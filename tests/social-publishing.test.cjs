const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createWorkspace } = require("../electron/workspace.cjs");
const { generatePostCaption } = require("../electron/social-caption.cjs");
const { secureUpload } = require("../electron/social-platforms.cjs");
function setup(t, fetchImpl) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "orvio-social-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return {
    directory,
    fetchImpl,
    safeStorage: {
      isEncryptionAvailable: () => true,
      encryptString: (v) => Buffer.from("secret:" + v),
      decryptString: (v) => v.toString().slice(7),
    },
  };
}
const response = (body) => ({ ok: true, json: async () => body });
const meta = () =>
  response({
    data: [
      {
        id: "1",
        name: "Page",
        access_token: "page-token-123",
        instagram_business_account: { id: "11", username: "ig" },
      },
    ],
  });
const future = () => new Date(Date.now() + 3600000).toISOString();
test("bulk validation is atomic and derives names without requiring a title", async (t) => {
  const options = setup(t, async () => meta()),
    w = createWorkspace(options);
  await w.connect({ token: "meta-private-token", version: "v24.0" });
  const post = {
    accountId: "fb:1",
    mediaType: "text",
    caption: "A new beginning\nOur story.",
    scheduledAt: future(),
  };
  assert.throws(() =>
    w.scheduleBulk([post, { ...post, accountId: "missing" }]),
  );
  assert.equal(w.snapshot().jobs.length, 0);
  w.scheduleBulk([post, { ...post, caption: "A second thought" }]);
  assert.equal(w.snapshot().jobs.length, 2);
  assert.equal(w.snapshot().jobs[0].title, "A new beginning");
  assert.ok(w.snapshot().jobs[0].createdAt);
  assert.equal(createWorkspace(options).snapshot().jobs.length, 2);
  assert.throws(() => w.schedule({ ...post, accountId: "11" }), /Text-only/);
});
test("Facebook text publishes to feed and records live permalink", async (t) => {
  const calls = [],
    options = setup(t, async (url, request) => {
      calls.push({ url, request });
      if (url.includes("me/accounts")) return meta();
      if (url.endsWith("/feed")) return response({ id: "1_77" });
      return response({
        permalink_url: "https://www.facebook.com/1/posts/77",
        created_time: "2026-10-02T08:00:00Z",
      });
    }),
    w = createWorkspace(options);
  await w.connect({ token: "meta-private-token", version: "v24.0" });
  w.schedule({
    accountId: "fb:1",
    mediaType: "text",
    caption: "Text, without media or a title.",
    scheduledAt: new Date().toISOString(),
  });
  await w.tick();
  assert.equal(
    calls[1].request.body.get("message"),
    "Text, without media or a title.",
  );
  const j = w.snapshot().jobs[0];
  assert.equal(j.status, "published");
  assert.equal(j.postUrl, "https://www.facebook.com/1/posts/77");
  assert.equal(j.publishedAt, "2026-10-02T08:00:00Z");
  await w.tick();
  assert.equal(calls.filter((c) => c.url.endsWith("/feed")).length, 1);
});
test("staged files survive deletion of originals, serve only registered media, and can be shared across destinations", async (t) => {
  const options = setup(t, async (url) =>
      url.includes("me/accounts") ? meta() : response({ id: "1_9" }),
    ),
    w = createWorkspace(options);
  await w.connect({ token: "meta-private-token", version: "v24.0" });
  const original = path.join(options.directory, "original.jpg");
  fs.writeFileSync(original, "photo");
  const media = w.stageMedia(original);
  fs.unlinkSync(original);
  assert.equal(fs.readFileSync(w.socialFile(media.sourceId), "utf8"), "photo");
  assert.throws(() => w.socialFile("../workspace-v3.json"));
  assert.ok(!JSON.stringify(w.snapshot()).includes("original.jpg"));
  const item = {
    accountId: "fb:1",
    mediaType: "image",
    sourceId: media.sourceId,
    caption: "Photo",
    scheduledAt: future(),
  };
  w.scheduleBulk([item, item]);
  assert.equal(
    w.snapshot().jobs[0].preview,
    `orvio-media://social/${media.sourceId}`,
  );
  assert.equal(
    fs.readFileSync(
      createWorkspace(options).socialFile(media.sourceId),
      "utf8",
    ),
    "photo",
  );
  assert.throws(() => w.schedule({ ...item, accountId: "11" }), /Cloudinary/);
});
test("vision captions send actual image content using selected model without changing saved model", async (t) => {
  let payload;
  const options = setup(t, async (url, request) => {
      payload = JSON.parse(request.body);
      return response({
        choices: [
          {
            message: {
              content:
                '{"title":"Morning light","caption":"A little sunshine."}',
            },
          },
        ],
      });
    }),
    w = createWorkspace(options);
  w.saveAI({ provider: "openai", model: "gpt-4o", key: "private-ai-key" });
  const result = await w.generatePostCaption({
    frames: ["data:image/jpeg;base64,/9j/AA=="],
    chatModel: "provider:gpt-4.1",
    brief: "",
  });
  assert.equal(result.caption, "A little sunshine.");
  assert.equal(payload.model, "gpt-4.1");
  assert.equal(
    payload.messages[0].content[1].image_url.url,
    "data:image/jpeg;base64,/9j/AA==",
  );
  assert.equal(w.snapshot().ai.model, "gpt-4o");
  await assert.rejects(
    () =>
      w.generatePostCaption({
        frames: ["data:image/jpeg;base64,/9j/AA=="],
        chatModel: "provider:text-only",
      }),
    /vision model/,
  );
  await assert.rejects(
    () => w.generatePostCaption({ frames: ["https://example.com/secret"] }),
    /valid media/,
  );
});
test("Gemini captions include sampled video frames and text as real multimodal parts", async () => {
  let payload;
  const result = await generatePostCaption({
    input: {
      frames: [
        "data:image/jpeg;base64,/9j/AA==",
        "data:image/jpeg;base64,/9j/BB==",
      ],
      brief: "A launch video",
    },
    config: { provider: "gemini", model: "gemini-2.5-flash" },
    key: "key",
    fetchImpl: async (url, r) => {
      payload = JSON.parse(r.body);
      return response({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '{"title":"Launch","caption":"Meet our latest creation."}',
                },
              ],
            },
          },
        ],
      });
    },
  });
  assert.equal(result.title, "Launch");
  assert.equal(payload.contents[0].parts.length, 3);
  assert.equal(payload.contents[0].parts[1].inlineData.mimeType, "image/jpeg");
});
test("TikTok connection encrypts tokens, checks audience, persists processing, and never posts twice", async (t) => {
  let inits = 0;
  const options = setup(t, async (url, r) => {
      if (url.includes("creator_info"))
        return response({
          data: {
            creator_username: "creator",
            creator_nickname: "Creator",
            privacy_level_options: ["SELF_ONLY"],
            max_video_post_duration_sec: 300,
          },
          error: { code: "ok" },
        });
      if (url.includes("/user/info"))
        return response({ data: { user: { open_id: "abc" } } });
      if (url.includes("/init/")) {
        inits++;
        return response({ data: { publish_id: "publish-1" } });
      }
      if (url.includes("/status/"))
        return response({
          data: { status: "PUBLISH_COMPLETE", publicaly_available_post_id: [] },
        });
      throw Error("Unexpected request");
    }),
    w = createWorkspace(options);
  await w.connectSocial({ kind: "tiktok", token: "tiktok-private-token" });
  const item = {
    accountId: "tt:abc",
    mediaType: "video",
    caption: "A TikTok",
    imageUrl: "https://verified.example/video.mp4",
    scheduledAt: new Date().toISOString(),
  };
  assert.throws(() => w.schedule(item), /audience/);
  w.schedule({ ...item, privacy: "SELF_ONLY" });
  await w.tick();
  assert.equal(w.snapshot().jobs[0].status, "published");
  assert.equal(w.snapshot().jobs[0].postUrl, "");
  assert.ok(!JSON.stringify(w.snapshot()).includes("tiktok-private-token"));
  await createWorkspace(options).tick();
  assert.equal(inits, 1);
});
test("YouTube requires video and explicit audience, uploads local bytes, and waits for processing", async (t) => {
  let putCount = 0;
  const options = setup(t, async (url, r) => {
      if (url.includes("/channels?"))
        return response({
          items: [{ id: "channel", snippet: { title: "My channel" } }],
        });
      if (url.includes("/upload/youtube") && r.method === "POST") {
        const body = JSON.parse(r.body);
        assert.equal(body.status.selfDeclaredMadeForKids, false);
        assert.equal(body.status.privacyStatus, "unlisted");
        return {
          ok: true,
          headers: new Headers({
            location:
              "https://www.googleapis.com/upload/youtube/v3/videos?upload_id=abc",
          }),
        };
      }
      if (r.method === "PUT") {
        putCount++;
        assert.equal(await r.body.text(), "video-bytes");
        return response({ id: "video-123" });
      }
      return response({ items: [{ status: { uploadStatus: "processed" } }] });
    }),
    w = createWorkspace(options);
  await w.connectSocial({ kind: "youtube", token: "youtube-private-token" });
  const file = path.join(options.directory, "clip.mp4");
  fs.writeFileSync(file, "video-bytes");
  const media = w.stageMedia(file);
  const post = {
    accountId: "yt:channel",
    mediaType: "video",
    sourceId: media.sourceId,
    caption: "Clip caption",
    scheduledAt: new Date().toISOString(),
  };
  assert.throws(() => w.schedule(post), /visibility/);
  w.schedule({ ...post, privacy: "unlisted", madeForKids: false });
  await w.tick();
  assert.equal(w.snapshot().jobs[0].status, "published");
  assert.equal(
    w.snapshot().jobs[0].postUrl,
    "https://www.youtube.com/watch?v=video-123",
  );
  await createWorkspace(options).tick();
  assert.equal(putCount, 1);
});
test("upload session URLs never reach the renderer, and interrupted YouTube requests are not repeated", async (t) => {
  const options = setup(t, async () =>
      response({ items: [{ id: "c", snippet: { title: "Channel" } }] }),
    ),
    w = createWorkspace(options);
  await w.connectSocial({ kind: "youtube", token: "youtube-private-token" });
  const file = path.join(options.directory, "clip.mp4");
  fs.writeFileSync(file, "video");
  const media = w.stageMedia(file);
  w.schedule({
    accountId: "yt:c",
    sourceId: media.sourceId,
    mediaType: "video",
    caption: "Clip",
    privacy: "private",
    madeForKids: false,
    scheduledAt: new Date().toISOString(),
  });
  const target = path.join(options.directory, "workspace-v3.json"),
    saved = JSON.parse(fs.readFileSync(target));
  Object.assign(saved.jobs[0], {
    status: "publishing",
    uploadURL: "https://www.googleapis.com/?upload_token=secret",
  });
  fs.writeFileSync(target, JSON.stringify(saved));
  const reopened = createWorkspace(options);
  assert.ok(!JSON.stringify(reopened.snapshot()).includes("upload_token"));
  await reopened.tick();
  assert.equal(reopened.snapshot().jobs[0].status, "uncertain");
  await reopened.tick();
  assert.equal(reopened.snapshot().jobs[0].status, "uncertain");
});
test("untrusted upload destinations cannot receive platform tokens", () => {
  assert.throws(() =>
    secureUpload("https://evil.example/upload", ["www.googleapis.com"]),
  );
  assert.throws(() =>
    secureUpload("https://user:secret@www.googleapis.com/upload", [
      "www.googleapis.com",
    ]),
  );
  assert.equal(
    secureUpload("https://www.googleapis.com/upload", ["www.googleapis.com"]),
    "https://www.googleapis.com/upload",
  );
});

// Official publishing adapters. Access tokens and upload session URLs stay in the main process.
const fs = require("node:fs");
const path = require("node:path");
const { openAsBlob } = fs;
function secureUpload(value, hosts) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    !hosts.includes(url.hostname)
  )
    throw Error("Platform returned an unexpected upload destination.");
  return url.href;
}
function createSocialPlatforms({ fetchImpl = fetch }) {
  async function request(url, token, body) {
    const response = await fetchImpl(url, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      redirect: "error",
      signal: AbortSignal.timeout(60000),
    });
    const result = await response.json();
    if (!response.ok || (result.error && result.error.code !== "ok"))
      throw Error(
        `Platform request failed (${result.error?.code || response.status}). Reconnect and check publishing permissions.`,
      );
    return result.data || result;
  }
  const creator = (token) =>
    request(
      "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
      token,
      {},
    );
  return {
    creator,
    async refresh(kind, { clientId, clientSecret, refreshToken }) {
      const response = await fetchImpl(
        kind === "tiktok"
          ? "https://open.tiktokapis.com/v2/oauth/token/"
          : "https://oauth2.googleapis.com/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            [kind === "tiktok" ? "client_key" : "client_id"]: clientId,
            ...(clientSecret ? { client_secret: clientSecret } : {}),
            grant_type: "refresh_token",
            refresh_token: refreshToken,
          }),
          redirect: "error",
          signal: AbortSignal.timeout(30000),
        },
      );
      const result = await response.json();
      if (!response.ok || !result.access_token)
        throw Error("Automatic token refresh failed. Reconnect this channel.");
      return result;
    },
    async connect(kind, token) {
      if (kind === "tiktok") {
        const info = await creator(token);
        const user = await request(
          "https://open.tiktokapis.com/v2/user/info/?fields=open_id",
          token,
        );
        if (!user.user?.open_id)
          throw Error(
            "TikTok access needs user.info.basic and video.publish scopes.",
          );
        return {
          id: "tt:" + user.user.open_id,
          kind,
          username: info.creator_username,
          pageName: info.creator_nickname,
          pictureUrl: info.creator_avatar_url,
          privacyOptions: info.privacy_level_options,
          maxDuration: info.max_video_post_duration_sec,
          commentDisabled: info.comment_disabled,
          duetDisabled: info.duet_disabled,
          stitchDisabled: info.stitch_disabled,
        };
      }
      if (kind === "youtube") {
        const result = await request(
          "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
          token,
        );
        const c = result.items?.[0];
        if (!c) throw Error("No YouTube channel found for this token.");
        return {
          id: "yt:" + c.id,
          kind,
          username: c.snippet.title,
          pageName: c.snippet.customUrl || c.snippet.title,
          pictureUrl: c.snippet.thumbnails?.default?.url,
          followers: Number(c.statistics?.subscriberCount) || 0,
          mediaCount: Number(c.statistics?.videoCount) || 0,
        };
      }
      throw Error("Choose TikTok or YouTube.");
    },
    async publish(account, token, job, filePath, save) {
      if (account.kind === "tiktok") {
        const info = await creator(token);
        if (!info.privacy_level_options?.includes(job.privacy))
          throw Error(
            "TikTok privacy choices changed. Edit this post and choose an available audience.",
          );
        const post_info = {
          title:
            job.mediaType === "image" ? job.title.slice(0, 90) : job.caption,
          privacy_level: job.privacy,
          disable_comment:
            !!info.comment_disabled || job.disableComment !== false,
          brand_content_toggle: !!job.brandContent,
          brand_organic_toggle: !!job.brandOrganic,
          ...(job.mediaType === "image"
            ? { description: job.caption }
            : {
                disable_duet: !!info.duet_disabled || job.disableDuet !== false,
                disable_stitch:
                  !!info.stitch_disabled || job.disableStitch !== false,
              }),
        };
        let source_info, blob;
        if (job.mediaType === "video" && filePath) {
          blob = await openAsBlob(filePath, {
            type:
              path.extname(filePath).toLowerCase() === ".mov"
                ? "video/quicktime"
                : "video/mp4",
          });
          if (blob.size > 64 * 1024 * 1024)
            throw Error(
              "TikTok local videos must be under 64 MB for this upload.",
            );
          source_info = {
            source: "FILE_UPLOAD",
            video_size: blob.size,
            chunk_size: blob.size,
            total_chunk_count: 1,
          };
        } else
          source_info =
            job.mediaType === "video"
              ? { source: "PULL_FROM_URL", video_url: job.imageUrl }
              : {
                  source: "PULL_FROM_URL",
                  photo_cover_index: 0,
                  photo_images: [job.imageUrl],
                };
        if (
          job.mediaType === "video" &&
          Number.isFinite(job.duration) &&
          job.duration > info.max_video_post_duration_sec
        )
          throw Error("This video exceeds the TikTok account duration limit.");
        save({ status: "publishing" }); // An init request can start a post; never replay it after a crash.
        const result = await request(
          `https://open.tiktokapis.com/v2/post/publish/${job.mediaType === "video" ? "video" : "content"}/init/`,
          token,
          {
            post_info,
            source_info,
            ...(job.mediaType === "image"
              ? { post_mode: "DIRECT_POST", media_type: "PHOTO" }
              : {}),
          },
        );
        save({ containerId: result.publish_id, status: "processing" });
        if (blob) {
          const upload = await fetchImpl(
            secureUpload(result.upload_url, ["open-upload.tiktokapis.com"]),
            {
              method: "PUT",
              headers: {
                "Content-Type": blob.type,
                "Content-Range": `bytes 0-${blob.size - 1}/${blob.size}`,
              },
              body: blob,
              redirect: "error",
              signal: AbortSignal.timeout(300000),
            },
          );
          if (!upload.ok)
            throw Error(`TikTok upload failed (${upload.status}).`);
        }
        return { status: "processing" };
      }
      if (!filePath) throw Error("Choose a local video for YouTube.");
      const blob = await openAsBlob(filePath, {
        type:
          path.extname(filePath).toLowerCase() === ".mov"
            ? "video/quicktime"
            : "video/mp4",
      });
      const init = await fetchImpl(
        "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "X-Upload-Content-Type": blob.type,
            "X-Upload-Content-Length": String(blob.size),
          },
          body: JSON.stringify({
            snippet: {
              title: job.title,
              description: job.caption,
              categoryId: "22",
            },
            status: {
              privacyStatus: job.privacy,
              selfDeclaredMadeForKids: job.madeForKids,
            },
          }),
          redirect: "error",
          signal: AbortSignal.timeout(60000),
        },
      );
      if (!init.ok)
        throw Error(
          `YouTube upload setup failed (${init.status}). Check youtube.upload permission.`,
        );
      const uploadURL = secureUpload(init.headers.get("location"), [
        "www.googleapis.com",
      ]);
      save({ status: "publishing" });
      const upload = await fetchImpl(uploadURL, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": blob.type,
        },
        body: blob,
        redirect: "error",
        signal: AbortSignal.timeout(300000),
      });
      if (!upload.ok)
        throw Error(
          `YouTube upload failed (${upload.status}). Check the channel before trying again.`,
        );
      const result = await upload.json();
      if (!result.id) throw Error("YouTube did not return a video ID.");
      save({
        mediaId: result.id,
        postUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(result.id)}`,
        status: "processing",
        uploadURL: "",
      });
      return { status: "processing" };
    },
    async status(account, token, job) {
      if (account.kind === "tiktok") {
        const result = await request(
          "https://open.tiktokapis.com/v2/post/publish/status/fetch/",
          token,
          { publish_id: job.containerId },
        );
        if (result.status === "FAILED") {
          const error = Error(
            `TikTok could not publish: ${result.fail_reason || "processing failed"}.`,
          );
          error.terminal = true;
          throw error;
        }
        if (result.status !== "PUBLISH_COMPLETE")
          return { status: "processing" };
        const mediaId = String(result.publicaly_available_post_id?.[0] || "");
        return {
          status: "published",
          mediaId,
          postUrl: mediaId
            ? `https://www.tiktok.com/@${encodeURIComponent(account.username)}/${job.mediaType === "image" ? "photo" : "video"}/${mediaId}`
            : "",
        };
      }
      if (!job.mediaId)
        return {
          status: "uncertain",
          error:
            "YouTube upload was interrupted. Check your channel before publishing again.",
        };
      const result = await request(
        `https://www.googleapis.com/youtube/v3/videos?part=status,processingDetails&id=${encodeURIComponent(job.mediaId)}`,
        token,
      );
      const item = result.items?.[0];
      if (!item) return { status: "processing" };
      if (
        ["failed", "terminated"].includes(
          item.processingDetails?.processingStatus,
        ) ||
        ["failed", "rejected", "deleted"].includes(item.status?.uploadStatus)
      ) {
        const error = Error(
          "YouTube could not process this video. Review it in YouTube Studio.",
        );
        error.terminal = true;
        throw error;
      }
      return {
        status:
          item.status?.uploadStatus === "processed" ||
          item.processingDetails?.processingStatus === "succeeded"
            ? "published"
            : "processing",
      };
    },
  };
}
module.exports = { createSocialPlatforms, secureUpload };

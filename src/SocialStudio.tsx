import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import {
  bridge,
  friendlyError,
  type Account,
  type Job,
  type Workspace,
} from "./Connected";
import "./social-studio.css";

type Media = {
  sourceId?: string;
  preview?: string;
  url?: string;
  mediaType: string;
  name: string;
  size?: number;
  duration?: number;
};
type PostRow = {
  id: string;
  media: Media | null;
  caption: string;
  title?: string;
};
export type PostInitial = {
  title?: string;
  caption?: string;
  accountId?: string;
  imageUrl?: string;
  mediaType?: string;
  publishMode?: string;
  scheduledAt?: string;
  generatedId?: string;
};
const platforms = [
  { kind: "instagram", name: "Instagram", mark: "IG", hint: "Photos & Reels" },
  {
    kind: "facebook",
    name: "Facebook",
    mark: "f",
    hint: "Text, photos & Reels",
  },
  { kind: "tiktok", name: "TikTok", mark: "♪", hint: "Videos & photos" },
  { kind: "youtube", name: "YouTube", mark: "▶", hint: "Videos & Shorts" },
];
export const platformName = (kind?: string) =>
  platforms.find((p) => p.kind === kind)?.name || "Account";
const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const localInput = (value: string) => {
  const d = new Date(value);
  return Number.isFinite(d.getTime())
    ? `${dateKey(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
    : "";
};
const nextSlot = () => {
  const d = new Date();
  d.setMinutes(Math.ceil((d.getMinutes() + 1) / 15) * 15, 0, 0);
  return localInput(d.toISOString());
};
const stamp = (value?: string) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";
const activeStatuses = ["queued", "creating", "processing", "publishing"];
const statusLabel = (s: string) =>
  ({
    queued: "Scheduled",
    creating: "Preparing",
    processing: "Processing",
    publishing: "Publishing",
    published: "Published",
    failed: "Failed",
    uncertain: "Check live account",
    cancelled: "Cancelled",
  })[s] || s;
function PlatformMark({ kind }: { kind?: string }) {
  return (
    <span
      className={`social-platform ${kind || ""}`}
      aria-label={platformName(kind)}
    >
      {platforms.find((p) => p.kind === kind)?.mark || "•"}
    </span>
  );
}
function MediaPreview({
  media,
  compact = false,
}: {
  media: Media | null;
  compact?: boolean;
}) {
  const url = media?.preview || media?.url;
  return (
    <div className={`social-media-preview ${compact ? "compact" : ""}`}>
      {url ? (
        media?.mediaType === "video" ? (
          <video
            src={url}
            controls={!compact}
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          <img src={url} alt={media?.name || "Post preview"} />
        )
      ) : (
        <Icon
          name={media?.mediaType === "video" ? "video" : "image"}
          size={compact ? 20 : 42}
        />
      )}
    </div>
  );
}
function PostLink({ job }: { job: Job }) {
  return job.postUrl ? (
    <button
      className="text-button"
      onClick={() =>
        void bridge()
          .openPost(job.postUrl)
          .catch(() => {})
      }
    >
      View live post <Icon name="external" size={14} />
    </button>
  ) : job.status === "published" ? (
    <span className="social-muted">Live link not provided by the platform</span>
  ) : null;
}

export function SocialConnection({ done }: { done: () => void }) {
  const [kind, setKind] = useState("meta"),
    [autoRefresh, setAutoRefresh] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="social-connection">
      <span className="mini-label">CONNECT A CHANNEL</span>
      <h2>Bring your audience here.</h2>
      <p>
        Choose a platform. Your access token stays encrypted on this device.
      </p>
      <div className="social-platform-options">
        {[
          { kind: "meta", name: "Instagram + Facebook", mark: "IG / f" },
          { kind: "tiktok", name: "TikTok", mark: "♪" },
          { kind: "youtube", name: "YouTube", mark: "▶" },
        ].map((p) => (
          <button
            type="button"
            key={p.kind}
            aria-pressed={kind === p.kind}
            className={kind === p.kind ? "selected" : ""}
            disabled={busy}
            onClick={() => {
              setKind(p.kind);
              setAutoRefresh(false);
              setError("");
            }}
          >
            <b>{p.mark}</b>
            <span>{p.name}</span>
          </button>
        ))}
      </div>
      <form
        key={kind}
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget,
            d = new FormData(form);
          setBusy(true);
          setError("");
          try {
            if (kind === "meta")
              await bridge().connectMeta({
                token: String(d.get("token")).trim(),
                version: String(d.get("version")),
              });
            else
              await bridge().connectSocial({
                kind,
                token: String(d.get("token")).trim(),
                ...(autoRefresh
                  ? {
                      refreshToken: String(d.get("refreshToken")).trim(),
                      clientId: String(d.get("clientId")).trim(),
                      clientSecret: String(d.get("clientSecret") || "").trim(),
                    }
                  : {}),
              });
            form.reset();
            done();
          } catch (e) {
            setError(friendlyError(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="social-setup-note">
          <b>
            {kind === "meta"
              ? "Instagram professionals & Facebook Pages"
              : kind === "tiktok"
                ? "TikTok Content Posting API"
                : "YouTube Data API"}
          </b>
          <p>
            {kind === "meta"
              ? "Connect a Facebook user token with Page access. Linked Instagram Business and Creator accounts appear automatically."
              : kind === "tiktok"
                ? "Use a TikTok app token with user.info.basic and video.publish. Direct Post requires app access; unaudited apps can publish privately. Public media URLs must belong to a verified domain."
                : "Use a Google OAuth access token with youtube.upload and youtube.readonly. Enable YouTube Data API for your Google project."}
          </p>
          <a
            href={
              kind === "meta"
                ? "https://developers.facebook.com/tools/explorer/"
                : kind === "tiktok"
                  ? "https://developers.tiktok.com/docs/content-posting-api-get-started"
                  : "https://developers.google.com/youtube/v3/guides/uploading_a_video"
            }
            target="_blank"
            rel="noreferrer"
          >
            Connection guide ↗
          </a>
        </div>
        <label>
          {kind === "meta"
            ? "Facebook user access token"
            : `${platformName(kind)} access token`}
          <input
            name="token"
            type="password"
            autoComplete="off"
            placeholder="Paste your access token"
            required
            disabled={busy}
          />
        </label>
        {kind === "meta" && (
          <details>
            <summary>Advanced connection settings</summary>
            <label>
              Graph API version
              <input
                name="version"
                defaultValue="v24.0"
                required
                pattern="v[0-9]+\.[0-9]+"
              />
            </label>
            <p className="field-help">
              Permissions: pages_show_list, pages_read_engagement,
              pages_manage_posts, instagram_basic and instagram_content_publish.
            </p>
          </details>
        )}
        {kind !== "meta" && (
          <div className="social-refresh-settings">
            <label>
              <input
                type="checkbox"
                checked={autoRefresh}
                disabled={busy}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Keep schedules connected automatically
            </label>
            {autoRefresh && (
              <>
                <label>
                  {kind === "tiktok"
                    ? "TikTok client key"
                    : "Google OAuth client ID"}
                  <input
                    name="clientId"
                    required
                    autoComplete="off"
                    disabled={busy}
                  />
                </label>
                <label>
                  Refresh token
                  <input
                    name="refreshToken"
                    type="password"
                    required
                    autoComplete="off"
                    disabled={busy}
                  />
                </label>
                <label>
                  Client secret
                  {kind === "youtube"
                    ? " (if required by your OAuth client)"
                    : ""}
                  <input
                    name="clientSecret"
                    type="password"
                    required={kind === "tiktok"}
                    autoComplete="off"
                    disabled={busy}
                  />
                </label>
                <p className="field-help">
                  Use the app credentials that issued this refresh token.
                  Secrets stay encrypted on this device.
                </p>
              </>
            )}
          </div>
        )}
        <p className="field-help">
          Without automatic refresh, reconnect when your access token expires.
          Scheduled publishing needs an awake, online computer.
        </p>
        {error && (
          <p role="alert" className="error-message">
            {error}
          </p>
        )}
        <button className="primary full" disabled={busy}>
          {busy ? "Checking your account…" : "Connect channel"}
          <Icon name="link" size={16} />
        </button>
      </form>
    </div>
  );
}

export function SocialAccounts({
  workspace,
  onConnect,
  notify,
}: {
  workspace: Workspace;
  onConnect: () => void;
  notify: (s: string) => void;
}) {
  const [selectedJob, setSelectedJob] = useState(""),
    [selected, setSelected] = useState(""),
    [filter, setFilter] = useState("all"),
    [search, setSearch] = useState("");
  const account = workspace.accounts.find((a) => a.id === selected);
  const jobs = workspace.jobs
    .filter((j) => j.accountId === selected)
    .sort(
      (a, b) =>
        Date.parse(b.publishedAt || b.scheduledAt) -
        Date.parse(a.publishedAt || a.scheduledAt),
    );
  const last = jobs.find((j) => j.status === "published");
  return (
    <div className="social-accounts">
      <section className="social-heading">
        <div>
          <span className="mini-label">YOUR CHANNELS</span>
          <h2>Connected accounts</h2>
          <p>One home for your audiences, queues and publishing activity.</p>
        </div>
        <button className="primary" onClick={onConnect}>
          <Icon name="plus" size={16} />
          Add channel
        </button>
      </section>
      <div className="social-channel-overview">
        {platforms.map((p) => {
          const count = workspace.accounts.filter(
            (a) => a.kind === p.kind,
          ).length;
          return (
            <button
              key={p.kind}
              className={filter === p.kind ? "selected" : ""}
              onClick={() => setFilter(filter === p.kind ? "all" : p.kind)}
            >
              <PlatformMark kind={p.kind} />
              <span>
                <b>{p.name}</b>
                <small>{p.hint}</small>
              </span>
              <span className="social-count">{count}</span>
            </button>
          );
        })}
      </div>
      {!!workspace.accounts.length && (
        <div className="social-toolbar">
          <label className="social-search">
            <Icon name="search" size={16} />
            <input
              aria-label="Search connected accounts"
              placeholder="Search accounts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <button
            className="text-button"
            onClick={() => {
              setFilter("all");
              setSearch("");
            }}
          >
            All channels · {workspace.accounts.length}
          </button>
        </div>
      )}
      {!workspace.accounts.length ? (
        <section className="social-empty panel">
          <Icon name="link" size={30} />
          <h3>Your next post starts here.</h3>
          <p>
            Connect Instagram, Facebook, TikTok or YouTube, then post to several
            channels at once.
          </p>
          <button className="secondary" onClick={onConnect}>
            Connect your first channel
          </button>
        </section>
      ) : (
        <div className="social-account-grid">
          {workspace.accounts
            .filter(
              (a) =>
                (filter === "all" || a.kind === filter) &&
                (a.username + " " + a.pageName)
                  .toLowerCase()
                  .includes(search.toLowerCase()),
            )
            .map((a) => {
              const posts = workspace.jobs.filter((j) => j.accountId === a.id),
                lastPost = posts
                  .filter((j) => j.status === "published")
                  .sort(
                    (x, y) =>
                      Date.parse(y.publishedAt || y.scheduledAt) -
                      Date.parse(x.publishedAt || x.scheduledAt),
                  )[0];
              return (
                <button
                  className={`panel social-account-card ${selected === a.id ? "selected" : ""}`}
                  key={a.id}
                  onClick={() => setSelected(selected === a.id ? "" : a.id)}
                  aria-expanded={selected === a.id}
                >
                  <div className="social-account-top">
                    {a.pictureUrl ? (
                      <img
                        className="profile-photo"
                        src={a.pictureUrl}
                        alt=""
                      />
                    ) : (
                      <PlatformMark kind={a.kind} />
                    )}
                    <span className="social-status published">Connected</span>
                  </div>
                  <span className="social-muted">{platformName(a.kind)}</span>
                  <h3>
                    {a.kind === "instagram" || a.kind === "tiktok" ? "@" : ""}
                    {a.username}
                  </h3>
                  <p>{a.pageName}</p>
                  <div className="social-account-stats">
                    <span>
                      <b>
                        {posts.filter((j) => j.status === "published").length}
                      </b>
                      published
                    </span>
                    <span>
                      <b>
                        {
                          posts.filter((j) => activeStatuses.includes(j.status))
                            .length
                        }
                      </b>
                      in queue
                    </span>
                    {a.followers !== undefined && (
                      <span>
                        <b>{a.followers.toLocaleString()}</b>followers
                      </span>
                    )}
                  </div>
                  <div className="social-account-last">
                    <span>Last published</span>
                    <b>
                      {lastPost
                        ? stamp(lastPost.publishedAt || lastPost.scheduledAt)
                        : "No posts yet"}
                    </b>
                    <Icon name="arrow" size={15} />
                  </div>
                </button>
              );
            })}
        </div>
      )}
      {account && (
        <section className="panel social-account-detail">
          <div className="social-heading">
            <div>
              <span className="mini-label">ACCOUNT DETAILS</span>
              <h2>{account.username}</h2>
              <p>
                {platformName(account.kind)} · Connected{" "}
                {stamp(account.connectedAt)}
              </p>
            </div>
            <button className="text-button" onClick={() => setSelected("")}>
              Close <Icon name="close" size={15} />
            </button>
          </div>
          <div className="social-detail-facts">
            <span>
              <small>Last published</small>
              <b>
                {last
                  ? stamp(last.publishedAt || last.scheduledAt)
                  : "No posts yet"}
              </b>
            </span>
            <span>
              <small>Account ID</small>
              <b>{account.id}</b>
            </span>
            <span>
              <small>Published with Orvio</small>
              <b>{jobs.filter((j) => j.status === "published").length} posts</b>
            </span>
          </div>
          <h3>Recent activity</h3>
          {jobs.length ? (
            jobs.slice(0, 8).map((j) => (
              <div className="social-account-activity" key={j.id}>
                <button
                  className="text-button"
                  onClick={() => setSelectedJob(j.id)}
                  aria-label={`View account post ${j.title}`}
                >
                  <Icon name="arrow" size={14} />
                </button>
                <span className={`social-status ${j.status}`}>
                  {statusLabel(j.status)}
                </span>
                <span>
                  <b>{j.title}</b>
                  <small>{stamp(j.publishedAt || j.scheduledAt)}</small>
                </span>
                <PostLink job={j} />
              </div>
            ))
          ) : (
            <p className="social-muted">
              Posts published or scheduled with Orvio appear here.
            </p>
          )}
          <button
            className="secondary"
            onClick={async () => {
              try {
                await bridge().disconnectMeta(account.id);
                setSelected("");
                notify("Channel disconnected.");
              } catch (e) {
                notify(friendlyError(e));
              }
            }}
          >
            Disconnect channel
          </button>
        </section>
      )}
      {workspace.jobs.find((j) => j.id === selectedJob) && (
        <PostDetails
          key={selectedJob}
          job={workspace.jobs.find((j) => j.id === selectedJob)!}
          workspace={workspace}
          notify={notify}
          onClose={() => setSelectedJob("")}
        />
      )}
    </div>
  );
}

export function DatePicker({
  value,
  onChange,
  compact = false,
}: {
  value: string;
  onChange: (s: string) => void;
  compact?: boolean;
}) {
  const selected = new Date(value),
    today = new Date();
  const [month, setMonth] = useState(
    () =>
      new Date(
        (Number.isFinite(selected.getTime()) ? selected : today).getFullYear(),
        (Number.isFinite(selected.getTime()) ? selected : today).getMonth(),
        1,
      ),
  );
  const count = new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      0,
    ).getDate(),
    pad = (month.getDay() + 6) % 7,
    time = value.slice(11, 16) || "09:00";
  const pick = (d: Date) => onChange(`${dateKey(d)}T${time}`);
  return (
    <div className={`social-date-picker ${compact ? "compact" : ""}`}>
      <div className="social-date-presets">
        {["Today", "Tomorrow", "Next week"].map((label, i) => (
          <button
            type="button"
            key={label}
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() + [0, 1, 7][i]);
              setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
              pick(d);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="social-month-heading">
        <b>
          {month.toLocaleDateString(undefined, {
            month: "long",
            year: "numeric",
          })}
        </b>
        <span>
          <button
            type="button"
            aria-label="Previous month"
            onClick={() =>
              setMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
            }
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() =>
              setMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
            }
          >
            ›
          </button>
        </span>
      </div>
      <div className="social-date-grid">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <small key={i}>{d}</small>
        ))}
        {Array.from({ length: pad }, (_, i) => (
          <span key={`pad${i}`} />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const d = new Date(month.getFullYear(), month.getMonth(), i + 1),
            key = dateKey(d);
          return (
            <button
              type="button"
              key={key}
              className={`${key === value.slice(0, 10) ? "selected" : ""} ${key === dateKey(today) ? "today" : ""}`}
              disabled={key < dateKey(today)}
              aria-label={d.toLocaleDateString(undefined, {
                dateStyle: "full",
              })}
              aria-pressed={key === value.slice(0, 10)}
              onClick={() => pick(d)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="social-time-row">
        <label>
          Time
          <input
            type="time"
            required
            value={time}
            onChange={(e) =>
              onChange(`${value.slice(0, 10)}T${e.target.value}`)
            }
          />
        </label>
        <span>{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
      </div>
      <div className="social-time-presets">
        {["09:00", "12:00", "18:00", "20:00"].map((t) => (
          <button
            type="button"
            className={time === t ? "selected" : ""}
            key={t}
            onClick={() => onChange(`${value.slice(0, 10)}T${t}`)}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

async function mediaDuration(media: Media): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    const clean = () => {
      clearTimeout(timer);
      video.removeAttribute("src");
      video.load();
    };
    const timer = setTimeout(() => {
      clean();
      reject(Error("Video metadata timed out. Choose a playable MP4 file."));
    }, 20000);
    video.onloadedmetadata = () => {
      const duration = video.duration;
      video.onloadedmetadata = null;
      video.onerror = null;
      clean();
      if (Number.isFinite(duration)) resolve(duration);
      else reject(Error("Could not read the video duration."));
    };
    video.onerror = () => {
      video.onerror = null;
      clean();
      reject(Error("Could not read this video. Choose a playable MP4 file."));
    };
    video.src = media.preview || media.url || "";
  });
}

async function mediaFrames(media: Media): Promise<string[]> {
  const url = media.preview || media.url;
  if (!url) return [];
  const canvas = document.createElement("canvas"),
    ctx = canvas.getContext("2d");
  if (!ctx) throw Error("Media preview is unavailable.");
  if (media.mediaType === "image")
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      const timer = setTimeout(
        () => reject(Error("Image preview timed out.")),
        15000,
      );
      image.onload = () => {
        clearTimeout(timer);
        try {
          canvas.width = Math.min(1024, image.naturalWidth);
          canvas.height = Math.round(
            (image.naturalHeight * canvas.width) / image.naturalWidth,
          );
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve([canvas.toDataURL("image/jpeg", 0.8)]);
        } catch {
          reject(
            Error(
              "This image host does not allow AI previews. Choose a local file.",
            ),
          );
        }
      };
      image.onerror = () => {
        clearTimeout(timer);
        reject(Error("Could not read the image. Choose a local file."));
      };
      image.src = url;
    });
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.preload = "auto";
  const wait = (event: string) =>
    new Promise<void>((resolve, reject) => {
      const clean = () => {
        clearTimeout(timer);
        video.removeEventListener(event, done);
        video.removeEventListener("error", fail);
      };
      const done = () => {
          clean();
          resolve();
        },
        fail = () => {
          clean();
          reject(
            Error("Could not inspect the video. Choose a playable MP4 file."),
          );
        };
      const timer = setTimeout(fail, 20000);
      video.addEventListener(event, done, { once: true });
      video.addEventListener("error", fail, { once: true });
    });
  try {
    const ready = wait("loadeddata");
    video.src = url;
    await ready;
    if (!Number.isFinite(video.duration) || !video.videoWidth)
      throw Error("Video preview is unavailable.");
    canvas.width = Math.min(1024, video.videoWidth);
    canvas.height = Math.round(
      (video.videoHeight * canvas.width) / video.videoWidth,
    );
    const frames: string[] = [];
    for (const fraction of [0.05, 0.5, 0.9]) {
      const seek = wait("seeked");
      video.currentTime = Math.max(0.001, video.duration * fraction);
      await seek;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push(canvas.toDataURL("image/jpeg", 0.75));
    }
    return frames;
  } finally {
    video.removeAttribute("src");
    video.load();
  }
}

export function SocialComposer({
  workspace,
  done,
  initial,
}: {
  workspace: Workspace;
  done: () => void;
  initial?: PostInitial;
}) {
  const [rows, setRows] = useState<PostRow[]>(() => [
    {
      id: crypto.randomUUID(),
      caption: initial?.caption || "",
      title: initial?.title,
      media: initial?.imageUrl
        ? {
            url: initial.imageUrl,
            preview: initial.imageUrl,
            mediaType: initial.mediaType || "image",
            name: "Linked media",
          }
        : null,
    },
  ]);
  const [active, setActive] = useState(0),
    [destinations, setDestinations] = useState<string[]>(
      initial?.accountId
        ? [initial.accountId]
        : workspace.accounts.length === 1
          ? [workspace.accounts[0].id]
          : [],
    ),
    [when, setWhen] = useState<"now" | "later">(
      initial?.publishMode === "later" || initial?.scheduledAt
        ? "later"
        : "now",
    ),
    [at, setAt] = useState(
      initial?.scheduledAt ? localInput(initial.scheduledAt) : nextSlot(),
    ),
    [cadence, setCadence] = useState("daily"),
    [busy, setBusy] = useState(false),
    [aiBusy, setAiBusy] = useState(false),
    [error, setError] = useState(""),
    [progress, setProgress] = useState(""),
    [model, setModel] = useState(""),
    [models, setModels] = useState<
      { id: string; name: string; vision: boolean }[]
    >([]),
    [urlOpen, setUrlOpen] = useState(false),
    [url, setUrl] = useState(""),
    [urlType, setUrlType] = useState("image"),
    [autoAI, setAutoAI] = useState(true),
    [privacy, setPrivacy] = useState<Record<string, string>>({}),
    [kids, setKids] = useState<string>(""),
    [disableComment, setDisableComment] = useState(true),
    [disableDuet, setDisableDuet] = useState(true),
    [disableStitch, setDisableStitch] = useState(true),
    [brandContent, setBrandContent] = useState(false),
    [brandOrganic, setBrandOrganic] = useState(false);
  const generatedLoaded = useRef(false);
  const row = rows[active] || rows[0],
    accounts = workspace.accounts.filter((a) => destinations.includes(a.id));
  const patch = (id: string, values: Partial<PostRow>) =>
    setRows((list) => list.map((r) => (r.id === id ? { ...r, ...values } : r)));
  useEffect(() => {
    if (!(window as any).studio) return;
    let alive = true;
    bridge()
      .socialModels()
      .then((list: typeof models) => {
        if (alive) setModels(list);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [workspace.ai.provider, workspace.ai.model]);
  useEffect(() => {
    if (!(window as any).studio?.refreshCreator) return;
    for (const id of destinations) {
      if (workspace.accounts.find((a) => a.id === id)?.kind === "tiktok")
        void bridge()
          .refreshCreator(id)
          .catch((e: unknown) => setError(friendlyError(e)));
    }
  }, [destinations.join(",")]);
  useEffect(() => {
    if (!initial?.generatedId || generatedLoaded.current) return;
    generatedLoaded.current = true;
    setBusy(true);
    bridge()
      .socialPrepare(initial.generatedId)
      .then((media: Media) =>
        setRows((list) => list.map((r, i) => (i === 0 ? { ...r, media } : r))),
      )
      .catch((e: unknown) => setError(friendlyError(e)))
      .finally(() => setBusy(false));
  }, [initial?.generatedId]);
  const generate = async (items: PostRow[]) => {
    setAiBusy(true);
    setError("");
    try {
      for (let i = 0; i < items.length; i++) {
        setProgress(`Writing caption ${i + 1} of ${items.length}…`);
        const item = items[i],
          frames = item.media ? await mediaFrames(item.media) : [];
        const result = await bridge().generatePostCaption({
          brief: item.caption,
          frames,
          chatModel: model,
          platforms: accounts.map((a) => platformName(a.kind)).join(", "),
        });
        patch(item.id, result);
      }
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setAiBusy(false);
      setProgress("");
    }
  };
  const addMedia = async () => {
    setBusy(true);
    setError("");
    try {
      const media: Media[] = await bridge().socialMedia();
      if (!media.length) return;
      for (const m of media)
        if (m.mediaType === "video") m.duration = await mediaDuration(m);
      const newRows = media.map((m) => ({
        id: crypto.randomUUID(),
        media: m,
        caption: rows.length === 1 && !row.media ? row.caption : "",
      }));
      if (rows.length === 1 && !row.media) {
        setRows(newRows);
        setActive(0);
      } else {
        setRows((list) => [...list, ...newRows]);
        setActive(rows.length);
      }
      if (autoAI && workspace.ai.model) await generate(newRows);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };
  const timeFor = (index: number) => {
    const d = new Date(at);
    if (cadence === "daily") d.setDate(d.getDate() + index);
    else d.setMinutes(d.getMinutes() + index * Number(cadence));
    return d;
  };
  const submit = async () => {
    if (busy || aiBusy) return;
    setBusy(true);
    setError("");
    try {
      if (!accounts.length) throw Error("Choose at least one channel.");
      if (rows.length * accounts.length > 100)
        throw Error(
          "Queue up to 100 posts at once. Split this batch into smaller groups.",
        );
      const inputs = rows.flatMap((r, i) =>
        accounts.map((a) => ({
          accountId: a.id,
          title: r.title || "",
          caption: r.caption,
          sourceId: r.media?.sourceId,
          imageUrl: r.media?.url || "",
          mediaType: r.media?.mediaType || "text",
          mediaName: r.media?.name,
          scheduledAt:
            when === "now"
              ? new Date().toISOString()
              : timeFor(i).toISOString(),
          privacy: privacy[a.id],
          madeForKids: kids ? kids === "yes" : undefined,
          disableComment,
          disableDuet,
          disableStitch,
          brandContent,
          brandOrganic,
          duration: r.media?.duration,
        })),
      );
      await bridge().scheduleBulk(inputs);
      done();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="social-composer">
      <div className="social-composer-head">
        <span className="mini-label">CREATE & SHARE</span>
        <h2>
          {rows.length > 1
            ? "A whole queue. One flow."
            : "What are we sharing?"}
        </h2>
        <p>
          Add your media, let AI write the caption, and choose where it goes.
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="social-composer-grid">
          <div className="social-compose-main">
            <div className="social-section-label">
              <b>
                1 <span>Your content</span>
              </b>
              <span>
                {rows.length} {rows.length === 1 ? "post" : "posts"}
              </span>
            </div>
            <button
              className="social-dropzone"
              type="button"
              disabled={busy || aiBusy}
              onClick={() => void addMedia()}
            >
              <span>
                <Icon name="plus" size={23} />
              </span>
              <b>Add images or videos</b>
              <small>Select several files to build a bulk queue</small>
            </button>
            <div className="social-add-options">
              <button
                type="button"
                className="text-button"
                disabled={busy || aiBusy}
                onClick={() => setUrlOpen((v) => !v)}
              >
                Add a media link
              </button>
              <button
                type="button"
                className="text-button"
                disabled={busy || aiBusy}
                onClick={() => {
                  if (rows.length === 1 && !row.media) return;
                  setRows((list) => [
                    ...list,
                    { id: crypto.randomUUID(), caption: "", media: null },
                  ]);
                  setActive(rows.length);
                }}
              >
                Add a text post
              </button>
              <label>
                <input
                  type="checkbox"
                  checked={autoAI}
                  onChange={(e) => setAutoAI(e.target.checked)}
                />
                Auto-write captions
              </label>
            </div>
            {urlOpen && (
              <div className="social-url-row">
                <input
                  type="url"
                  aria-label="Public media URL"
                  placeholder="https://…"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <select
                  aria-label="Linked media format"
                  value={urlType}
                  onChange={(e) => setUrlType(e.target.value)}
                >
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
                <button
                  type="button"
                  className="secondary"
                  disabled={!url || busy || aiBusy}
                  onClick={() => {
                    try {
                      const target = new URL(url);
                      if (target.protocol !== "https:")
                        throw Error("Use a public HTTPS URL.");
                      const media = {
                        url: target.href,
                        preview: target.href,
                        mediaType: urlType,
                        name: "Linked media",
                      };
                      patch(row.id, { media });
                      setUrlOpen(false);
                      setUrl("");
                    } catch (e) {
                      setError(friendlyError(e));
                    }
                  }}
                >
                  Add
                </button>
              </div>
            )}
            {rows.length > 1 && (
              <div className="social-bulk-strip">
                {rows.map((r, i) => (
                  <button
                    type="button"
                    key={r.id}
                    aria-pressed={active === i}
                    className={active === i ? "selected" : ""}
                    onClick={() => setActive(i)}
                  >
                    <MediaPreview media={r.media} compact />
                    <span>
                      {i + 1}. {r.media?.name || "Text post"}
                    </span>
                    {r.caption && <Icon name="check" size={13} />}
                  </button>
                ))}
              </div>
            )}
            <div className="social-editor">
              <div className="social-editor-top">
                <b>{row.media?.name || "Text post"}</b>
                <span>
                  {row.media?.mediaType === "video"
                    ? "Reel on Instagram & Facebook"
                    : row.media?.mediaType === "image"
                      ? "Image post"
                      : "Facebook text post"}
                </span>
                {rows.length > 1 && (
                  <button
                    type="button"
                    className="text-button"
                    disabled={busy || aiBusy}
                    aria-label="Remove this post"
                    onClick={() => {
                      setRows((list) => list.filter((r) => r.id !== row.id));
                      setActive(Math.max(0, active - 1));
                    }}
                  >
                    <Icon name="close" size={14} />
                  </button>
                )}
              </div>
              <textarea
                aria-label="Post caption or idea"
                placeholder={
                  row.media
                    ? "AI can see your media and write this for you. Add an idea or edit the caption…"
                    : "Write something to share, or give AI a short idea…"
                }
                value={row.caption}
                maxLength={2200}
                disabled={busy || aiBusy}
                onChange={(e) =>
                  patch(row.id, { caption: e.target.value, title: undefined })
                }
              />
              <div className="social-caption-tools">
                <button
                  type="button"
                  className="secondary"
                  disabled={
                    busy || aiBusy || (!row.media && !row.caption.trim())
                  }
                  onClick={() => void generate([row])}
                >
                  <Icon name="sparkles" size={15} />
                  {aiBusy ? "Writing…" : "Write with AI"}
                </button>
                <small>{row.caption.length.toLocaleString()} / 2,200</small>
              </div>
            </div>
            <div className="social-ai-model">
              <Icon name="sparkles" size={16} />
              <label>
                Caption model
                <select
                  aria-label="Caption AI model"
                  disabled={busy || aiBusy}
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                >
                  <option value="">
                    Default · {workspace.ai.model || "Configure AI in Settings"}
                  </option>
                  {models
                    .filter((m) => !row.media || m.vision)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                        {m.vision ? " · Vision" : ""}
                      </option>
                    ))}
                </select>
              </label>
              {rows.length > 1 && (
                <button
                  type="button"
                  className="text-button"
                  disabled={busy || aiBusy}
                  onClick={() => void generate(rows)}
                >
                  AI for all {rows.length}
                </button>
              )}
            </div>
            <p className="field-help">
              Vision models see images and three sampled video frames. Captions
              stay editable. Post names are automatic.
            </p>
            {progress && (
              <p role="status" className="social-progress">
                {progress}
              </p>
            )}
          </div>
          <aside className="social-compose-side">
            <div className="social-section-label">
              <b>
                2 <span>Choose channels</span>
              </b>
              <button
                type="button"
                className="text-button"
                disabled={busy || aiBusy}
                onClick={() =>
                  setDestinations(
                    destinations.length === workspace.accounts.length
                      ? []
                      : workspace.accounts.map((a) => a.id),
                  )
                }
              >
                {destinations.length === workspace.accounts.length
                  ? "Clear"
                  : "Select all"}
              </button>
            </div>
            <div className="social-destination-list">
              {workspace.accounts.length ? (
                workspace.accounts.map((a) => (
                  <button
                    type="button"
                    key={a.id}
                    disabled={busy || aiBusy}
                    aria-pressed={destinations.includes(a.id)}
                    className={destinations.includes(a.id) ? "selected" : ""}
                    onClick={() =>
                      setDestinations((ids) =>
                        ids.includes(a.id)
                          ? ids.filter((id) => id !== a.id)
                          : [...ids, a.id],
                      )
                    }
                  >
                    <PlatformMark kind={a.kind} />
                    <span>
                      <b>{a.username}</b>
                      <small>{platformName(a.kind)}</small>
                    </span>
                    <span className="social-check">
                      {destinations.includes(a.id) ? "✓" : ""}
                    </span>
                  </button>
                ))
              ) : (
                <p className="social-muted">
                  Connect a channel from Connections first.
                </p>
              )}
            </div>
            {accounts.some((a) => a.kind !== "facebook") &&
              rows.some((r) => !r.media) && (
                <p className="social-warning">
                  Text-only posts need a Facebook Page. Add media for your other
                  channels.
                </p>
              )}
            {accounts
              .filter((a) => a.kind === "tiktok" || a.kind === "youtube")
              .map((a) => (
                <label key={a.id}>
                  {a.username} ·{" "}
                  {a.kind === "tiktok" ? "Audience" : "Visibility"}
                  <select
                    required
                    value={privacy[a.id] || ""}
                    disabled={busy || aiBusy}
                    onChange={(e) =>
                      setPrivacy((p) => ({ ...p, [a.id]: e.target.value }))
                    }
                  >
                    <option value="">Choose audience</option>
                    {(a.kind === "tiktok"
                      ? a.privacyOptions || []
                      : ["public", "unlisted", "private"]
                    ).map((p) => (
                      <option key={p} value={p}>
                        {p.replaceAll("_", " ").toLowerCase()}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            {accounts.some((a) => a.kind === "youtube") && (
              <label>
                Is this video made for kids?
                <select
                  required
                  value={kids}
                  onChange={(e) => setKids(e.target.value)}
                >
                  <option value="">Choose audience classification</option>
                  <option value="no">No, it is not made for kids</option>
                  <option value="yes">Yes, it is made for kids</option>
                </select>
              </label>
            )}
            {accounts.some((a) => a.kind === "tiktok") && (
              <details className="social-interactions">
                <summary>TikTok interactions</summary>
                {[
                  {
                    name: "comments",
                    value: disableComment,
                    change: setDisableComment,
                    forced: accounts.some(
                      (a) => a.kind === "tiktok" && a.commentDisabled,
                    ),
                  },
                  {
                    name: "duets",
                    value: disableDuet,
                    change: setDisableDuet,
                    forced: accounts.some(
                      (a) => a.kind === "tiktok" && a.duetDisabled,
                    ),
                  },
                  {
                    name: "stitches",
                    value: disableStitch,
                    change: setDisableStitch,
                    forced: accounts.some(
                      (a) => a.kind === "tiktok" && a.stitchDisabled,
                    ),
                  },
                ].map((v) => (
                  <label key={v.name}>
                    <input
                      type="checkbox"
                      checked={!v.value && !v.forced}
                      disabled={v.forced}
                      onChange={(e) => v.change(!e.target.checked)}
                    />
                    Allow {v.name}
                  </label>
                ))}
                <label>
                  <input
                    type="checkbox"
                    checked={brandOrganic}
                    onChange={(e) => setBrandOrganic(e.target.checked)}
                  />
                  Promotes my own business
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={brandContent}
                    onChange={(e) => setBrandContent(e.target.checked)}
                  />
                  Paid partnership
                </label>
              </details>
            )}
            <div className="social-section-label">
              <b>
                3 <span>Pick your moment</span>
              </b>
            </div>
            <div className="social-publish-choice">
              {(["now", "later"] as const).map((w) => (
                <button
                  type="button"
                  key={w}
                  className={when === w ? "selected" : ""}
                  aria-pressed={when === w}
                  disabled={busy || aiBusy}
                  onClick={() => setWhen(w)}
                >
                  <Icon name={w === "now" ? "arrow" : "calendar"} size={16} />
                  {w === "now" ? "Post now" : "Schedule"}
                </button>
              ))}
            </div>
            {when === "later" && (
              <>
                <DatePicker value={at} onChange={setAt} />
                {rows.length > 1 && (
                  <label>
                    Space bulk posts
                    <select
                      value={cadence}
                      onChange={(e) => setCadence(e.target.value)}
                    >
                      <option value="daily">One per day, same time</option>
                      <option value="30">Every 30 minutes</option>
                      <option value="60">Every hour</option>
                      <option value="120">Every 2 hours</option>
                    </select>
                  </label>
                )}
                <p className="social-schedule-summary">
                  {stamp(timeFor(0).toISOString())}
                  {rows.length > 1 && (
                    <> → {stamp(timeFor(rows.length - 1).toISOString())}</>
                  )}
                </p>
              </>
            )}
            {row.media && (
              <div className="social-compose-preview">
                <MediaPreview media={row.media} />
                <small>
                  Preview ·{" "}
                  {row.media.mediaType === "video" ? "video" : "image"}
                </small>
              </div>
            )}
          </aside>
        </div>
        <div className="social-composer-footer">
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          <div>
            <p>
              {workspace.paused ? (
                <strong>
                  Publishing is paused. Resume it on the Publishing page to send
                  these posts.
                </strong>
              ) : when === "now" ? (
                "Your selected channels will receive these posts immediately."
              ) : (
                "Keep Orvio running, awake and online at the scheduled time."
              )}
              <small>
                {rows.length} {rows.length === 1 ? "post" : "posts"} ×{" "}
                {accounts.length}{" "}
                {accounts.length === 1 ? "channel" : "channels"} ·{" "}
                {rows.length * accounts.length} queue items
              </small>
            </p>
            <button
              type="submit"
              className="primary"
              disabled={busy || aiBusy || !accounts.length}
            >
              {busy
                ? "Preparing your queue…"
                : when === "now"
                  ? `Post ${rows.length > 1 ? "all " : ""}now`
                  : `Schedule ${rows.length > 1 ? rows.length + " posts" : "post"}`}
              <Icon name={when === "now" ? "arrow" : "calendar"} size={17} />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export function PostDetails({
  job,
  workspace,
  notify,
  onClose,
}: {
  job: Job;
  workspace: Workspace;
  notify: (s: string) => void;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false),
    [caption, setCaption] = useState(job.caption),
    [at, setAt] = useState(localInput(job.scheduledAt)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const account = workspace.accounts.find((a) => a.id === job.accountId),
    kind = account?.kind || job.platform;
  useEffect(() => {
    if (job.status === "published" && !job.postUrl && job.mediaId)
      void bridge()
        .refreshPost(job.id)
        .catch(() => {});
  }, [job.id]);
  return (
    <section className="panel social-post-detail">
      <div className="social-heading">
        <div>
          <span className="mini-label">POST DETAILS</span>
          <h2>{job.title}</h2>
          <p>
            {platformName(kind)} ·{" "}
            {account?.username || job.accountName || "Disconnected account"}
          </p>
        </div>
        <button className="secondary" onClick={onClose}>
          <Icon name="close" size={15} />
          Close details
        </button>
      </div>
      <div className="social-post-detail-grid">
        <MediaPreview
          media={
            job.mediaType === "text"
              ? null
              : {
                  preview: job.preview || job.imageUrl,
                  mediaType: job.mediaType || "image",
                  name: job.title,
                }
          }
        />
        <div>
          <span className={`social-status ${job.status}`}>
            {statusLabel(job.status)}
          </span>
          <p className="social-detail-caption">{job.caption || "No caption"}</p>
          <PostLink job={job} />
          {job.error && (
            <p className="error-message" role="alert">
              {job.error}
            </p>
          )}
          <div className="social-detail-facts">
            <span>
              <small>Created</small>
              <b>{stamp(job.createdAt)}</b>
            </span>
            <span>
              <small>Scheduled for</small>
              <b>{stamp(job.scheduledAt)}</b>
            </span>
            <span>
              <small>Published</small>
              <b>{stamp(job.publishedAt)}</b>
            </span>
            <span>
              <small>Last updated</small>
              <b>{stamp(job.updatedAt || job.publishedAt || job.createdAt)}</b>
            </span>
            <span>
              <small>Format</small>
              <b>
                {job.mediaType === "video" &&
                ["instagram", "facebook"].includes(kind || "")
                  ? "Reel"
                  : job.mediaType || "Image"}
              </b>
            </span>
            <span>
              <small>Visibility</small>
              <b>
                {job.privacy?.replaceAll("_", " ").toLowerCase() ||
                  "Platform default"}
              </b>
            </span>
            {job.mediaId && (
              <span>
                <small>Platform post ID</small>
                <b>{job.mediaId}</b>
              </span>
            )}
          </div>
          {job.status === "uncertain" && (
            <p className="social-warning">
              Open your account and check whether this post is live before
              creating another copy.
            </p>
          )}
          {job.status === "queued" && (
            <div className="social-detail-actions">
              <button
                className="secondary"
                disabled={busy}
                onClick={() => setEditing(!editing)}
              >
                Edit schedule & caption
              </button>
              <button
                className="secondary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await bridge().cancelJob(job.id);
                    notify("Post cancelled.");
                  } catch (e) {
                    setError(friendlyError(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Cancel post
              </button>
            </div>
          )}
          {editing && job.status === "queued" && (
            <form
              className="social-edit-form"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                try {
                  await bridge().editJob(job.id, {
                    caption,
                    scheduledAt: new Date(at).toISOString(),
                  });
                  setEditing(false);
                  notify("Post updated.");
                } catch (e) {
                  setError(friendlyError(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Caption
                <textarea
                  value={caption}
                  maxLength={2200}
                  onChange={(e) => setCaption(e.target.value)}
                />
              </label>
              <DatePicker value={at} onChange={setAt} compact />
              <button className="primary" disabled={busy}>
                {busy ? "Saving…" : "Save changes"}
              </button>
            </form>
          )}
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export function SocialCalendar({
  workspace,
  onCreate,
  onSelect,
}: {
  workspace: Workspace;
  onCreate?: (date?: string) => void;
  onSelect?: (id: string) => void;
}) {
  const [month, setMonth] = useState(
      () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    ),
    [selected, setSelected] = useState(dateKey(new Date()));
  const count = new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      0,
    ).getDate(),
    pad = (month.getDay() + 6) % 7;
  const jobs = workspace.jobs.filter(
    (j) => dateKey(new Date(j.scheduledAt)) === selected,
  );
  return (
    <section className="panel social-calendar">
      <div className="social-heading">
        <div>
          <span className="mini-label">PUBLISHING CALENDAR</span>
          <h2>
            {month.toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </h2>
        </div>
        <div className="social-detail-actions">
          <button
            className="secondary"
            aria-label="Previous calendar month"
            onClick={() =>
              setMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
            }
          >
            ‹
          </button>
          <button
            className="secondary"
            onClick={() => {
              setMonth(
                new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              );
              setSelected(dateKey(new Date()));
            }}
          >
            Today
          </button>
          <button
            className="secondary"
            aria-label="Next calendar month"
            onClick={() =>
              setMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
            }
          >
            ›
          </button>
        </div>
      </div>
      <div className="social-calendar-grid">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <span className="social-calendar-weekday" key={d}>
            {d}
          </span>
        ))}
        {Array.from({ length: pad }, (_, i) => (
          <span className="social-calendar-blank" key={`pad${i}`} />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const d = new Date(month.getFullYear(), month.getMonth(), i + 1),
            key = dateKey(d),
            dayJobs = workspace.jobs.filter(
              (j) =>
                dateKey(new Date(j.scheduledAt)) === key &&
                j.status !== "cancelled",
            );
          return (
            <button
              className={`social-calendar-day ${key === selected ? "selected" : ""} ${key === dateKey(new Date()) ? "today" : ""}`}
              key={key}
              aria-pressed={key === selected}
              aria-label={`${d.toLocaleDateString(undefined, { dateStyle: "full" })}, ${dayJobs.length} posts`}
              onClick={() => setSelected(key)}
            >
              <b>{i + 1}</b>
              {dayJobs.slice(0, 2).map((j) => (
                <span
                  className={`social-calendar-event ${j.status}`}
                  key={j.id}
                >
                  {j.title}
                </span>
              ))}
              {dayJobs.length > 2 && <small>+{dayJobs.length - 2} more</small>}
            </button>
          );
        })}
      </div>
      <div className="social-calendar-agenda">
        <div className="social-heading">
          <h3>
            {new Date(selected + "T12:00").toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </h3>
          {onCreate && selected >= dateKey(new Date()) && (
            <button
              className="text-button"
              onClick={() =>
                onCreate(
                  `${selected}T${selected === dateKey(new Date()) ? nextSlot().slice(11, 16) : "09:00"}`,
                )
              }
            >
              <Icon name="plus" size={15} />
              Schedule here
            </button>
          )}
        </div>
        {jobs.length ? (
          jobs
            .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
            .map((j) => (
              <button
                className="social-agenda-item"
                key={j.id}
                onClick={() => onSelect?.(j.id)}
                disabled={!onSelect}
              >
                <PlatformMark
                  kind={
                    workspace.accounts.find((a) => a.id === j.accountId)
                      ?.kind || j.platform
                  }
                />
                <span>
                  <b>{j.title}</b>
                  <small>
                    {new Date(j.scheduledAt).toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </small>
                </span>
                <span className={`social-status ${j.status}`}>
                  {statusLabel(j.status)}
                </span>
              </button>
            ))
        ) : (
          <p className="social-muted">
            A little room for your next idea. No posts on this day.
          </p>
        )}
      </div>
    </section>
  );
}

export function Publishing({
  workspace,
  notify,
  onCreate,
}: {
  workspace: Workspace;
  notify: (s: string) => void;
  onCreate?: (date?: string) => void;
}) {
  const [tab, setTab] = useState("queue"),
    [search, setSearch] = useState(""),
    [platform, setPlatform] = useState("all"),
    [status, setStatus] = useState("all"),
    [selected, setSelected] = useState(""),
    [busy, setBusy] = useState(false);
  const queued = workspace.jobs.filter((j) =>
      activeStatuses.includes(j.status),
    ),
    published = workspace.jobs.filter((j) => j.status === "published"),
    attention = workspace.jobs.filter((j) =>
      ["failed", "uncertain"].includes(j.status),
    );
  const job = workspace.jobs.find((j) => j.id === selected);
  const visible = workspace.jobs
    .filter(
      (j) =>
        (tab === "queue"
          ? activeStatuses.includes(j.status)
          : tab === "history"
            ? ["published", "cancelled"].includes(j.status)
            : tab === "attention"
              ? ["failed", "uncertain"].includes(j.status)
              : true) &&
        (status === "all" || j.status === status) &&
        (platform === "all" ||
          (workspace.accounts.find((a) => a.id === j.accountId)?.kind ||
            j.platform) === platform) &&
        (
          j.title +
          " " +
          j.caption +
          " " +
          (workspace.accounts.find((a) => a.id === j.accountId)?.username ||
            j.accountName ||
            "")
        )
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      tab === "queue"
        ? Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt)
        : Date.parse(b.publishedAt || b.createdAt || b.scheduledAt) -
          Date.parse(a.publishedAt || a.createdAt || a.scheduledAt),
    );
  return (
    <div className="social-publishing">
      <section className="social-heading">
        <div>
          <span className="mini-label">PUBLISHING STUDIO</span>
          <h2>Your content, in motion.</h2>
          <p>Create once. Share everywhere. Know exactly what happened.</p>
        </div>
        {onCreate && (
          <button className="primary" onClick={() => onCreate()}>
            <Icon name="plus" size={16} />
            Create post / bulk queue
          </button>
        )}
      </section>
      <div className="social-publishing-stats">
        {[
          {
            name: "In queue",
            count: queued.length,
            tab: "queue",
            icon: "calendar",
          },
          {
            name: "Published",
            count: published.length,
            tab: "history",
            icon: "check",
          },
          {
            name: "Need attention",
            count: attention.length,
            tab: "attention",
            icon: "bell",
          },
        ].map((s) => (
          <button
            className="panel"
            key={s.name}
            onClick={() => {
              setTab(s.tab);
              setStatus("all");
              setSelected("");
            }}
          >
            <span className="social-stat-icon">
              <Icon name={s.icon as "calendar" | "check" | "bell"} size={21} />
            </span>
            <span>
              <b>{s.count}</b>
              <small>{s.name}</small>
            </span>
            <Icon name="arrow" size={15} />
          </button>
        ))}
      </div>
      <section
        className={`social-automation-bar ${workspace.paused ? "paused" : ""}`}
      >
        <span className="social-live-dot" />
        <div>
          <b>{workspace.paused ? "Queue paused" : "Publishing is running"}</b>
          <span>
            Scheduled posts run while Orvio is awake and online. Closing the
            window keeps it in the tray.
          </span>
        </div>
        <button
          className="secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await bridge().savePreferences({ paused: !workspace.paused });
            } catch (e) {
              notify(friendlyError(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {workspace.paused ? "Resume queue" : "Pause queue"}
        </button>
      </section>
      <div
        className="social-publishing-tabs"
        role="tablist"
        aria-label="Publishing view"
      >
        {[
          { id: "queue", label: "Queue", count: queued.length },
          { id: "calendar", label: "Calendar" },
          { id: "history", label: "History", count: published.length },
          {
            id: "attention",
            label: "Needs attention",
            count: attention.length,
          },
          { id: "all", label: "All posts" },
        ].map((t) => (
          <button
            role="tab"
            aria-selected={tab === t.id}
            key={t.id}
            className={tab === t.id ? "selected" : ""}
            onClick={() => {
              setTab(t.id);
              setStatus("all");
              setSelected("");
            }}
          >
            {t.label}
            {t.count !== undefined && <span>{t.count}</span>}
          </button>
        ))}
      </div>
      {job && (
        <PostDetails
          key={job.id}
          job={job}
          workspace={workspace}
          notify={notify}
          onClose={() => setSelected("")}
        />
      )}
      {tab === "calendar" ? (
        <SocialCalendar
          workspace={workspace}
          onCreate={onCreate}
          onSelect={setSelected}
        />
      ) : (
        <>
          <div className="social-toolbar">
            <label className="social-search">
              <Icon name="search" size={17} />
              <input
                placeholder="Search posts, captions or accounts…"
                aria-label="Search publishing history"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <select
              aria-label="Filter by platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            >
              <option value="all">All platforms</option>
              {platforms.map((p) => (
                <option key={p.kind} value={p.kind}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">All statuses</option>
              {[
                "queued",
                "creating",
                "processing",
                "publishing",
                "published",
                "failed",
                "uncertain",
                "cancelled",
              ].map((s) => (
                <option value={s} key={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
          </div>
          {!visible.length ? (
            <section className="panel social-empty">
              <Icon name={tab === "history" ? "check" : "calendar"} size={32} />
              <h3>
                {search || platform !== "all" || status !== "all"
                  ? "No matching posts"
                  : tab === "history"
                    ? "Your story is just getting started"
                    : tab === "attention"
                      ? "Everything looks clear"
                      : "Make room for your next idea."}
              </h3>
              <p>
                {tab === "history"
                  ? "Published posts, their details and live links will appear here."
                  : "Add one post or a whole batch. Pick a date and Orvio handles the queue."}
              </p>
              {onCreate && (
                <button className="secondary" onClick={() => onCreate()}>
                  Create a post
                </button>
              )}
            </section>
          ) : (
            <div className="social-post-list">
              {visible.map((j) => {
                const a = workspace.accounts.find((a) => a.id === j.accountId);
                return (
                  <article
                    className={`panel social-post-row ${selected === j.id ? "selected" : ""}`}
                    key={j.id}
                  >
                    <button
                      className="social-post-open"
                      aria-label={`View details for ${j.title}`}
                      onClick={() => setSelected(selected === j.id ? "" : j.id)}
                    >
                      <MediaPreview
                        media={
                          j.mediaType === "text"
                            ? null
                            : {
                                preview: j.preview || j.imageUrl,
                                mediaType: j.mediaType || "image",
                                name: j.title,
                              }
                        }
                        compact
                      />
                      <div>
                        <div className="social-post-byline">
                          <PlatformMark kind={a?.kind || j.platform} />
                          <span>
                            {a?.username ||
                              j.accountName ||
                              "Disconnected account"}
                          </span>
                          <span>
                            {j.mediaType === "video" &&
                            ["facebook", "instagram"].includes(
                              a?.kind || j.platform || "",
                            )
                              ? "Reel"
                              : j.mediaType || "Image"}
                          </span>
                        </div>
                        <h3>{j.title}</h3>
                        <p>{j.caption || "No caption"}</p>
                        <small>
                          {j.status === "published" ? "Published" : "Scheduled"}{" "}
                          · {stamp(j.publishedAt || j.scheduledAt)}
                        </small>
                      </div>
                      <span className={`social-status ${j.status}`}>
                        {statusLabel(j.status)}
                      </span>
                      <Icon name="arrow" size={17} />
                    </button>
                    {j.postUrl && (
                      <div className="social-post-link">
                        <PostLink job={j} />
                      </div>
                    )}
                    {j.error && <p className="social-row-error">{j.error}</p>}
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

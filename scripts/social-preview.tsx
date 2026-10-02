// Development-only fixture: no network publishing, tokens or real accounts.
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/unbounded";
import "../src/theme.css";
import {
  Publishing,
  SocialComposer,
  SocialAccounts,
  SocialConnection,
} from "../src/SocialStudio";
const image =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480"><rect width="480" height="480" fill="#e6eee4"/><circle cx="240" cy="200" r="100" fill="#a0b59b"/><text x="240" y="370" font-size="30" font-family="sans-serif" text-anchor="middle" fill="#374c32">A fresh perspective</text></svg>',
  );
const accounts = [
  {
    id: "11",
    kind: "instagram",
    username: "orvio.studio",
    pageName: "Orvio Studio",
    pictureUrl: image,
    followers: 2450,
    connectedAt: new Date().toISOString(),
  },
  {
    id: "fb:1",
    kind: "facebook",
    username: "Orvio Studio",
    pageName: "Orvio Studio",
    pictureUrl: "/orvio-logo.png",
    connectedAt: new Date().toISOString(),
  },
  {
    id: "tt:1",
    kind: "tiktok",
    username: "orvio",
    pageName: "Orvio",
    privacyOptions: ["SELF_ONLY", "PUBLIC_TO_EVERYONE"],
    connectedAt: new Date().toISOString(),
  },
  {
    id: "yt:1",
    kind: "youtube",
    username: "Orvio Studio",
    pageName: "@orviostudio",
    connectedAt: new Date().toISOString(),
  },
];
const workspace: any = {
  accounts,
  jobs: [
    {
      id: "1",
      accountId: "11",
      title: "A fresh perspective",
      caption:
        "Small ideas make a big difference. What are you creating today?",
      mediaType: "image",
      preview: image,
      imageUrl: image,
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      status: "queued",
      createdAt: new Date().toISOString(),
    },
    {
      id: "2",
      accountId: "fb:1",
      title: "A little more room to create",
      caption: "New things are coming to the studio.",
      mediaType: "text",
      scheduledAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
      status: "published",
      postUrl: "https://www.facebook.com/1/posts/2",
    },
    {
      id: "3",
      accountId: "tt:1",
      title: "A moment from the studio",
      caption: "Behind the scenes.",
      mediaType: "video",
      scheduledAt: new Date().toISOString(),
      status: "failed",
      error: "Your token expired. Reconnect this channel before publishing.",
    },
  ],
  paused: false,
  ai: { model: "gemini-2.5-flash", provider: "gemini", hasKey: true },
  media: { cloudName: "preview", uploadPreset: "preview" },
  drive: { connected: false },
};
(window as any).studio = {
  socialModels: async () => [
    { id: "provider:gemini-2.5-flash", name: "Gemini 2.5 Flash", vision: true },
    { id: "provider:gemini-2.5-pro", name: "Gemini 2.5 Pro", vision: true },
  ],
  socialMedia: async () => [
    {
      sourceId: "preview1",
      preview: image,
      name: "fresh-perspective.jpg",
      mediaType: "image",
    },
    {
      sourceId: "preview2",
      preview: image,
      name: "new-beginnings.jpg",
      mediaType: "image",
    },
    {
      sourceId: "preview3",
      preview: image,
      name: "in-the-studio.jpg",
      mediaType: "image",
    },
  ],
  generatePostCaption: async () => ({
    title: "A fresh perspective",
    caption: "Make room for your next idea.",
  }),
  scheduleBulk: async () => {},
  cancelJob: async () => {},
  editJob: async () => {},
  savePreferences: async () => {},
  openPost: async () => {},
  refreshPost: async () => {},
};
function Preview() {
  const [page, setPage] = useState("publishing"),
    [modal, setModal] = useState(""),
    [initial, setInitial] = useState<any>(),
    [message, setMessage] = useState("");
  return (
    <div style={{ padding: "32px", maxWidth: "1200px", margin: "auto" }}>
      <nav style={{ display: "flex", gap: "12px", marginBottom: "28px" }}>
        <button className="secondary" onClick={() => setPage("publishing")}>
          Publishing
        </button>
        <button className="secondary" onClick={() => setPage("accounts")}>
          Connections
        </button>
        <button className="secondary" onClick={() => setModal("connect")}>
          Connect channel
        </button>
      </nav>
      {page === "publishing" ? (
        <Publishing
          workspace={workspace}
          notify={setMessage}
          onCreate={(date) => {
            setInitial(
              date
                ? {
                    scheduledAt: new Date(date).toISOString(),
                    publishMode: "later",
                  }
                : undefined,
            );
            setModal("compose");
          }}
        />
      ) : (
        <SocialAccounts
          workspace={workspace}
          onConnect={() => setModal("connect")}
          notify={setMessage}
        />
      )}
      <p role="status">{message}</p>
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal("")}>
          <section
            className={`modal ${modal === "compose" ? "social-composer-modal" : ""}`}
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close icon-button"
              aria-label="Close dialog"
              onClick={() => setModal("")}
            >
              ×
            </button>
            {modal === "compose" ? (
              <SocialComposer
                workspace={workspace}
                initial={initial}
                done={() => {
                  setMessage("Preview batch queued successfully.");
                  setModal("");
                }}
              />
            ) : (
              <SocialConnection done={() => setModal("")} />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);

# Interface feedback

**Settings → Appearance** controls activity sounds, volume, and Studio/system cursor styles. Six original short WAV cues distinguish listening, microphone stop, successful creation, download completion, failure and updates. Start cues finish before recording starts; stop cues play after capture stops. Routine activity cues are suppressed during microphone/video recording and rate-limited when multiple tasks finish together. If playback is blocked, visual status remains available.

Tooltips share one delayed overlay across the main application. They use existing titles or labelled icon buttons, support keyboard focus and Escape, clamp inside the viewport and work within modal dialogs. They do not poll pointer position or render on every mouse movement. The Studio cursor is a static CSS pointer; text selection and resize handles retain their usual behavior. System cursor mode is available for accessibility.

The top-bar update indicator shows download percentage, download-ready status, manual Mac updates or failures. Clicking opens details and the appropriate retry, download or restart/install action. Existing active-work checks still prevent an unsafe restart. Unsigned macOS builds continue to require downloading the installer manually.

HeyGen **Hyperframes 0.8.82** is installed as development tooling. `npm exec hyperframes -- --help` lists its audio/video composition commands. No preview, render server, account login or paid service was started. App interface cues are lightweight original PCM files, not a Hyperframes runtime dependency; regenerate them with `python3 scripts/create-ui-sounds.py`.

Reference: [Hyperframes documentation](https://github.com/heygen-com/hyperframes/tree/main/docs) and [audio workflow](https://github.com/heygen-com/hyperframes/tree/main/skills/hyperframes-audio).

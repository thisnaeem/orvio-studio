Orvio Studio 0.6.0 adds a built-in model workspace and a unified download center.

- Chat, Image, Video and Voice model library with hardware detection, memory recommendations and real local benchmarks. See processor, RAM and graphics details without entering them manually.
- Built-in llama.cpp chat with curated Qwen models, GGUF import and online Hugging Face discovery. SD Turbo / SD 1.5 image generation and AnimateDiff Lightning short-video generation use managed Diffusers pipelines. No separate Ollama or ComfyUI installation is required for these models.
- 15 compact Piper voices across 14 languages, plus Chatterbox multilingual speech and reference voice cloning in 23 languages. Python is bundled; model weights and engine packages download separately.
- A top-bar download drawer with persistent history, per-file percentages, transferred bytes, speed, estimated time, errors and cancellation. Download buttons turn into progress controls. Up to three models download concurrently; additional choices queue. Shared engine setup is coordinated to prevent package corruption.
- Tailwind 4 now handles the app styling. Removed the previous stylesheets and obsolete ComfyUI adapter. New model and transfer screens support the existing light/dark themes and accent preferences.
- The video downloader now handles separate video/audio streams and uses Electron's embedded JavaScript runtime for supported sites. The reported YouTube link was successfully downloaded as MP4 with audio.
- Includes YouTube Live from a local video using an RTMPS stream key, Caption Studio with editable timed subtitles and burned-in styles, and screen/window/camera recording with microphone mixing, pause/resume and local saving.
- The assistant can use installed image/video/voice models, download supported videos, export clips, schedule complete posts and edit queued posts through its tool harness.

Compatibility: model architectures and website access vary. Online search adds compatible single-file GGUF chat weights, not arbitrary image/video pipelines. Video generation is a short animation workflow and can be slow. On Windows, the included chat engine is CPU-based; detecting a GPU does not guarantee the selected runtime can accelerate it. Model licenses are linked in the library.

Verification: production build and automated tests pass. Native Apple Silicon checks include local GGUF inference, concurrent download of three Piper voices with numeric progress, speech generation, voice cloning, Whisper transcription, MP4 download/conversion, clipping and caption rendering. Full AnimateDiff generation, screen/camera capture, an actual YouTube broadcast, live social publication, and Windows/Intel Mac execution were not exercised on-device. The app and development preview were not launched during verification.

Installers: Windows x64 NSIS, macOS Apple Silicon and Intel DMG/ZIP. All include Python. Builds are unsigned; Windows may show SmartScreen and macOS may require opening through system security settings. Windows supports automatic updates. Unsigned Mac builds discover updates in-app but require manual installation.

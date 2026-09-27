# Local runtime and model notices

Orvio distributes CPython 3.11 from python-build-standalone. The runtime's included license files are preserved in the application resources.
https://github.com/astral-sh/python-build-standalone
https://docs.python.org/3/license.html

The following components are downloaded on request into the user's private local environment. Their upstream licenses and model cards govern use and redistribution:

- Piper: GPL-3.0, source https://github.com/OHF-Voice/piper1-gpl ; individual voice licenses vary: https://huggingface.co/rhasspy/piper-voices . Piper is run in a separate Python process.
- Chatterbox: MIT, https://github.com/resemble-ai/chatterbox . Generated audio retains the built-in Perth watermark. Model weights: https://huggingface.co/ResembleAI/chatterbox . The multilingual model supports 23 languages; Intel macOS is not supported by the pinned Torch dependency.
- faster-whisper: MIT, https://github.com/SYSTRAN/faster-whisper ; Whisper model: https://github.com/openai/whisper . Tiny is selected for lower memory use.
- yt-dlp: Unlicense (some bundled components have other licenses), https://github.com/yt-dlp/yt-dlp . Site support changes; login-protected and DRM content are not guaranteed.
- imageio-ffmpeg: BSD-2-Clause wrapper, https://github.com/imageio/imageio-ffmpeg . Its FFmpeg binary has separate licensing/build configuration; source https://ffmpeg.org . FFmpeg is executed as a separate process.

Package metadata, license files, and dependencies remain in each installed environment. No model weights are bundled with the installer. A model download includes its engine dependencies and may be substantially larger than the weight size shown.

## Built-in chat, image and video engines (0.6)

- llama.cpp b11146: MIT, checksum-verified native binaries from https://github.com/ggml-org/llama.cpp/releases/tag/b11146 . The runtime binds only to a randomly selected loopback port, requires a per-session API key, disables its web UI and unloads after idle time.
- Qwen 2.5 Instruct GGUF: Apache 2.0; official model cards: https://huggingface.co/Qwen . Download size varies by quantization.
- Hugging Face Diffusers: Apache 2.0, https://github.com/huggingface/diffusers . Only supported pipelines are exposed; remote repository Python code is not enabled.
- Stable Diffusion Turbo: model-specific Stability AI license, https://huggingface.co/stabilityai/sd-turbo .
- Stable Diffusion 1.5: CreativeML Open RAIL-M, https://huggingface.co/stable-diffusion-v1-5/stable-diffusion-v1-5 .
- AnimateDiff Lightning: CreativeML Open RAIL-M, including the SD 1.5 base model, https://huggingface.co/ByteDance/AnimateDiff-Lightning .

- DreamShaper 8: CreativeML Open RAIL-M, https://huggingface.co/Lykon/dreamshaper-8 .
- SDXL Turbo: Stability AI non-commercial community license; review separate commercial terms on https://huggingface.co/stabilityai/sdxl-turbo .

## Expanded model catalog and dictation

The built-in catalog links each upstream model card and lists its terms. Qwen 3, Qwen Coder and SmolLM2 GGUF weights use Apache 2.0. OpenJourney, AbsoluteReality and SD 1.5 DreamShaper variants use CreativeML Open RAIL-M; SDXL Base and DreamShaper XL use Open RAIL++. Zeroscope uses CC BY-NC 4.0. ModelScope's model card has noncommercial research terms (its metadata and prose differ between NC and NC-ND); consult that card. AnimateDiff motion presets retain both adapter and base-model terms. Weights are downloaded separately.

Meta MMS: https://huggingface.co/facebook/mms-1b-all — CC BY-NC 4.0 model weights. The checked-in language-adapter list is derived from that repository's public file metadata (1,198 script/dialect adapter names; the upstream card describes 1,162 languages). Transformers and PyTorch execute the local CTC model; PyAV decodes audio. Only the selected adapter and shared base weights are requested.

Whisper / faster-whisper: MIT. The language-code list is derived from the installed faster-whisper tokenizer; Tiny/Base/Small support 99, Turbo supports 100. https://github.com/SYSTRAN/faster-whisper and https://github.com/openai/whisper. Recognition, voice, writing and generation model quality is not guaranteed across all languages or hardware.

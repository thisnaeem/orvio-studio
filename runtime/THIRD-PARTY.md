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

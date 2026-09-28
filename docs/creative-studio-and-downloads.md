# Creative Studio and Download Manager

Restart the development desktop process with `npm run desktop` to load the new Electron handlers. A browser refresh alone does not replace the main process or preload. These changes are in source; no installer was published.

## Creative Studio

Image and video generation now share one tool with an Image / Video switch, Create / Workflow apps / Gallery views, and model downloads inside the form. Legacy Images and Videos routes open the combined studio.

Model profiles drive both the controls and backend validation: aspect ratio/resolution, steps, guidance, negative prompts where effective, seed (including zero), samplers, and video frames/playback rate. Styles add prompt text. Batches of up to four variations run sequentially. Generated assets retain model IDs and generation parameters for reuse.

Models have local SVG identity artwork. Saved outputs from a particular model replace its identity preview. The generated desert-pool inspiration image is explicitly labeled; it is not presented as a sample produced by every installed model.

Workflow apps are reusable Orvio pipeline presets, with built-in templates, named saved setups, and JSON import/export. They are not a ComfyUI node editor and do not execute imported ComfyUI graphs.

Profile references: [SDXL Turbo model card](https://huggingface.co/stabilityai/sdxl-turbo), [AnimateDiff Lightning model card](https://huggingface.co/ByteDance/AnimateDiff-Lightning), [Diffusers text-to-video pipeline](https://huggingface.co/docs/diffusers/v0.35.1/api/pipelines/text_to_video).

## Download Manager

- Batch up to 30 links; HTTP/HTTPS direct files, website video, MP3 audio, and image links discovered in page HTML.
- Website video quality selection from 360p through 2160p when the source offers it. The existing 2 GB source-stream limit remains.
- Per-transfer speed limits, measured progress/speed/ETA, search, status filters, pause/resume/retry/cancel, pause all, resume paused, persistent history, Show in folder and Save as.
- Direct files stream to disk and automatically retry connection failures twice. Range resumes use ETag/Last-Modified validators; changed files or servers ignoring Range restart safely. Paused and interrupted transfers can be resumed after restarting the app.
- Up to three shared transfer slots. Website video/audio processing is serialized to reduce CPU pressure. Downloads continue when navigating between pages.
- Optional session-cookie import for supported signed-in website downloads, held in memory and cleared on exit. No automatic browser-cookie extraction.

Downloads are stored in the app's local library; Save as chooses a copy destination. This is not full IDM parity: there is no browser interception extension, segmented acceleration, scheduled queue, or arbitrary playlist crawler. Static image discovery does not execute website scripts. Extractor support and site access restrictions determine which websites work; protected media and every website are not guaranteed. Extractor options follow [yt-dlp documentation](https://github.com/yt-dlp/yt-dlp).

## Verification

- TypeScript and Vite production build.
- Node regression suite, including real local HTTP transfers, byte-preserving pause/resume, server Range fallback, failure retries, and model parameter validation.
- Python tests covering pipeline parameter forwarding and video/audio extractor and converter options.
- `npm run verify:creative:dev` against the running Vite server: actual Electron navigation, model controls, workflow loading, seed-zero generation requests, real file downloading, HTML image discovery and image download. Uses a temporary app profile; diffusion output is a fixture, not live model inference.

Live model inference and arbitrary third-party website downloads were not verified during these changes. No model weights were downloaded for testing.

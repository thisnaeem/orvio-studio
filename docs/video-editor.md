# Orvio Video Editor

Open **All tools → Video Editor → Import video** or select a video in its searchable library. Captures open the same dedicated editor. It follows the workspace font, theme and accent.

- Split, trim and reorder sections; retain the original footage.
- Effects: Original, Black & white, Warm, Cool and Vivid. Transitions: hard cut or fade through black/white at section boundaries, adjustable from 0.1 to 1 second.
- Captions: select a local Whisper model or write captions; edit timing, export SRT, use Clean, Hormozi-inspired or TikTok-highlight styling. Adjust size, placement, uppercase, background and highlight color. Word highlights currently divide each caption's duration evenly, rather than using forced word alignment.
- Elements: the existing MIT-licensed Hugeicons free library, plus local images/logos. Add, move, resize and time these layers. Stock images can be used as layers or backdrops.
- Stock: enter your own Pexels or Pixabay API key in the Stock panel. Keys use Electron secure storage and never reach snapshots. Search responses cache for 24 hours. Images download only when added; attribution links remain in results and the imported asset title.
- Publish: renders the current edit and opens the existing publishing composer inside the editor. Select connected channels, caption and publish now or schedule. This uses each platform's existing connection and publishing requirements.

## Performance

Preview is limited to a 960-pixel longest edge and 30 fps, with timeline state updates at 10 Hz. Export retains the selected resolution. Paused playback has no continuous animation loop; hidden editors pause. Timeline caption blocks are memoized, export fonts cached, and export processes use below-normal scheduling priority where supported. Recorder thumbnails refresh every five seconds only while the recorder window is focused; window thumbnails are smaller. Real Windows hardware profiling is still needed to confirm the reported hang is resolved.

## Validation

Recorder, production, desktop, local studio, stock, shortcuts and publishing tests pass. The export smoke script checks audio, cuts, cursor follow, camera placement, captions, effects, fades and timed images in actual MP4 outputs. Stock search uses mocked provider responses in tests; live searches need user API keys. UI transcription uses a development fixture, not a fresh Whisper download.

References: https://www.pexels.com/api/documentation/ and https://pixabay.com/api/docs/.
Hugeicons license: node_modules/@hugeicons/core-free-icons/LICENSE.md (MIT).

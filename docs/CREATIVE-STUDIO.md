# Creative Studio

Studio brings image, video, voice, lip-sync and 3D generation into one full-height workspace. The main sidebar collapses automatically on entry; its menu button can expand it. A results canvas occupies the center, the prompt composer stays at the bottom, and a collapsible model/settings panel sits on the right. On narrower windows the settings panel overlays the canvas and can be closed.

## Models and controls

The panel only exposes controls supported by the selected runner:

- **Image/video:** supported resolutions, steps, guidance, sampler, negative prompt, seed and sequential variations. Fixed-step checkpoints keep their exact step count; models without CFG or negative prompts do not show ineffective controls. Video models also expose their supported frame counts and playback rates.
- **Voice:** script, downloadable voice, and language/reference audio for Chatterbox. Compact Piper voices have no unsupported speed or pitch sliders. A reference requires permission to use that voice.
- **Lip-sync:** image/video and speech audio inputs, duration, automatic or manual face region, and seed. Generated Voice Studio audio appears in the speech picker. The manual region overlays the source preview.
- **3D:** text or image according to the selected model, steps, guidance and seed. Generated GLB assets open in the orbit/zoom/wireframe viewer.

Download progress is shared with the app transfer center. Generation uses the existing local runners; the UI does not imply support for arbitrary model architectures or ComfyUI graphs. The previously documented lip-sync/3D inference validation limits still apply.

## Prompt helper

**Enhance** sends the entered prompt or script to the AI model configured in Settings. The studio identifies that model beside the composer. An enhanced suggestion appears with **Use suggestion** and **Keep original**; the original text is not automatically overwritten. Generation itself remains local. An unavailable enhancement provider produces an error without deleting the prompt.

Styling choices add words through **Apply to prompt**. Color, lighting, camera, material and motion are descriptive hints, not extra inference parameters. The 3D text helper limits styling to object color/material. Voice scripts use language-preserving cleanup rather than image-prompt expansion.

## Results and reusable setups

Creations are saved locally. Pin results to the Saved view, export media or meshes, send images/videos to the posting composer, or load a previous image/video as the starting setup for a fresh variation. Variations are new generations, not an upscale operation.

Save a named workflow, export its Orvio JSON or import an existing Orvio setup. Existing image/video workflow files remain supported. Reference media remain in the local library and are not embedded in workflow exports.

## Theme

The shared dark palette uses charcoal surfaces, near-black panels, quiet gray borders and a violet accent inspired by the supplied reference. This update selects that look once for existing workspaces. Later theme/accent choices in Appearance persist normally; light and system modes remain available.

No app or development server was launched while implementing the redesign. Automated validation covers model control defaults, workflow control normalization and prompt enhancement input limits. Visual and full model inference checks still require running the desktop app.

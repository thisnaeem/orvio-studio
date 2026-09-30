# Local lip-sync and 3D creation

Open **Models → Lip-sync / 3D**, download a model, then choose **Use model**. The matching workspace opens inside **Studio**. Downloads use Orvio's shared transfer center, private bundled-Python environments, cancellation and retry support. Models are not bundled into the installer or downloaded until requested.

## Lip-sync

MuseTalk 1.5 takes a portrait or video and speech audio, including output from Voice Studio. Orvio's runner generates a 256px face region and blends it into video up to 720px, at 25fps. It processes at most the first 30 seconds; shorter source videos hold the last frame. Select automatic single-face detection or adjust a normalized face rectangle. Confirm permission to animate the person, generate, then preview, export MP4 or use the result in a post.

This is an **experimental feathered-crop compositor**, not MuseTalk's upstream DWPose and face-parsing pipeline. Front-facing, well-lit single faces work best. Occlusions, large movement and unsuitable crops can fail or produce visible seams. Automatic detection stops with an actionable error if it cannot identify one face. Manual cropping is best for stable shots. No output is saved as a completed asset if rendering fails.

Orvio loads pinned MuseTalk, Whisper Tiny and SD VAE weight revisions, uses `weights_only=True` for the MuseTalk state dictionary and safetensors for the other components. It does not download or execute arbitrary model repository Python code. GPU inference uses CUDA if the installed engine supports the device; otherwise it runs on CPU. Apple Metal is not used for this runner. Expect slow CPU rendering. Frames are streamed to disk; a still portrait's latent encoding is reused. Cancellation removes the job's temporary workspace.

## 3D

- **Shap-E text to 3D:** describe a single object and choose 16, 32 or 64 steps.
- **Shap-E image to 3D:** choose a centered object image against a simple background.

Both produce colored concept meshes. Inspect results with the on-demand WebGL viewer, orbit/zoom, reset the view or toggle wireframe. Export GLB for Blender or another 3D editor. These are coarse concept assets; they may need topology, material and geometry cleanup. Texturing, rigging, arbitrary checkpoints and ComfyUI node imports are not supported by these pipelines.

Shap-E uses pinned safetensors variants. CUDA is used when available, otherwise CPU. Twelve GB of system memory is a starting estimate, not a guarantee. Actual capacity and speed depend on the machine. A single generation runs at a time; model downloads may run separately. The viewer renders only when its view changes, caps pixel density and releases GPU resources when closed.

## Validation boundary

Automated tests cover model routing, pinned download specifications, input and crop validation, asset access, frame timing and seed preservation. The application was not launched, and multi-GB models were not downloaded or run during this change. End-to-end model quality, platform runtime compatibility and the visual UI still need a real-device test before publishing a release.

## References

- [MuseTalk](https://github.com/TMElyralab/MuseTalk) and [model weights](https://huggingface.co/TMElyralab/MuseTalk).
- [Shap-E Diffusers pipelines](https://huggingface.co/docs/diffusers/api/pipelines/shap_e).
- [Shap-E text weights](https://huggingface.co/openai/shap-e) and [image weights](https://huggingface.co/openai/shap-e-img2img).
- Component licensing notices ship in `runtime/MODEL-NOTICES.md`.

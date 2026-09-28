# Assistant and navigation improvements

## Use the updated app

Run `npm run desktop` from the project folder. The production web bundle has also been rebuilt with `npm run build`. An existing installed EXE must be rebuilt/reinstalled separately; this change does not replace that installer.

1. Open Settings > AI models. Choose OpenAI, Anthropic Claude, DeepSeek, Gemini, an OpenAI-compatible endpoint, or an installed local model. Save a model ID and your own API key where required.
2. Open Assistant > Work, select **AI settings** or a downloaded coding model, and open/create a project folder. Cloud models receive the project text requested by their tools. Keys stay in Electron's encrypted credential store.
3. Describe the task. Review exact terminal commands before running them. Existing text-file backup/review/restore remains available.
4. The agent can start a managed preview server, inspect its output, and browse its localhost URL. You can also enter a URL and use **Open browser**. Stop preview shuts down the managed process; quitting shuts down its process tree.
5. Download an image model from Models before asking Work to generate artwork. The image tool writes a new PNG at a project-relative path and refuses to overwrite existing files. Images also remain in the media library. Generated binary images are not included in the text diff/undo list.

## Changes

- Lazy-loaded heavy pages with loading feedback and recoverable page/root error boundaries.
- Active recorder and assistant state survive page navigation; hidden chat stops its voice activity. Work initializes on its first visit.
- A crashed Electron renderer gets one reload attempt, with an error dialog if recovery fails.
- Smaller local-model context on computers below 12 GB RAM, CPU thread limits, cancellation signals, and unloading the chat model before image generation.
- Native Claude Messages adapter and DeepSeek endpoint support for chat and project work; existing OpenAI/Gemini/local transports remain available.
- Up to 48 tool rounds, bounded context/history, paginated recursive file discovery, partial large-file reads, atomic task-state saves, and smaller IPC snapshots.
- Sandboxed browser window with a separate in-memory session, no Node/app bridge, no device permissions, and HTTP(S)-only navigation. The model can read text/links; this is not a full click/type/screenshot browser automation suite.
- Managed preview server start/status/stop, command approval, and project image generation.

## Validation and limits

- Production TypeScript/Vite build passes.
- 73 Node tests pass, including provider translation, credential privacy, context compaction, pagination, image overwrite refusal, command approval, preview output, and Windows path confinement.
- Actual Electron smoke check: 16 pages visited twice, no page-recovery errors or renderer console errors; a localhost page opened and read in the project browser; browser app-bridge isolation verified.
- Cloud responses are tested with fixtures. Live paid API calls, actual model inference/image generation, low-memory hardware stress tests, and installer packaging were not performed.
- Model quality, context support, API quotas and hardware still determine task size and speed. Large tasks may need follow-up requests. Deployment is possible through reviewed commands but no site was deployed during these checks.

Provider references: https://platform.claude.com/docs/en/api/overview and https://api-docs.deepseek.com/api/create-chat-completion/

Dev startup regression: fixed Vite's React lazy-binding initialization order. A plain startup fallback now displays module-load errors before React mounts. Start npm run dev, then run npm run verify:desktop:dev to check the actual development transport. This passed 32 page switches with no renderer errors.

Work lifecycle regression: the Electron Chromium version returns a Promise from scrollIntoView. The Work effect now discards that value instead of returning it as React cleanup. User cancellation resolves as a stopped task; timeouts and unexpected transport aborts produce actionable messages. With Vite running, npm run verify:work:dev tests actual UI submission, file writes, navigation, cancellation during an HTTP request, and retry using an isolated local provider fixture. This passed in Electron.

## Agent tools and configurable permissions

Work now provides Agent (implementation) and Ask (read-only) modes. The saved permission policy has three choices:

- Always ask: approval before file changes, image generation, directories and terminal commands.
- Project edits: project file operations proceed; terminal commands and preview startup ask first (default).
- Full access: commands run automatically with the user's OS permissions. Direct file tools remain confined to the selected project. This is not an OS command sandbox.

The model cannot change the permission policy. Stop the active task before changing it. Pending requests show the exact command or proposed file content; declining does not execute the operation.

Tool protocol can be Auto, Native or Structured JSON. Auto retries code-only implementation responses as strict JSON actions, and falls back after a native-tool rejection (400/422). Only validated named tool actions execute; Markdown code is never run automatically. If a model still cannot use tools, Work reports failure instead of claiming implementation. Actual Qwen inference was not part of the fixture-based verification.

Tools include project listing/search, paginated reads, file creation/replacement, unique-text edits with undo, directory creation, plan tracking, terminal execution/output, preview server management, page browsing and local image generation. Activity shows command output and failures. No-effect responses are explicitly labeled.

Electron verification now also exercises the permission selector, file approval, automatic command execution, and code-only-to-JSON fallback resulting in a real file. All used an isolated localhost test provider, without paid API calls.

# Orvio bot identities

The tool directory, navigation, workspace search, home cards and tool breadcrumbs share identities from `src/tool-bots.ts`. The directory supports searching by bot or original tool name. Existing tool routes remain stable.

| Bot | Tool |
| --- | --- |
| Orbi | Assistant |
| Prisma | Creative studio |
| Atlas | SEO |
| Tidy | PC helper |
| Mingle | Social accounts |
| Relay | Integrations |
| Tempo | Publishing |
| Sage | Models |
| Beacon | Live broadcasts |
| Glyph | Captions |
| Frame | Recording |
| Echo | Voice |
| Slice | Clipping |
| Fetch | Downloads |

Orbi, Glyph and Tempo also name the existing assistant, caption and planning roles. Other identities open their existing tools; the avatar layer does not add autonomous permissions or new execution abilities.

## Artwork

Created using the installed bs-grokbot-avatar skill 1.0.1 and built-in image_gen. Each of the 14 Original-style avatars was generated independently. Final PNGs are in `public/bots`; prompts, reference paths, original output paths and actual dimensions are recorded in `bot-avatar-assets.json`. Initial briefs remain in `bot-avatar-prompts.json`.

Tidy required two additional attempts because the initial transparent output and its first correction contained an unwanted mouth-shaped transparency artifact. Its accepted final image uses an opaque charcoal background. Rejected originals remain in the generation archive and are not shipped in the app. All final avatars were visually inspected.

Installed skill: `/Users/naeem/.agents/skills/bs-grokbot-avatar/SKILL.md`.

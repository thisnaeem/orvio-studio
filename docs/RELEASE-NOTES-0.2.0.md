## Orvio Studio 0.2.0

The first public desktop release: a clean multi-tool workspace with Unbounded typography, Hugeicons Free, a generated squircle logo, first-launch onboarding, light/dark/system themes, accent colors, and adjustable spacing.

### Downloads

- **Windows 10/11 x64:** `Orvio-Studio-0.2.0-Windows-Setup.exe` — NSIS Modern UI assisted installer with location selection, shortcuts, and optional launch.
- **macOS Apple Silicon:** `Orvio-Studio-0.2.0-mac-arm64.dmg`
- **macOS Intel:** `Orvio-Studio-0.2.0-mac-x64.dmg`
- ZIPs and blockmaps are also included for release/update tooling. SHA256SUMS.txt contains checksums for manual verification.

### What works

- Tool launcher and searchable collection.
- Persistent workspace onboarding and personalization.
- Create/edit/delete local content drafts.
- Save comment-to-message workflow configurations, inactive until a service is connected.
- Windows automatic update checks/downloads with progress and restart-to-install controls.
- macOS release checks with a manual download link.

### Important limitations

These builds are **unsigned**; macOS builds are **not notarized**. Operating-system trust warnings or blocks are expected. No Developer ID or Windows signing certificate was available for this release.

**macOS automatic installation is intentionally disabled for this unsigned release.** Signed distribution is required to support that path. Windows update logic and metadata have been checked, but a full installed-version-to-newer-version upgrade has not been exercised on a Windows machine.

No dummy accounts or metrics are included. Live Instagram connections, scheduled publishing, messaging, and Paddle subscriptions still require the hosted authenticated service and provider credentials described in the repository. The $9.99/month plan is an integration entry point; no subscription is activated by this installer.

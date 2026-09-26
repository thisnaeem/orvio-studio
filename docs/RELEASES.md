# Release and update operation

## v0.3.0

Artifacts are built locally with `npm run release:build` and published to https://github.com/thisnaeem/orvio-studio/releases.

- Windows x64: branded NSIS Modern UI assisted installer, installation-folder selection, desktop/Start menu shortcuts, optional launch, and preserved workspace data on uninstall.
- macOS Apple Silicon and Intel: DMG installers and ZIP update packages.
- This release is unsigned and not notarized. Windows may show SmartScreen warnings. macOS may block an unverified download. Developer ID distribution signing and notarization are required for a trusted Mac release. No security checks are disabled in the application to work around this.

## Automatic updates

The packaged application reads the public GitHub provider from its bundled `app-update.yml`. No token is included in the application, and no environment switch is required. Development builds do not check releases.

On Windows, checks run 8 seconds after launch, every 4 hours, and when requested in Settings. Stable releases only; downgrades disabled. Downloads start automatically, report progress and errors, and can install using Restart & install or on normal application quit. Standard updater SHA-512 validation remains enabled. The initial unsigned build has no publisher identity to validate; use consistently signed installers for production trust.

Unsigned macOS builds check the same feed but do not download/install automatically. When a newer version exists, Settings offers the GitHub release page. This is deliberate: macOS automatic updates need a signed application. After provisioning Developer ID signing/notarization, remove `mac.identity: null`, configure signing securely, and switch `macSigned` to true in the main process. Perform an installed-version A → B upgrade test before claiming that path verified.

Every release must include the installer files, blockmaps, `latest.yml`, and `latest-mac.yml`. Publish the complete release together; do not publish metadata before its referenced installers are available. Use a larger semantic version for each release. Keep the previous stable release available for users recovering from a failed download.

## Verification scope

The automated tests exercise update discovery events, progress, ready-only installation, concurrent checks, development exclusion, retry after network errors, and unsigned Mac fallback. Release validation verifies artifact sizes and SHA-512 values against updater metadata plus SHA-256 checksums for manual downloads. An actual Windows installation and installed-version-to-newer-version upgrade require a Windows machine and a second version; those are not equivalent to passing unit tests.

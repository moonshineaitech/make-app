# Platforms and output formats

Make App separates the computer that builds/launches a desktop project from devices that consume a hosted web export.

| Target | Converter | Generated desktop output | Verification target |
| --- | --- | --- | --- |
| Windows x64 | Portable EXE | One-file EXE with checked desktop runtime | Local Windows acceptance and `windows-latest` runner |
| macOS ARM64 | Application ZIP | `.app` bundle with embedded project payload and relative framework links | Native matrix runner |
| macOS Intel | Application ZIP | `.app` bundle | Native matrix runner |
| Linux x64 | AppImage | Executable `.run` with checked embedded AppImage runtime | Native matrix runner |
| Linux ARM64 | AppImage | Executable `.run` | Native matrix runner |
| iOS / iPadOS / Android / ChromeOS / other browser devices | Desktop converter not available | Hosted static web exports | Chromium responsive and offline checks passed; physical devices not certified |

Desktop output includes the project snapshot, dependencies and a managed runtime or compiled build. It does not require the original folder or Make App on the recipient computer. The recipient must use a compatible OS and architecture. macOS apps travel as complete .app bundles; Windows .exe and Linux .run outputs travel as individual files. External APIs, credentials, OS libraries, services and hardware remain application requirements.

## Web exports

Choose a folder with an existing static build. Make App looks for `index.html` in the chosen folder and common output directories. It exports public asset file types, adds web-app installation metadata and icons, and registers a service worker scoped to that deployment. The cache is isolated by the registration scope. Only preselected static assets are cached; private API responses are not added to the offline cache.

Upload the folder to an HTTPS static host. On compatible browsers, install it using the browser menu or home-screen action. First load and external services need network access. Offline reload is available after installation of the service worker. Opening files with `file://` is not an install/deployment method. Browser installation details are described by [MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).

A web export does not convert a desktop GUI, compiler, native game, arbitrary server or database into phone-native code. Existing backend URLs, authentication and responsive/touch behavior belong to the project. Review built public assets for sensitive information before publishing.

## SDK preparation

Node archives are selected for OS and architecture and verified against official checksums. Go, Java, .NET, Zig, CMake, Ninja and Rust selection now uses the current desktop target. Missing Python can use an Astral-maintained CPython standalone archive with a release digest. Archives without an expected checksum are refused. Publisher coverage varies; unsupported combinations fail with an explanation. Ruby auto-download currently remains Windows x64 only.

## Process ownership

Windows x64 uses Job Objects. macOS/Linux use a pipe-owned supervisor and separate child process group, with termination followed by bounded escalation when the controller closes. Terminal hosts close their PTY on controller termination. This is lifecycle management, not a security sandbox; independently daemonized processes can escape a POSIX process group.

## Release gates

Unsigned previews require OS trust handling and are not notarized or certified for every desktop distribution. Physical iOS/Android, screen-reader/high-DPI, clean-machine acceptance and publisher signing remain separate gates. The CI workflow exercises actual packaged converter and generated-app launch paths for each listed desktop architecture.

Acceptance deletes its own temporary source fixture and relocates the generated output before launch. A separate receiving-profile check bypasses installed Node, blocks runtime downloads, starts the app with its bundled runtime and checks shutdown. Platform release manifests embed this evidence. This is a controlled native-runner check, not a claim of physical-device or publisher certification. Windows uses the native ZIP extractor when available, retaining the PowerShell fallback.

# Platforms and output formats

Make App separates the computer that builds/launches a desktop project from devices that consume a hosted web export.

| Target | Converter | Generated desktop output | Verification target |
| --- | --- | --- | --- |
| Windows x64 | Portable EXE | One-file EXE with checked desktop runtime | Local Windows acceptance and `windows-latest` runner |
| macOS ARM64 | Application ZIP | `.app` bundle with local project metadata and relative framework links | Native matrix runner |
| macOS Intel | Application ZIP | `.app` bundle | Native matrix runner |
| Linux x64 | AppImage | Executable `.run` with checked embedded AppImage runtime | Native matrix runner |
| Linux ARM64 | AppImage | Executable `.run` | Native matrix runner |
| iOS / iPadOS / Android / ChromeOS / other browser devices | Desktop converter not available | Hosted static web exports | Chromium responsive and offline checks passed; physical devices not certified |

Desktop output includes the converter's desktop runtime but keeps the selected project at its existing absolute path. It is not a source-inclusive transfer package. Different machines need their own project folder and a compatible output. Native frameworks remain subject to their OS, architecture, SDK and hardware requirements.

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

Acceptance includes a separate fresh-cache phase that bypasses installed Node, downloads and verifies a private runtime, runs the original JavaScript project with no setup clicks, and checks shutdown. Platform release manifests embed this evidence. This is a controlled native-runner check, not a claim of physical-device or publisher certification. Windows uses the native ZIP extractor when available, retaining the PowerShell fallback.

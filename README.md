# Make App

Open what you build. Choose a local project and create its desktop app, or export a static web app for phones, tablets and browsers.

**Free · MIT licensed · Local execution · No account or API key**

[Downloads](https://github.com/moonshineaitech/make-app/releases) · [Codex plugin](docs/CODEX.md) · [Other coding tools](docs/HARNESSES.md) · [Device support](docs/CROSS_PLATFORM.md) · [Validation](docs/VALIDATION.md)

![Make App creator](docs/assets/make-app-windows.png)

The creator includes ten selectable Frutiger Aero themes and a Classic appearance. The complete product website includes the same interactive renderer. [Preview, build and verify the website](docs/INTERFACE.md) with `npm run preview:site`.

## Start here

1. Download the converter for your computer from **Releases**.
2. Open it and choose a folder, or pick a saved Codex project.
3. Select **Desktop app** or **Installable web app**. Choose an entry point if the project has several.
4. Review the detected requirements, name the app and save it.

A desktop app opens the selected project directly and prepares its dependencies when needed. **Keep the original project folder in place.** The desktop output is a local launcher, not a source-inclusive package for another computer. The converter can be removed after creating it.

A web export copies an existing static build into a new folder. Upload that folder to any static HTTPS host, then open its URL on your devices. Supported browsers offer **Install App** or **Add to Home Screen**. Offline access starts after the first successful visit and service-worker installation. Backend services, external APIs and authentication still need their own connectivity and hosting.

## Make it yours

Click the **Make App** wordmark (or press **Alt+T**) in a photographic theme to switch between ten Frutiger Aero designs, from midnight water and aurora glass to botanical green, pearl and sunlit skies. Themes are included offline and your choice is remembered. Classic also offers system, light and dark appearance. Changing a theme preserves your selected project and creation progress. [Interface and accessibility details](docs/INTERFACE.md).

![Ten selectable Make App themes](docs/assets/make-app-themes.png)

## Choose your download

**Release status:** binary assets remain private while a release is a draft. The source and CI results are public. Desktop builds use native acceptance on each target; check the validation page and release assets before choosing a build.

| Computer | Converter asset | Codex plugin asset |
| --- | --- | --- |
| Windows x64 | `Make-App-Windows-x64.exe` | `Make-App-Codex-Plugin-Windows-x64.zip` |
| macOS, Apple Silicon | `Make-App-macOS-arm64.zip` | `Make-App-Codex-Plugin-macOS-arm64.tar.gz` |
| macOS, Intel | `Make-App-macOS-x64.zip` | `Make-App-Codex-Plugin-macOS-x64.tar.gz` |
| Linux x64 | `Make-App-Linux-x64.AppImage` | `Make-App-Codex-Plugin-Linux-x64.tar.gz` |
| Linux ARM64 | `Make-App-Linux-arm64.AppImage` | `Make-App-Codex-Plugin-Linux-arm64.tar.gz` |

Use the assets on the [release page](https://github.com/moonshineaitech/make-app/releases). GitHub's **Code → Download ZIP** contains development source, without the converter or complete plugin dependencies. Each platform bundle includes its own checksum list, release manifest and runtime dependency SBOM. Signing and notarization remain release gates; this is an unsigned preview.

On macOS, extract the ZIP and open **Make App.app**. On Linux, allow the AppImage to run as a program, then open it. The generated Linux `.run` file is executable and includes its desktop runtime; its launcher supports extraction without requiring FUSE. Windows uses an `.exe`. Build apps on their target desktop OS; Make App does not cross-compile arbitrary projects.

## Use it from Codex

Download the plugin archive matching your OS and architecture. Extract the entire archive to a folder you will keep, then run its **Install Codex Plugin** script. Codex must already be installed. The archive includes Node and the converter, so there is no global Node installation, API key, administrator step or manual MCP configuration.

Open a new Codex chat and ask:

> Make a desktop app for this project.

For a static web build:

> Export this project as an installable web app.

The plugin includes the `run-project` skill and four tools: `inspect_project`, `list_projects`, `make_executable` and `open_project`. The creation tool needs only your project path; it chooses a fresh output name automatically. It accepts desktop or web output. [Installation, updates and removal](docs/CODEX.md).

## Use it from another coding tool

In a complete 0.8.1+ plugin archive, open **Connect Coding Tool**, select your harness and choose your project folder. Supported project adapters cover Codex, Claude Code, Cursor, current VS Code/Copilot, older VS Code Local, Gemini CLI and OpenCode. Setup preserves unrelated configuration and comments. Codex is not required for these routes.

Other local harnesses can use the generic MCP configuration or the bundled `make-app` command, which returns JSON. The same engine powers the plugin, MCP server and CLI. A hosted-only chat needs a local agent or worker with access to the project; it cannot reach your computer automatically. [Setup, commands, compatibility and removal](docs/HARNESSES.md).

## Device support

| Device | What it can use |
| --- | --- |
| Windows, macOS and Linux computers | Native converter, Codex plugin and generated apps for their OS |
| iPhone and iPad | Hosted web exports in Safari and compatible browsers; home-screen installation where supported |
| Android phones and tablets | Hosted web exports; browser installation where supported |
| Chromebooks | Hosted web exports; Linux desktop support depends on the device's Linux environment |
| Other modern browser devices | Hosted web exports, subject to browser capabilities |

The converter runs on desktop operating systems. A phone browser cannot run an arbitrary desktop executable, compiler, native game or backend service. Web export is available when an existing static build is detected in the chosen folder or its `dist`, `build`, `out` or `public` directory. Native platform SDKs, GPUs, hardware access and external services remain project requirements. [Support boundaries and formats](docs/CROSS_PLATFORM.md).

## Languages and setup

| Stack | Recognized workflows | Setup behavior |
| --- | --- | --- |
| Rust | Cargo binaries, workspaces and standalone programs | Uses installed Rust or a private verified toolchain; native libraries and platform SDKs may be required |
| TypeScript / JavaScript | Package scripts, CLI entry points, local services and common frontend layouts | Compatible installed or private Node runtime, lockfile-aware npm/pnpm/Yarn setup and pinned TypeScript runner |
| Python | Common scripts, web, console and desktop entry points | Uses available Python 3 or provisions private CPython when missing; unusual version constraints need a compatible interpreter |
| Go | Modules and executable targets, including services | Uses installed or private Go SDK |
| C# / .NET | Console, ASP.NET and recognized GUI projects | SDK selection and private preparation; Windows-specific frameworks require Windows |
| Java | Source entries and recognized layouts | Uses installed or private JDK; Maven/Gradle and framework coverage varies |
| C / C++ | Single-file programs and CMake executable targets | Private Zig compiler and recognized CMake/Ninja workflows; project-specific native libraries may still need setup |
| Ruby | Script entries and Bundler workflows | Private Windows Ruby or an installed Ruby/Bundler environment on macOS/Linux |

Detection reads project files and does not execute source. Libraries without runnable entry points are identified instead of receiving invented commands. Multi-target projects ask you to select an entry point. Setup can download SDKs and execute the project's declared installation/build steps when the generated desktop app is opened.

## What changed in 0.8

Seven areas received implementation changes:

- **Device reach:** native desktop formats and static web export with a manifest, mobile icons and scoped offline caching.
- **Setup:** OS/architecture-aware SDK selection and automatic private Python preparation when no suitable interpreter is available.
- **Launch speed and reliability:** incremental hashing for direct launchers, process-group supervision on macOS/Linux, bounded cancellation and atomic output writes. Native permission checks continue to read source contents freshly.
- **Interface:** a concise project/output/review flow, detected requirements, entry selection, progress, cancellation and accurate saved-file messages.
- **Accessibility:** keyboard form controls, status/error announcements, visible focus, 44-pixel controls, responsive layouts, light/dark themes and reduced-motion/forced-color support.
- **Export safety:** no source clones for desktop output; web export excludes hidden files and source/dependency folders, refuses symlinks, checks common embedded credential signatures and writes only to a new destination. These checks do not prove every build is free of secrets.
- **Distribution:** five native build targets, OS-specific complete plugin archives, checksum manifests, dependency inventories and end-to-end CI that creates and runs an app.

On one actual project containing 1,875 files and about 806 MB of source/build content, warm fingerprinting fell from 2,718 ms to 292 ms: **9.3× faster**, with zero unchanged file content reread. This measures hashing on the development Windows host, not total launch time or all projects.

## Verification and limits

The current local suite passes 84 applicable Windows regression tests and 20 plugin/integration tests. Three actual project executables opened their app windows with zero additional setup/approval clicks, then stopped their processes; source fingerprints stayed unchanged. The creator passed automated accessibility checks in both themes at 320, 520 and 900 pixels. A web export rendered at phone/tablet/desktop sizes and reloaded offline after its server stopped. These are browser-engine checks, not physical iPhone/Android or manual screen-reader certification. Harness adapters are checked by launching the actual MCP server through their generated commands; vendor UI acceptance is separate.

Read [validation evidence and open gates](docs/VALIDATION.md) and the [native CI runs](https://github.com/moonshineaitech/make-app/actions/workflows/cross-platform.yml). Native build success, unit tests, desktop launch acceptance and physical-device acceptance are reported separately. Compatibility varies by framework. The preview is not a filesystem or network sandbox: project code runs with your account's permissions.

## Troubleshooting

| Symptom | Next step |
| --- | --- |
| Several executables are detected | Select the program you intend to run |
| Web export is unavailable | Build the frontend first, or select the folder containing its built `index.html` |
| A web export needs an API | Host that backend separately and configure the frontend's API URL |
| A desktop app cannot find its project | Restore the folder to its original location or create a new app for the relocated folder |
| First launch is preparing tools | Keep the progress window open; subsequent apps reuse compatible runtime/SDK caches |
| A project needs credentials | Supply its required environment variables through its supported setup; Make App does not provide service accounts |
| Plugin installation cannot find Codex | Install/update Codex and retry; its CLI must be discoverable |
| An output already exists | Choose a new name; web exports and macOS bundles preserve existing directories |
| Linux lacks a required system library | Install the desktop library required by Electron or the project; see the launch error |

Creation can be cancelled. Failed or cancelled creation removes temporary output and leaves existing apps intact. Keep plugin files in their extracted folder while installed. Use its matching **Uninstall Codex Plugin** script to remove only Make App.

## Development

Use Node.js 24 and an installed Rust compiler to build native launchers. Native packages are built on their corresponding OS. Linux desktop tests require a working graphical session or Xvfb.

```sh
npm ci
npm run public:check
npm run build:supervisor
npm run build:launcher
npm test
npm ci --prefix integrations/codex
npm run build:plugin
npm run test:plugin
npm run build -- --publish never
node scripts/desktop-acceptance.cjs
```

The Windows supervisor build can prepare a private Rust toolchain. Unix native launcher builds use the installed `rustc`. `npm run build` selects the host's converter format. Packaging a complete plugin archive requires `APPDOCK_PLUGIN_NODE` and `APPDOCK_PLUGIN_BUILDER`; macOS also specifies the converter ZIP via `APPDOCK_CONVERTER_ASSET`. See [release workflow](.github/workflows/cross-platform.yml).

[Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Privacy](PRIVACY.md) · [Third-party notices](THIRD_PARTY_NOTICES.md) · [MIT license](LICENSE)

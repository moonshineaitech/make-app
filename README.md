# Make App

Turn a local project into a Windows executable. Choose a folder, save an `.exe`, and double-click it to open your app.

**Free and open source · MIT license · Windows x64 preview**

[Get the Windows preview](https://github.com/moonshineaitech/make-app/releases) · [Install the Codex plugin](docs/CODEX.md) · [How it works](docs/HOW_IT_WORKS.md)

![The Make App converter](docs/assets/make-app-windows.png)

## Downloads

**Release status:** v0.7.0 is being prepared as a draft. The source is public; GitHub makes the binary assets publicly downloadable when a maintainer publishes the draft. The versioned links below are the intended download URLs after publication.

| What you want | Download | What to do |
| --- | --- | --- |
| Use the converter | [Windows x64 executable](https://github.com/moonshineaitech/make-app/releases/download/v0.7.0/Make-App-Windows-x64.exe) | Open the file; no installer or administrator rights needed |
| Use it from Codex | [Complete Codex plugin ZIP](https://github.com/moonshineaitech/make-app/releases/download/v0.7.0/Make-App-Codex-Plugin-Windows-x64.zip) | Extract everything, then double-click `Install Codex Plugin.cmd` |
| Check a download | [SHA-256 checksums](https://github.com/moonshineaitech/make-app/releases/download/v0.7.0/SHA256SUMS.txt) | Compare the downloaded file's hash with the matching entry |
| Inspect dependencies | [CycloneDX SBOM](https://github.com/moonshineaitech/make-app/releases/download/v0.7.0/sbom.cdx.json) | Review the converter's npm runtime dependency inventory |

Use the release assets above rather than GitHub's **Code → Download ZIP** for normal use. The source ZIP is for development and does not contain the converter binary or bundled plugin dependencies.

## Start here

1. Download **Make-App-Windows-x64.exe** from Releases and open it. No installation is needed.
2. Choose your project folder, or select a saved Codex project.
3. Select an entry point if your project has several, then click **Make executable**.
4. Save the file and double-click it. Setup progress appears when needed, followed by your app.

No Make App account or API key is required. Your project and development tools can have their own requirements.

**Keep the original project folder in place.** This preview creates local launchers that follow that folder. It does not bundle the complete project for a different computer. Generated files are currently about 110 MB because they include a desktop runtime; installed runtime and SDK caches are shared between apps.

## Use it from Codex

Download **Make-App-Codex-Plugin-Windows-x64.zip**, extract the whole folder, and double-click **Install Codex Plugin.cmd**. Open a new Codex chat and ask:

> Make an executable for this project.

The bundle includes Node and the converter. No manual MCP configuration or global Node installation is required. Codex must already be installed. [Install, update and remove the plugin](docs/CODEX.md).

## What it recognizes

| Stack | Recognized workflows | Important limits |
| --- | --- | --- |
| Rust | Cargo binaries, executable selection and standalone programs | Native frameworks and platform SDKs vary |
| TypeScript / JavaScript | Package scripts, CLI entry points, web frontends and local services | Unusual scripts or monorepos can need project adjustments |
| Python | Common script, console, web and desktop entry points | A compatible Python interpreter must already be installed |
| Go | Module projects and executable targets, including services | Native dependencies and assets remain project requirements |
| C# / .NET | Console, ASP.NET and supported Windows GUI projects | Requires the appropriate target framework and host capabilities |
| Java | Source entry points and recognized project layouts | Maven/Gradle and framework coverage varies |
| C / C++ | Single-file compilation and CMake executable targets | Compiler, native-library and asset requirements still apply |
| Ruby | Script entries and declared Bundler workflows | Native-extension builds are not universally validated |

Common web, native GUI and service layouts are supported at different levels. Detection uses project files and does not run source code. Multi-target projects ask you to choose an entry point.

Compatibility depends on the project and framework. First launch can download a runtime/SDK and install dependencies. Python currently needs a compatible installed interpreter. Native Apple targets require their supported operating system and SDKs. Credentials, databases, hardware requirements and external services are not supplied automatically.

## What has been checked

The local Windows baseline has 71 regression tests, ten language examples across nine families, and three actual project executables that opened their app windows and stopped their processes. These are local observations, not clean-machine certification or proof every application works. [Validation scope and release status](docs/VALIDATION.md).

The preview is unsigned, so Windows can show a publisher warning. Compare your download with **SHA256SUMS.txt**. Run generated apps only from projects you trust: project code and setup scripts run with your account's permissions and can update the original folder. Make App is not a filesystem/network security sandbox.

## How your app runs

A generated `.exe` contains a small Windows launcher, the desktop runtime and the selected project's launch settings. It checks its embedded payload, reuses a shared local runtime cache, reads the current project files and runs the inferred setup/build/start sequence. Apps keep their own state and can share cached SDKs.

Web projects open in their own window with their local services running. Native GUI applications retain their original interface. CLI tools get an output/input window, with an interactive terminal available on Windows x64. Closing a managed app stops its owned process tree.

This is local execution, not hosting or deployment. Creating the `.exe` does not execute project code; opening it does. No full source clone is created by the normal workflow. See [the execution model](docs/HOW_IT_WORKS.md) and [privacy policy](PRIVACY.md).

## Troubleshooting

| Symptom | Next step |
| --- | --- |
| The download link is unavailable | Check [Releases](https://github.com/moonshineaitech/make-app/releases). Draft assets become public only after the release is published. |
| The Codex installer cannot find Codex | Install or update the Windows Codex desktop app, then rerun the installer. [Manual installation](docs/CODEX.md#manual-alternative) is available for other CLI setups. |
| Files are missing after extracting the plugin | Extract the entire ZIP, keeping its folders together, then rerun `Install Codex Plugin.cmd`. |
| A generated app cannot find its project | Restore the original source folder or create another executable for its new location. |
| Setup needs a credential, database or external service | Configure that project's prerequisites. Make App does not supply accounts, credentials or cloud infrastructure. |
| Several executable entry points are detected | Select the intended target. A library without an entry point needs an executable consumer. |
| You need to send an app to another computer | This preview requires the original source folder. Source-inclusive portable distribution is not implemented yet. |

For a bug report, include the version, Windows version, project type, expected result and a small public reproduction. Redact credentials, personal paths and private source. [Report a bug](https://github.com/moonshineaitech/make-app/issues/new/choose) or use [private security reporting](SECURITY.md) for vulnerabilities.

## Develop

Use Node 24 LTS and Git on Windows x64. Release ZIP packaging also uses Python 3.

```sh
npm ci
npm run build:supervisor
npm run build:launcher
npm test
npm ci --prefix integrations/codex
npm run build:plugin
npm run test:plugin
npm run build
```

Native helper builds prepare a private Rust toolchain if needed. Source and release dependencies are locked; use the existing lockfiles. `npm run public:check` checks tracked public source for accidental binary/data inclusion. [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Privacy](PRIVACY.md) · [License](LICENSE).

This is an independent project. The local Codex integration is not an OpenAI-endorsed or public-directory-approved plugin.

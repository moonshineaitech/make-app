# Make App for Codex

The independent local plugin turns a selected project into a desktop app or exports an existing static web build. It does not require an OpenAI API key or a Make App account. It is not an approved OpenAI Plugin Directory listing.

## Install

1. Open [Releases](https://github.com/moonshineaitech/make-app/releases) and download the complete **Codex Plugin** archive for your OS and architecture. Draft assets become public only when the maintainer publishes the release.
2. Extract the entire archive to a folder you will keep.
3. Run its installer:

| OS | Installer |
| --- | --- |
| Windows | Double-click `Install Codex Plugin.cmd` |
| macOS | Open `Install Codex Plugin.command` |
| Linux | Run `sh "Install Codex Plugin.sh"` from the extracted directory |

Codex must already be installed. Node and the converter are included. The installer validates the bundle's integrity inventory, finds Codex, registers the local marketplace and installs `make-app@make-app`. It uses supported plugin CLI commands without editing configuration files manually or changing your execution policy. When installed, open a new chat.

The plugin includes a `run-project` skill. Ask naturally or explicitly invoke `$run-project`; only the project root is needed for creation. Make App chooses a fresh name in the sibling **Make App Outputs** directory. An explicit output path remains available when you want it.

> Make a desktop app for this project.

> Export this project's static web build as an installable web app.

## Tools

| Tool | Purpose |
| --- | --- |
| `inspect_project` | Read detected language, targets and setup requirements without running project code or returning environment values |
| `list_projects` | Discover saved local Codex projects; arbitrary folders are supported too |
| `make_executable` | Create a desktop app by default; set `format: "web"` to export a static build |
| `open_project` | Open the desktop converter with the chosen project selected |

Desktop output must match the current host: `.exe` on Windows, `.app` on macOS, `.run` on Linux. Output is optional; explicit output paths must be absolute and new. Packaging may execute dependency/build scripts in a temporary source snapshot with your account permissions. It does not open the finished application. The result includes its project, dependencies and runtime or compiled artifact; the original project folder is not required. Secrets and external services are not automatically included.

For a project-only connection, use **Connect Coding Tool** and select Codex instead of the global plugin installer. This registers MCP for that trusted project without changing your global profile; the global plugin also supplies its skill. Choose one route to avoid duplicate tool entries. The server offers a `make-app` prompt in clients that expose MCP prompts. See [other harnesses and CLI use](HARNESSES.md).

## Update or remove

Run the matching **Uninstall Codex Plugin** script before replacing/deleting the extracted archive. Then extract the newer version into a stable folder and run its installer. Uninstall removes only `make-app@make-app`, retaining unrelated plugins and project files. The local marketplace registration may remain.

Use the complete platform bundle. A source checkout is for development and lacks bundled dependencies/runtime until built. If discovery fails, ensure `codex` is installed and accessible; advanced users can set `CODEX_EXECUTABLE`. Normal installs need no override or global Node.

## Publishing status

Local marketplace installation and public OpenAI Directory distribution are separate. The source includes portable and compatibility manifests, an icon, privacy/security documentation and [submission preparation](OPENAI_SUBMISSION.md). A public Directory listing still requires the applicable publisher and local-execution review. See [OpenAI plugin packaging](https://developers.openai.com/plugins/build/plugins).

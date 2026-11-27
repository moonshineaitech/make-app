# Use Make App from your coding tool

Make App is a local app builder. The same engine is available as a Codex plugin with a reusable skill, a standard MCP server, and a JSON command-line interface. You do not need a Make App account, API key or another application platform.

## Start here

Download the complete **Codex Plugin** archive for your computer from [Releases](https://github.com/moonshineaitech/make-app/releases) and extract it to a folder you will keep. Despite the archive's compatibility name, version 0.8.1 and later also include connections for other coding tools. Node and the converter are bundled. Draft release downloads are visible only to repository collaborators until published.

**Codex:** run **Install Codex Plugin**, open a new chat and ask:

> Make an app for this project.

The plugin combines tools and the `run-project` skill. It uses your current workspace, inspects its requirements and chooses a fresh output filename. You can also explicitly invoke `$run-project`. This is an independent plugin; it does not modify Codex itself or require an OpenAI API key.

**Other tools, or a single Codex project:** open **Connect Coding Tool**, choose the tool and provide your project folder. It adds the local connection to that project's configuration. Open a new session in the trusted project and ask the same question. Your harness may ask you to trust the server or enable its tools; Make App does not bypass those controls.

On Linux, run `sh "Connect Coding Tool.sh"` in a terminal. On macOS, open `Connect Coding Tool.command`. On Windows, open `Connect Coding Tool.cmd`.

## Supported project connections

| Setup choice | File updated | Format |
| --- | --- | --- |
| `codex` | `.codex/config.toml` | `mcp_servers` with a local command |
| `claude` | `.mcp.json` | Portable `mcpServers` |
| `cursor` | `.cursor/mcp.json` | `mcpServers` |
| `vscode` | `.mcp.json` | Current Copilot's portable `mcpServers` |
| `vscode-local` | `.vscode/mcp.json` | Older VS Code Local `servers` format |
| `gemini` | `.gemini/settings.json` | `mcpServers` |
| `opencode` | Existing `opencode.jsonc` or `opencode.json`; JSONC when neither exists | Current OpenCode `mcp.servers`, local command array |
| `generic` | `make-app.mcp.json` | Portable `mcpServers`; import this file in your client |

Claude Code and current Copilot can share the same `.mcp.json` connection. Make App reuses a matching entry. Disconnect it through the adapter that originally installed it. Some older OpenCode releases use a different schema; use the CLI fallback or update your harness rather than assuming the current adapter matches every historical version.

The installer preserves unrelated settings, server definitions and comments. It refuses malformed/ambiguous configuration, duplicate JSON keys, conflicting existing Make App entries and linked configuration paths. Small ownership receipts live under `.make-app/integrations/`. They contain only this connection's definition, not a backup of your other settings or credentials. Configuration embeds absolute paths to this machine's extracted bundle; do not commit those paths as team-wide installation instructions. Keep the bundle in place while connected.

## Commands and removal

The extracted archive includes `Make App.cmd` on Windows and `make-app` on macOS/Linux. Run it by its full path, or from the extracted directory. PowerShell examples:

```powershell
& '.\Make App.cmd' connect cursor --project 'C:\Projects\My Project'
& '.\Make App.cmd' status cursor --project 'C:\Projects\My Project'
& '.\Make App.cmd' disconnect cursor --project 'C:\Projects\My Project'
```

Preview changes with `--dry-run`. Disconnect removes only the managed Make App entry. If you edit that entry yourself, setup refuses to replace/remove it automatically. Run the original **Uninstall Codex Plugin** script to remove a global Codex plugin installation. Project connections and the global plugin are separate; choose one Codex route to avoid duplicate tools.

## Every harness with a local command tool

MCP is the preferred integration when supported. A harness without MCP can invoke the same engine through the CLI; it returns structured JSON and a nonzero exit status on failure:

```sh
./make-app inspect /path/to/project
./make-app make /path/to/project
./make-app make /path/to/project --format web
./make-app make /path/to/project --target server --output /path/to/MyApp.run
./make-app open /path/to/project
```

Omit the project to use the current working directory. Omit output to use a fresh filename under the sibling `Make App Outputs` folder. Explicit desktop outputs use `.exe` on Windows, `.app` on macOS and `.run` on Linux. Creating an app does not run its project code. Opening the generated app does.

For other MCP clients, `make-app config generic` prints a configuration containing real executable paths, with no shell quoting or runtime placeholders. `make-app mcp` starts the server on stdio. Clients can use the four tools or the `make-app` prompt when they support MCP prompts. No network listener, telemetry service or shared daemon is started.

Custom SDK harnesses can call `server/service.cjs` with `inspect`, `make`, `open` and `projects`; the CLI and MCP server use this same implementation. Keep this in-process API within the same pinned bundle. MCP and CLI are the recommended integration boundaries across versions.

## Local, remote and hosted sessions

The runtime must execute on the machine that can access your project and build tools. Install a matching bundle inside WSL, an SSH host, a development container or a self-hosted worker when that is where the harness runs. Output targets that environment's OS; a Linux worker cannot make a Windows app by changing its filename. Graphical converter/app launch needs an available desktop session; web export and configuration do not.

A browser-only or hosted chat cannot spawn this local stdio server or see a laptop folder automatically. It needs a supported local agent/bridge or an explicitly configured worker. This release does not expose an unauthenticated remote execution endpoint. A generic adapter is a compatibility route, not evidence that every proprietary harness or hosted environment has been tested.

Static web exports can be served over HTTPS for phones/tablets; backend/native code still needs its compatible host. Desktop apps require their original project folder. Publisher signing, clean-machine and physical-device checks remain separate preview limitations.

## Verification and format references

The integration tests generate every adapter's configuration, launch the real MCP server using its emitted executable/arguments, inspect a project and remove the connection while preserving unrelated edits. They also exercise CLI inspection, prompt discovery, fresh web output, conflicts, malformed settings and symlink refusal. This verifies the adapter and protocol; it is not a claim that every vendor's UI has been manually tested.

Formats checked against current first-party documentation:

- [OpenAI MCP configuration](https://developers.openai.com/codex/mcp/) and [plugin packaging](https://developers.openai.com/plugins/build/plugins)
- [Claude Code MCP](https://code.claude.com/docs/en/mcp)
- [Cursor MCP](https://cursor.com/docs/mcp)
- [VS Code/Copilot MCP configuration](https://code.visualstudio.com/docs/agents/reference/mcp-configuration)
- [Gemini CLI MCP](https://geminicli.com/docs/tools/mcp-server/)
- [OpenCode MCP servers](https://opencode.ai/docs/mcp-servers/)

For source development, install dependencies and run `npm run build:plugin`, then use `node integrations/codex/scripts/make-app.cjs`. Set `APPDOCK_BUILDER` to a compatible converter for native creation; complete release bundles already include it.

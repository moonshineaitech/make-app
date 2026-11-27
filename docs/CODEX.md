# Codex installation

## Recommended: the release bundle

1. Download [Make-App-Codex-Plugin-Windows-x64.zip](https://github.com/moonshineaitech/make-app/releases/download/v0.7.0/Make-App-Codex-Plugin-Windows-x64.zip) from the matching [GitHub release](https://github.com/moonshineaitech/make-app/releases). Draft assets are available only to maintainers until publication.
2. Extract the entire ZIP into a folder you will keep.
3. Double-click **Install Codex Plugin.cmd**. It verifies the package bytes and uses Codex's plugin CLI to register the local marketplace and install `make-app@make-app`.
4. Open a new Codex chat and ask: **Make an executable for this project.**

This action installs only this plugin. It does not replace your Codex configuration file, install other plugins, change Windows execution policy, or require administrator rights. It includes Node and Make App. Codex itself needs to be installed and support local plugins.

Keep the extracted folder while the plugin is installed. For updates, download and extract the new bundle, then run its installer. To remove the plugin, run **Uninstall Codex Plugin.cmd**, then delete the extracted folder if desired. Uninstall leaves the marketplace registration and unrelated plugins in place.

## Manual alternative

From the extracted release folder:

```sh
codex plugin marketplace add "<absolute path to marketplace>"
codex plugin add make-app@make-app
```

For a source checkout, install Node 24, run `npm ci --prefix integrations/codex`, then `npm run build:plugin`. Source packages need a built converter or `APPDOCK_BUILDER` pointing to one; the release bundle supplies it automatically.

## Tools and access

- `inspect_project`: read project files to infer requirements and entry points; no project execution.
- `list_projects`: best-effort saved Codex project discovery; manual folder selection remains available.
- `make_executable`: create one selected `.exe`; existing outputs are refused. Creation does not execute the project.
- `open_project`: open the converter with a selected project; no project execution.

Opening a generated executable runs that project's setup/build/run commands. The source folder must remain available. Inputs and tool results are shared with the Codex client you use; see its privacy settings. No Make App server or API key is involved.

## OpenAI Directory status

The release bundle is a local plugin, not a public-directory listing. Desktop-only local MCP submissions require OpenAI allowlisting, verified publisher access, clean desktop installation testing and review. The repository includes a submission preparation guide; it does not claim approval.

Official references: [plugin packaging](https://developers.openai.com/plugins/build/plugins), [desktop-only submission](https://developers.openai.com/plugins/deploy/desktop-only).

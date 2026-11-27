# One-click project executables — 0.7

The deliverable is the project's own `.exe`. Make App is a converter: select a folder, then save a file. Generated applications open directly without a catalog, approval wizard, setup button or second Run button for web/native apps. CLI tools retain a terminal or output window appropriate to their interface.

A small Rust Windows launcher contains the desktop runtime and inferred project settings in its payload. At launch it verifies those bytes with Windows SHA-256, caches the runtime by its content hash, and opens the selected project. Multiple apps share that runtime cache and private SDK caches; each app has separate state and data. No full project clone is created. Project setup and build commands can update the selected source folder.

First launch may prepare dependencies or download a compatible SDK from its publisher. A progress window is followed by the app itself. Later launches reuse setup and builds when their identities match. Detection runs again on launch; changing executable entry points can require regenerating the launcher.

The source folder must stay in place. These files are local launchers, not source-inclusive distributions for arbitrary computers. Secrets, databases, external services and platform-specific SDKs are not invented or bundled. Missing settings produce a launch error. Python currently needs an installed compatible interpreter.

The Windows Codex bundle includes `make_executable(path, output, target?)`, the converter and Node. Creating an executable does not run project code. Inspection and saved-project discovery remain available. Public directory publication, signing, clean-machine acceptance, manual accessibility acceptance and macOS/Linux releases remain outstanding.

Developer command:

```powershell
node src/cli.cjs make-executable "C:/Projects/My Project" --output="C:/Apps/My Project.exe"
```

Source use needs a built runtime in `release/`, or `APPDOCK_EXECUTABLE_TEMPLATE` for development. The packaged converter supplies its runtime automatically. Only create/run executables from projects you trust.

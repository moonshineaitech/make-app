# One-click project executables

The deliverable is the project's own `.exe`. Make App is a converter: select a folder, then save a file. Generated applications open directly without a catalog, approval wizard, setup button or second Run button for web/native apps. CLI tools retain a terminal or output window appropriate to their interface.

A small Rust Windows launcher contains the desktop runtime, compressed project snapshot and inferred project settings in its payload. At launch it verifies those bytes with SHA-256, caches the desktop runtime by its content hash and extracts a private writable project copy. The project includes its dependencies and required managed runtime or compiled artifact. The original source folder and Make App installation are not required on the receiving computer.

Packaging prepares dependencies and required builds in a temporary snapshot. A first-launch progress window covers verification and extraction, followed by the app itself; recipients do not repeat dependency installation or download the bundled runtime. Later launches reuse the extracted copy. Regenerate the app to include new source changes.

Move or share the single Windows EXE or Linux run file, or zip the complete macOS app bundle. Output must match the recipient's OS and architecture. Windows single-file output is limited to 2 GB. Dot-env files and private keys are excluded; external services, credentials, databases, hardware and OS libraries remain application requirements. Unsupported self-contained runtime combinations fail with a packaging explanation. Older source-linked launchers must be regenerated.

The optional coding-tool bundle includes `make_executable(path, output, target?)`, the converter and Node. Packaging may run dependency/build scripts with your account's permissions. It does not open the finished app. Inspection and saved-project discovery remain available. Native launch acceptance covers all five desktop targets; publisher signing, macOS notarization, physical clean-machine and manual accessibility acceptance remain separate preview gates. The integration is not a public OpenAI Directory listing.

Developer command:

```powershell
node src/cli.cjs make-executable "C:/Projects/My Project" --output="C:/Apps/My Project.exe"
```

Source use needs a built runtime in `release/`, or `APPDOCK_EXECUTABLE_TEMPLATE` for development. The packaged converter supplies its runtime automatically. Only create/run executables from projects you trust.

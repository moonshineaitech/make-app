# Third-party components

AppDock's application code and native process supervisor are MIT licensed; see LICENSE.

The packaged desktop runtime includes Electron/Chromium and their accompanying license files. The application includes smol-toml (BSD-3-Clause), with its original license in the bundled dependency directory. The Codex plugin includes the MCP SDK and Zod with their dependency licenses.

The Windows supervisor links the Rust standard library. Its library copyright notices and referenced licenses are included under resources/bin/RUST-STANDARD-LIBRARY-NOTICES.html and resources/bin/licenses in the desktop distribution. The native source and notices are also provided in the source package.

Downloaded project runtimes, compilers, package managers and project dependencies are separate components with their own licenses. They are downloaded from their publishers during approved setup and are not all bundled in the AppDock executable. A runtime dependency SBOM is included in qa/sbom.cdx.json. This inventory does not establish the licensing or safety of projects opened with AppDock.

## Interactive terminal

- node-pty 1.1.0 — MIT, Microsoft Corporation; bundled LICENSE and third_party/conpty license apply to native terminal components. https://github.com/microsoft/node-pty
- xterm.js 6.0.0 and fit addon 0.11.0 — MIT, xterm.js contributors. https://github.com/xtermjs/xterm.js
- node-addon-api — MIT, Node.js contributors (dependency of node-pty). Package license files are included with distributed dependencies.

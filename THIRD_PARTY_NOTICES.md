# Third-party components

AppDock's application code and native process supervisor are MIT licensed; see LICENSE.

The packaged desktop runtime includes Electron/Chromium and their accompanying license files. The application includes smol-toml (BSD-3-Clause), with its original license in the bundled dependency directory. The coding-tool bundle includes the MCP SDK, Zod and Microsoft's jsonc-parser 3.3.1 (MIT), with their dependency licenses. jsonc-parser preserves comments while updating project connections.

The Windows process supervisor and native Windows/Linux launchers link the Rust standard library. Its library copyright notices and referenced licenses are included under resources/bin/RUST-STANDARD-LIBRARY-NOTICES.html and resources/bin/licenses in the desktop distribution. The Rust source is provided in the source package; notices are copied from the compiling toolchain during packaging.

Downloaded project runtimes, compilers, package managers and project dependencies are separate components with their own licenses. They are downloaded from their publishers during approved setup and are not all bundled in the AppDock executable. A runtime dependency SBOM is included in qa/sbom.cdx.json. This inventory does not establish the licensing or safety of projects opened with AppDock.

## Interface fonts and icons

- Geist Sans and Geist Mono 1.9.2, Vercel and basement.studio — SIL Open Font License 1.1. Fonts are bundled locally. The license is included in src/ui/assets/licenses/geist.txt.
- Lucide 1.82.0 — ISC, Lucide contributors; the upstream distribution also includes Feather notices. Original notices are included in src/ui/assets/licenses/lucide.txt.
- Exact upstream package URLs, versions and integrity checks are recorded in src/ui/assets/provenance.json. These assets are shared by the desktop interface and static website.

## Terminal components

- node-pty 1.1.0 — MIT, Microsoft Corporation; bundled LICENSE and third_party/conpty license apply to native terminal components. https://github.com/microsoft/node-pty
- xterm.js 6.0.0 and fit addon 0.11.0 — MIT, xterm.js contributors. https://github.com/xtermjs/xterm.js
- node-addon-api — MIT, Node.js contributors (dependency of node-pty). Package license files are included with distributed dependencies.

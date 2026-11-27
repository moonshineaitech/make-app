# Validation and open gates

Verification records apply to a particular build, source commit and environment. They do not establish universal application compatibility.

## Local Windows evidence

- 80 regression tests passed, with zero skipped tests.
- Three plugin protocol/integrity tests passed.
- Three actual project executables opened their app windows with zero extra setup/approval clicks, then stopped their managed processes. Original source fingerprints remained unchanged. These tests used an intermediate 0.8 development executable; final release binaries are gated independently by native matrix acceptance.
- The creator passed automated WCAG-tagged checks in light/dark themes at 320, 520 and 900 pixels, without horizontal overflow.
- A static web export rendered at 390, 768 and 1280 pixels. Its service worker controlled the app, and the app reloaded after its HTTP server stopped, with browser storage preserved and no Node bridge exposed.
- On one existing TypeScript project with 1,875 files and 805,820,396 bytes of content, cold hashing took 2,718 ms and the warm pass took 292 ms. Both produced the same fingerprint; the warm pass reread zero file contents. This 9.3-times measurement describes hashing on one Windows host, not whole-app launch speed.

Sanitized aggregate records are in `qa/`. Private project names, filesystem paths, screenshots and raw project logs are excluded from the repository and release assets. External credentials were disabled in project launch acceptance. Cloud authentication, scientific correctness and game mechanics were not validated.

## Native desktop matrix

[Build and exercise desktop apps](https://github.com/moonshineaitech/make-app/actions/workflows/cross-platform.yml) targets Windows x64, macOS ARM64/Intel and Linux x64/ARM64. Each job compiles its native launcher, checks SHA-256 vectors, runs applicable regressions/plugin tests/audits, builds the converter, creates an app through its UI, verifies actual tool output and shutdown, and packages its complete plugin archive.

Windows-specific tests are explicitly skipped on Unix. Packaging success and app-launch success are separate steps. A draft release can consume only a successful five-target run for the exact source commit. `BUILD-VERIFICATION.json` identifies the source SHA and native jobs attached to a release.

## Open acceptance gates

Publisher signing/notarization, clean-machine acceptance, manual screen-reader/high-DPI review, and physical iPhone/iPad/Android testing remain open. Chromium viewport/offline checks do not certify Safari or physical mobile devices. A local app window does not prove authenticated cloud workflows.

The legacy native-permission smoke harness has an unresolved always-on-top assertion on the development Windows host. The release acceptance exercises the converter/generated-app flow; it does not certify every legacy native capability. Python/native SDK/framework coverage and OS requirements vary by project. Desktop launchers require the original project folder; web exports do not execute native/backend code on phones.

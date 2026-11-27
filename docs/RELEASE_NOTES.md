# Make App 0.8.0 — desktop and web preview

Choose a project and create a native desktop app, or export an existing static web build for phones, tablets and browsers. No Make App account, API key or hosted platform is required.

Seven areas improved:

1. Native Windows EXE, macOS application-bundle and Linux executable output, plus installable static web exports.
2. OS/architecture-aware SDK selection, installed Node reuse and missing Python preparation.
3. Incremental direct-launch hashing, Unix process supervision, cancellation and atomic output. On one 1,875-file actual project, warm hashing was 9.3 times faster (2,718 ms to 292 ms); this is not an end-to-end launch speed guarantee.
4. Project/output/review UI with detected requirements, accurate formats, progress and cancellation.
5. Responsive light/dark layouts, keyboard controls, accessible status/error handling and high-contrast/reduced-motion support.
6. Safer static exports with file-type filtering, hidden-file/source exclusions, symlink refusal, scoped offline caches and common credential-signature checks.
7. Complete OS-specific Codex plugin bundles and native build/launch acceptance on five desktop targets, with checksums and dependency inventories.

Download the converter or complete plugin bundle matching your OS/architecture. The plugin archive includes Node and the converter. Extract it to a stable folder and run its Install Codex Plugin script. Desktop apps require their original project folder. Web exports require HTTPS hosting and do not execute backend/native code in a phone browser.

This is an unsigned, non-notarized preview. Signing, clean-machine, physical mobile-device and manual accessibility acceptance remain separate gates. The independent local plugin is not an approved OpenAI Directory listing. Build verification records identify the exact source commit and native workflow used for release assets.

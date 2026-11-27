# Contributing

Small, focused changes with a minimal public fixture are welcome. Use Node 24 LTS and the checked-in lockfiles. Windows x64 is the release target; do not claim other hosts are supported without real acceptance evidence.

Before a pull request, run `npm test`, `npm run test:plugin`, and the checks appropriate to the adapter or workflow changed. Native tests require the two Rust helpers; build them with `npm run build:supervisor` and `npm run build:launcher`.

Keep source detection read-only. Commands must use executable/argument arrays rather than shell-built strings. Preserve source folders, keep secrets out of logs and manifests, and stop processes created by tests. Add a meaningful execution fixture for new adapters; manifest recognition alone is not enough.

Do not commit runtimes, SDK caches, generated executables, project archives, personal test data or environment files. Release binaries belong in GitHub Releases. Use SECURITY.md for vulnerabilities. Contributions are provided under the repository's MIT license.

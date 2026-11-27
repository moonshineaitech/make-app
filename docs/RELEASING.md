# Releasing

The public repository contains source and sanitized evidence. Keep converter/plugin binaries in GitHub Releases. Never attach private project executables or raw private acceptance data.

## Native builds

Run **Build and exercise desktop apps** for the intended source commit. Its five native jobs compile helpers, run regressions/plugin tests/audits, build the host converter, create and launch a real app, then package the converter and complete plugin archive. Platform manifests contain the exact asset sizes and hashes. Temporary Actions artifacts use one-day retention.

The local packager takes `APPDOCK_PLUGIN_NODE` and `APPDOCK_PLUGIN_BUILDER`; macOS also takes `APPDOCK_CONVERTER_ASSET` pointing to the converter ZIP. Python 3 creates ZIP/tar archives. Symlinks remain internal to the macOS/plugin bundle and are validated by its integrity inventory.

## Draft release

Fast-forward the tested source commit to `main`, then run **Create verified draft release** on that same commit with its successful native workflow run ID. The preflight requires all five platform jobs to pass and all five artifacts to be available. The release job downloads only those assets and checks every file against its expected platform manifest and checksum list before creating a draft prerelease.

The release workflow does not rebuild unreviewed source or publish the draft. Its `BUILD-VERIFICATION.json` links the exact commit and native jobs; it is a verification receipt, not a cryptographic provenance or reproducible-build certification. Review downloaded assets, hashes, limitations and OS trust behavior before publishing. When immutable releases are enabled, attach every asset before publication; ship later changes under a new version.

Workflow actions are pinned to full commit SHAs; checkout credentials are not persisted. Build jobs are read-only. Only the separate draft job has release-write permission. It validates source/run identity before downloading assets and runs only the repository's asset verification code.

Keep unsigned previews labeled accurately. Do not call the application production-ready while signing, clean-machine and manual accessibility gates are open. X announcements and OpenAI Directory submission remain separate publisher actions.

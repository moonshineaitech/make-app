# Releasing

The public repository is source-only. Put the converter, plugin ZIP, checksums and SBOM in GitHub Releases. Do not attach personal project executables or private acceptance logs.

Build and verify before creating a tag. `npm run package:release` uses `APPDOCK_PLUGIN_NODE` and `APPDOCK_PLUGIN_BUILDER` to package the tested binaries, plus Python 3 to create the ZIP. The release manifest lists the exact artifact hashes.

The release workflow creates a draft prerelease and uploads all assets. It does not publish the release automatically. Review the downloaded files, checksum manifest, workflow results and limitations before publication. Enable immutable releases and private vulnerability reporting in repository settings. When immutability is enabled, attach all assets before publishing; publish changes as a new tag instead of replacing existing files.

Actions are pinned to full commit SHAs, checkout credentials are not persisted, ordinary verification has read-only permissions, and only the release job can write release assets/attestations. Hosted attestations exist only after a successful hosted build. They do not establish a reproducible-build assurance level.

The unsigned preview must remain labeled as such. Do not call it production-ready while signing, clean-machine and manual accessibility acceptance remain open. X announcement drafts are provided separately; posting them is a publisher action.

References: https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases and https://docs.github.com/en/actions/reference/security/secure-use.

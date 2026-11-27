# Validation and known limits

Recorded local Windows x64 baseline for 0.7.0:

- 72 regression tests passed with zero skipped tests.
- Ten executable language examples passed across nine language families.
- Three actual generated project executables opened their own app windows with zero additional setup/approval clicks, then stopped their managed processes. Original source fingerprints were unchanged in those checks.
- Light and dark converter screens had no confirmed automated accessibility violations.
- Converter and plugin npm audits had zero known findings at the recorded audit time. This excludes opened-project dependencies and downloaded SDKs.

Private project names, paths, screenshots and raw logs are excluded from the public repository and release. Tests used credential-free local workflows; external authentication, background email, scientific correctness and game mechanics were not validated.

Read the [Windows verification runs](https://github.com/moonshineaitech/make-app/actions/workflows/verify.yml) for current hosted CI results. Local and hosted results cover different environments. Signing, clean-machine acceptance and manual accessibility acceptance remain open. Automated accessibility checks are not manual screen-reader/high-DPI certification.

Only Windows x64 has release acceptance. Python needs an installed interpreter. Libraries without executable entries need a consumer; unusual frameworks, external databases, GPU workloads and unsupported native SDKs can require project work. Do not advertise universal compatibility based on detection alone.

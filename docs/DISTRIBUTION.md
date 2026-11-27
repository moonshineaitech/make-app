# Distributing Make App

Make App is free, MIT-licensed desktop software. A website introduces the product; a file host or storefront delivers the downloads. The desktop converter runs locally and does not require a hosted Make App service.

## Recommended launch

Use a branded static website as the main link, with GitHub Releases for source-linked binaries and itch.io as an optional free or pay-what-you-want mirror. This keeps downloads useful without introducing accounts or licenses into the app. A Whop or Gumroad listing can offer paid downloads, support or a separate service later. Establish the scope and price of any paid offer before publishing it.

The website is built with `npm run build:site`; upload `web-dist/` to a static HTTPS host. Its download chooser reads published GitHub releases when opened and never exposes draft assets. Review a release before publishing it. A draft release URL is only useful to repository maintainers, not as a customer download link.

## Upload checklist

For each OS/architecture, upload the unchanged converter and complete coding-tool bundle, its `SHA256SUMS`, CycloneDX SBOM and release manifest. Include `BUILD-VERIFICATION.json` and link the exact source commit. Preserve artifact names when mirroring so the manifest and checksums still match. Do not repackage a binary under another OS label.

| Target | Converter | Coding-tool bundle |
| --- | --- | --- |
| Windows x64 | `Make-App-Windows-x64.exe` | `Make-App-Codex-Plugin-Windows-x64.zip` |
| macOS Apple Silicon | `Make-App-macOS-arm64.zip` | `Make-App-Codex-Plugin-macOS-arm64.tar.gz` |
| macOS Intel | `Make-App-macOS-x64.zip` | `Make-App-Codex-Plugin-macOS-x64.tar.gz` |
| Linux x64 | `Make-App-Linux-x64.AppImage` | `Make-App-Codex-Plugin-Linux-x64.tar.gz` |
| Linux ARM64 | `Make-App-Linux-arm64.AppImage` | `Make-App-Codex-Plugin-Linux-arm64.tar.gz` |

For itch.io, mark platform-specific uploads for Windows, macOS or Linux; distinguish CPU architectures in the display labels. Keep the coding-tool bundles as clearly labeled optional downloads. If using butler, preserve the exact downloadable archives as an alternative and verify the installed layout before promoting a channel. Do not upload a desktop application as a browser game.

For Whop, use a digital-download/software product with the platform-specific archives and a short installation guide. The core MIT code remains free and redistributable; do not promise exclusive ownership, proprietary source access or automatic entitlement enforcement. Any paid support agreement is separate from the application's license.

## Describe the product accurately

Make App detects supported local project setups and creates launchers. It does not guarantee that every repository works or that missing SDKs, credentials or hardware are supplied. Generated desktop launchers retain the original project path; they are not source-inclusive packages for other computers. Static web export needs an existing static build and HTTPS hosting. Hosted-only coding tools need a local bridge or worker.

State the unsigned preview status before download. Signing, macOS notarization, clean-machine testing and manual accessibility acceptance are separate release gates. Do not imply that passing CI is publisher certification or an OpenAI endorsement. No accounts, analytics, remote fonts or Make App API key are required by the application. Opening website downloads contacts GitHub's public release API.

## Other channels

Steam accepts non-game software only in listed categories; a general developer utility is not an automatic fit. Confirm eligibility before paying the application fee or preparing a Steam launch. Microsoft Store and Mac App Store need their own packaging, policy review and execution-model assessment; the current portable downloads are not store submissions. A public download host can serve the existing files without those store integrations.

For large binary mirrors, use object storage or a storefront with suitable file limits. Do not put large desktop downloads directly in a static-site source repository. An alternative download provider should use a verified manifest and explicit trusted hosts, rather than accepting arbitrary download URLs.

## Official references

- [itch.io pricing](https://itch.io/docs/creators/pricing) and [creator FAQ](https://itch.io/docs/creators/faq)
- [Whop product overview](https://whop.com/blog/what-is-a-whop/)
- [Steam onboarding and accepted software categories](https://partner.steamgames.com/doc/gettingstarted/onboarding)
- [Steam application fee](https://partner.steamgames.com/doc/gettingstarted/appfee)
- [Cloudflare Pages file limits](https://developers.cloudflare.com/pages/platform/limits/)

Store features, limits and fees can change. Check the official pages when creating a listing.

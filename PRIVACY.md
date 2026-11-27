# Privacy

Make App does not operate an account system, telemetry service, advertising tracker or hosted project-storage service.

The converter reads the project folder you choose to infer its setup and launch commands. Generated local launchers contain the selected local path and inferred settings. Keep them private when that metadata is sensitive. They are not source-inclusive distributions.

App state, cached runtimes/SDKs, encrypted saved settings and run records are stored locally. The normal flow does not clone the full source tree. Project code and its setup scripts run under your account and can read files or contact services as they normally would.

Runtime, SDK and dependency preparation can contact publisher download services and package registries. Your projects can make their own network requests. Those services have their own policies.

The optional local Codex plugin reads selected project files, reports detection results and creates the output file you request. Tool inputs and results pass through your Codex client; its privacy settings and terms apply. Make App does not add a separate relay server. Do not include credentials in tool arguments, issue reports, screenshots or public launchers.

GitHub hosts the source, downloads and issue tracker and applies its own policies. Public issues are public: redact personal paths, source code and tokens before posting. See SECURITY.md for private vulnerability reports.

Direct launchers can cache file metadata and content hashes locally to avoid rereading unchanged files. This cache contains relative filenames and hashes, not source contents. Native capability approval checks read source contents freshly. Static web exports copy public assets to a selected new directory for hosting; review those assets before publishing. Make App does not upload them automatically.

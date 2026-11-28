# Privacy

Make App does not operate an account system, telemetry service, advertising tracker or hosted project-storage service.

The converter reads the project folder you choose to infer its setup and launch commands. Generated standalone apps contain a compressed copy of the project, dependencies and required runtime or compiled artifact, with commands relative to that copy. Anyone receiving the app can extract its included files. Review the project before sharing: common secret files are excluded, but custom files or credentials embedded in source and built assets may remain. Make App does not upload generated apps automatically.

App state, cached runtimes/SDKs, encrypted saved settings and run records are stored locally. Packaging uses a temporary project snapshot and may execute dependency/build scripts there. A receiving computer extracts a private writable copy into local app storage. Opening a live project directly in the converter uses that original folder. Project code and its setup scripts run under your account and can read files or contact services as they normally would.

The creator remembers recently selected project paths and up to twenty completed export receipts, including source/output paths, names, platform, time and file size, in local app storage. Recognized desktop receipts also retain a SHA-256 hash of their embedded export settings and the time their saved location changed. Find moved app reads the file or complete app bundle explicitly selected in the native picker and compares those settings before changing the receipt; it does not scan your drives or open the selected app. Available older entries can acquire their settings hash when Recent apps loads. Clearing Recent apps removes those receipts without deleting exported files. Copy path writes the selected path to your system clipboard only when requested; the creator does not read your clipboard.

Check launch runs an exported app under your account with temporary profile, home, cache and app-data paths. App code retains its normal access to the computer and network; this is not a sandbox. The temporary receiving copy is removed when the check ends, and a cleanup problem is reported if removal fails. Recent apps stores the last check status, time and bounded diagnostic text locally. Known environment-secret values are redacted from returned diagnostics. No page content or source files are included in the check result, and results are not uploaded. Copy result writes the displayed report to your clipboard when requested.

Runtime, SDK and dependency preparation can contact publisher download services and package registries. Your projects can make their own network requests. Those services have their own policies.

The optional local Codex plugin reads selected project files, reports detection results and creates the output file you request. Tool inputs and results pass through your Codex client; its privacy settings and terms apply. Make App does not add a separate relay server. Do not include credentials in tool arguments, issue reports, screenshots or public launchers.

GitHub hosts the source, downloads and issue tracker and applies its own policies. Public issues are public: redact personal paths, source code and tokens before posting. See SECURITY.md for private vulnerability reports.

Direct launchers can cache file metadata and content hashes locally to avoid rereading unchanged files. This cache contains relative filenames and hashes, not source contents. Native capability approval checks read source contents freshly. Static web exports copy public assets to a selected new directory for hosting; review those assets before publishing. Make App does not upload them automatically.

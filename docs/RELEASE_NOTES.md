# Make App 0.18.1 — practical standalone packages

Standalone packaging now excludes known generated output folders (release, public-release, work and outputs) when the project explicitly ignores them. Runtime commands and workspace paths take precedence, and production build assets such as dist remain included. This avoids embedding old installers and development tool archives in a new app. A Windows single-file size guard refuses oversized output before replacing any existing file.

## Previous: Make App 0.18.0 — standalone desktop apps

Generated desktop apps now contain a streamed, compressed project snapshot, installed dependencies and a managed runtime or a compiled artifact. Move or share the Windows EXE or Linux run file; macOS apps include the payload inside their application bundle. The recipient does not need the original project directory or Make App installed. A private writable copy is extracted on first use, with application data stored on the receiving computer.

Node apps include the verified Node distribution and their package manager when needed. Supported compiled adapters build in temporary source snapshots and ship their artifacts rather than requiring the recipient to install the compiler. Python and Java retain bundled interpreter runtimes. Packaging refuses unsupported self-contained runtime combinations instead of creating a launcher tied to the developer computer.

Packaging can run dependency and build scripts. The original project stays untouched. Dot-env files, private key files, version-control folders and common caches are excluded; external services, credentials and OS libraries remain application requirements. Native acceptance verifies relocated output after deleting its temporary source, with a new profile and runtime downloads blocked. Builds remain unsigned previews and GitHub assets remain draft.

## Previous: Make App 0.17.0 — a shorter local desktop flow

Choose a project, create its app, then use Open app from the same primary button. Desktop creation now saves a fresh file on your Desktop by default, without a save-location prompt or overwriting existing apps. An optional Ask where to save choice remains available. The last successfully inspected native project is restored on the next start, without running it automatically.

Creation still does not execute project code. Open app is a separate user action and starts only the desktop output created by this converter session. Closing the converter leaves the opened app independent. Every native target checks the real desktop create/open/shutdown path, zero save prompts, ordinary launch and an empty-cache runtime download. Browser demonstrations remain clearly labeled and do not open local executables.

The existing designs and optional integrations are retained. No account, hosted workspace or website is needed to use the desktop converter. Preview builds remain unsigned; macOS publisher notarization is separate.

## Previous: Make App 0.16.0 — eight Aero refinements

Eight cumulative passes refine the approved photographic direction: composition and materials; desktop navigation; project workspace; current-atmosphere exhibits; tactile controls and truthful creation feedback; complete website and download flow; quieter glass motion with an explicit preview; and small-screen, keyboard and assistive-display refinements. All twenty themes, twelve utility views, original creator compositions and bundled artwork remain.

New interaction checks cover project-search shortcuts, pin focus, theme focus, motion preview, gallery empty-state recovery, live workspace links and platform-specific installation hints. Source, native and fresh-cache qualification records are specific to this release. The site remains local and binaries remain unsigned previews.

## Previous: Make App 0.15.0 — complete Aero design and first-launch verification

The complete website now shares the application's photographic Aero materials, readable typography and glass controls. Its live gallery includes all twenty designs, Original/Studio collection filters and search. Selecting a design updates the actual embedded interface; it remains a clearly labeled browser demonstration with sample projects.

All twenty app designs and twelve utility views retain the refined workspace, direct saved-project access, keyboard-accessible compact navigation, and in-place Appearance library. Original photographic creator compositions and artwork are preserved. Both collections retain adjustable glass motion and operating-system reduced-motion support.

Windows runtime setup uses the built-in native ZIP extractor when available, with the PowerShell fallback retained for compatible older environments. A new native acceptance phase starts with an empty runtime cache, bypasses an installed Node executable, downloads and verifies the official runtime, launches the original project with no setup clicks, and checks shutdown. Cold-runtime verification is required for every desktop target and embedded in each platform manifest. The cold test has a bounded setup-specific deadline; the ordinary launch smoke retains its shorter deadline.

Draft creation now also requires successful source/interface verification for the exact native-build commit. Download files, complete coding-tool bundles, checksums, dependency inventories and platform manifests are built together. The release remains an unsigned, non-notarized preview; signing, physical-device and manual accessibility acceptance are separate gates. The website remains local unless its owner chooses to publish it.

Fresh-cache acceptance exposed and corrected the Linux Node release selector: the official index uses `linux-x64` and `linux-arm64`, while macOS uses the `-tar` suffix. Existing installed runtimes had hidden the Linux download failure. Failed setup now reaches the smoke report immediately, and native diagnostic artifacts are retained on failed jobs.

## Previous: Make App 0.14.0 — a clearer Aero workspace

The overview now shows saved projects directly, alongside the current project's original glass illustration, output and detection status. Horizontal layouts use four primary destinations and a keyboard-accessible More menu. Existing sidebar compositions and all twelve utility views remain available.

The Appearance library includes larger previews, live search, Original/Studio collection filters and a current-design marker. Applying a theme keeps the library and search open and preserves the selected project. The glass surfaces, typography, scrollbars, project rows and narrow layouts are refined across all twenty designs. The measured photographic creator screens and existing artwork are retained.

Release verification is recorded per build. Local Windows packaging and renderer checks do not imply that a new native Mac/Linux matrix has run. Previous verified 0.13 downloads remain separate from this design iteration. Preview signing and clean-machine requirements still apply.

## Previous: Make App 0.13.0 — complete Aero workspaces and glass motion

Both interface collections are included: the original ten photographic designs, each with its creator and twelve matching screens, plus ten additional Studio designs. Switch collections and themes without losing your selected project or creation progress. All artwork is bundled locally.

Seven coordinated motion treatments cover glass highlights, entrances, press feedback, ripples and focus, image depth, panel lighting, and selection/build/success feedback. Choose Glass, Subtle or Reduced motion in Preferences. System reduced motion takes precedence, and decorative motion pauses while the app is hidden.

The twelve utility views include project search and pins, project details, output formats, first launch, build activity, recent apps, coding tools, appearance, preferences, help and about. The website shares the actual renderer with clearly labeled sample data.

Download the converter for your own operating system, or the complete coding-tool bundle if you want Codex/MCP integration. Windows uses a portable EXE; macOS uses a ZIP containing an app; Linux uses an AppImage. Apple Silicon, Intel Mac, Linux x64 and Linux ARM64 have separate builds. No global Node installation, account or API key is needed to open the converter. Project-specific runtimes may still be required.

Local 0.13 verification recorded 294 layout checks, 32 automated accessibility scans, all twenty motion themes and a native Windows creation smoke. Release assets are admitted separately by the exact-commit native five-target workflow and source verification; see BUILD-VERIFICATION.json for the release's actual evidence.

This is an unsigned, non-notarized preview. Generated desktop launchers require the original project folder and a compatible computer. Web exports serve existing static builds; they do not make backend or native code run on phones. This independent integration is not an approved OpenAI Directory listing. See [distribution guidance](https://github.com/moonshineaitech/make-app/blob/main/docs/DISTRIBUTION.md).

## Previous: Make App 0.11.0 — photographic Aero interfaces

The ten selected Aero concepts now use their original scenic artwork, glass frames, pictograms and button materials, with measured 1487 × 1058 layouts. Project paths, saved projects, app names, output choices and creation actions remain real editable controls. Each design retains its own composition, including Botanical’s sidebar, Citrus’s three columns and Pearl’s creation summary.

Click the Make App wordmark or press Alt+T to change themes. The native creator uses the illustrated titlebar with working minimize, maximize/restore and close controls. Click the detected project to review requirements and entry points. Narrow windows, zoom and forced colors retain the responsive form. The website uses the same renderer and clearly labeled samples.

## Previous: Make App 0.10.0 — ten atmospheres, one click

Open **Themes** to choose Midnight Tide, Botanical Canopy, Stratosphere, Pearl Current, Citrus Circuit, Cobalt Hydro, Aurora Lake, Sunset Estuary, Glacial Quartz or Meadow OS. Each appearance includes locally bundled scenery, optical glass materials and a coordinated palette. Classic keeps system, light and dark modes. Existing preferences are preserved; new profiles start in Midnight Tide.

- The thumbnail chooser supports keyboard navigation, Escape dismissal and focus restoration. Choices persist locally and synchronize between windows in the same profile. Theme changes preserve the project, output format, name and active creation.
- The ten backgrounds, thumbnails and three glass ornaments add approximately 2.9 MB, require no network access and contain no project content. Unsupported storage falls back to a session-only choice.
- Larger labels, inputs and supporting copy, stronger contrast, 200% zoom support and narrow-window layouts keep the new materials readable. Theme color schemes override an opposing OS palette explicitly.
- The complete website retains a full-size interactive creator preview and the same theme chooser. The preview labels its sample projects and cannot read files or create executables.
- Automated Aero verification covers every theme at four widths, chooser states, persistence, invalid preferences and creation. The existing native creator, website and five-target desktop acceptance remain separate checks.

## Existing desktop and integration capabilities

The creator and complete product website now share a new interface: warm translucent materials, locally bundled Geist typography, precise iconography and a quieter hierarchy. Project selection, output format and saving stay in one view. System, light and dark appearance modes carry through to the launch and terminal screens.

- Responsive layouts, readable supporting text, visible keyboard focus, reduced-motion support and forced-color fallbacks.
- A complete static website with an interactive sample-project preview, coding-tool tabs, device guidance, FAQs and a platform-specific download chooser. The preview uses the actual app renderer without reading files, creating apps or running project code.
- The download chooser uses published GitHub assets and explains when builds remain in draft review. No remote fonts, analytics, account or application backend.
- Stale project-inspection responses cannot enable creation for a newly typed folder. Switching projects clears outdated results and requirements.
- Windows portable runtimes and Linux extract-and-run AppImages now use separate extraction directories for every launch, preventing overlapping apps from replacing or removing each other's runtime files. Linux temporary directories are private and cleaned on exit. Native acceptance starts a second app after the first project is running, then checks both results and shutdown.
- A bounded native Electron design check covers 15 responsive/theme combinations, automated accessibility rules, preview sizing and creation, cancellation, invalid-folder and website-control states. Native acceptance separately creates and launches generated apps on all five desktop targets.

See docs/INTERFACE.md for website preview, hosting and verification instructions.

## Coding-tool integrations

Ask your coding tool to make an app for the current project. The Codex plugin now chooses a fresh output name automatically and includes the updated run-project skill. The same engine is available through MCP and a JSON command-line interface.

- Complete platform bundles include a Connect Coding Tool setup and a Make App command. No Codex installation, global Node or API key is required for other harnesses.
- Project-scoped adapters cover Codex, Claude Code, Cursor, current VS Code/Copilot, legacy VS Code Local, Gemini CLI, OpenCode and generic MCP import. Current Copilot and Claude can share the portable .mcp.json connection. The OpenCode adapter targets its current mcp.servers schema.
- Setup preserves comments and other server settings, supports preview/status/removal, refuses conflicting or malformed settings, and rejects linked configuration paths. Disconnect preserves unrelated changes made after installation.
- The CLI and MCP tools use one shared implementation for inspection, native creation, static web export and converter handoff. Only the local project path is required for creation. Default outputs are new siblings under Make App Outputs.
- A reusable make-app MCP prompt guides clients that support prompts. The Codex plugin also includes the run-project skill.
- Runtime dependency inventories now include the integration bundle's dependencies as well as the converter's.
- Source hashing retries a file from fresh metadata when OneDrive/cloud hydration changes its first-read timestamps. A hash is accepted only after a stable before/after read; persistently changing files still fail after three attempts.

Download the complete Codex Plugin archive for your desktop OS/architecture. Extract it to a stable folder. For Codex, run Install Codex Plugin and open a new chat. For other tools or project-only Codex setup, open Connect Coding Tool and choose your project. Source and detailed compatibility instructions are in docs/HARNESSES.md.

Adapters are tested by generating configurations, launching the actual MCP server through their emitted commands, invoking inspection and removing connections while preserving unrelated settings. This does not certify every vendor UI or proprietary harness. A local shell-capable harness can use the CLI; hosted-only sessions need a local bridge or accessible worker. No remote execution listener is exposed.

This remains an unsigned, non-notarized preview. Desktop apps require their original project folders and compatible hosts. Static web exports need HTTPS hosting and do not run backend/native code on phones. Signing, clean-machine, physical-device and manual accessibility acceptance remain separate gates. The independent plugin is not an approved OpenAI Directory listing. Build verification records identify the exact source commit and five native jobs used for the draft.

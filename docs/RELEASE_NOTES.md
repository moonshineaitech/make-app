# Make App 0.13.0 — complete Aero workspaces and glass motion

Both interface collections are included: the original ten photographic designs, each with its creator and twelve matching screens, plus ten additional Studio designs. Switch collections and themes without losing your selected project or creation progress. All artwork is bundled locally.

Seven coordinated motion treatments cover glass highlights, entrances, press feedback, ripples and focus, image depth, panel lighting, and selection/build/success feedback. Choose Glass, Subtle or Reduced motion in Preferences. System reduced motion takes precedence, and decorative motion pauses while the app is hidden.

The twelve utility views include project search and pins, project details, output formats, first launch, build activity, recent apps, coding tools, appearance, preferences, help and about. The website shares the actual renderer with clearly labeled sample data.

Download the converter for your own operating system, or the complete coding-tool bundle if you want Codex/MCP integration. Windows uses a portable EXE; macOS uses a ZIP containing an app; Linux uses an AppImage. Apple Silicon, Intel Mac, Linux x64 and Linux ARM64 have separate builds. No global Node installation, account or API key is needed to open the converter. Project-specific runtimes may still be required.

Local 0.13 verification recorded 294 layout checks, 32 automated accessibility scans, all twenty motion themes and a native Windows creation smoke. Release assets are admitted separately by the exact-commit native five-target workflow and source verification; see BUILD-VERIFICATION.json for the release's actual evidence.

This is an unsigned, non-notarized preview. Generated desktop launchers require the original project folder and a compatible computer. Web exports serve existing static builds; they do not make backend or native code run on phones. This independent integration is not an approved OpenAI Directory listing. See [distribution guidance](DISTRIBUTION.md).

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

# Make App 0.9.1 — a clearer way to open your work

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

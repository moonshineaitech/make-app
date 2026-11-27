# OpenAI desktop-only submission preparation

This plugin requires local filesystem access and starts a local stdio MCP server. It is desktop-only, not a remote web connector. A public HTTPS relay would not make local project files safely available and is not part of this design.

The package has a portable `plugin.json`, `mcp.json`, a compatibility `.codex-plugin/plugin.json`, four narrowly scoped tools, a run-project skill, no authentication requirement and complete platform-specific dependencies.

Before submission:

1. Publish the reviewed source and download assets. Verify that website, support, privacy and license URLs in the manifest are live.
2. Complete a clean desktop installation and the documented create/open/uninstall workflows. Record evidence separately from local development tests.
3. Have the actual submitting organization and publisher identity verified. Obtain confirmation that the organization is allowlisted for local MCP submissions through its OpenAI representative.
4. Prepare public screenshots and a short demo using the included sample projects, plus positive and negative review cases.
5. Follow the official desktop-only submission flow. Upload the plugin-root package, not the marketplace installer ZIP. Keep it a draft until all requirements are complete.

Suggested positive cases: inspect a sample without execution; create its executable; open the converter on a selected folder. Negative cases: reject an HTTP URL as a local path; refuse to overwrite an existing executable; report a library with no executable target; do not run source during inspection or creation.

No organization approval, public-directory submission or review result is claimed by the repository. Official guidance: https://developers.openai.com/plugins/deploy/desktop-only and https://developers.openai.com/plugins/deploy/submission.

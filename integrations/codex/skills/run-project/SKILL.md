---
name: run-project
description: Create a one-click Windows executable from an existing local software project, or inspect its launch requirements. Use for Make App conversion; not for publishing or deploying services.
---

Use `inspect_project` on the actual project root. If several executable targets exist, use an unambiguous target from the request or ask for the required selection. Do not invent an executable consumer for a library.

When the user asks for an app or executable, call `make_executable` with the project root and the requested absolute `.exe` output path. Choose a sensible new output filename when the task already authorizes creation and no filename was given. The tool refuses to overwrite an existing output. It creates the file without running project code.

Return the generated executable path. Explain that it opens the project directly, requires the source folder to remain in place, and does not require an AppDock installation. Do not send the user through a project library or manual configuration when automatic detection works. Creating the file is separate from testing its launch; run it only within the user's authorized scope and report observed behavior.

The complete Windows bundle includes the builder. If it is missing, identify that missing component or the APPDOCK_BUILDER override; do not claim a generated executable exists. Do not install software or change Codex settings without authorization.

Keep credentials out of arguments, manifests and chat. Missing secrets and external services still require their own setup. A local app screen does not establish cloud workflows, signing, clean-machine compatibility, or untested operating systems.

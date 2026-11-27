---
name: run-project
description: Create a native desktop app from a local software project, inspect its launch requirements, or export an existing static web build for phones and browsers using Make App.
---

Use `inspect_project` on the actual project root. If several executable targets exist, use the target clearly specified by the request; otherwise ask which program to launch. Libraries need a real executable consumer.

For desktop output, call `make_executable` with the project root and an absolute output path matching the host: `.exe` on Windows, `.app` on macOS, `.run` on Linux. Creation does not run project code. Choose a sensible new filename when creation is already authorized; existing outputs are preserved. Return the saved path and explain that the original project folder must remain in place. The converter need not stay installed.

For a phone/browser app, use `make_executable` with `format: "web"` and a new absolute output directory. This requires an existing static frontend build. Explain that the exported directory must be served over HTTPS before browser installation; offline access follows a successful first visit. A web export does not execute backend or native desktop code on the phone. Hosting the export or backend requires its own authorization; creation does not publish anything.

Use `open_project` when the user wants to choose output in the converter UI. Avoid a project library or manual configuration when detection succeeds. Creating an app and testing its launch are separate operations; execute it only within the task's authorized scope and report observed behavior.

The complete plugin archive for the current OS includes the builder and Node. If the builder is missing, identify the missing bundle or `APPDOCK_BUILDER` override rather than claiming an app exists. Keep credentials out of arguments, exported files and chat. Missing secrets, services and platform SDKs remain project requirements. Do not infer signing, clean-machine or physical-device acceptance from a successful local window.

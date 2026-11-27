# How the executable works

The generated file contains a small Rust Windows launcher, the desktop runtime and the inferred project settings. It opens the selected local project directly, without a project library or separate Make App installation.

The launcher checks its embedded settings and runtime with SHA-256, caches the runtime by its content hash, and starts it with the project's settings. Applications share that runtime cache and their SDK cache. Each application has its own state and data. These integrity checks detect damaged files; they are not a publisher signature or a security sandbox.

At launch, Make App reads the current project files again. Existing installed dependencies can be reused; missing setup and builds run automatically. Supported private build outputs and app state are kept separately, while project scripts may write their normal generated files in the source folder. No full project clone is created by the normal flow.

Web projects open their own desktop window with managed local services. Native GUI applications retain their own windows. CLI tools get streamed output, input and, on Windows x64, a real interactive terminal. Closing a managed app stops its owned process tree through Windows Job Objects.

The current artifact is a local launcher: it still requires the project folder. Source-inclusive portable distribution, publisher signing, verified macOS/Linux builds and a sandbox for untrusted projects remain future work. External credentials and services remain the project's responsibility.

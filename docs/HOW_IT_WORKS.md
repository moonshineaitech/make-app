# How an app works

On Windows and Linux, the generated file contains a small Rust launcher, the matching desktop runtime and inferred project settings. The launcher validates its settings and runtime with SHA-256 and caches the runtime by content hash. Linux can extract the embedded AppImage runtime without requiring FUSE. macOS output copies the converter application bundle, keeps its framework links relative, adds project metadata and applies a local ad-hoc signature; publisher signing/notarization is separate.

The original project stays in place. Each app owns its state while compatible runtime/SDK caches can be shared. At launch, the current entry and requirements are detected again. A compatible installed Node can be reused before a private download; missing runtimes and supported SDKs use verified publisher archives. Project setup/build scripts may write their normal generated files to the source folder. Normal desktop conversion does not clone the source.

Direct launchers optionally cache content hashes using file identity, size, modification and change times. Changed entries are rehashed; strict native-permission checks always read content freshly. Cache failures fall back to content reads. The cache is an optimization, not an execution trust boundary or security sandbox.

Web projects open their own desktop window with managed local services. Native GUI apps retain their own windows. Tools get streamed output/input and supported interactive terminals. Windows uses Job Objects; macOS/Linux use controller-owned process groups and PTY cleanup. Independently daemonized POSIX processes can escape that group, so lifecycle ownership does not isolate arbitrary hostile programs.

Web export instead copies an existing static frontend build into a new directory and adds browser installation metadata, raster/SVG icons and scoped offline caching. That output can be served over HTTPS to phones, tablets and computers. Native/backend code, databases, credentials and external services require their own host and setup.

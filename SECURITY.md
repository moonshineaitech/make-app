# Security

Use Make App with trusted projects. The generated executable can run setup scripts, builds and application code with the user's account permissions. Windows Job Objects manage process lifetime; they do not isolate files, credentials or the network.

The Windows preview is unsigned. Release SHA-256 checksums detect corruption and allow comparison with the published release; they do not replace Authenticode signing. GitHub artifact attestations apply only when the corresponding hosted build has produced them.

Report vulnerabilities using GitHub's private vulnerability reporting on this repository when available. If it is unavailable, open a minimal issue requesting a private contact without exploit details. Never put credentials, private source, database contents or personal filesystem paths in a public report.

The current preview is maintained on a best-effort basis. Please identify the affected version, host OS, project type and a minimal public reproduction. Do not attach a private project archive.

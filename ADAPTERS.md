# Declarative adapters, API v1

Adapters extend otherwise unrecognized projects. They are JSON data, not discovery code. A project with a built-in adapter or explicit recipe keeps its existing behavior. Installation is an explicit local CLI operation; running still executes trusted project commands under the user's account.

```json
{
  "apiVersion": 1,
  "id": "example.framework",
  "name": "Example framework",
  "language": "custom",
  "match": {"files": ["example.project"]},
  "plan": {
    "mode": "tool",
    "requirements": ["example-runtime"],
    "run": ["example-runtime", "example.project"]
  }
}
```

Install using `node src/cli.cjs adapter-install /absolute/path/adapter.json`. APPDOCK_DATA selects the local data directory; the desktop and CLI must use the same directory to share adapters. Match files must be literal in-project paths. API versions, working directories, task arrays, service dependency graphs, loopback URLs and readiness assertions are validated. Discovery rejects ambiguous matching adapters. Arbitrary JavaScript hooks and custom SDK download URLs are not supported.

Each adapter should include an acceptance fixture that builds/runs through ProjectSession, verifies a meaningful result, stops descendants and checks the original source fingerprint. Detection alone is not compatibility evidence. The shipped adapters.test.cjs demonstrates the contract. Public distribution, publisher review and signing are separate future work.

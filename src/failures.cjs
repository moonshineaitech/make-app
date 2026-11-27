const { redact } = require('./diagnostics.cjs');
function classify(error, { phase = 'run', task, output = '', values = [] } = {}) {
  const message = redact(error?.message || String(error), values);
  const text = message + '\n' + redact(output, values);
  const rules = [
    ['cancelled', /cancelled|canceled|aborted|AbortError/i, 'Operation cancelled', 'Run the project again when you are ready.'],
    ['workspace-busy', /Another AppDock operation|operation lease/i, 'Project is already being prepared', 'Stop the existing operation before retrying.'],
    ['missing-runtime', /Missing executable|Install or configure|Missing cached|No cached|SDK is unavailable/i, 'A required runtime is unavailable', 'Allow private runtime setup or install the named runtime, then retry.'],
    ['missing-credential', /Set environment variable|Missing recipe value: env\./i, 'A required variable is missing', 'Add the named variable in project settings. Keep its value out of source files.'],
    ['port-in-use', /EADDRINUSE|address already in use|port.*already.*use/i, 'The application port is occupied', 'Stop the other instance or make the application use its allocated PORT.'],
    ['dependency-conflict', /ERESOLVE|peer dependency|version solving failed|ResolutionImpossible|failed to select a version/i, 'Dependencies conflict', 'Review the conflicting versions in the project. The previous verified environment has been retained.'],
    ['network', /ENOTFOUND|ECONNRESET|ETIMEDOUT|fetch failed|Download failed|proxy authentication|certificate.*(?:verify|expired)/i, 'A download or service is unreachable', 'Check connectivity, proxy and certificate settings. Retry setup when the named endpoint is reachable.'],
    ['disk-full', /ENOSPC|no space left|disk.*full/i, 'There is not enough disk space', 'Free space on the AppDock storage drive, then retry. Source and saved environments are retained.'],
    ['permissions', /EACCES|EPERM|access is denied|permission denied/i, 'Access was denied', 'Check access to the named path and whether another process has locked it.'],
    ['verification', /did not become ready|verification failed|before it became ready/i, 'The application did not pass its readiness check', 'Inspect the application output and its expected endpoint. A listening port alone does not prove the application is usable.'],
    ['timeout', /timed out|exceeded .*seconds|deadline/i, 'The operation exceeded its deadline', 'Inspect the last output for stalled work before retrying.'],
  ];
  const selected = rules.find(([, pattern]) => pattern.test(text));
  const [code, , title, nextAction] = selected || [phase === 'build' ? 'build-failed' : phase === 'setup' ? 'setup-failed' : 'application-failed', null, 'The ' + phase + ' step failed', 'Review the final output for the application error. Retry after correcting the project.'];
  return { code, phase, task: task || error?.task || null, title, message, nextAction, retryable: ['network', 'port-in-use', 'workspace-busy', 'cancelled'].includes(code) };
}
module.exports = { classify };

// An inspectable explanation, derived without running project code.
function describe(record) {
  const plan = record.plan;
  if (!plan) return { schemaVersion: 1, mode: record.kind, automatic: !!record.automatic, executionStarted: false };
  const evidence = record.evidence || [record.framework === 'recipe' ? 'Explicit project recipe' : record.label || 'Detected project files'];
  return {
    schemaVersion: 1, adapterVersion: 1, mode: plan.mode, language: record.language || record.framework,
    defaultExecution:'existing folder',sourceCopiedAutomatically:false,automatic: !!record.automatic, selectionRequired: plan.configured === false,
    evidence, prerequisites: plan.requirements, requiredVariableNames: plan.requiredEnv,
    toolchains: record.toolchains || [], setupSteps: plan.setup.length, buildSteps: plan.build.length,
    services: plan.services.map(service => ({ id: service.id, dependsOn: service.dependsOn, readiness: service.ready?.json || service.ready?.contains !== undefined ? 'functional assertion' : service.ready?.url ? 'HTTP response' : service.ready?.tcp ? 'listening port' : 'process only' })),
    verification: plan.verify?.length ? 'functional assertions' : plan.mode === 'web' ? 'HTTP response; application functionality is not asserted' : plan.mode === 'tool' ? 'successful process exit' : 'process launch; native UI is not asserted',
    isolation: 'Runs with your account permissions. Private source copies are not a security sandbox.',
    executionStarted: false,
  };
}
module.exports = { describe };

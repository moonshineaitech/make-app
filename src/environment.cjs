const sensitive = /(?:TOKEN|SECRET|PASSWORD|PASSWD|API_?KEY|CREDENTIAL|DATABASE_URL|CONNECTION_STRING|SSH_AUTH_SOCK)/i;
function projectEnvironment(record, provided = {}, inherited = process.env) {
  const allowed = new Set([...(record.plan?.requiredEnv || []), ...(record.requestedEnvironmentNames || []), ...Object.keys(provided)]);
  return { ...Object.fromEntries(Object.entries(inherited).filter(([name]) => !sensitive.test(name) || allowed.has(name))), ...provided };
}
function fingerprint(record, provided = {}, inherited = process.env) {
  const environment = projectEnvironment(record, provided, inherited);
  const names = [...new Set([...(record.plan?.requiredEnv || []), ...(record.requestedEnvironmentNames || []), ...Object.keys(provided)])].sort();
  return require('node:crypto').createHash('sha256').update(JSON.stringify(names.map(name => [name, environment[name]]))).digest('hex');
}
module.exports = { projectEnvironment, fingerprint };

const path = require('node:path');
const crypto = require('node:crypto');
const { atomic } = require('./workspaces.cjs');
class RunRecord {
  constructor(record) {
    this.file = path.join(record.stateRoot || path.join(record.root, '.appdock'), 'last-run.json');
    this.value = { schemaVersion: 1, id: crypto.randomUUID(), startedAt: new Date().toISOString(), platform: process.platform, architecture: process.arch, language: record.language || record.framework, mode: record.plan?.mode, selectedTarget: record.selectedTarget || null, workspaceGeneration: record.workspaceGeneration || null, toolchains: (record.resolvedToolchains || []).map(({ kind, version }) => ({ kind, version })), phase: 'created', outcome: 'in-progress', events: [], sourceFilesIncluded: false, environmentValuesIncluded: false };
    this.queue = Promise.resolve();
  }
  event(phase, details = {}) {
    this.value.phase = phase;
    this.value.events.push({ phase, at: new Date().toISOString(), ...details });
    this.value.events = this.value.events.slice(-250);
  }
  async flush() {
    this.value.updatedAt=new Date().toISOString();
    const snapshot = structuredClone(this.value);
    this.queue = this.queue.catch(() => {}).then(() => atomic(this.file, snapshot));
    return this.queue;
  }
  async finish(outcome, details = {}) {
    Object.assign(this.value, { outcome, updatedAt: new Date().toISOString(), ...details });
    await this.flush();
  }
}
module.exports = { RunRecord };

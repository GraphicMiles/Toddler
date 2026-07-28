export const SUBAGENT_STAGES = Object.freeze([
  'planning',
  'context',
  'coding',
  'reviewing',
  'revising',
  'verifying',
  'waiting-approval',
  'completed',
  'failed',
  'cancelled',
]);

export class AgentRunBudget {
  constructor({ maxModelCalls = 3, maxFiles = 6, maxDurationMs = 5 * 60_000 } = {}) {
    this.maxModelCalls = maxModelCalls;
    this.maxFiles = maxFiles;
    this.maxDurationMs = maxDurationMs;
    this.startedAt = Date.now();
    this.modelCalls = 0;
    this.files = new Set();
  }

  addFiles(paths = []) {
    for (const path of paths) this.files.add(path);
    if (this.files.size > this.maxFiles) throw new Error(`Agent file budget exceeded (${this.maxFiles}).`);
  }

  beforeModelCall() {
    if (Date.now() - this.startedAt > this.maxDurationMs) throw new Error('Agent time budget expired.');
    this.modelCalls++;
    if (this.modelCalls > this.maxModelCalls) throw new Error(`Agent model-call budget exceeded (${this.maxModelCalls}).`);
  }

  snapshot() {
    return { modelCalls: this.modelCalls, maxModelCalls: this.maxModelCalls, files: [...this.files], maxFiles: this.maxFiles, elapsedMs: Date.now() - this.startedAt };
  }
}

export function emitSubagentStage(callback, stage, detail = {}) {
  if (!SUBAGENT_STAGES.includes(stage)) throw new Error(`Unknown subagent stage: ${stage}`);
  callback?.({ stage, at: Date.now(), ...detail });
}

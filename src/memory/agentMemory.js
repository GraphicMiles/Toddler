const STORAGE_KEY = 'forgeai_agent_memory_v1';
const MAX_FACTS = 100;
const MAX_TASKS = 50;

function readAll() {
  if (typeof localStorage === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

function writeAll(value) {
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

function workspaceKey(workspaceId) {
  return String(workspaceId || 'no-workspace').slice(0, 500);
}

export function readProjectMemory(workspaceId) {
  const key = workspaceKey(workspaceId);
  const stored = readAll()[key];
  return stored || { facts: [], tasks: [] };
}

export function rememberProjectFact(workspaceId, fact) {
  if (!fact?.approved || !['user', 'mechanical'].includes(fact.provenance)) throw new Error('Only approved user facts or mechanically verified facts may be persisted.');
  const all = readAll();
  const key = workspaceKey(workspaceId);
  const current = all[key] || { facts: [], tasks: [] };
  const entry = {
    id: fact.id || globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    text: String(fact.text || '').trim().slice(0, 2000),
    provenance: fact.provenance,
    createdAt: fact.createdAt || Date.now(),
  };
  if (!entry.text) throw new Error('Memory fact text is required.');
  const facts = [entry, ...current.facts.filter(item => item.text !== entry.text)].slice(0, MAX_FACTS);
  all[key] = { ...current, facts };
  writeAll(all);
  return entry;
}

export function createAgentTask(workspaceId, request) {
  const all = readAll();
  const key = workspaceKey(workspaceId);
  const current = all[key] || { facts: [], tasks: [] };
  const task = {
    id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    request: String(request || '').slice(0, 4000),
    status: 'started',
    files: [],
    events: [{ type: 'started', at: Date.now() }],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  all[key] = { ...current, tasks: [task, ...current.tasks].slice(0, MAX_TASKS) };
  writeAll(all);
  return task;
}

export function updateAgentTask(workspaceId, taskId, update) {
  const all = readAll();
  const key = workspaceKey(workspaceId);
  const current = all[key] || { facts: [], tasks: [] };
  let result = null;
  const tasks = current.tasks.map(task => {
    if (task.id !== taskId) return task;
    result = {
      ...task,
      ...update,
      files: update.files ? [...new Set(update.files)].slice(0, 30) : task.files,
      events: [...(task.events || []), ...(update.event ? [{ ...update.event, at: Date.now() }] : [])].slice(-50),
      updatedAt: Date.now(),
    };
    delete result.event;
    return result;
  });
  if (!result) throw new Error('Agent task was not found.');
  all[key] = { ...current, tasks };
  writeAll(all);
  return result;
}

export function projectMemoryPrompt(workspaceId) {
  const memory = readProjectMemory(workspaceId);
  if (!memory.facts.length) return '';
  return `APPROVED PROJECT MEMORY:\n${memory.facts.slice(0, 20).map(fact => `- ${fact.text} [${fact.provenance}]`).join('\n')}`;
}

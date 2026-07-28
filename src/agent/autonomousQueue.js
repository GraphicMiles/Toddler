const STORAGE_KEY = 'forgeai_android_task_queue_v1';
const MAX_QUEUE = 25;

function readAll() {
  if (typeof localStorage === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

function writeAll(value) {
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export function readAutonomousQueue(workspaceId) {
  return readAll()[String(workspaceId)] || [];
}

export function enqueueAutonomousTask(workspaceId, suggestion) {
  const all = readAll();
  const key = String(workspaceId);
  const task = {
    id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    type: suggestion.type,
    prompt: String(suggestion.prompt || '').slice(0, 4000),
    reason: String(suggestion.reason || '').slice(0, 1000),
    status: 'queued',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  if (!task.prompt) throw new Error('Queued task requires a prompt.');
  all[key] = [...(all[key] || []), task].slice(-MAX_QUEUE);
  writeAll(all);
  return task;
}

export function updateAutonomousTask(workspaceId, taskId, status, detail = '') {
  const allowed = ['queued', 'running', 'waiting-approval', 'completed', 'failed', 'cancelled'];
  if (!allowed.includes(status)) throw new Error(`Invalid queue status: ${status}`);
  const all = readAll();
  const key = String(workspaceId);
  let result = null;
  all[key] = (all[key] || []).map(task => {
    if (task.id !== taskId) return task;
    result = { ...task, status, detail: String(detail).slice(0, 1000), updatedAt: Date.now() };
    return result;
  });
  if (!result) throw new Error('Queued task was not found.');
  writeAll(all);
  return result;
}

export function removeAutonomousTask(workspaceId, taskId) {
  const all = readAll();
  const key = String(workspaceId);
  all[key] = (all[key] || []).filter(task => task.id !== taskId);
  writeAll(all);
  return all[key];
}

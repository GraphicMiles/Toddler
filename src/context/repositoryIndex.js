import { analyzeCodeRelationships, flattenWorkspaceFiles } from './contextEngine.js';

const STORAGE_KEY = 'forgeai_repository_index_v1';
const CODE_EXTENSIONS = new Set(['js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx', 'json', 'css', 'html', 'py', 'java', 'kt', 'kts', 'c', 'cc', 'cpp', 'h', 'hpp', 'rs', 'php', 'sql', 'xml', 'yml', 'yaml', 'md']);
const MAX_FILES = 150;
const MAX_BYTES = 2 * 1024 * 1024;

function readAll() {
  if (typeof localStorage === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

function writeAll(value) {
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

function fingerprint(files) {
  let hash = 2166136261;
  for (const path of files.map(file => file.path).sort()) {
    for (let index = 0; index < path.length; index++) { hash ^= path.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  }
  return (hash >>> 0).toString(16);
}

export function readRepositoryIndex(workspaceId) {
  return readAll()[String(workspaceId)] || null;
}

export async function buildRepositoryIndex({ workspaceId, workspaceProvider, workspaceTree, onProgress } = {}) {
  const allFiles = flattenWorkspaceFiles(workspaceTree).filter(file => CODE_EXTENSIONS.has(file.name.split('.').pop()?.toLowerCase()));
  const selected = allFiles.slice(0, MAX_FILES);
  const nodes = [];
  let bytes = 0;
  let skipped = allFiles.length - selected.length;

  for (let index = 0; index < selected.length; index++) {
    const file = selected[index];
    try {
      const content = await workspaceProvider.readText(file.path, { maxBytes: Math.min(256 * 1024, MAX_BYTES - bytes) });
      const size = new TextEncoder().encode(content).byteLength;
      if (bytes + size > MAX_BYTES) { skipped += selected.length - index; break; }
      bytes += size;
      nodes.push(analyzeCodeRelationships(file.path, content));
    } catch { skipped++; }
    onProgress?.({ completed: index + 1, total: selected.length });
  }

  const definitions = {};
  const callers = {};
  for (const node of nodes) {
    for (const symbol of node.symbols) (definitions[symbol] ||= []).push(node.path);
    for (const call of node.calls) (callers[call.split('.').pop()] ||= []).push(node.path);
  }
  const result = {
    workspaceId: String(workspaceId),
    fingerprint: fingerprint(allFiles),
    createdAt: Date.now(),
    filesIndexed: nodes.length,
    bytesIndexed: bytes,
    skipped,
    nodes,
    definitions,
    callers,
  };
  const all = readAll();
  all[String(workspaceId)] = result;
  writeAll(all);
  return result;
}

export function queryRepositoryIndex(index, query, limit = 12) {
  if (!index) return [];
  const terms = String(query || '').toLowerCase().split(/[^a-z0-9_$.-]+/).filter(term => term.length > 1);
  return index.nodes
    .map(node => {
      let score = 0;
      const haystack = `${node.path} ${node.symbols.join(' ')} ${node.imports.join(' ')} ${node.calls.join(' ')}`.toLowerCase();
      for (const term of terms) if (haystack.includes(term)) score += node.path.toLowerCase().includes(term) ? 3 : 1;
      return { path: node.path, score, symbols: node.symbols, imports: node.imports, calls: node.calls };
    })
    .filter(item => item.score > 0)
    .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path))
    .slice(0, limit);
}

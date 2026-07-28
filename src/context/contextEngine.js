const STOP_WORDS = new Set(['the', 'a', 'an', 'is', 'are', 'to', 'for', 'of', 'in', 'on', 'with', 'this', 'that', 'please', 'can', 'you']);
const ENTRY_FILES = new Set(['package.json', 'readme.md', 'src/app.jsx', 'src/app.tsx', 'src/main.jsx', 'src/main.tsx', 'index.js', 'index.ts']);

function terms(query) {
  return [...new Set(String(query || '').toLowerCase().split(/[^a-z0-9_.-]+/).filter(term => term.length > 1 && !STOP_WORDS.has(term)))];
}

export function flattenWorkspaceFiles(nodes = [], output = []) {
  for (const node of nodes || []) {
    if (node.type === 'folder' || node.children) flattenWorkspaceFiles(node.children || [], output);
    else if (node.path) output.push(node);
  }
  return output;
}

export function rankWorkspaceFiles({ query = '', workspaceTree = [], selectedPath = '', limit = 8 } = {}) {
  const queryTerms = terms(query);
  const files = flattenWorkspaceFiles(workspaceTree);
  return files
    .map(file => {
      const path = file.path.toLowerCase();
      const name = file.name.toLowerCase();
      let score = path === selectedPath.toLowerCase() ? 100 : 0;
      for (const term of queryTerms) {
        if (name === term) score += 90;
        else if (name.includes(term)) score += 45;
        if (path.includes(term)) score += 20;
        if (term.startsWith('.') && name.endsWith(term)) score += 25;
      }
      if (ENTRY_FILES.has(path) || ENTRY_FILES.has(name)) score += 8;
      if (/\.(test|spec)\.[^.]+$/.test(name) && /\b(test|failing|failure)\b/i.test(query)) score += 35;
      if (/package\.json$/.test(path) && /\b(dependency|package|npm|build|script)\b/i.test(query)) score += 45;
      return { ...file, score };
    })
    .filter(file => file.score > 0)
    .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path))
    .slice(0, limit);
}

export function extractCodeSymbols(content = '', extension = '') {
  const symbols = [];
  const patterns = extension === 'py'
    ? [/^\s*(?:async\s+)?def\s+([A-Za-z_][\w]*)/gm, /^\s*class\s+([A-Za-z_][\w]*)/gm]
    : [
        /\b(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g,
        /\bclass\s+([A-Za-z_$][\w$]*)/g,
        /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(/g,
      ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      symbols.push({ name: match[1], offset: match.index });
      if (symbols.length >= 50) return symbols;
    }
  }
  return symbols;
}

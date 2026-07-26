/**
 * File Index & Extension Mapping
 * Indexes workspace files by extension, provides icons/logos, and supports
 * folder selection and deep retrieval.
 */

export const EXTENSION_ICONS = {
  // Web / Frontend
  html: { color: '#e34c26', label: 'HTML' },
  htm: { color: '#e34c26', label: 'HTML' },
  css: { color: '#264de4', label: 'CSS' },
  scss: { color: '#cf649a', label: 'SCSS' },
  sass: { color: '#cf649a', label: 'SASS' },
  less: { color: '#1d365d', label: 'LESS' },

  // JavaScript / TypeScript
  js: { color: '#f7df1e', label: 'JS' },
  jsx: { color: '#61dafb', label: 'JSX' },
  ts: { color: '#3178c6', label: 'TS' },
  tsx: { color: '#3178c6', label: 'TSX' },
  mjs: { color: '#f7df1e', label: 'MJS' },
  cjs: { color: '#f7df1e', label: 'CJS' },

  // Python
  py: { color: '#3776ab', label: 'PY' },
  pyw: { color: '#3776ab', label: 'PY' },
  pyc: { color: '#3776ab', label: 'PY' },

  // Java / Android / Kotlin
  java: { color: '#b07219', label: 'JAVA' },
  kt: { color: '#7f52ff', label: 'KT' },
  gradle: { color: '#02303a', label: 'GRADLE' },
  properties: { color: '#ecd53f', label: 'PROP' },
  xml: { color: '#e34c26', label: 'XML' },
  manifest: { color: '#e34c26', label: 'XML' },

  // Mobile / Build
  apk: { color: '#3ddc84', label: 'APK' },
  aab: { color: '#3ddc84', label: 'AAB' },
  jar: { color: '#b07219', label: 'JAR' },
  aar: { color: '#b07219', label: 'AAR' },
  pro: { color: '#f05032', label: 'PRO' },

  // Config / Data
  json: { color: '#f7df1e', label: 'JSON' },
  yaml: { color: '#cb171e', label: 'YAML' },
  yml: { color: '#cb171e', label: 'YAML' },
  toml: { color: '#9c4221', label: 'TOML' },
  ini: { color: '#68686c', label: 'INI' },
  conf: { color: '#68686c', label: 'CONF' },

  // Documentation
  md: { color: '#083fa1', label: 'MD' },
  txt: { color: '#68686c', label: 'TXT' },
  text: { color: '#68686c', label: 'TXT' },
  log: { color: '#68686c', label: 'LOG' },

  // Git / Version Control
  gitignore: { color: '#f05032', label: 'GIT' },
  gitmodules: { color: '#f05032', label: 'GIT' },

  // Environment / Secrets
  env: { color: '#ecd53f', label: 'ENV' },
  dotenv: { color: '#ecd53f', label: 'ENV' },

  // Shell / Scripts
  sh: { color: '#89e051', label: 'SH' },
  bash: { color: '#89e051', label: 'SH' },
  zsh: { color: '#89e051', label: 'SH' },
  bat: { color: '#c1f12e', label: 'BAT' },
  ps1: { color: '#012456', label: 'PS' },

  // Images / Assets
  png: { color: '#d6604d', label: 'PNG' },
  jpg: { color: '#d6604d', label: 'JPG' },
  jpeg: { color: '#d6604d', label: 'JPG' },
  gif: { color: '#d6604d', label: 'GIF' },
  svg: { color: '#ffb13b', label: 'SVG' },
  ico: { color: '#ffb13b', label: 'ICO' },
  webp: { color: '#d6604d', label: 'WEBP' },

  // Models / AI
  gguf: { color: '#8e44ad', label: 'GGUF' },
  ggml: { color: '#8e44ad', label: 'GGML' },
  bin: { color: '#8e44ad', label: 'BIN' },

  // Other
  lock: { color: '#68686c', label: 'LOCK' },
  map: { color: '#68686c', label: 'MAP' },
};

export function getFileIconInfo(filename) {
  const name = filename || '';
  const baseName = name.toLowerCase();
  // Check special filenames first
  if (baseName === '.gitignore' || baseName === 'gitignore') return EXTENSION_ICONS['gitignore'];
  if (baseName === '.env' || baseName === '.env.local' || baseName === '.env.production') return EXTENSION_ICONS['env'];
  if (baseName === '.well-known' || baseName.endsWith('.json')) return EXTENSION_ICONS['json'];

  const ext = name.split('.').pop()?.toLowerCase();
  if (!ext || ext === name.toLowerCase()) return { color: 'var(--faint)', label: '?' };

  const info = EXTENSION_ICONS[ext];
  if (info) return info;

  // Fallback: check full filename patterns for special cases
  if (baseName.includes('gradle') || baseName.includes('gradlew')) return EXTENSION_ICONS['gradle'];
  if (baseName.includes('manifest') || baseName.includes('androidmanifest')) return EXTENSION_ICONS['manifest'];
  if (baseName.includes('proguard')) return EXTENSION_ICONS['pro'];

  return { color: 'var(--faint)', label: ext.toUpperCase() };
}

/**
 * Build an index of workspace files by extension, name, and folder.
 * Powers search and retrieval instead of sending the whole project to the model.
 */
export function buildFileIndex(workspaceTree = []) {
  const index = {
    byExtension: {},
    byName: {},
    byFolder: {},
    allFiles: [],
    folders: [],
    count: 0,
  };

  function walk(nodes, parentPath = '') {
    for (const node of nodes || []) {
      const path = node.path || (parentPath ? `${parentPath}/${node.name}` : node.name);
      if (node.type === 'folder' || node.children) {
        index.folders.push({ name: node.name, path, parent: parentPath });
        index.byFolder[path] = node;
        if (node.children) walk(node.children, path);
      } else {
        const info = getFileIconInfo(node.name);
        const entry = {
          name: node.name,
          path,
          extension: node.name.split('.').pop()?.toLowerCase() || 'none',
          iconInfo: info,
          parent: parentPath,
        };
        index.allFiles.push(entry);
        index.byName[node.name] = entry;
        const ext = entry.extension;
        if (!index.byExtension[ext]) index.byExtension[ext] = [];
        index.byExtension[ext].push(entry);
      }
    }
  }

  walk(workspaceTree);
  index.count = index.allFiles.length;
  return index;
}

/**
 * Search files by query across names, extensions, and folder paths.
 */
export function searchFiles(query = '', workspaceTree = []) {
  if (!query || !query.trim()) return [];
  const q = query.toLowerCase();
  const index = buildFileIndex(workspaceTree);
  const results = [];

  // Search by file name
  for (const file of index.allFiles) {
    if (file.name.toLowerCase().includes(q) || file.extension.includes(q)) {
      results.push({ ...file, matchType: 'name' });
    }
  }

  // Search by folder path
  for (const folder of index.folders) {
    if (folder.path.toLowerCase().includes(q) || folder.name.toLowerCase().includes(q)) {
      results.push({ ...folder, type: 'folder', matchType: 'folder' });
    }
  }

  // Deduplicate by path
  const seen = new Set();
  return results.filter((r) => {
    if (seen.has(r.path)) return false;
    seen.add(r.path);
    return true;
  });
}

/**
 * Get files of a specific extension.
 */
export function getFilesByExtension(ext = '', workspaceTree = []) {
  const index = buildFileIndex(workspaceTree);
  const target = ext.toLowerCase();
  return index.byExtension[target] || [];
}

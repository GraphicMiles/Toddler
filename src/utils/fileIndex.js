/**
 * File Index & Extension Mapping
 * Indexes workspace files by extension, provides icons/logos, and supports
 * folder selection and deep retrieval.
 */

export const EXTENSION_ICONS = {
  // Web / Frontend
  html: { color: 'var(--accent)', label: 'HTML' },
  htm: { color: 'var(--accent)', label: 'HTML' },
  css: { color: 'var(--accent)', label: 'CSS' },
  scss: { color: 'var(--accent)', label: 'SCSS' },
  sass: { color: 'var(--accent)', label: 'SASS' },
  less: { color: 'var(--accent)', label: 'LESS' },

  // JavaScript / TypeScript
  js: { color: 'var(--accent)', label: 'JS' },
  jsx: { color: 'var(--accent)', label: 'JSX' },
  ts: { color: 'var(--accent)', label: 'TS' },
  tsx: { color: 'var(--accent)', label: 'TSX' },
  mjs: { color: 'var(--accent)', label: 'MJS' },
  cjs: { color: 'var(--accent)', label: 'CJS' },

  // Python
  py: { color: 'var(--accent)', label: 'PY' },
  pyw: { color: 'var(--accent)', label: 'PY' },
  pyc: { color: 'var(--accent)', label: 'PY' },

  // Java / Android / Kotlin
  java: { color: 'var(--accent)', label: 'JAVA' },
  kt: { color: 'var(--accent)', label: 'KT' },
  gradle: { color: 'var(--accent)', label: 'GRADLE' },
  properties: { color: 'var(--accent)', label: 'PROP' },
  xml: { color: 'var(--accent)', label: 'XML' },
  manifest: { color: 'var(--accent)', label: 'XML' },

  // Mobile / Build
  apk: { color: 'var(--accent)', label: 'APK' },
  aab: { color: 'var(--accent)', label: 'AAB' },
  jar: { color: 'var(--accent)', label: 'JAR' },
  aar: { color: 'var(--accent)', label: 'AAR' },
  pro: { color: 'var(--accent)', label: 'PRO' },

  // Config / Data
  json: { color: 'var(--accent)', label: 'JSON' },
  yaml: { color: 'var(--accent)', label: 'YAML' },
  yml: { color: 'var(--accent)', label: 'YAML' },
  toml: { color: 'var(--accent)', label: 'TOML' },
  ini: { color: 'var(--text-tertiary)', label: 'INI' },
  conf: { color: 'var(--text-tertiary)', label: 'CONF' },

  // Documentation
  md: { color: 'var(--accent)', label: 'MD' },
  txt: { color: 'var(--text-tertiary)', label: 'TXT' },
  text: { color: 'var(--text-tertiary)', label: 'TXT' },
  log: { color: 'var(--text-tertiary)', label: 'LOG' },

  // Git / Version Control
  gitignore: { color: 'var(--accent)', label: 'GIT' },
  gitmodules: { color: 'var(--accent)', label: 'GIT' },

  // Environment / Secrets
  env: { color: 'var(--accent)', label: 'ENV' },
  dotenv: { color: 'var(--accent)', label: 'ENV' },

  // Shell / Scripts
  sh: { color: 'var(--accent)', label: 'SH' },
  bash: { color: 'var(--accent)', label: 'SH' },
  zsh: { color: 'var(--accent)', label: 'SH' },
  bat: { color: 'var(--accent)', label: 'BAT' },
  ps1: { color: 'var(--accent)', label: 'PS' },

  // Images / Assets
  png: { color: 'var(--accent)', label: 'PNG' },
  jpg: { color: 'var(--accent)', label: 'JPG' },
  jpeg: { color: 'var(--accent)', label: 'JPG' },
  gif: { color: 'var(--accent)', label: 'GIF' },
  svg: { color: 'var(--accent)', label: 'SVG' },
  ico: { color: 'var(--accent)', label: 'ICO' },
  webp: { color: 'var(--accent)', label: 'WEBP' },

  // Models / AI
  gguf: { color: 'var(--accent)', label: 'GGUF' },
  ggml: { color: 'var(--accent)', label: 'GGML' },
  bin: { color: 'var(--accent)', label: 'BIN' },

  // Other
  lock: { color: 'var(--text-tertiary)', label: 'LOCK' },
  map: { color: 'var(--text-tertiary)', label: 'MAP' },
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

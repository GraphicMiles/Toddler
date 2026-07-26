/**
 * File Index & Extension Mapping
 * Indexes workspace files by extension, provides icons/logos, and supports
 * folder selection and deep retrieval.
 */

export const EXTENSION_ICONS = {
  // Web / Frontend
  html: { color: '#e34c26', label: 'HTML', logo: '🌐' },
  htm: { color: '#e34c26', label: 'HTML', logo: '🌐' },
  css: { color: '#264de4', label: 'CSS', logo: '🎨' },
  scss: { color: '#cf649a', label: 'SCSS', logo: '🎨' },
  sass: { color: '#cf649a', label: 'SASS', logo: '🎨' },
  less: { color: '#1d365d', label: 'LESS', logo: '🎨' },

  // JavaScript / TypeScript
  js: { color: '#f7df1e', label: 'JS', logo: '⚡' },
  jsx: { color: '#61dafb', label: 'JSX', logo: '⚛️' },
  ts: { color: '#3178c6', label: 'TS', logo: '🔷' },
  tsx: { color: '#3178c6', label: 'TSX', logo: '🔷' },
  mjs: { color: '#f7df1e', label: 'MJS', logo: '📦' },
  cjs: { color: '#f7df1e', label: 'CJS', logo: '📦' },

  // Python
  py: { color: '#3776ab', label: 'PY', logo: '🐍' },
  pyw: { color: '#3776ab', label: 'PY', logo: '🐍' },
  pyc: { color: '#3776ab', label: 'PY', logo: '🐍' },

  // Java / Android / Kotlin
  java: { color: '#b07219', label: 'JAVA', logo: '☕' },
  kt: { color: '#7f52ff', label: 'KT', logo: '🍃' },
  gradle: { color: '#02303a', label: 'GRADLE', logo: '🐘' },
  properties: { color: '#ecd53f', label: 'PROP', logo: '⚙️' },
  xml: { color: '#e34c26', label: 'XML', logo: '📄' },
  manifest: { color: '#e34c26', label: 'XML', logo: '📱' },

  // Mobile / Build
  apk: { color: '#3ddc84', label: 'APK', logo: '📱' },
  aab: { color: '#3ddc84', label: 'AAB', logo: '📦' },
  jar: { color: '#b07219', label: 'JAR', logo: '☕' },
  aar: { color: '#b07219', label: 'AAR', logo: '📦' },
  pro: { color: '#f05032', label: 'PRO', logo: '🛡️' },

  // Config / Data
  json: { color: '#f7df1e', label: 'JSON', logo: '📋' },
  yaml: { color: '#cb171e', label: 'YAML', logo: '⚓' },
  yml: { color: '#cb171e', label: 'YAML', logo: '⚓' },
  toml: { color: '#9c4221', label: 'TOML', logo: '⚙️' },
  ini: { color: '#68686c', label: 'INI', logo: '⚙️' },
  conf: { color: '#68686c', label: 'CONF', logo: '⚙️' },

  // Documentation
  md: { color: '#083fa1', label: 'MD', logo: '📘' },
  txt: { color: '#68686c', label: 'TXT', logo: '📄' },
  text: { color: '#68686c', label: 'TXT', logo: '📄' },
  log: { color: '#68686c', label: 'LOG', logo: '📝' },

  // Git / Version Control
  gitignore: { color: '#f05032', label: 'GIT', logo: '🌿' },
  gitmodules: { color: '#f05032', label: 'GIT', logo: '🌿' },

  // Environment / Secrets
  env: { color: '#ecd53f', label: 'ENV', logo: '🔑' },
  dotenv: { color: '#ecd53f', label: 'ENV', logo: '🔑' },

  // Shell / Scripts
  sh: { color: '#89e051', label: 'SH', logo: '🐚' },
  bash: { color: '#89e051', label: 'SH', logo: '🐚' },
  zsh: { color: '#89e051', label: 'SH', logo: '🐚' },
  bat: { color: '#c1f12e', label: 'BAT', logo: '🐚' },
  ps1: { color: '#012456', label: 'PS', logo: '🐚' },

  // Images / Assets
  png: { color: '#d6604d', label: 'PNG', logo: '🖼️' },
  jpg: { color: '#d6604d', label: 'JPG', logo: '🖼️' },
  jpeg: { color: '#d6604d', label: 'JPG', logo: '🖼️' },
  gif: { color: '#d6604d', label: 'GIF', logo: '🖼️' },
  svg: { color: '#ffb13b', label: 'SVG', logo: '🎨' },
  ico: { color: '#ffb13b', label: 'ICO', logo: '🖼️' },
  webp: { color: '#d6604d', label: 'WEBP', logo: '🖼️' },

  // Models / AI
  gguf: { color: '#8e44ad', label: 'GGUF', logo: '🤖' },
  ggml: { color: '#8e44ad', label: 'GGML', logo: '🤖' },
  bin: { color: '#8e44ad', label: 'BIN', logo: '🤖' },

  // Other
  lock: { color: '#68686c', label: 'LOCK', logo: '🔒' },
  map: { color: '#68686c', label: 'MAP', logo: '🗺️' },
};

export function getFileIconInfo(filename) {
  const name = filename || '';
  const baseName = name.toLowerCase();
  // Check special filenames first
  if (baseName === '.gitignore' || baseName === 'gitignore') return EXTENSION_ICONS['gitignore'];
  if (baseName === '.env' || baseName === '.env.local' || baseName === '.env.production') return EXTENSION_ICONS['env'];
  if (baseName === '.well-known' || baseName.endsWith('.json')) return EXTENSION_ICONS['json'];

  const ext = name.split('.').pop()?.toLowerCase();
  if (!ext || ext === name.toLowerCase()) return { color: 'var(--faint)', label: '?', logo: '📄' };

  const info = EXTENSION_ICONS[ext];
  if (info) return info;

  // Fallback: check full filename patterns for special cases
  if (baseName.includes('gradle') || baseName.includes('gradlew')) return EXTENSION_ICONS['gradle'];
  if (baseName.includes('manifest') || baseName.includes('androidmanifest')) return EXTENSION_ICONS['manifest'];
  if (baseName.includes('proguard')) return EXTENSION_ICONS['pro'];

  return { color: 'var(--faint)', label: ext.toUpperCase(), logo: '📄' };
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

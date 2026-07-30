/**
 * Project Indexer — Full Project Understanding
 * 
 * Builds a comprehensive index of the entire project:
 * - File tree with types and sizes
 * - Import/export graph (who imports whom)
 * - Symbol index (functions, classes, variables)
 * - Dependency map
 * 
 * This lets the agent understand the full project structure, not just
 * 4 RAG-retrieved files. It can ask "what depends on X?" or "where is Y defined?"
 */

// File type classification
const FILE_TYPES = {
  SOURCE: 'source',
  CONFIG: 'config',
  STYLE: 'style',
  TEST: 'test',
  DOCS: 'docs',
  ASSET: 'asset',
  BUILD: 'build',
};

const EXTENSION_MAP = {
  js: FILE_TYPES.SOURCE, jsx: FILE_TYPES.SOURCE, ts: FILE_TYPES.SOURCE, tsx: FILE_TYPES.SOURCE,
  py: FILE_TYPES.SOURCE, java: FILE_TYPES.SOURCE, kt: FILE_TYPES.SOURCE, cpp: FILE_TYPES.SOURCE,
  c: FILE_TYPES.SOURCE, rs: FILE_TYPES.SOURCE, go: FILE_TYPES.SOURCE, rb: FILE_TYPES.SOURCE,
  php: FILE_TYPES.SOURCE, swift: FILE_TYPES.SOURCE,
  css: FILE_TYPES.STYLE, scss: FILE_TYPES.STYLE, less: FILE_TYPES.STYLE,
  json: FILE_TYPES.CONFIG, yaml: FILE_TYPES.CONFIG, yml: FILE_TYPES.CONFIG, toml: FILE_TYPES.CONFIG,
  test: FILE_TYPES.TEST, spec: FILE_TYPES.TEST,
  md: FILE_TYPES.DOCS, txt: FILE_TYPES.DOCS,
  html: FILE_TYPES.SOURCE, xml: FILE_TYPES.CONFIG,
};

// Import patterns for different languages
const IMPORT_PATTERNS = {
  js: [
    /import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/g,
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ],
  ts: [
    /import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/g,
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ],
  py: [
    /import\s+([\w.]+)/g,
    /from\s+([\w.]+)\s+import/g,
  ],
  java: [
    /import\s+([\w.]+);/g,
  ],
  css: [
    /@import\s+['"]([^'"]+)['"]/g,
    /url\s*\(\s*['"]?([^'")]+)['"]?\s*\)/g,
  ],
};

// Export/symbol patterns
const SYMBOL_PATTERNS = {
  js: [
    /(?:export\s+)?(?:default\s+)?(?:function|class|const|let|var)\s+(\w+)/g,
    /(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+(\w+)/g,
  ],
  ts: [
    /(?:export\s+)?(?:default\s+)?(?:function|class|const|let|var|interface|type|enum)\s+(\w+)/g,
  ],
  py: [
    /(?:def|class)\s+(\w+)/g,
  ],
  java: [
    /(?:public|private|protected|static)?\s*(?:class|interface|enum)\s+(\w+)/g,
    /(?:public|private|protected|static)?\s*\w+(?:<[^>]+>)?\s+(\w+)\s*\(/g,
  ],
};

class ProjectIndexer {
  constructor() {
    this.files = new Map(); // path -> { type, size, imports, exports, symbols }
    this.imports = new Map(); // path -> Set of imported paths
    this.importedBy = new Map(); // path -> Set of paths that import it
    this.symbols = new Map(); // symbol name -> [{ file, type, line }]
    this.lastIndexed = null;
  }

  /**
   * Build the full project index from a workspace provider.
   */
  async buildIndex(workspaceProvider, { maxFiles = 500, maxFileSize = 100000 } = {}) {
    this.files.clear();
    this.imports.clear();
    this.importedBy.clear();
    this.symbols.clear();

    // Get file list
    let fileList = [];
    try {
      const listing = await workspaceProvider.list('');
      fileList = this.flattenTree(listing.items || []);
    } catch {
      return { error: 'Could not list workspace files.' };
    }

    // Filter to indexable files
    const indexable = fileList
      .filter(f => this.isIndexable(f))
      .slice(0, maxFiles);

    // Index each file
    for (const filePath of indexable) {
      try {
        const content = await workspaceProvider.readText(filePath);
        if (content.length > maxFileSize) continue; // Skip huge files
        this.indexFile(filePath, content);
      } catch {
        // Skip unreadable files
      }
    }

    // Build reverse import map
    for (const [file, imports] of this.imports) {
      for (const imp of imports) {
        if (!this.importedBy.has(imp)) this.importedBy.set(imp, new Set());
        this.importedBy.get(imp).add(file);
      }
    }

    this.lastIndexed = Date.now();

    return {
      files: this.files.size,
      imports: this.getTotalImports(),
      symbols: this.symbols.size,
      indexedAt: this.lastIndexed,
    };
  }

  /**
   * Index a single file: extract imports, exports, symbols.
   */
  indexFile(path, content) {
    const ext = path.split('.').pop()?.toLowerCase();
    const fileType = this.getFileType(path, ext);

    const fileEntry = {
      path,
      type: fileType,
      size: content.length,
      lines: content.split('\n').length,
      extension: ext,
      imports: [],
      symbols: [],
    };

    // Extract imports
    const importPatterns = IMPORT_PATTERNS[ext] || IMPORT_PATTERNS.js;
    const importSet = new Set();
    for (const pattern of importPatterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const imp = this.resolveImport(match[1], path);
        if (imp) importSet.add(imp);
      }
    }
    fileEntry.imports = [...importSet];
    this.imports.set(path, importSet);

    // Extract symbols
    const symbolPatterns = SYMBOL_PATTERNS[ext] || [];
    for (const pattern of symbolPatterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const name = match[1];
        if (name && name.length > 1 && !this.isCommonWord(name)) {
          const line = content.slice(0, match.index).split('\n').length;
          fileEntry.symbols.push({ name, line });

          if (!this.symbols.has(name)) this.symbols.set(name, []);
          this.symbols.get(name).push({ file: path, line, type: 'definition' });
        }
      }
    }

    this.files.set(path, fileEntry);
  }

  /**
   * Resolve a relative import to an absolute path.
   */
  resolveImport(importPath, fromFile) {
    if (!importPath) return null;

    // Relative import
    if (importPath.startsWith('.')) {
      const fromDir = fromFile.substring(0, fromFile.lastIndexOf('/'));
      const parts = [...fromDir.split('/'), ...importPath.split('/')];
      const resolved = [];
      for (const part of parts) {
        if (part === '..') resolved.pop();
        else if (part !== '.' && part !== '') resolved.push(part);
      }
      return resolved.join('/');
    }

    // Package import (node_modules, etc.)
    return importPath;
  }

  /**
   * Get what depends on a file (reverse imports).
   */
  getDependents(path) {
    return [...(this.importedBy.get(path) || [])];
  }

  /**
   * Get what a file depends on.
   */
  getDependencies(path) {
    return [...(this.imports.get(path) || [])];
  }

  /**
   * Find where a symbol is defined.
   */
  findSymbol(name) {
    return this.symbols.get(name) || [];
  }

  /**
   * Search for symbols matching a pattern.
   */
  searchSymbols(pattern) {
    const results = [];
    // Pattern may be caller/model supplied; a malformed regex must not throw and
    // break indexing. Fall back to a literal (escaped) match on failure.
    let regex;
    try {
      regex = new RegExp(pattern, 'i');
    } catch {
      regex = new RegExp(String(pattern ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }
    for (const [name, locations] of this.symbols) {
      if (regex.test(name)) {
        results.push({ name, locations });
      }
    }
    return results.slice(0, 20);
  }

  /**
   * Get a summary of the project structure.
   */
  getSummary() {
    const byType = {};
    const byExtension = {};
    for (const file of this.files.values()) {
      byType[file.type] = (byType[file.type] || 0) + 1;
      byExtension[file.extension] = (byExtension[file.extension] || 0) + 1;
    }

    return {
      totalFiles: this.files.size,
      byType,
      byExtension,
      totalSymbols: this.symbols.size,
      totalImports: this.getTotalImports(),
      lastIndexed: this.lastIndexed,
    };
  }

  /**
   * Format the index as a prompt for the LLM.
   */
  formatForPrompt({ maxFiles = 50, maxSymbols = 30 } = {}) {
    const summary = this.getSummary();
    const parts = [
      `PROJECT STRUCTURE: ${summary.totalFiles} files, ${summary.totalSymbols} symbols, ${summary.totalImports} imports.`,
    ];

    // File types breakdown
    const typeParts = Object.entries(summary.byType)
      .map(([type, count]) => `${type}: ${count}`)
      .join(', ');
    if (typeParts) parts.push(`File types: ${typeParts}`);

    // Key files (source files, sorted by import count)
    const keyFiles = [...this.files.values()]
      .filter(f => f.type === FILE_TYPES.SOURCE)
      .sort((a, b) => (this.importedBy.get(b.path)?.size || 0) - (this.importedBy.get(a.path)?.size || 0))
      .slice(0, maxFiles);

    if (keyFiles.length > 0) {
      const fileLines = keyFiles.map(f => {
        const deps = this.importedBy.get(f.path)?.size || 0;
        return `  - ${f.path} (${f.lines} lines${deps > 0 ? `, ${deps} dependents` : ''})`;
      });
      parts.push(`Key source files:\n${fileLines.join('\n')}`);
    }

    // Top symbols
    const topSymbols = [...this.symbols.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, maxSymbols);

    if (topSymbols.length > 0) {
      const symbolLines = topSymbols.map(([name, locs]) =>
        `  - ${name}: defined in ${locs.map(l => l.file.split('/').pop()).join(', ')}`
      );
      parts.push(`Key symbols:\n${symbolLines.join('\n')}`);
    }

    return parts.join('\n\n');
  }

  // Helpers
  isIndexable(path) {
    const ext = path.split('.').pop()?.toLowerCase();
    const skipDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', '__pycache__', '.next', 'target'];
    if (skipDirs.some(dir => path.includes(`/${dir}/`))) return false;
    if (!ext) return false;
    const skipExts = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'woff', 'woff2', 'ttf', 'eot', 'map', 'lock'];
    return !skipExts.includes(ext);
  }

  getFileType(path, ext) {
    if (/test|spec/i.test(path)) return FILE_TYPES.TEST;
    if (/config|\.env|\.rc$/i.test(path)) return FILE_TYPES.CONFIG;
    return EXTENSION_MAP[ext] || FILE_TYPES.SOURCE;
  }

  isCommonWord(name) {
    const common = new Set(['if', 'else', 'for', 'while', 'return', 'import', 'export', 'from', 'default', 'new', 'this', 'true', 'false', 'null', 'undefined', 'async', 'await', 'try', 'catch']);
    return common.has(name);
  }

  flattenTree(items, prefix = '') {
    const result = [];
    for (const item of items) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.type === 'file') result.push(path);
      else if (item.children) result.push(...this.flattenTree(item.children, path));
    }
    return result;
  }

  getTotalImports() {
    let total = 0;
    for (const set of this.imports.values()) total += set.size;
    return total;
  }
}

export const projectIndexer = new ProjectIndexer();

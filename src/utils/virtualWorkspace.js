/**
 * Virtual Workspace for Web/Desktop
 * 
 * Provides in-memory file system simulation for non-Android platforms.
 * Allows users to create, edit, and manage files in the browser.
 * Files can be exported as a ZIP or downloaded individually.
 */

const VIRTUAL_STORAGE_KEY = 'forgeai_virtual_workspace';

export class VirtualWorkspace {
  constructor() {
    this.files = new Map(); // path -> { content, type, createdAt }
    this.folders = new Set();
    this.loadFromStorage();
  }

  loadFromStorage() {
    if (typeof localStorage === 'undefined') return;
    try {
      const saved = localStorage.getItem(VIRTUAL_STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        this.files = new Map(data.files || []);
        this.folders = new Set(data.folders || []);
      }
    } catch (e) {
      console.warn('Failed to load virtual workspace:', e);
    }
  }

  saveToStorage() {
    if (typeof localStorage === 'undefined') return;
    try {
      const data = {
        files: Array.from(this.files.entries()),
        folders: Array.from(this.folders),
      };
      localStorage.setItem(VIRTUAL_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save virtual workspace:', e);
    }
  }

  // Get a tree structure compatible with Workspace component
  getTree() {
    const tree = [];
    const folderMap = new Map();

    // Create folders
    for (const folderPath of this.folders) {
      const parts = folderPath.split('/').filter(Boolean);
      let current = tree;
      let pathSoFar = '';

      for (const part of parts) {
        pathSoFar = pathSoFar ? `${pathSoFar}/${part}` : part;
        let folder = current.find(n => n.name === part && n.type === 'folder');
        
        if (!folder) {
          folder = {
            name: part,
            path: pathSoFar,
            type: 'folder',
            children: [],
          };
          current.push(folder);
        }
        current = folder.children;
      }
    }

    // Add files
    for (const [path, file] of this.files) {
      const parts = path.split('/').filter(Boolean);
      const fileName = parts.pop();
      let current = tree;
      let pathSoFar = '';

      for (const part of parts) {
        pathSoFar = pathSoFar ? `${pathSoFar}/${part}` : part;
        let folder = current.find(n => n.name === part && n.type === 'folder');
        if (!folder) {
          folder = {
            name: part,
            path: pathSoFar,
            type: 'folder',
            children: [],
          };
          current.push(folder);
        }
        current = folder.children;
      }

      current.push({
        name: fileName,
        path,
        type: 'file',
      });
    }

    // Sort: folders first, then files
    const sortTree = (nodes) => {
      nodes.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      for (const node of nodes) {
        if (node.children) sortTree(node.children);
      }
    };

    sortTree(tree);
    return tree;
  }

  async readFile(path) {
    const file = this.files.get(path);
    if (!file) throw new Error(`File not found: ${path}`);
    return file.content;
  }

  async writeFile(path, content = '') {
    const dir = path.substring(0, path.lastIndexOf('/'));
    if (dir) {
      this.createDirectory(dir);
    }
    
    this.files.set(path, {
      content: String(content),
      type: 'file',
      createdAt: Date.now(),
    });
    this.saveToStorage();
    return { path, size: content.length };
  }

  async createDirectory(path) {
    if (!path) return;
    this.folders.add(path);
    
    // Create parent folders recursively
    const parent = path.substring(0, path.lastIndexOf('/'));
    if (parent) {
      this.createDirectory(parent);
    }
    this.saveToStorage();
  }

  async deleteFile(path) {
    if (this.files.has(path)) {
      this.files.delete(path);
    } else if (this.folders.has(path)) {
      // Delete folder and all children
      for (const filePath of this.files.keys()) {
        if (filePath.startsWith(path + '/')) {
          this.files.delete(filePath);
        }
      }
      for (const folderPath of Array.from(this.folders)) {
        if (folderPath.startsWith(path + '/')) {
          this.folders.delete(folderPath);
        }
      }
      this.folders.delete(path);
    }
    this.saveToStorage();
  }

  async rename(oldPath, newPath) {
    if (this.files.has(oldPath)) {
      const file = this.files.get(oldPath);
      this.files.delete(oldPath);
      this.files.set(newPath, file);
    } else if (this.folders.has(oldPath)) {
      // Rename folder and update all children
      this.folders.delete(oldPath);
      this.folders.add(newPath);

      for (const [filePath, file] of this.files) {
        if (filePath.startsWith(oldPath + '/')) {
          const newFilePath = filePath.replace(oldPath, newPath);
          this.files.delete(filePath);
          this.files.set(newFilePath, file);
        }
      }
    }
    this.saveToStorage();
  }

  // Export all files as a downloadable structure
  exportAsDownload() {
    const data = {
      files: Array.from(this.files.entries()),
      folders: Array.from(this.folders),
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `forgeai-workspace-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  // Import from exported JSON
  importFromJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      this.files = new Map(data.files || []);
      this.folders = new Set(data.folders || []);
      this.saveToStorage();
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }

  clear() {
    this.files.clear();
    this.folders.clear();
    if (typeof localStorage !== 'undefined') localStorage.removeItem(VIRTUAL_STORAGE_KEY);
  }
}

// Singleton instance
export const virtualWorkspace = new VirtualWorkspace();
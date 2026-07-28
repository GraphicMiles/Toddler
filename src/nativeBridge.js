/**
 * ForgeAI Native Bridge
 * Provides interface between web app and native Android/Desktop features
 * 
 * Supports Capacitor 7+ API
 */

import { Filesystem } from '@capacitor/filesystem';
import { Haptics } from '@capacitor/haptics';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { StatusBar } from '@capacitor/status-bar';
import { registerPlugin } from '@capacitor/core';
import { profileForModel, formatPrompt } from './models/promptProfiles.js';

const DeviceCapacity = registerPlugin('DeviceCapacity');
const OnDeviceRuntime = registerPlugin('OnDeviceRuntime');
const WorkspaceStorage = registerPlugin('WorkspaceStorage');

export async function pickWorkspaceFolder() { return WorkspaceStorage.pickFolder(); }
export async function listWorkspace(uri, path = '') { return WorkspaceStorage.list({ uri, path }); }
export async function readWorkspaceFile(uri, path) { return (await WorkspaceStorage.readFile({ uri, path })).content; }
export async function writeWorkspaceFile(uri, path, content) { return WorkspaceStorage.writeFile({ uri, path, content }); }
export async function createWorkspaceFile(uri, path) { return WorkspaceStorage.createFile({ uri, path }); }
export async function createWorkspaceFolder(uri, path) { return WorkspaceStorage.createFolder({ uri, path }); }
export async function renameWorkspaceItem(uri, path, newName) { return WorkspaceStorage.rename({ uri, path, newName }); }
export async function deleteWorkspaceItem(uri, path) { return WorkspaceStorage.delete({ uri, path }); }
export async function inspectWorkspaceItem(uri, path) { return WorkspaceStorage.inspect({ uri, path }); }
export async function downloadModelToWorkspace(uri, url, path, onProgress) {
  const listener = await WorkspaceStorage.addListener('modelDownloadProgress', event => { if (event.path === path) onProgress?.(event); });
  try { return await WorkspaceStorage.download({ uri, url, path }); } finally { await listener.remove(); }
}
export async function pauseWorkspaceModelDownload(uri, path) { return WorkspaceStorage.pauseDownload({ uri, path }); }
export async function cancelWorkspaceModelDownload(uri, path) { return WorkspaceStorage.cancelDownload({ uri, path }); }
export async function importModelToRuntime(uri, path) { return WorkspaceStorage.importToRuntime({ uri, path }); }
export async function pickModelFile() { return WorkspaceStorage.pickModelFile(); }
export async function importDocumentToRuntime(uri, name) { return WorkspaceStorage.importDocumentToRuntime({ uri, name }); }

export async function getOnDeviceRuntimeInfo() {
  if (!isNative) return { available: false, reason: 'On-device runtime is available only in the Android build.' };
  try { return await OnDeviceRuntime.getInfo(); } catch { return { available: false, reason: 'Native inference runtime is not installed in this build.' }; }
}

export async function downloadOnDeviceModel(url, filename, onProgress) {
  if (!isNative) throw new Error('On-device model downloads require Android.');
  const listener = await OnDeviceRuntime.addListener('downloadProgress', event => {
    if (event.filename === filename) onProgress?.(event);
  });
  try { return await OnDeviceRuntime.download({ url, filename }); }
  finally { await listener.remove(); }
}

export async function pauseOnDeviceDownload(filename) {
  if (isNative) return OnDeviceRuntime.pauseDownload({ filename });
}

export async function cancelOnDeviceDownload(filename) {
  if (isNative) return OnDeviceRuntime.cancelDownload({ filename });
}

export async function deleteOnDeviceModel(path) {
  if (isNative && path) return OnDeviceRuntime.deleteModel({ path });
}

export async function loadOnDeviceModel(path) {
  if (!isNative) throw new Error('On-device inference requires Android.');
  return OnDeviceRuntime.load({ path });
}

export async function unloadOnDeviceModel() {
  if (isNative) return OnDeviceRuntime.unload();
}

export async function runOnDeviceChat({ model, messages, signal, onToken }) {
  if (!isNative) throw new Error('On-device inference requires Android.');
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const profile = profileForModel({ id: model || '' });
  const prompt = formatPrompt(messages, profile);
  const requestId = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  const cancel = () => OnDeviceRuntime.cancel({ requestId }).catch(() => {});
  signal?.addEventListener('abort', cancel, { once: true });
  const result = await OnDeviceRuntime.generate({ prompt, maxTokens: profile.maxOutputTokens, requestId });
  signal?.removeEventListener('abort', cancel);
  if (signal?.aborted || result?.cancelled) throw new DOMException('Aborted', 'AbortError');
  onToken?.(result.text || '');
  return result;
}

// Check if running in Capacitor
export const isNative = typeof window !== 'undefined' && (
  window.Capacitor?.isNativePlatform?.() === true || window.Capacitor?.isNative === true
);

// Platform detection
export const isAndroid = isNative && window.Capacitor.getPlatform() === 'android';
export const isIOS = isNative && window.Capacitor.getPlatform() === 'ios';
export const isDesktop = !isNative;

const asPositiveNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

/**
 * Read hardware capacity where the platform makes it available.
 *
 * Android uses the bundled DeviceCapacity plugin so the UI reads the phone's
 * real RAM and internal-storage capacity instead of relying on a fixed value.
 * Browsers deliberately restrict hardware details; in that case we expose the
 * browser's quota as such rather than presenting it as total device storage.
 */
export async function getDeviceCapacity() {
  const platform = isNative ? window.Capacitor.getPlatform() : 'web';

  if (isAndroid) {
    try {
      const capacity = await DeviceCapacity.getCapacity();
      const ramBytes = asPositiveNumber(capacity.totalRamBytes);
      return {
        ramBytes,
        availableRamBytes: asPositiveNumber(capacity.availableRamBytes),
        storageBytes: asPositiveNumber(capacity.totalStorageBytes),
        availableStorageBytes: asPositiveNumber(capacity.availableStorageBytes),
        // Model requirements are expressed in binary GB, matching Android RAM specs.
        ram: ramBytes ? Math.max(1, Math.round(ramBytes / (1024 ** 3))) : 4,
        storageScope: 'device',
        platform,
      };
    } catch (error) {
      console.warn('Unable to read Android device capacity:', error);
    }
  }

  const deviceMemory = typeof navigator !== 'undefined' ? navigator.deviceMemory : undefined;
  const ram = asPositiveNumber(deviceMemory) || 4;
  let storageBytes = null;

  try {
    if (navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate();
      storageBytes = asPositiveNumber(estimate.quota);
    }
  } catch {
    // Capacity data is optional in browsers.
  }

  return {
    ramBytes: asPositiveNumber(deviceMemory) ? deviceMemory * (1024 ** 3) : null,
    availableRamBytes: null,
    storageBytes,
    availableStorageBytes: null,
    ram,
    storageScope: storageBytes ? 'browser' : 'unknown',
    platform,
  };
}

/**
 * File System Operations
 */
export const fileSystem = {
  /**
   * Read a file as UTF-8 text
   */
  async readFile(path) {
    if (isNative) {
      try {
        const result = await Filesystem.readFile({ path, encoding: 'utf8' });
        return result.data;
      } catch (err) {
        throw new Error(`Cannot read "${path}": ${err.message || 'file not found'}`);
      }
    }
    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (err) {
      throw new Error(`Cannot read "${path}": ${err.message}`);
    }
  },

  /**
   * Write content to a file, creating parent directories as needed
   */
  async writeFile(path, content) {
    if (isNative) {
      const dir = path.substring(0, path.lastIndexOf('/'));
      if (dir) {
        try { await Filesystem.mkdir({ path: dir, recursive: true }); } catch { /* exists */ }
      }
      try {
        const uri = await Filesystem.writeFile({ path, data: content || '' });
        return uri;
      } catch (err) {
        const msg = err.message || '';
        if (msg.includes('permission') || msg.includes('denied')) {
          throw new Error(`Permission denied writing to "${path}". Grant storage permission or use Downloads/ForgeAI folder.`);
        }
        throw new Error(`Cannot write "${path}": ${msg}`);
      }
    }
    const blob = new Blob([content || ''], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = path.split('/').pop() || 'file.txt';
    a.click();
    URL.revokeObjectURL(url);
  },

  /**
   * List directory contents
   */
  async listDirectory(path) {
    if (isNative) {
      try {
        const result = await Filesystem.readDir({ path });
        return result.files.map(f => ({
          name: f.name,
          type: f.type === 'directory' ? 'folder' : 'file',
          path: `${path}/${f.name}`,
        }));
      } catch (err) {
        throw new Error(`Cannot list "${path}": ${err.message}`);
      }
    }
    return [];
  },

  /**
   * Check if file or folder exists
   */
  async exists(path) {
    if (isNative) {
      try { await Filesystem.stat({ path }); return true; } catch { return false; }
    }
    return false;
  },

  /**
   * Create directory (recursive)
   */
  async createDirectory(path) {
    if (isNative) {
      try {
        await Filesystem.mkdir({ path, recursive: true });
      } catch (err) {
        const msg = err.message || '';
        if (msg.includes('permission') || msg.includes('denied')) {
          throw new Error(`Permission denied creating "${path}". Use Downloads/ForgeAI or grant storage permission.`);
        }
        if (!msg.includes('exists')) {
          throw new Error(`Cannot create directory "${path}": ${msg}`);
        }
      }
    }
  },

  /**
   * Delete a file or directory (recursive)
   */
  async deleteFile(path) {
    if (isNative) {
      try {
        const stat = await Filesystem.stat({ path });
        if (stat.type === 'directory') {
          await Filesystem.rmdir({ path, recursive: true });
        } else {
          await Filesystem.deleteFile({ path });
        }
      } catch (err) {
        throw new Error(`Cannot delete "${path}": ${err.message}`);
      }
    }
  },

  /**
   * Rename or move a file/folder
   */
  async rename(oldPath, newPath) {
    if (isNative) {
      try {
        await Filesystem.rename({ from: oldPath, to: newPath });
      } catch (err) {
        throw new Error(`Cannot rename "${oldPath}" to "${newPath}": ${err.message}`);
      }
    } else {
      throw new Error('Rename is not supported in the browser.');
    }
  },

  /**
   * Recursively load a file tree from a directory (max depth 4)
   */
  async loadTree(rootPath, depth = 0) {
    if (depth > 4) return [];
    let entries;
    try {
      entries = await this.listDirectory(rootPath);
    } catch {
      return [];
    }
    const tree = [];
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue; // skip hidden
      if (entry.type === 'folder') {
        const children = await this.loadTree(entry.path, depth + 1);
        tree.push({ ...entry, children });
      } else {
        tree.push(entry);
      }
    }
    // folders first, then files, alphabetically
    tree.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return tree;
  },
};

/**
 * Haptic Feedback
 */
export const haptics = {
  /**
   * Light impact - for selections
   */
  async light() {
    if (isNative) {
      try {
        await Haptics.impact({ style: 'Light' });
      } catch {
        // Haptics not available
      }
    }
  },

  /**
   * Medium impact - for confirmations
   */
  async medium() {
    if (isNative) {
      try {
        await Haptics.impact({ style: 'Medium' });
      } catch {
        // Haptics not available
      }
    }
  },

  /**
   * Heavy impact - for warnings
   */
  async heavy() {
    if (isNative) {
      try {
        await Haptics.impact({ style: 'Heavy' });
      } catch {
        // Haptics not available
      }
    }
  },

  /**
   * Selection changed
   */
  async selection() {
    if (isNative) {
      try {
        await Haptics.selectionChanged();
      } catch {
        // Haptics not available
      }
    }
  },

  /**
   * Success notification
   */
  async success() {
    if (isNative) {
      try {
        await Haptics.notification({ type: 'Success' });
      } catch {
        // Haptics not available
      }
    }
  },

  /**
   * Error notification
   */
  async error() {
    if (isNative) {
      try {
        await Haptics.notification({ type: 'Error' });
      } catch {
        // Haptics not available
      }
    }
  },
};

/**
 * App Lifecycle
 */
export const app = {
  /**
   * Get app info
   */
  async getInfo() {
    if (isNative) {
      return await App.getInfo();
    }
    return {
      name: 'ForgeAI Web',
      id: 'ai.forgeai.web',
      version: '0.0.1',
    };
  },

  /**
   * Handle app state change
   */
  onStateChange(callback) {
    if (isNative) {
      App.addListener('appStateChange', callback);
      return () => App.removeListener('appStateChange', callback);
    }
    return () => {};
  },

  /**
   * Handle deep link
   */
  onDeepLink(callback) {
    if (isNative) {
      App.addListener('deepLink', callback);
      return () => App.removeListener('deepLink', callback);
    }
    return () => {};
  },
};

/**
 * Status Bar (Android)
 */
export const statusBar = {
  async hide() {
    if (isNative) {
      try {
        await StatusBar.hide();
      } catch {
        // Not available
      }
    }
  },
  async show() {
    if (isNative) {
      try {
        await StatusBar.show();
      } catch {
        // Not available
      }
    }
  },
  async setStyle(style) {
    if (isNative) {
      try {
        await StatusBar.setStyle({ style });
      } catch {
        // Not available
      }
    }
  },
};

/**
 * Notifications (Android)
 */
export const notifications = {
  async request() {
    if (isNative) {
      try {
        const result = await LocalNotifications.requestPermissions();
        return result.granted;
      } catch {
        return false;
      }
    }
    return false;
  },

  async show(title, body) {
    if (isNative) {
      try {
        await LocalNotifications.schedule({
          notifications: [{ title, body, id: Date.now().toString() }],
        });
      } catch {
        // Not available
      }
    }
  },
};

/**
 * Ollama Connection Check
 * Checks if Ollama is running locally
 */
export async function streamOllamaChat({ url = 'http://localhost:11434', model, messages, signal, onToken }) {
  const response = await fetch(`${url.replace(/\/$/, '')}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model, messages, stream: true }), signal });
  if (!response.ok) throw new Error(`Ollama chat failed (${response.status})`);
  if (!response.body) throw new Error('Runtime did not return a stream');
  const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
  while (true) { const { value, done } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n'); buffer = lines.pop() || '';
    for (const line of lines) { if (!line.trim()) continue; const chunk = JSON.parse(line); if (chunk.error) throw new Error(chunk.error); if (chunk.message?.content) onToken?.(chunk.message.content); if (chunk.done) return chunk; }
  }
}

export async function pullOllamaModel(model, url = 'http://localhost:11434', onProgress, signal) {
  const response = await fetch(`${url.replace(/\/$/, '')}/api/pull`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: model, stream: true }), signal });
  if (!response.ok) throw new Error(`Model download failed (${response.status})`);
  const reader = response.body?.getReader(); if (!reader) throw new Error('Download stream unavailable'); const decoder = new TextDecoder(); let buffer = ''; let last;
  while (true) { const { value, done } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }); const lines = buffer.split('\n'); buffer = lines.pop() || '';
    for (const line of lines) { if (!line.trim()) continue; const item = JSON.parse(line); last = item; const total = Number(item.total) || 0; const completed = Number(item.completed) || 0; onProgress?.({ status: item.status || 'downloading', progress: total ? Math.round(completed / total * 100) : 0, completed, total, speed: 0 }); if (item.error) throw new Error(item.error); }
  } return last || {};
}

export async function deleteOllamaModel(model, url = 'http://localhost:11434') {
  const response = await fetch(`${url.replace(/\/$/, '')}/api/delete`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: model }) });
  if (!response.ok && response.status !== 404) throw new Error(`Model deletion failed (${response.status})`);
}

export async function checkOllamaConnection(url = 'http://localhost:11434') {
  try {
    const response = await fetch(`${url}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    if (response.ok) {
      const data = await response.json();
      return { connected: true, models: data.models || [] };
    }
    return { connected: false, models: [] };
  } catch {
    return { connected: false, models: [] };
  }
}

/**
 * Device Info
 */
export async function getDeviceInfo() {
  if (isNative) {
    const info = await App.getInfo();
    return {
      platform: window.Capacitor.getPlatform(),
      version: info.version,
      ...info,
    };
  }
  return {
    platform: 'web',
    version: '0.0.1',
  };
}

export default {
  isNative,
  isAndroid,
  isIOS,
  isDesktop,
  fileSystem,
  haptics,
  app,
  statusBar,
  notifications,
  checkOllamaConnection,
  getDeviceCapacity,
  getDeviceInfo,
};

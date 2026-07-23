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

// Check if running in Capacitor
export const isNative = typeof window !== 'undefined' && window.Capacitor?.isNative;

// Platform detection
export const isAndroid = isNative && window.Capacitor.getPlatform() === 'android';
export const isIOS = isNative && window.Capacitor.getPlatform() === 'ios';
export const isDesktop = !isNative;

/**
 * File System Operations
 */
export const fileSystem = {
  /**
   * Read a file from the device
   */
  async readFile(path) {
    if (isNative) {
      const result = await Filesystem.readFile({ path });
      return result.data;
    }
    // Web fallback: use fetch
    try {
      const response = await fetch(path);
      return await response.text();
    } catch {
      throw new Error('File not found');
    }
  },

  /**
   * Write content to a file
   */
  async writeFile(path, content) {
    if (isNative) {
      // Make sure directory exists
      const dir = path.substring(0, path.lastIndexOf('/'));
      try {
        await Filesystem.mkdir({ path: dir, recursive: true });
      } catch {
        // Directory might already exist
      }
      const uri = await Filesystem.writeFile({ path, data: content });
      return uri;
    }
    // Web fallback: download as blob
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = path.split('/').pop();
    a.click();
    URL.revokeObjectURL(url);
  },

  /**
   * List directory contents
   */
  async listDirectory(path) {
    if (isNative) {
      const result = await Filesystem.readDir({ path });
      return result.files.map(f => ({
        name: f.name,
        type: f.type === 'directory' ? 'folder' : 'file',
        path: `${path}/${f.name}`,
      }));
    }
    // Web fallback: return empty
    return [];
  },

  /**
   * Check if file exists
   */
  async exists(path) {
    if (isNative) {
      try {
        await Filesystem.stat({ path });
        return true;
      } catch {
        return false;
      }
    }
    return false;
  },

  /**
   * Create directory
   */
  async createDirectory(path) {
    if (isNative) {
      await Filesystem.mkdir({ path, recursive: true });
    }
  },

  /**
   * Delete file
   */
  async deleteFile(path) {
    if (isNative) {
      await Filesystem.deleteFile({ path });
    }
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
  getDeviceInfo,
};

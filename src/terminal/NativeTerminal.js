/**
 * Advanced Native Terminal for Android
 * 
 * Supports:
 * - Default Android shell
 * - Termux (recommended for npm, python, git, node, etc.)
 * - Custom binary paths
 */

import { runTerminalCommand } from '../nativeBridge.js';

export class NativeTerminal {
  constructor() {
    this.preferredShell = 'termux'; // 'termux' or 'android'
  }

  async execute(command, options = {}) {
    const { cwd = '', timeoutSeconds = 120 } = options;

    // Try Termux first (best for developers)
    if (this.preferredShell === 'termux') {
      const termuxResult = await this.runInTermux(command, cwd, timeoutSeconds);
      if (termuxResult.success) return termuxResult;
    }

    // Fallback to Android default shell
    return await this.runInAndroidShell(command, cwd, timeoutSeconds);
  }

  async runInTermux(command, cwd, timeoutSeconds) {
    try {
      // Termux environment setup
      const termuxPrefix = 'export PATH=$PATH:/data/data/com.termux/files/usr/bin:/data/data/com.termux/files/usr/bin/applets && ';

      const result = await runTerminalCommand({
        command: termuxPrefix + command,
        cwd: cwd || '/data/data/com.termux/files/home',
        timeoutSeconds,
      });

      return {
        output: result?.output || result?.text || '',
        status: 'success',
        shell: 'termux',
        native: true,
        success: true,
      };
    } catch (error) {
      return { success: false, error: error.message, status: 'error', shell: 'termux', native: true };
    }
  }

  async runInAndroidShell(command, cwd, timeoutSeconds) {
    try {
      const result = await runTerminalCommand({
        command,
        cwd,
        timeoutSeconds,
      });

      return {
        output: result?.output || result?.text || '',
        status: 'success',
        shell: 'android',
        native: true,
        success: true,
      };
    } catch (error) {
      return {
        output: `Error: ${error.message}`,
        status: 'error',
        native: true,
        success: false,
      };
    }
  }

  setPreferredShell(shell) {
    this.preferredShell = shell;
  }
}

export const nativeTerminal = new NativeTerminal();
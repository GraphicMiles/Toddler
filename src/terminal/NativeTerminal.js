/**
 * Native Android Terminal
 * Delegates to the TerminalRuntime Capacitor plugin when available.
 */

import { runTerminalCommand, cancelTerminalCommand } from '../nativeBridge.js';

export class NativeTerminal {
  async execute(command, options = {}) {
    const { cwd = '', timeoutSeconds = 30, requestId } = options;

    try {
      const result = await runTerminalCommand({
        command,
        cwd,
        timeoutSeconds,
        requestId,
      });

      return {
        output: result?.output || result?.text || 'Command executed',
        status: 'success',
        native: true,
      };
    } catch (error) {
      return {
        output: `Native terminal error: ${error.message}`,
        status: 'error',
        native: true,
      };
    }
  }

  async cancel(requestId) {
    try {
      await cancelTerminalCommand(requestId);
      return { status: 'cancelled' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }
}

export const nativeTerminal = new NativeTerminal();
/**
 * Real Terminal Implementation
 * Executes safe commands against the virtual workspace when Experimental Terminal is enabled.
 */

import { virtualWorkspace } from '../utils/virtualWorkspace.js';

export class RealTerminal {
  async execute(command, workspacePath = '') {
    const cmd = command.trim();
    const parts = cmd.split(' ');
    const action = parts[0].toLowerCase();

    try {
      switch (action) {
        case 'pwd':
          return { output: workspacePath || '/workspace', status: 'success' };

        case 'ls':
          const path = parts[1] || '';
          const tree = await virtualWorkspace.getTree();
          const items = tree.filter(item => 
            !path || item.path.startsWith(path)
          );
          return {
            output: items.map(i => `${i.type === 'folder' ? '📁' : '📄'} ${i.name}`).join('\n') || 'Empty directory',
            status: 'success'
          };

        case 'cat':
          if (!parts[1]) return { output: 'Usage: cat <filename>', status: 'error' };
          try {
            const content = await virtualWorkspace.readFile(parts[1]);
            return { output: content, status: 'success' };
          } catch {
            return { output: `File not found: ${parts[1]}`, status: 'error' };
          }

        case 'echo':
          const text = parts.slice(1).join(' ');
          return { output: text, status: 'success' };

        case 'mkdir':
          if (!parts[1]) return { output: 'Usage: mkdir <folder>', status: 'error' };
          await virtualWorkspace.createDirectory(parts[1]);
          return { output: `Directory created: ${parts[1]}`, status: 'success' };

        case 'touch':
          if (!parts[1]) return { output: 'Usage: touch <file>', status: 'error' };
          await virtualWorkspace.writeFile(parts[1], '');
          return { output: `File created: ${parts[1]}`, status: 'success' };

        default:
          return {
            output: `Command not supported in browser environment: ${action}\nSupported: pwd, ls, cat, echo, mkdir, touch`,
            status: 'limited'
          };
      }
    } catch (error) {
      return { output: `Error: ${error.message}`, status: 'error' };
    }
  }
}

export const realTerminal = new RealTerminal();
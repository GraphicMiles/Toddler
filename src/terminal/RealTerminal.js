/**
 * Real Terminal Implementation (Enhanced)
 * Executes commands against the virtual workspace + some browser capabilities.
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

        case 'rm':
          if (!parts[1]) return { output: 'Usage: rm <file>', status: 'error' };
          try {
            await virtualWorkspace.deleteFile(parts[1]);
            return { output: `Deleted: ${parts[1]}`, status: 'success' };
          } catch {
            return { output: `Failed to delete: ${parts[1]}`, status: 'error' };
          }

        case 'write':
          // write filename content
          if (parts.length < 3) return { output: 'Usage: write <filename> <content>', status: 'error' };
          const filename = parts[1];
          const content = parts.slice(2).join(' ');
          await virtualWorkspace.writeFile(filename, content);
          return { output: `Written to ${filename}`, status: 'success' };

        default:
          return {
            output: `Command not fully supported: ${action}\nSupported: pwd, ls, cat, echo, mkdir, touch, rm, write`,
            status: 'limited'
          };
      }
    } catch (error) {
      return { output: `Error: ${error.message}`, status: 'error' };
    }
  }
}

export const realTerminal = new RealTerminal();
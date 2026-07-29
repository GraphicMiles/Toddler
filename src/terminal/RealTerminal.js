/**
 * Advanced Real Terminal for ForgeAI
 * 
 * This implementation provides a rich terminal experience within the virtual workspace.
 * It supports many common commands and gives the feeling of a real terminal.
 */

import { virtualWorkspace } from '../utils/virtualWorkspace.js';

export class RealTerminal {
  constructor() {
    this.currentPath = '/workspace';
    this.history = [];
  }

  async execute(command, _workspacePath = '') {
    const cmd = command.trim();
    if (!cmd) return { output: '', status: 'success' };

    const parts = cmd.split(' ');
    const action = parts[0].toLowerCase();

    this.history.push(cmd);

    try {
      switch (action) {
        // === Navigation & Info ===
        case 'pwd':
          return { output: this.currentPath, status: 'success' };

        case 'cd':
          if (!parts[1]) return { output: this.currentPath, status: 'success' };
          this.currentPath = parts[1].startsWith('/') ? parts[1] : `${this.currentPath}/${parts[1]}`.replace(/\/+/g, '/');
          return { output: '', status: 'success' };

        case 'ls':
        case 'dir':
          return await this.listFiles(parts[1]);

        case 'tree':
          return await this.showTree();

        // === File Operations ===
        case 'cat':
        case 'type':
          return await this.readFile(parts[1]);

        case 'echo':
          return this.echo(parts.slice(1));

        case 'touch':
          return await this.touch(parts[1]);

        case 'mkdir':
          return await this.mkdir(parts[1]);

        case 'rm':
        case 'del':
        case 'rmdir':
          return await this.remove(parts[1]);

        case 'write':
          return await this.writeFile(parts[1], parts.slice(2).join(' '));

        case 'clear':
          return { output: '', status: 'success', clear: true };

        // === Advanced / Simulated System Commands ===
        case 'node':
        case 'npm':
        case 'python':
        case 'pip':
          return this.simulateSystemCommand(action, parts.slice(1));

        default:
          return {
            output: `forgeai: command not found: ${action}\n` +
                    `Supported: pwd, cd, ls, tree, cat, echo, touch, mkdir, rm, write, clear, node, npm, python`,
            status: 'limited'
          };
      }
    } catch (error) {
      return { output: `Error: ${error.message}`, status: 'error' };
    }
  }

  async listFiles(path = '') {
    const tree = await virtualWorkspace.getTree();
    const targetPath = path || this.currentPath;
    
    const filtered = tree.filter(item => 
      !targetPath || item.path.startsWith(targetPath.replace(/^\//, ''))
    );

    if (filtered.length === 0) {
      return { output: 'No files found', status: 'success' };
    }

    const output = filtered.map(item => 
      `${item.type === 'folder' ? 'd' : '-'}rwxr-xr-x  ${item.name}`
    ).join('\n');

    return { output, status: 'success' };
  }

  async showTree() {
    const tree = await virtualWorkspace.getTree();
    const output = this.buildTreeString(tree);
    return { output, status: 'success' };
  }

  buildTreeString(nodes, prefix = '') {
    return nodes.map((node, index) => {
      const isLast = index === nodes.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      let line = `${prefix}${connector}${node.name}${node.type === 'folder' ? '/' : ''}`;
      
      if (node.children?.length > 0) {
        const newPrefix = prefix + (isLast ? '    ' : '│   ');
        line += '\n' + this.buildTreeString(node.children, newPrefix);
      }
      return line;
    }).join('\n');
  }

  async readFile(filename) {
    if (!filename) return { output: 'Usage: cat <filename>', status: 'error' };
    try {
      const content = await virtualWorkspace.readFile(filename);
      return { output: content, status: 'success' };
    } catch {
      return { output: `cat: ${filename}: No such file or directory`, status: 'error' };
    }
  }

  echo(args) {
    return { output: args.join(' '), status: 'success' };
  }

  async touch(filename) {
    if (!filename) return { output: 'Usage: touch <file>', status: 'error' };
    await virtualWorkspace.writeFile(filename, '');
    return { output: '', status: 'success' };
  }

  async mkdir(foldername) {
    if (!foldername) return { output: 'Usage: mkdir <folder>', status: 'error' };
    await virtualWorkspace.createDirectory(foldername);
    return { output: `mkdir: created directory '${foldername}'`, status: 'success' };
  }

  async remove(filename) {
    if (!filename) return { output: 'Usage: rm <file>', status: 'error' };
    try {
      await virtualWorkspace.deleteFile(filename);
      return { output: `rm: removed '${filename}'`, status: 'success' };
    } catch {
      return { output: `rm: cannot remove '${filename}': No such file`, status: 'error' };
    }
  }

  async writeFile(filename, content) {
    if (!filename) return { output: 'Usage: write <file> <content>', status: 'error' };
    await virtualWorkspace.writeFile(filename, content);
    return { output: `Written ${content.length} bytes to ${filename}`, status: 'success' };
  }

  simulateSystemCommand(cmd, args) {
    const output = `⚠️  ${cmd} is simulated in this environment.\n` +
                   `In a real Android app with native plugins, this would execute:\n` +
                   `${cmd} ${args.join(' ')}`;
    return { output, status: 'simulated_system' };
  }
}

export const realTerminal = new RealTerminal();
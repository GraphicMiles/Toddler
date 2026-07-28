import { buildFileIndex, searchFiles } from '../utils/fileIndex.js';
import { ToolRegistry } from './toolRegistry.js';

export function createWorkspaceToolRegistry(workspaceProvider) {
  if (!workspaceProvider) throw new Error('A workspace provider is required.');

  return new ToolRegistry()
    .register({
      name: 'read_file',
      description: 'Read a file inside the selected workspace.',
      permission: 'read',
      execute: async ({ path }) => ({
        path,
        content: await workspaceProvider.readText(path),
        type: 'read',
      }),
    })
    .register({
      name: 'write_file',
      description: 'Write an existing file inside the selected workspace.',
      permission: 'write',
      execute: async ({ path, content }) => {
        await workspaceProvider.writeText(path, content ?? '');
        return { path, content: content ?? '', type: 'write' };
      },
    })
    .register({
      name: 'search',
      description: 'Search the selected workspace tree by file or folder name.',
      permission: 'read',
      execute: async ({ query, workspaceTree }) => {
        const results = searchFiles(query || '', workspaceTree || []);
        return { query, results, count: results.length, type: 'search' };
      },
    })
    .register({
      name: 'index',
      description: 'Build an index of the selected workspace tree.',
      permission: 'read',
      execute: async ({ workspaceTree, filterType }) => {
        const index = buildFileIndex(workspaceTree || []);
        const result = filterType ? index.byExtension[filterType] || [] : index;
        return {
          index: result,
          type: 'index',
          count: Array.isArray(result) ? result.length : result.count || 0,
        };
      },
    })
    .register({
      name: 'rename',
      description: 'Rename a file or folder inside the selected workspace.',
      permission: 'write',
      execute: async ({ path, newName }) => {
        if (!newName) throw new Error('A new item name is required.');
        await workspaceProvider.rename(path, newName);
        const slash = path.lastIndexOf('/');
        const parent = slash < 0 ? '' : path.slice(0, slash);
        const newPath = parent ? `${parent}/${newName}` : newName;
        return { oldPath: path, newPath, type: 'rename' };
      },
    })
    .register({
      name: 'delete',
      description: 'Delete a file or folder inside the selected workspace.',
      permission: 'dangerous',
      execute: async ({ path }) => {
        await workspaceProvider.delete(path);
        return { path, type: 'delete' };
      },
    })
    .register({
      name: 'terminal',
      description: 'Preview a terminal request. Shell execution is not available.',
      permission: 'dangerous',
      execute: async ({ command, workspacePath = '' }) => {
        if (typeof command !== 'string' || !command.trim()) throw new Error('A command is required.');
        const cmd = command.trim();
        if (cmd === 'pwd') {
          return { command: cmd, output: workspacePath || 'selected-workspace', type: 'terminal', status: 'completed', simulated: true };
        }
        if (cmd === 'ls' || cmd.startsWith('ls ')) {
          return { command: cmd, output: 'Use the Files tab for the contained workspace listing.', type: 'terminal', status: 'completed', simulated: true };
        }
        if (cmd.startsWith('echo ')) {
          return { command: cmd, output: cmd.slice(5), type: 'terminal', status: 'completed', simulated: true };
        }
        return {
          command: cmd,
          output: `Not executed: ${cmd}. Shell execution is disabled.`,
          type: 'terminal',
          status: 'blocked',
          simulated: true,
        };
      },
    });
}

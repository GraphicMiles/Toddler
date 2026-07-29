import { buildFileIndex, searchFiles } from '../utils/fileIndex.js';
import { applyUnifiedDiff, summarizeUnifiedDiff } from '../patch/unifiedDiff.js';
import { ToolRegistry } from './toolRegistry.js';
import { isExperimentalEnabled } from '../utils/experimentalFeatures.js';
import { isNative, runTerminalCommand } from '../nativeBridge.js';

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
      name: 'create_file',
      description: 'Create a new text file inside the selected workspace and write approved content.',
      permission: 'write',
      execute: async ({ path, content }) => {
        try { await workspaceProvider.inspect(path); throw new Error(`Workspace item already exists: ${path}`); }
        catch (error) { if (!/not found/i.test(error.message) && !/path not found/i.test(error.message)) throw error; }
        await workspaceProvider.createFile(path);
        try {
          const receipt = await workspaceProvider.writeText(path, content ?? '');
          const verified = await workspaceProvider.readText(path);
          if (verified !== String(content ?? '')) throw new Error(`Post-create verification failed for ${path}.`);
          return { path, content: content ?? '', type: 'create_file', created: true, backupId: receipt?.backupId || null };
        } catch (error) {
          await workspaceProvider.delete(path).catch(() => {});
          throw error;
        }
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
      name: 'validate_patch',
      description: 'Validate and summarize a unified diff without changing files.',
      permission: 'read',
      execute: async ({ patch }) => ({ type: 'patch_preview', files: summarizeUnifiedDiff(patch), patch }),
    })
    .register({
      name: 'apply_patch',
      description: 'Apply a user-reviewed unified diff to existing workspace files.',
      permission: 'write',
      execute: async ({ patch }) => ({ type: 'patch_apply', ...(await applyUnifiedDiff(workspaceProvider, patch)) }),
    })
    .register({
      name: 'terminal',
      description: 'Execute terminal commands (real on Android when Experimental Terminal is enabled)',
      permission: 'dangerous',
      execute: async ({ command, workspacePath = '' }) => {
        if (typeof command !== 'string' || !command.trim()) throw new Error('A command is required.');
        const cmd = command.trim();

        const experimentalEnabled = isExperimentalEnabled('realTerminal');

        if (!experimentalEnabled || !isNative) {
          // Simulated mode (non-Android or toggle off)
          return {
            command: cmd,
            output: `Terminal is simulated. Enable "Real Terminal Execution" in Experimental Features on Android.`,
            type: 'terminal',
            status: 'simulated',
            simulated: true,
          };
        }

        // Real native terminal execution
        try {
          const result = await runTerminalCommand({ command: cmd, cwd: workspacePath });
          return {
            command: cmd,
            output: result?.output || 'Command executed',
            type: 'terminal',
            status: 'success',
            experimental: true,
            native: true,
          };
        } catch (error) {
          return {
            command: cmd,
            output: `Native error: ${error.message}`,
            type: 'terminal',
            status: 'error',
            experimental: true,
            native: true,
          };
        }
      },
    });
}

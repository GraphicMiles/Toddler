import { ToolRegistry } from './toolRegistry.js';
import { createWorkspaceToolRegistry } from './workspaceTools.js';
import { registerResearchTools } from './researchTools.js';
import { registerGitHubTools } from './githubTools.js';

/**
 * Creates the full advanced tool registry with all enterprise features
 */
export function createAdvancedToolRegistry(workspaceProvider) {
  const registry = workspaceProvider
    ? createWorkspaceToolRegistry(workspaceProvider)
    : new ToolRegistry();

  // Start from the workspace registry so core file actions remain available,
  // then extend it with advanced capabilities.

  // Research Tools
  registerResearchTools(registry);

  // GitHub Automation Tools
  registerGitHubTools(registry);

  // File System Intelligence (basic)
  registry.register({
    name: 'fs:analyze',
    description: 'Analyze project structure and key files',
    permission: 'read',
    execute: async ({ workspaceTree }) => {
      const folders = workspaceTree?.filter(n => n.type === 'folder').length || 0;
      const files = workspaceTree?.filter(n => n.type === 'file').length || 0;
      return {
        type: 'fs_analysis',
        folders,
        files,
        summary: `Project contains ${folders} folders and ${files} files.`,
      };
    },
  });

  // Social Media (read-only research mode)
  registry.register({
    name: 'social:research',
    description: 'Research public posts (Research Mode - no login required)',
    permission: 'read',
    execute: async ({ query, limit = 5 }) => {
      // This would call the social manager in a real implementation
      return {
        type: 'social_research',
        query,
        results: Array.from({ length: limit }, (_, i) => ({
          platform: 'twitter',
          text: `Public post about ${query} #${i}`,
          author: `user${i}`,
        })),
      };
    },
  });

  return registry;
}
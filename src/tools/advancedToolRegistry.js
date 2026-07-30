import { ToolRegistry } from './toolRegistry.js';
import { createWorkspaceToolRegistry } from './workspaceTools.js';
import { registerResearchTools } from './researchTools.js';
import { registerGitHubTools } from './githubTools.js';

function flattenTree(items, prefix = '') {
  const result = [];
  for (const item of items) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.type === 'file') result.push(path);
    else if (item.children) result.push(...flattenTree(item.children, path));
  }
  return result;
}

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

  // File System Intelligence — full project analysis
  registry.register({
    name: 'fs:analyze',
    description: 'Analyze project structure, file types, entry points, and dependencies',
    permission: 'read',
    execute: async ({ workspaceTree, workspaceProvider }) => {
      const allFiles = flattenTree(workspaceTree || []);
      const byExtension = {};
      const byType = { source: 0, config: 0, style: 0, test: 0, docs: 0, other: 0 };
      const entryPoints = [];
      const keyFiles = [];

      const sourceExts = new Set(['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'kt', 'cpp', 'c', 'rs', 'go', 'rb', 'php', 'swift']);
      const configExts = new Set(['json', 'yaml', 'yml', 'toml', 'ini', 'conf', 'env']);
      const styleExts = new Set(['css', 'scss', 'less', 'sass']);
      const testPatterns = /test|spec|__tests__|\.test\.|\.spec\./i;
      const entryPatterns = /^(index|main|app|server|entry|bootstrap|start)\./i;
      const keyFilePatterns = /^(package\.json|tsconfig|vite\.config|webpack|babel|eslint|prettier|dockerfile|readme|makefile|cargo\.toml|go\.mod|build\.gradle|pom\.xml)$/i;

      for (const file of allFiles) {
        const name = file.split('/').pop();
        const ext = name.split('.').pop()?.toLowerCase() || '';

        byExtension[ext] = (byExtension[ext] || 0) + 1;

        if (testPatterns.test(file)) byType.test++;
        else if (sourceExts.has(ext)) byType.source++;
        else if (configExts.has(ext)) byType.config++;
        else if (styleExts.has(ext)) byType.style++;
        else if (/\.(md|txt|log)$/i.test(ext)) byType.docs++;
        else byType.other++;

        if (entryPatterns.test(name)) entryPoints.push(file);
        if (keyFilePatterns.test(name)) keyFiles.push(file);
      }

      // Try to read key files for more context
      let projectInfo = {};
      if (workspaceProvider?.readText) {
        for (const kf of keyFiles.slice(0, 3)) {
          try {
            const content = await workspaceProvider.readText(kf);
            if (kf.endsWith('package.json')) {
              try {
                const pkg = JSON.parse(content);
                projectInfo.name = pkg.name;
                projectInfo.version = pkg.version;
                projectInfo.scripts = Object.keys(pkg.scripts || {}).slice(0, 10);
                projectInfo.dependencies = Object.keys(pkg.dependencies || {}).length;
                projectInfo.devDependencies = Object.keys(pkg.devDependencies || {}).length;
              } catch {}
            }
          } catch {}
        }
      }

      return {
        type: 'fs_analysis',
        totalFiles: allFiles.length,
        byType,
        byExtension: Object.entries(byExtension).sort((a, b) => b[1] - a[1]).slice(0, 15),
        entryPoints: entryPoints.slice(0, 10),
        keyFiles,
        projectInfo,
        summary: `${allFiles.length} files: ${byType.source} source, ${byType.config} config, ${byType.style} style, ${byType.test} test, ${byType.docs} docs. Entry points: ${entryPoints.slice(0, 5).join(', ') || 'none detected'}.`,
      };
    },
  });

  // NOTE: no social:research tool is registered here. The previous stub returned
  // fabricated posts (user0..n placeholders); a tool that invents data is worse
  // than no tool. Real social providers live in src/social/*.

  return registry;
}
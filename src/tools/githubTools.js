import { githubAutomation } from '../github/GitHubAutomation.js';

export function registerGitHubTools(registry) {
  registry.register({
    name: 'github:propose',
    description: 'Propose a commit or PR (branch protection bypass requires valid token)',
    permission: 'read',
    execute: async ({ changes, message, githubToken, branchProtectionBypass }) => {
      return await githubAutomation.proposeCommit(changes, message, {
        githubToken,
        branchProtectionBypass,
      });
    },
  });

  registry.register({
    name: 'github:run_maintenance',
    description: 'Run the Maintenance Bot (dependency updates, lint fixes)',
    permission: 'read',
    execute: async () => {
      return await githubAutomation.runMaintenanceBot();
    },
  });
}
import { githubAutomation } from '../github/GitHubAutomation.js';

export function registerGitHubTools(registry) {
  registry.register({
    name: 'github:propose',
    description: 'Propose a commit or PR based on current automation tier',
    permission: 'read', // Safe by default
    execute: async ({ changes, message }) => {
      return await githubAutomation.proposeCommit(changes, message);
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
/**
 * Native Android GitHub Provider
 * Uses the GithubRuntime Capacitor plugin for real operations.
 */

import { githubApi, storeGithubToken } from '../nativeBridge.js';

export class NativeGitHubProvider {
  async proposeCommit(changes, message, options = {}) {
    const { githubToken, branchProtectionBypass = false } = options;

    if (!githubToken) {
      return {
        status: 'error',
        message: 'GitHub token required',
      };
    }

    try {
      // Store token securely
      await storeGithubToken(githubToken);

      // Example: Create an issue via native plugin
      const result = await githubApi({
        method: 'POST',
        path: '/issues',
        body: JSON.stringify({
          title: `[ForgeAI] ${message}`,
          body: JSON.stringify(changes),
        }),
      });

      return {
        status: 'real_success',
        result,
        native: true,
        experimental: true,
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
      };
    }
  }
}

export const nativeGitHubProvider = new NativeGitHubProvider();
import { parseStructuredActions, structuredActionPrompt, validateStructuredAction } from './actionProtocol.js';
import {
  githubApi, gitCheckout, gitClone, gitCommit, gitFetch, gitLog, gitPull, gitPush, gitRebase, gitStatus,
  runTerminalCommand,
} from '../nativeBridge.js';
import { performOnlineResearch } from './onlineResearch.js';
import { automationTierManager, shouldAutoApproveAction } from './automation/automationTiers.js';

export function isAutonomousToolRequest(message = '') {
  return /\b(terminal|shell|command|github|repository|repo|clone|fetch|pull|push|commit|rebase|checkout|branch|workflow|actions)\b/i.test(message);
}

async function capture(provider, model, messages, signal) {
  let text = '';
  const result = await provider.stream({ model, messages, signal, onToken: token => { text += token; } });
  return { text, result };
}

function fallbackActions(request) {
  const repository = request.match(/https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?/i)?.[0]
    || request.match(/\b[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\b/)?.[0];
  if (repository && /\b(clone|import|pull down)\b/i.test(request)) return [{ type: 'git_clone', paths: [], rationale: 'Clone the repository requested by the user.', repository, branch: '' }];
  const command = request.match(/(?:run|execute)(?: the)?(?: terminal| shell)? command\s*[:：]\s*([\s\S]+)/i)?.[1];
  if (command) return [{ type: 'terminal', paths: [], rationale: 'Run the exact command requested by the user.', command: command.trim(), cwd: '', timeoutSeconds: 120 }];
  return [];
}

async function executeAction(action) {
  if (action.type === 'terminal') return runTerminalCommand({ ...action, cwd: action.cwd || localStorage.getItem('forgeai_last_git_repo') || '' });
  if (action.type === 'web_search') return performOnlineResearch(action.query);
  if (action.type === 'github_api') return githubApi({ method: action.method, path: action.apiPath, body: action.body });
  if (action.type === 'git_clone') {
    const result = await gitClone(action.repository, action.branch);
    try { localStorage.setItem('forgeai_last_git_repo', result.path); }
    catch (error) { console.warn('Failed to persist last Git repository path:', error); }
    return result;
  }
  if (action.type === 'git') {
    const path = action.repositoryPath || localStorage.getItem('forgeai_last_git_repo') || '';
    if (!path) throw new Error('No app-private Git clone is active. Clone a repository first.');
    if (action.operation === 'status') return gitStatus(path);
    if (action.operation === 'log') return gitLog(path, 30);
    if (action.operation === 'fetch') return gitFetch(path);
    if (action.operation === 'pull') return gitPull(path);
    if (action.operation === 'checkout') return gitCheckout(path, action.branch, false);
    if (action.operation === 'commit') return gitCommit(path, action.message || 'ForgeAI autonomous change', 'ForgeAI User', 'forgeai@localhost');
    if (action.operation === 'push') return gitPush(path, action.force);
    if (action.operation === 'rebase') return gitRebase(path, action.upstream || action.branch);
  }
  return null;
}

export async function runFullAutonomyAgent({ provider, model, request, signal, onToken }) {
  const activeRepository = localStorage.getItem('forgeai_last_git_repo') || '(none)';
  const prompt = `${structuredActionPrompt(['terminal', 'web_search', 'github_api', 'git_clone', 'git'])}\nFull Autonomous Android mode is enabled. Return up to 6 actions. You may use app-sandbox terminal and app-private JGit clones. Active app-private clone: ${activeRepository}. GitHub writes use the encrypted token vault. Never ask for or print credentials. Android usually has no node, npm, python, or system git binary; use JGit actions for Git. Use final only when no tool is needed.`;
  const planned = await capture(provider, model, [{ role: 'system', content: prompt }, { role: 'user', content: request }], signal);
  let actions;
  try { actions = parseStructuredActions(planned.text); }
  catch { actions = fallbackActions(request).map(validateStructuredAction); }
  if (!actions.length) throw new Error('The local model did not produce a valid terminal, research, or Git action. Use a direct command such as “run command: ls” or include a GitHub repository URL.');

  const results = [];
  const isWorkflow = automationTierManager.isWorkflowMode();
  const checkpointId = isWorkflow ? automationTierManager.createRevertCheckpoint(actions, `Workflow: ${request.slice(0, 60)}`) : null;

  for (const action of actions.slice(0, isWorkflow ? 12 : 6)) {
    if (action.type === 'final') { 
      onToken?.(action.answer); 
      return planned.result; 
    }

    // Check if we should auto-approve based on tier + whitelist
    const autoApproved = shouldAutoApproveAction(action);
    
    if (!autoApproved && !automationTierManager.isFullAuto()) {
      // In assisted/semi mode we still require approval gate from App.jsx
      results.push({ action: action.type, input: action, status: 'pending-approval', skipped: true });
      continue;
    }

    // Log step for workflow mode
    if (isWorkflow) {
      automationTierManager.logWorkflowStep({
        type: 'action',
        action: action.type,
        input: action,
        checkpointId,
      });
    }

    try {
      const output = await executeAction(action);
      results.push({ action: action.type, input: action, output, status: 'executed' });
    } catch (err) {
      results.push({ action: action.type, input: action, error: err.message, status: 'failed' });
      if (!automationTierManager.isFullAuto()) break; // stop on error unless full-auto
    }
  }

  const final = await provider.stream({
    model,
    signal,
    onToken,
    messages: [
      { role: 'system', content: 'Summarize the completed tool work accurately. Do not claim an operation succeeded if its output reports failure. Do not expose credentials. Include relevant paths, exit codes, Git states, and source URLs.' },
      { role: 'user', content: `REQUEST:\n${request}\n\nTOOL RESULTS:\n${JSON.stringify(results).slice(0, 120000)}` },
    ],
  });
  return final;
}

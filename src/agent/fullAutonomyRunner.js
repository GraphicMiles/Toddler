import { parseStructuredActions, structuredActionPrompt, validateStructuredAction } from './actionProtocol.js';
import {
  githubApi, gitCheckout, gitClone, gitCommit, gitFetch, gitLog, gitPull, gitPush, gitRebase, gitStatus,
  runTerminalCommand,
} from '../nativeBridge.js';
import { performOnlineResearch } from './onlineResearch.js';
import { automationTierManager, shouldAutoApproveAction } from './automation/automationTiers.js';

export function isAutonomousToolRequest(message = '') {
  const text = String(message).trim();
  // Original keyword-based triggers
  if (/\b(terminal|shell|command|github|repository|repo|clone|fetch|pull|push|commit|rebase|checkout|branch|workflow|actions)\b/i.test(text)) return true;
  // Direct GitHub URL (with or without a verb)
  if (/https?:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/i.test(text)) return true;
  // owner/repo pattern
  if (/\b[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\b/i.test(text) && /\b(clone|import|pull down|check out|get|download)\b/i.test(text)) return true;
  return false;
}

// A request that can only be satisfied by executing a Git/terminal/GitHub tool —
// phrased as a command, not a question. Used to gate such requests honestly instead
// of letting the small chat model hallucinate a refusal.
const TOOL_COMMAND_VERBS = /\b(clone|pull|push|fetch|commit|rebase|checkout|merge)\b/i;
const TOOL_COMMAND_TARGETS = /\b(repo|repository|branch|remote|origin|commit|github|gitlab|main|master|pull request|issue)\b/i;
const SHELL_COMMAND_REQUEST = /\b(run|execute)\b[\s\S]{0,32}\b(command|terminal|shell|script)\b/i;
const QUESTION_PHRASING = /^(what|whats|what's|how|why|explain|describe|define|tell me|difference|can i|should i)\b/i;

export function isActionableToolRequest(message = '') {
  const text = String(message).trim();
  if (!text || QUESTION_PHRASING.test(text)) return false;
  return (TOOL_COMMAND_VERBS.test(text) && TOOL_COMMAND_TARGETS.test(text)) || SHELL_COMMAND_REQUEST.test(text);
}

// A Git command with no target: no repo URL / owner-repo in the message and no
// previously cloned app-private repository. Asking for the URL beats failing.
const GIT_TOOL_VERBS = /\b(clone|pull|push|fetch|commit|rebase|checkout|merge)\b/i;
const MENTIONS_REPOSITORY = /(https?:\/\/[^\s]+|https?:\/\/github\.com\S+|[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/;

export function isGitRequestWithoutRepo(message = '') {
  if (!GIT_TOOL_VERBS.test(message)) return false;
  if (MENTIONS_REPOSITORY.test(message)) return false;
  try { return !localStorage.getItem('forgeai_last_git_repo'); }
  catch { return true; }
}

// Check if a message contains a GitHub URL (for direct URL paste handling)
export function containsGitHubUrl(message = '') {
  return /https?:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?/i.test(message);
}

// Extract GitHub URL from a message
export function extractGitHubUrl(message = '') {
  return message.match(/https?:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?/i)?.[0] || '';
}

async function capture(provider, model, messages, signal) {
  let text = '';
  const result = await provider.stream({ model, messages, signal, onToken: token => { text += token; } });
  return { text, result };
}

function fallbackActions(request) {
  // Check for GitHub URL first - if present, treat as clone request
  const githubUrl = request.match(/https?:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?/i)?.[0];
  if (githubUrl) return [{ type: 'git_clone', paths: [], rationale: 'Clone the GitHub repository provided by the user.', repository: githubUrl, branch: '' }];
  
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

export async function runFullAutonomyAgent({ provider, model, request, signal, onToken, onPendingActions }) {
  const activeRepository = localStorage.getItem('forgeai_last_git_repo') || '(none)';
  const prompt = `${structuredActionPrompt(['terminal', 'web_search', 'github_api', 'git_clone', 'git'])}\nFull Autonomous Android mode is enabled. Return up to 6 actions. You may use app-sandbox terminal and app-private JGit clones. Active app-private clone: ${activeRepository}. GitHub writes use the encrypted token vault. Never ask for or print credentials. Android usually has no node, npm, python, or system git binary; use JGit actions for Git. Use final only when no tool is needed.`;
  const planned = await capture(provider, model, [{ role: 'system', content: prompt }, { role: 'user', content: request }], signal);
  let actions;
  try { actions = parseStructuredActions(planned.text); }
  catch { actions = fallbackActions(request).map(validateStructuredAction); }
  if (!actions.length) {
    const hasUrl = /https?:\/\//.test(request);
    if (hasUrl) {
      throw new Error('I found a URL but could not determine what action to take. Try being more specific, for example: clone https://github.com/owner/repo');
    }
    throw new Error('I could not determine what tool action to take. Try a direct command like clone https://github.com/owner/repo, run command: ls, or ask a question instead.');
  }

  const results = [];
  const pendingApproval = [];
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
      // In assisted/semi mode the action is surfaced as an approval card in chat
      // (via onPendingActions) instead of being silently skipped.
      results.push({ action: action.type, input: action, status: 'pending-approval', skipped: true });
      pendingApproval.push(action);
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

  if (pendingApproval.length) {
    try { onPendingActions?.(pendingApproval); }
    catch (error) { console.warn('Failed to surface pending actions:', error); }
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

// Executes a single runner action after explicit user approval (chat approval card).
export async function executeAutonomousAction(action) {
  if (!action || !action.type) throw new Error('A tool action is required.');
  const output = await executeAction(action);
  if (output === null || output === undefined) throw new Error(`Unsupported action type: ${action.type}`);
  return output;
}

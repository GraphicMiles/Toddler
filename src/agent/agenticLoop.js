/**
 * Agentic Loop — Multi-Step Tool-Use Engine
 * 
 * This is the core architecture that makes ForgeAI behave like Claude Code / Arena AI.
 * Instead of single-pass generation with regex routing, the model:
 * 
 * 1. Receives tool schemas + full conversation context
 * 2. Decides which tool to call (or respond directly)
 * 3. Executes the tool and gets results
 * 4. Reads results and decides next action
 * 5. Repeats until it calls "respond" or hits max iterations
 * 
 * Supports: read → plan → edit → verify → fix → respond cycles.
 */

import { formatToolSchemasForPrompt, parseToolCalls, extractNonToolText, streamableText, toOpenAITools, normalizeNativeToolCalls } from './toolSchemas.js';
import { Scratchpad } from './scratchpad.js';
import { performOnlineResearch } from './onlineResearch.js';
import {
  gitClone, gitStatus, gitCommit, gitPush, gitLog,
  runTerminalCommand,
} from '../nativeBridge.js';

const MAX_ITERATIONS = 12;

// Actionable message the model can relay to the user when no workspace folder is
// selected — instead of a bare "No workspace selected." dead-end.
const NO_WORKSPACE_MSG = 'No workspace folder is selected. Open the Files tab and choose a workspace folder first (the app needs a folder to read from and write into), then ask again.';

/**
 * Create a tool executor bound to a workspace provider and native bridge.
 */
function createToolExecutor(workspaceProvider, options = {}) {
  const { isNative = false, _onToolCall, _signal } = options;

  return async function executeTool(toolName, args) {
    try {
      switch (toolName) {
        case 'read_file': {
          if (!workspaceProvider?.readText) throw new Error(NO_WORKSPACE_MSG);
          const content = await workspaceProvider.readText(args.path);
          return { success: true, path: args.path, content, lines: content.split('\n').length };
        }

        case 'write_file': {
          if (!workspaceProvider?.writeText) throw new Error(NO_WORKSPACE_MSG);
          await workspaceProvider.writeText(args.path, args.content);
          // Verify
          const verified = await workspaceProvider.readText(args.path);
          const match = verified === args.content;
          return { success: match, path: args.path, verified: match, lines: args.content.split('\n').length };
        }

        case 'create_file': {
          if (!workspaceProvider?.createFile) throw new Error(NO_WORKSPACE_MSG);
          try {
            await workspaceProvider.inspect(args.path);
            return { success: false, error: `File already exists: ${args.path}` };
          } catch { /* file doesn't exist, good */ }
          await workspaceProvider.createFile(args.path);
          await workspaceProvider.writeText(args.path, args.content);
          return { success: true, path: args.path, created: true, lines: args.content.split('\n').length };
        }

        case 'delete_file': {
          if (!workspaceProvider?.delete) throw new Error(NO_WORKSPACE_MSG);
          await workspaceProvider.delete(args.path);
          return { success: true, path: args.path, deleted: true };
        }

        case 'list_files': {
          if (!workspaceProvider?.list) {
            // Fallback: use workspace tree if available
            return { success: true, files: [], note: 'Workspace listing not available in this context.' };
          }
          const result = await workspaceProvider.list('');
          const files = flattenTree(result.items || []);
          const pattern = args.pattern;
          const filtered = pattern ? files.filter(f => matchGlob(f, pattern)) : files;
          return { success: true, files: filtered.slice(0, 200), total: filtered.length };
        }

        case 'search_code': {
          if (!workspaceProvider?.readText) throw new Error(NO_WORKSPACE_MSG);
          const query = args.query;
          const results = [];
          // Search through files (limited to first 50 for performance)
          const fileList = options.workspaceFiles || [];
          for (const file of fileList.slice(0, 50)) {
            try {
              const content = await workspaceProvider.readText(file);
              if (content.toLowerCase().includes(query.toLowerCase())) {
                const lines = content.split('\n');
                const matches = lines
                  .map((line, i) => ({ line: i + 1, text: line.trim() }))
                  .filter(l => l.text.toLowerCase().includes(query.toLowerCase()))
                  .slice(0, 5);
                if (matches.length > 0) {
                  results.push({ file, matches });
                }
              }
            } catch { /* skip unreadable files */ }
          }
          return { success: true, query, results: results.slice(0, 20), totalMatches: results.length };
        }

        case 'run_terminal': {
          if (!isNative) {
            return { success: false, output: 'Terminal requires Android native mode.', simulated: true };
          }
          try {
            const result = await runTerminalCommand({
              command: args.command,
              cwd: args.cwd || localStorage.getItem('forgeai_last_git_repo') || '',
              timeoutSeconds: 120,
            });
            const output = result?.output || result?.text || '';
            return { success: true, command: args.command, output: output.slice(0, 8000) };
          } catch (error) {
            return { success: false, command: args.command, error: error.message };
          }
        }

        case 'search_web': {
          try {
            const research = await performOnlineResearch(args.query);
            return {
              success: true,
              query: args.query,
              sources: research.items.slice(0, 5).map(item => ({
                title: item.title,
                url: item.url,
                snippet: item.snippet,
                publisher: item.publisher,
              })),
            };
          } catch (error) {
            return { success: false, query: args.query, error: error.message };
          }
        }

        case 'fetch_page': {
          try {
            const { researchProvider } = await import('../research/ResearchProvider.js');
            const result = await researchProvider.fetchFullPage(args.url);
            return {
              success: !result.simulated || !!result.content,
              url: args.url,
              content: (result.content || '').slice(0, 8000),
              simulated: result.simulated || false,
            };
          } catch (error) {
            return { success: false, url: args.url, error: error.message };
          }
        }

        case 'git_clone': {
          if (!isNative) return { success: false, error: 'Git requires Android native mode.' };
          try {
            const result = await gitClone(args.url, args.branch || '');
            try { localStorage.setItem('forgeai_last_git_repo', result.path); } catch {}
            return { success: true, path: result.path, url: args.url };
          } catch (error) {
            return { success: false, url: args.url, error: error.message };
          }
        }

        case 'git_status': {
          if (!isNative) return { success: false, error: 'Git requires Android native mode.' };
          const path = localStorage.getItem('forgeai_last_git_repo') || '';
          if (!path) return { success: false, error: 'No repository cloned.' };
          try {
            const result = await gitStatus(path);
            return { success: true, ...result };
          } catch (error) {
            return { success: false, error: error.message };
          }
        }

        case 'git_commit': {
          if (!isNative) return { success: false, error: 'Git requires android native mode.' };
          const path = localStorage.getItem('forgeai_last_git_repo') || '';
          if (!path) return { success: false, error: 'No repository cloned.' };
          try {
            const result = await gitCommit(path, args.message || 'ForgeAI change', 'ForgeAI User', 'forgeai@localhost');
            return { success: true, ...result };
          } catch (error) {
            return { success: false, error: error.message };
          }
        }

        case 'git_push': {
          if (!isNative) return { success: false, error: 'Git requires android native mode.' };
          const path = localStorage.getItem('forgeai_last_git_repo') || '';
          if (!path) return { success: false, error: 'No repository cloned.' };
          try {
            const result = await gitPush(path, args.force || false);
            return { success: true, ...result };
          } catch (error) {
            return { success: false, error: error.message };
          }
        }

        case 'git_diff': {
          if (!isNative) return { success: false, error: 'Git requires android native mode.' };
          const path = localStorage.getItem('forgeai_last_git_repo') || '';
          if (!path) return { success: false, error: 'No repository cloned.' };
          try {
            const result = await runTerminalCommand({ command: 'git diff', cwd: path, timeoutSeconds: 30 });
            return { success: true, diff: (result?.output || '').slice(0, 8000) };
          } catch (error) {
            return { success: false, error: error.message };
          }
        }

        case 'git_log': {
          if (!isNative) return { success: false, error: 'Git requires android native mode.' };
          const path = localStorage.getItem('forgeai_last_git_repo') || '';
          if (!path) return { success: false, error: 'No repository cloned.' };
          try {
            const result = await gitLog(path, args.count || 10);
            return { success: true, ...result };
          } catch (error) {
            return { success: false, error: error.message };
          }
        }

        case 'ask_user': {
          return { success: true, question: args.question, awaitingUserInput: true };
        }

        case 'respond': {
          return { success: true, finalResponse: args.message, done: true };
        }

        default:
          return { success: false, error: `Unknown tool: ${toolName}` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
}

/**
 * The main agentic loop.
 * 
 * @param {Object} options
 * @param {Object} options.provider - Model provider with .stream()
 * @param {Object} options.model - Active model
 * @param {string} options.userMessage - The user's message
 * @param {Array} options.history - Conversation history
 * @param {Object} options.workspaceProvider - Workspace file operations
 * @param {boolean} options.isNative - Running on Android
 * @param {Function} options.onToken - Streaming token callback
 * @param {Function} options.onToolCall - Called when a tool is invoked
 * @param {Function} options.onIteration - Called each loop iteration
 * @param {AbortSignal} options.signal - Abort controller signal
 * @param {Array} options.workspaceFiles - List of file paths in workspace
 */
export async function runAgenticLoop({
  provider,
  model,
  userMessage,
  history = [],
  workspaceProvider,
  isNative = false,
  onToken,
  onToolCall,
  onIteration,
  signal,
  workspaceFiles = [],
  missionPlan = '',
}) {
  const executeTool = createToolExecutor(workspaceProvider, { isNative, onToolCall, signal, workspaceFiles });
  const toolPrompt = formatToolSchemasForPrompt();
  const currentDate = new Date().toISOString().split('T')[0];

  const systemPrompt = `You are ForgeAI, an advanced AI coding assistant with full access to the user's workspace, terminal, git, and web search.

${toolPrompt}

Current date: ${currentDate}

BEHAVIOR GUIDELINES:
- ALWAYS read files before modifying them to understand the full context.
- When writing files, provide COMPLETE file content — never partial diffs or "... rest unchanged ...".
- If a terminal command fails, read the error, understand it, and try a different approach.
- Use search_code to find where things are defined before making changes.
- For multi-file changes, read all relevant files first, then make coordinated edits.
- After making changes, verify them by reading the modified files or running tests.
- If you're unsure about something, use ask_user to clarify.
- Be thorough and precise. Don't guess — read the code.
- When done, use the respond tool to give your final answer to the user.

WORKFLOW:
1. Understand what the user wants
2. Read relevant files to understand current code
3. Plan your approach
4. Execute changes (create/write files, run commands)
5. Verify your changes work
6. Respond to the user with what you did`;

  // Build the conversation messages for the model
  const modelMessages = [
    { role: 'system', content: systemPrompt },
  ];

  // Inject the mission plan (if the planner produced one) so the model follows
  // its own ordered plan and finishes the whole job instead of the first edit.
  if (missionPlan && typeof missionPlan === 'string') {
    modelMessages.push({ role: 'system', content: missionPlan });
  }

  // Add relevant history (last 8 turns)
  const relevantHistory = history.slice(-8);
  for (const msg of relevantHistory) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      modelMessages.push({ role: msg.role, content: msg.content });
    }
  }

  // Add the current user message
  modelMessages.push({ role: 'user', content: userMessage });

  const toolResults = [];
  let iteration = 0;
  let finalResponse = '';
  // Track files the agent wrote/created so we can verify them before "done".
  const writtenFiles = new Map(); // path -> expected content
  let verifiedOnce = false;
  // Bounded scratchpad: hidden working memory injected each turn so the model
  // tracks long-horizon progress without re-deriving state.
  const scratchpad = new Scratchpad(userMessage);

  // Capable providers (cloud/Ollama) get real function-calling: structured tool
  // schemas in the request and structured tool_calls back. Small on-device
  // models fall back to the prompt-embedded ```tool_call convention.
  const useNativeTools = provider?.supportsToolUse === true && typeof toOpenAITools === 'function';
  const nativeTools = useNativeTools ? toOpenAITools() : undefined;

  while (iteration < MAX_ITERATIONS) {
    iteration++;
    if (signal?.aborted) break;

    onIteration?.({ iteration, maxIterations: MAX_ITERATIONS, toolCalls: toolResults.length });

    // Stream model response. The scratchpad is injected as a fresh trailing
    // system note each turn (never appended to history, so it can't accumulate).
    let output = '';
    let streamResult;
    let lastShown = '';
    const scratchNote = scratchpad.toPrompt();
    const turnMessages = scratchNote
      ? [...modelMessages, { role: 'system', content: scratchNote }]
      : modelMessages;
    try {
      streamResult = await provider.stream({
        model,
        signal,
        messages: turnMessages,
        tools: nativeTools,
        onToken: (token) => {
          output += token;
          // Only surface text that can't still turn out to be a (prompt-based)
          // tool call: everything before the first ``` fence. This prevents raw
          // tool JSON from flashing into the UI mid-stream.
          const safe = streamableText(output);
          if (safe && safe !== lastShown) {
            lastShown = safe;
            onToken?.(safe);
          }
        },
      });
    } catch (error) {
      if (error.name === 'AbortError') break;
      throw error;
    }

    // Prefer native tool_calls; fall back to parsing the text output.
    const nativeCalls = Array.isArray(streamResult?.toolCalls)
      ? normalizeNativeToolCalls(streamResult.toolCalls)
      : [];
    const toolCalls = nativeCalls.length > 0 ? nativeCalls : parseToolCalls(output);
    const nonToolText = extractNonToolText(output);

    if (toolCalls.length === 0) {
      // No tool calls — this is the final response
      finalResponse = nonToolText || output;
      if (finalResponse) onToken?.(finalResponse);
      break;
    }

    // Record the assistant turn so the model sees its own tool request. Native
    // turns carry the structured tool_calls; prompt-based turns carry the text.
    const assistantTurn = nativeCalls.length > 0
      ? { role: 'assistant', content: output || null, tool_calls: streamResult.toolCalls }
      : { role: 'assistant', content: output };

    // Execute each tool call
    for (const call of toolCalls) {
      onToolCall?.({ tool: call.tool, args: call.args, iteration });

      const result = await executeTool(call.tool, call.args);
      toolResults.push({ tool: call.tool, args: call.args, result });
      // Keep the scratchpad's progress record current (skip control tools).
      if (call.tool !== 'respond' && call.tool !== 'ask_user') {
        scratchpad.recordToolResult(call.tool, call.args, result);
      }

      // Remember successful writes so we can verify them before declaring done.
      if ((call.tool === 'write_file' || call.tool === 'create_file') && result.success && call.args?.path) {
        writtenFiles.set(call.args.path, typeof call.args.content === 'string' ? call.args.content : null);
      }

      // If the tool is "respond", we're done — but first auto-verify any file
      // changes exactly once. If a change didn't stick, feed the discrepancy back
      // and let the model fix it instead of falsely reporting success.
      if (call.tool === 'respond' && result.done) {
        if (writtenFiles.size > 0 && !verifiedOnce) {
          verifiedOnce = true;
          const verification = await verifyWrittenFiles(workspaceProvider, writtenFiles);
          if (!verification.passed) {
            onToolCall?.({ tool: 'verify_changes', args: { files: [...writtenFiles.keys()] }, iteration });
            toolResults.push({ tool: 'verify_changes', args: {}, result: verification });
            modelMessages.push(assistantTurn);
            modelMessages.push({
              role: 'user',
              content: `Automatic verification found problems before finishing:\n${verification.issues.map(i => `- ${i}`).join('\n')}\n\nFix these, then call respond again. Do not claim success until the files verify.`,
            });
            output = '';
            break; // continue the loop so the model can fix
          }
        }
        finalResponse = result.finalResponse;
        // Signal completion
        onToken?.(finalResponse);
        return {
          response: finalResponse,
          toolCalls: toolResults,
          iterations: iteration,
          success: true,
          verified: writtenFiles.size > 0 ? true : undefined,
        };
      }

      // If the tool is "ask_user", return early with the question
      if (call.tool === 'ask_user' && result.awaitingUserInput) {
        return {
          response: result.question,
          toolCalls: toolResults,
          iterations: iteration,
          success: true,
          awaitingUserInput: true,
        };
      }

      // Feed tool result back to the model — as a native tool message when we
      // have a tool_call_id, otherwise as a plain user message.
      modelMessages.push(assistantTurn);
      if (call.id) {
        modelMessages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result).slice(0, 6000),
        });
      } else {
        modelMessages.push({
          role: 'user',
          content: `Tool "${call.tool}" result:\n\`\`\`json\n${JSON.stringify(result, null, 2).slice(0, 6000)}\n\`\`\`\n\nContinue with your next action. If you're done, use the respond tool.`,
        });
      }

      // Reset output for next iteration
      output = '';
      break; // Process one tool call at a time for clarity
    }
  }

  // If we hit max iterations without a respond call
  if (!finalResponse && iteration >= MAX_ITERATIONS) {
    finalResponse = 'I ran out of steps. Here\'s what I accomplished so far — let me know if you want me to continue.';
  }

  return {
    response: finalResponse || '(no response)',
    toolCalls: toolResults,
    iterations: iteration,
    success: true,
  };
}

// Read back each written file and confirm it exists (and matches expected
// content when we have it). Returns { passed, issues[] }. Never throws.
async function verifyWrittenFiles(workspaceProvider, writtenFiles) {
  const issues = [];
  if (!workspaceProvider?.readText) {
    return { passed: true, issues: [], note: 'No workspace reader available; skipped verification.' };
  }
  for (const [path, expected] of writtenFiles.entries()) {
    try {
      const actual = await workspaceProvider.readText(path);
      if (typeof actual !== 'string') {
        issues.push(`${path}: could not read the file back after writing.`);
      } else if (typeof expected === 'string' && actual !== expected) {
        issues.push(`${path}: content on disk does not match what was written.`);
      }
    } catch (error) {
      issues.push(`${path}: verification read failed (${error.message}).`);
    }
  }
  return { passed: issues.length === 0, issues };
}

// Helper: flatten a file tree into a list of paths
function flattenTree(items, prefix = '') {
  const result = [];
  for (const item of items) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.type === 'file') {
      result.push(path);
    } else if (item.children) {
      result.push(...flattenTree(item.children, path));
    }
  }
  return result;
}

// Helper: simple glob matching
function matchGlob(path, pattern) {
  const regex = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '<<<GLOBSTAR>>>')
    .replace(/\*/g, '[^/]*')
    .replace(/<<<GLOBSTAR>>>/g, '.*');
  return new RegExp(`^${regex}$`).test(path);
}

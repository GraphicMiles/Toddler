/**
 * Self-Correction Engine
 * 
 * When a tool call fails or produces an error, this engine:
 * 1. Reads the error output
 * 2. Feeds it back to the model with context
 * 3. Asks the model to diagnose and fix
 * 4. Retries the action (up to maxRetries times)
 * 
 * This is how Claude Code debugs — it reads tracebacks and fixes them.
 */

const MAX_RETRIES = 3;

/**
 * Detect if a tool result indicates an error that should trigger self-correction.
 */
export function isToolError(result) {
  if (!result) return false;
  if (result.success === false) return true;
  if (result.error) return true;
  if (result.status === 'error') return true;
  if (typeof result.output === 'string') {
    const errorPatterns = [
      /error:/i,
      /failed/i,
      /not found/i,
      /permission denied/i,
      /command not found/i,
      /syntax error/i,
      /reference error/i,
      /type error/i,
      /cannot find/i,
      /undefined/i,
      /null/i,
      /traceback/i,
      /exception/i,
    ];
    return errorPatterns.some(p => p.test(result.output));
  }
  return false;
}

/**
 * Extract the most relevant error information for the model.
 */
export function extractErrorContext(result, toolName, args) {
  const context = {
    tool: toolName,
    args: sanitizeArgs(args),
    error: '',
    output: '',
  };

  if (result.error) {
    context.error = result.error;
  }
  if (result.output) {
    context.output = typeof result.output === 'string'
      ? result.output.slice(0, 3000)
      : JSON.stringify(result.output).slice(0, 3000);
  }
  if (result.stderr) {
    context.output += '\nSTDERR: ' + String(result.stderr).slice(0, 2000);
  }

  return context;
}

/**
 * Remove sensitive data from args before feeding back to model.
 */
function sanitizeArgs(args) {
  const sanitized = { ...args };
  // Remove potential secrets
  for (const key of Object.keys(sanitized)) {
    if (/password|token|secret|key|auth/i.test(key)) {
      sanitized[key] = '[REDACTED]';
    }
    // Truncate large content
    if (typeof sanitized[key] === 'string' && sanitized[key].length > 2000) {
      sanitized[key] = sanitized[key].slice(0, 2000) + '... [truncated]';
    }
  }
  return sanitized;
}

/**
 * Build a self-correction prompt that asks the model to diagnose and fix.
 */
export function buildCorrectionPrompt(errorContext, originalRequest, attempt) {
  return `Your previous action failed. This is attempt ${attempt + 1} of ${MAX_RETRIES}.

ORIGINAL REQUEST: ${originalRequest}

FAILED ACTION:
- Tool: ${errorContext.tool}
- Arguments: ${JSON.stringify(errorContext.args, null, 2)}

ERROR:
${errorContext.error || '(no error message)'}

OUTPUT:
${errorContext.output || '(no output)'}

INSTRUCTIONS:
1. Analyze WHY this failed. Read the error carefully.
2. Determine a DIFFERENT approach to achieve the same goal.
3. Try again with corrected arguments or a different tool.
4. If the file doesn't exist, create it. If the command is wrong, fix it.
5. If you've tried ${MAX_RETRIES} times and still can't fix it, use the respond tool to explain what went wrong.

Do NOT repeat the exact same action that failed. Try something different.`;
}

/**
 * Classify the root cause of a tool failure from its error/output text.
 *
 * Blind "retry, retry, retry" wastes attempts. Naming the failure category lets
 * the loop pick a genuinely DIFFERENT approach (e.g. create the file instead of
 * writing to a missing one, or fix a command instead of rerunning it).
 *
 * @returns {{category:string, hint:string}}
 */
export function diagnoseRootCause(errorContext = {}) {
  const text = `${errorContext.error || ''} ${errorContext.output || ''}`.toLowerCase();
  const tool = errorContext.tool || '';

  const rules = [
    // Order matters: more specific patterns first (e.g. "command not found"
    // must win over the generic "not found" of missing_file).
    { category: 'command_not_found', match: /(command not found|not recognized|no such command)/, hint: 'The command/binary is unavailable. Use a different command or an available tool instead.' },
    { category: 'no_workspace', match: /(no workspace|choose a workspace|select a folder)/, hint: 'No workspace folder is selected — the user must pick one; ask_user or respond to explain.' },
    { category: 'already_exists', match: /(already exists|eexist|file exists)/, hint: 'The file already exists. Use write_file to modify it instead of create_file.' },
    { category: 'permission', match: /(permission denied|eacces|forbidden|read-only|not permitted)/, hint: 'A permission/path restriction blocked this. Choose a path inside the workspace and avoid protected locations.' },
    { category: 'syntax', match: /(syntax error|unexpected token|parse error|invalid json)/, hint: 'Output/content was malformed. Re-generate valid, complete content — no partial diffs or placeholders.' },
    { category: 'test_failure', match: /(test failed|assertion|expected .* received|failing tests?)/, hint: 'A test failed. Read the assertion, fix the code (not the test, unless the test is wrong), and re-run.' },
    { category: 'lint_error', match: /(lint|eslint|oxlint|unused|no-undef)/, hint: 'A lint rule failed. Read the rule and fix the flagged lines.' },
    { category: 'network', match: /(network|timeout|failed to fetch|econnrefused|offline|dns)/, hint: 'A network call failed. Retry once; if it persists, proceed without it and tell the user.' },
    { category: 'missing_file', match: /(no such file|not found|enoent|does not exist|cannot find|missing)/, hint: 'The target does not exist. Create it first (create_file), or list_files/search_code to find the correct path.' },
  ];

  for (const rule of rules) {
    if (rule.match.test(text)) return { category: rule.category, hint: rule.hint };
  }
  return { category: 'unknown', hint: `Analyse the ${tool || 'action'} error carefully and try a materially different approach — do not repeat the same call.` };
}

/**
 * Build a root-cause-aware correction prompt: name the likely cause and steer
 * toward a different approach rather than a blind retry.
 */
export function buildRootCausePrompt(errorContext, originalRequest, attempt) {
  const { category, hint } = diagnoseRootCause(errorContext);
  return `Your previous action failed (attempt ${attempt + 1} of ${MAX_RETRIES}).

ORIGINAL REQUEST: ${originalRequest}

FAILED ACTION:
- Tool: ${errorContext.tool}
- Arguments: ${JSON.stringify(errorContext.args, null, 2)}

ERROR:
${errorContext.error || '(no error message)'}

OUTPUT:
${errorContext.output || '(no output)'}

LIKELY ROOT CAUSE: ${category}
SUGGESTED FIX: ${hint}

INSTRUCTIONS:
1. Address the root cause above — do not repeat the same failing call.
2. If a different tool or path is needed, use it.
3. Provide complete, valid arguments.
4. If it still cannot be done after ${MAX_RETRIES} attempts, use the respond tool to explain plainly.`;
}

/**
 * Self-correction wrapper for tool execution.
 * If a tool fails, feeds the error back to the model and retries.
 */
export async function executeWithCorrection({
  executeTool,
  toolName,
  args,
  provider,
  model,
  signal,
  originalRequest,
  onCorrection,
  maxRetries = MAX_RETRIES,
}) {
  let lastResult = null;
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await executeTool(toolName, args);
      lastResult = result;

      if (!isToolError(result)) {
        return { result, attempts: attempt + 1, corrected: attempt > 0 };
      }

      // Error detected — try to self-correct
      if (attempt < maxRetries && provider?.stream) {
        const errorContext = extractErrorContext(result, toolName, args);
        // Root-cause aware: name the failure category and steer to a different
        // approach instead of a blind retry.
        const diagnosis = diagnoseRootCause(errorContext);
        const correctionPrompt = buildRootCausePrompt(errorContext, originalRequest, attempt);

        onCorrection?.({
          attempt: attempt + 1,
          error: errorContext.error || errorContext.output?.slice(0, 200),
          tool: toolName,
          rootCause: diagnosis.category,
        });

        // Ask the model how to fix it
        let correction = '';
        await provider.stream({
          model,
          signal,
          messages: [
            { role: 'system', content: 'You are a debugging assistant. Given a failed action, output ONLY a JSON object with corrected arguments. Format: {"tool": "tool_name", "args": {...}, "reasoning": "why this will work"}' },
            { role: 'user', content: correctionPrompt },
          ],
          onToken: (token) => { correction += token; },
        });

        // Try to parse the correction
        try {
          const jsonMatch = correction.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.args) {
              args = parsed.args;
              if (parsed.tool) toolName = parsed.tool;
              continue; // Retry with corrected args
            }
          }
        } catch {
          // Couldn't parse correction, try again with same args
        }
      }
    } catch (error) {
      lastError = error;
      if (attempt >= maxRetries) break;
    }
  }

  return {
    result: lastResult || { success: false, error: lastError?.message || 'Max retries exceeded' },
    attempts: maxRetries + 1,
    corrected: false,
    failed: true,
  };
}

/**
 * Verify that code changes are correct by running checks.
 */
export async function verifyChanges({
  workspaceProvider,
  changedFiles,
  runCommand,
}) {
  const verification = {
    filesRead: [],
    lintResult: null,
    testResult: null,
    errors: [],
  };

  // 1. Verify files were written correctly
  for (const file of changedFiles) {
    try {
      const content = await workspaceProvider.readText(file.path);
      if (file.expectedContent && content !== file.expectedContent) {
        verification.errors.push({
          file: file.path,
          issue: 'Content mismatch after write',
        });
      }
      verification.filesRead.push(file.path);
    } catch (error) {
      verification.errors.push({
        file: file.path,
        issue: `Could not read back: ${error.message}`,
      });
    }
  }

  // 2. Try running lint if available
  if (runCommand) {
    try {
      const lintResult = await runCommand('npx oxlint . 2>&1 || npx eslint . 2>&1 || echo "no linter"');
      verification.lintResult = lintResult.output?.slice(0, 2000) || '';
      if (/error/i.test(verification.lintResult) && !/no linter/i.test(verification.lintResult)) {
        verification.errors.push({
          type: 'lint',
          output: verification.lintResult.slice(0, 1000),
        });
      }
    } catch {
      // Lint not available, skip
    }

    // 3. Try running tests if available
    try {
      const testResult = await runCommand('npm test 2>&1 || echo "no tests"');
      verification.testResult = testResult.output?.slice(0, 2000) || '';
      if (/fail|error/i.test(verification.testResult) && !/no tests/i.test(verification.testResult)) {
        verification.errors.push({
          type: 'test',
          output: verification.testResult.slice(0, 1000),
        });
      }
    } catch {
      // Tests not available, skip
    }
  }

  return {
    passed: verification.errors.length === 0,
    ...verification,
  };
}

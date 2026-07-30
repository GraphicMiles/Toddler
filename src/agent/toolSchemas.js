/**
 * Tool Schemas for LLM-Driven Tool Selection
 * 
 * Replaces regex/keyword gates. The model receives these schemas and decides
 * which tools to call, with what arguments, based on full conversation context.
 * This is how Claude Code and Arena AI work — native function calling.
 */

export const TOOL_SCHEMAS = Object.freeze([
  {
    name: 'read_file',
    description: 'Read a file. Large files return an outline (imports + signatures) to save tokens; pass full:true for the whole file.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path to the file (e.g., "src/App.jsx")' },
        full: { type: 'boolean', description: 'Return the entire file instead of an outline (default false for large files)' },
      },
      required: ['path'],
    },
  },
  {
    name: 'read_symbol',
    description: 'Read the body of a single function/class/symbol from a file, instead of the whole file. Cheaper than read_file for targeted work.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path to the file' },
        symbol: { type: 'string', description: 'Name of the function/class/const to extract' },
      },
      required: ['path', 'symbol'],
    },
  },
  {
    name: 'write_file',
    description: 'Write content to an existing file. Use for modifying existing code. The entire file content must be provided.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path to the file' },
        content: { type: 'string', description: 'The complete new file content' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'create_file',
    description: 'Create a new file with the given content. Parent folders are created automatically. Use when the user asks to create something new.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path for the new file (e.g. project/index.html)' },
        content: { type: 'string', description: 'The file content to write' },
        overwrite: { type: 'boolean', description: 'If true, overwrite the file when it already exists (default false)' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'create_folder',
    description: 'Create a new folder/directory in the workspace (including any missing parent folders).',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative folder path to create (e.g. project or src/components)' },
      },
      required: ['path'],
    },
  },
  {
    name: 'delete_file',
    description: 'Delete a file from the workspace.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path to the file to delete' },
      },
      required: ['path'],
    },
  },
  {
    name: 'list_files',
    description: 'List all files in the workspace, optionally filtered by pattern. Use to understand project structure.',
    parameters: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Optional glob pattern to filter files (e.g., "*.jsx", "src/**")' },
      },
      required: [],
    },
  },
  {
    name: 'search_code',
    description: 'Search file contents in the workspace for a text pattern. Use to find where something is defined or used.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Text or regex pattern to search for' },
        filePattern: { type: 'string', description: 'Optional file glob to limit search (e.g., "*.js")' },
      },
      required: ['query'],
    },
  },
  {
    name: 'run_terminal',
    description: 'Execute a shell command and return the output. Use for builds, tests, installs, git operations, etc.',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The shell command to execute' },
        cwd: { type: 'string', description: 'Optional working directory' },
      },
      required: ['command'],
    },
  },
  {
    name: 'search_web',
    description: 'Search the web for current information. Use for time-sensitive queries, documentation, or facts.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
  },
  {
    name: 'fetch_page',
    description: 'Fetch the full content of a web page. Use after search_web to read a specific result in detail.',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The URL to fetch' },
      },
      required: ['url'],
    },
  },
  {
    name: 'git_clone',
    description: 'Clone a Git repository from a URL into the workspace.',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Git repository URL (e.g., https://github.com/owner/repo)' },
        branch: { type: 'string', description: 'Optional branch name' },
      },
      required: ['url'],
    },
  },
  {
    name: 'git_status',
    description: 'Show the current Git status of the workspace.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'git_commit',
    description: 'Stage all changes and create a Git commit.',
    parameters: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Commit message' },
      },
      required: ['message'],
    },
  },
  {
    name: 'git_push',
    description: 'Push commits to the remote repository.',
    parameters: {
      type: 'object',
      properties: {
        force: { type: 'boolean', description: 'Force push (use with caution)' },
      },
      required: [],
    },
  },
  {
    name: 'git_diff',
    description: 'Show the current Git diff (unstaged changes).',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'git_log',
    description: 'Show recent Git commit history.',
    parameters: {
      type: 'object',
      properties: {
        count: { type: 'number', description: 'Number of commits to show (default: 10)' },
      },
      required: [],
    },
  },
  {
    name: 'ask_user',
    description: 'Ask the user a clarifying question. Use when you need more information before proceeding.',
    parameters: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'The question to ask the user' },
      },
      required: ['question'],
    },
  },
  {
    name: 'respond',
    description: 'Send your final response to the user. Call this when you are done and want to reply.',
    parameters: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Your response message to the user' },
      },
      required: ['message'],
    },
  },
]);

/**
 * Format tool schemas into a system prompt the LLM can understand.
 * This is the "function calling" prompt that tells the model what tools are available.
 */
export function formatToolSchemasForPrompt(tools = TOOL_SCHEMAS) {
  const toolDescriptions = tools.map(tool => {
    const params = tool.parameters.properties || {};
    const required = tool.parameters.required || [];
    const paramLines = Object.entries(params).map(([name, schema]) => {
      const req = required.includes(name) ? '(required)' : '(optional)';
      return `    - ${name} ${req}: ${schema.description}`;
    });
    return `  - ${tool.name}: ${tool.description}\n    Parameters:\n${paramLines.join('\n') || '    (none)'}`;
  });

  return `You have access to the following tools. When you need to take an action, respond with a JSON tool call in this exact format:

\`\`\`tool_call
{
  "tool": "tool_name",
  "args": { "param1": "value1", "param2": "value2" }
}
\`\`\`

You can call multiple tools in sequence by outputting multiple tool_call blocks. After each tool call, you will receive the result. Use the results to decide your next action.

When you are done and want to reply to the user, use the "respond" tool.

Available tools:
${toolDescriptions.join('\n\n')}

IMPORTANT RULES:
- Always read files before modifying them to understand the current code.
- When making code changes, provide the COMPLETE file content, not just diffs.
- If a command fails, read the error output and try a different approach.
- Use search_code to find relevant code before making changes.
- Use ask_user if you need clarification before proceeding.
- Be thorough: read, plan, execute, verify, then respond.`;
}

const VALID_TOOL_NAMES = new Set(TOOL_SCHEMAS.map(tool => tool.name));

// Models are inconsistent about how they name the arguments object. Accept the
// common aliases so a valid call is never dropped over a key name.
function normalizeArgs(parsed) {
  const args = parsed.args ?? parsed.arguments ?? parsed.parameters ?? parsed.params ?? parsed.input ?? {};
  return args && typeof args === 'object' && !Array.isArray(args) ? args : {};
}

function coerceCall(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  const name = parsed.tool ?? parsed.name ?? parsed.tool_name ?? parsed.function;
  if (!name || typeof name !== 'string') return null;
  return { tool: name.trim(), args: normalizeArgs(parsed) };
}

// Find the first balanced {...} JSON object starting at or after `from`.
function extractBalancedObject(text, from = 0) {
  const start = text.indexOf('{', from);
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return { json: text.slice(start, i + 1), start, end: i + 1 };
    }
  }
  return null;
}

/**
 * Parse tool calls from model output.
 *
 * Tolerant by design — different models emit different envelopes and we must
 * never silently drop a real tool call (that makes the agentic loop treat an
 * action as a final answer and looks "dumb"). Accepted forms:
 *   ```tool_call { ... } ```   (preferred)
 *   ```json { "tool": ... } ```  or a bare ``` fence
 *   a raw JSON object anywhere in the text with a recognised tool name
 * Argument keys args/arguments/parameters/params/input are all honoured.
 */
export function parseToolCalls(output) {
  const calls = [];
  const seen = new Set();
  const text = String(output || '');

  const pushCall = (parsed, raw) => {
    const call = coerceCall(parsed);
    if (!call) return false;
    // Only accept known tools to avoid treating prose JSON as a tool call.
    if (!VALID_TOOL_NAMES.has(call.tool)) return false;
    const key = `${call.tool}:${JSON.stringify(call.args)}`;
    if (seen.has(key)) return true;
    seen.add(key);
    calls.push({ ...call, raw: raw.trim() });
    return true;
  };

  // 1) Fenced blocks: ```tool_call / ```json / ``` — parse the JSON inside.
  const fenceRegex = /```(?:tool_call|json)?\s*\n?([\s\S]*?)```/g;
  let match;
  while ((match = fenceRegex.exec(text)) !== null) {
    const body = match[1].trim();
    if (!body.includes('{')) continue;
    const obj = extractBalancedObject(body);
    const candidate = obj ? obj.json : body;
    try {
      pushCall(JSON.parse(candidate), body);
    } catch {
      // Salvage a tool name + best-effort args from malformed JSON.
      const toolMatch = body.match(/"(?:tool|name|tool_name|function)"\s*:\s*"([^"]+)"/);
      if (toolMatch && VALID_TOOL_NAMES.has(toolMatch[1].trim()) && !seen.has(`${toolMatch[1].trim()}:{}`)) {
        seen.add(`${toolMatch[1].trim()}:{}`);
        calls.push({ tool: toolMatch[1].trim(), args: {}, raw: body, parseError: true });
      }
    }
  }

  // 2) Unfenced raw JSON objects that name a known tool (some models skip fences).
  if (calls.length === 0) {
    let cursor = 0;
    let obj;
    while ((obj = extractBalancedObject(text, cursor)) !== null) {
      cursor = obj.end;
      if (!/"(?:tool|name|tool_name|function)"/.test(obj.json)) continue;
      try { pushCall(JSON.parse(obj.json), obj.json); } catch { /* not valid JSON, skip */ }
    }
  }

  return calls;
}

/**
 * Parse Llama/Groq "failed_generation" function syntax into tool calls.
 *
 * Groq's Llama models sometimes emit tool calls as `<function=NAME {json}>` (or
 * `<function=NAME>{json}</function>`) instead of proper OpenAI tool_calls. Groq
 * then rejects its OWN output with `tool_use_failed` / "not in request.tools".
 * Recovering the call from that text turns a hard failure into a working action.
 */
export function parseLlamaFunctionSyntax(text) {
  const calls = [];
  const str = String(text || '');
  const re = /<function=([a-zA-Z_][\w-]*)\s*/g;
  let m;
  while ((m = re.exec(str)) !== null) {
    const name = m[1];
    if (!VALID_TOOL_NAMES.has(name)) continue;
    // Extract the balanced JSON object that follows the name (if any).
    const rest = str.slice(re.lastIndex);
    const obj = extractBalancedObject(rest);
    let args = {};
    if (obj) { try { args = JSON.parse(obj.json); } catch { args = {}; } }
    calls.push({ tool: name, args: args && typeof args === 'object' ? args : {}, raw: m[0] });
  }
  return calls;
}

/**
 * Get the text output from the model that is NOT tool calls.
 * This is the model's "thinking" or partial response.
 */
export function extractNonToolText(output) {
  let text = String(output || '');
  // Strip fenced tool/JSON blocks that contain a recognised tool name.
  text = text.replace(/```(?:tool_call|json)?\s*\n?([\s\S]*?)```/g, (full, body) =>
    /"(?:tool|name|tool_name|function)"\s*:/.test(body) ? '' : full);
  return text.trim();
}

/**
 * Return only the portion of a partial stream that is safe to show the user.
 *
 * While a model is mid-stream, an opening ``` fence may not have closed yet, so
 * its (possibly tool-call) contents shouldn't flash into the UI. This returns
 * the text up to the first ``` fence — everything before any code/tool block —
 * which is the model's plain prose. Once the response is complete, the loop uses
 * extractNonToolText / the respond tool for the final answer.
 */
export function streamableText(output) {
  const text = String(output || '');
  const fenceIndex = text.indexOf('```');
  const safe = fenceIndex === -1 ? text : text.slice(0, fenceIndex);
  return safe.trim();
}

/**
 * Convert internal tool schemas into the OpenAI/Groq function-calling format.
 * Passed as the `tools` array in the chat/completions body so capable providers
 * emit structured tool_calls instead of prompt-embedded JSON.
 */
export function toOpenAITools(tools = TOOL_SCHEMAS) {
  return tools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters || { type: 'object', properties: {}, required: [] },
    },
  }));
}

/**
 * Normalise native OpenAI tool_calls (from message.tool_calls) into the same
 * shape parseToolCalls produces, so the agentic loop can treat both paths
 * identically. Arguments arrive as a JSON string; parse defensively.
 */
export function normalizeNativeToolCalls(rawToolCalls = []) {
  const calls = [];
  for (const raw of rawToolCalls) {
    const fn = raw?.function || raw;
    const name = fn?.name;
    if (!name || !VALID_TOOL_NAMES.has(name)) continue;
    let args = {};
    const rawArgs = fn?.arguments;
    if (rawArgs && typeof rawArgs === 'object') {
      args = rawArgs;
    } else if (typeof rawArgs === 'string' && rawArgs.trim()) {
      try { args = JSON.parse(rawArgs); }
      catch {
        const obj = extractBalancedObject(rawArgs);
        if (obj) { try { args = JSON.parse(obj.json); } catch { args = {}; } }
      }
    }
    calls.push({ tool: name, args: args && typeof args === 'object' ? args : {}, id: raw?.id, raw: JSON.stringify(fn) });
  }
  return calls;
}

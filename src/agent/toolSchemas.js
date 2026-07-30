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
    description: 'Read the contents of a file in the workspace. Use this to understand existing code before making changes.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path to the file (e.g., "src/App.jsx")' },
      },
      required: ['path'],
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
    description: 'Create a new file with the given content. Use when the user asks to create something new.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path for the new file' },
        content: { type: 'string', description: 'The file content to write' },
      },
      required: ['path', 'content'],
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

/**
 * Parse tool calls from model output.
 * Extracts ```tool_call blocks and parses them as JSON.
 */
export function parseToolCalls(output) {
  const calls = [];
  const regex = /```tool_call\s*\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(output)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed.tool && typeof parsed.tool === 'string') {
        calls.push({
          tool: parsed.tool,
          args: parsed.args || {},
          raw: match[1].trim(),
        });
      }
    } catch {
      // Try to extract tool name and args even from malformed JSON
      const toolMatch = match[1].match(/"tool"\s*:\s*"([^"]+)"/);
      if (toolMatch) {
        calls.push({
          tool: toolMatch[1],
          args: {},
          raw: match[1].trim(),
          parseError: true,
        });
      }
    }
  }
  return calls;
}

/**
 * Get the text output from the model that is NOT tool calls.
 * This is the model's "thinking" or partial response.
 */
export function extractNonToolText(output) {
  return output.replace(/```tool_call\s*\n[\s\S]*?```/g, '').trim();
}

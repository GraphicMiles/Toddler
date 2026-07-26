/**
 * Agent Core
 * The brain module. Understands user goals, selects registered tools,
 * maintains context, plans tasks, proposes actions (with manual approval),
 * and reviews outputs. Never hardcodes behavior for new capabilities.
 * 
 * IMPROVED VERSION: Significantly smarter rule-based planning
 * while remaining 100% deterministic and safe.
 */

import { AgentPluginRegistry, AGENT_PERMISSIONS } from './pluginContract.js';
import { ToolRegistry } from '../tools/toolRegistry.js';
import { ApprovalGate, executeWithApproval } from '../tools/toolApproval.js';

export class AgentCore {
  constructor(options = {}) {
    this.pluginRegistry = new AgentPluginRegistry();
    this.toolRegistry = options.toolRegistry || null;
    this.approvalGate = options.approvalGate || null;
    this.provider = options.provider || null;

    this.context = {
      history: [],
      workspace: {},
      plan: [],
      review: null,
      activeModel: null,
      previousActions: [], // Track what was done recently
    };
  }

  registerPlugin(plugin) {
    this.pluginRegistry.registerPlugin(plugin);
    return this;
  }

  registerTool(toolDef) {
    const { name, description, permission, execute } = toolDef;
    this.pluginRegistry.registerPlugin({
      id: `direct-${name}`,
      name: `Direct: ${name}`,
      version: '0.0.0',
      registerTools: ({ register }) => register({ name, description, permission, execute }),
    });
    return this;
  }

  setWorkspace(workspaceInfo) {
    this.context.workspace = workspaceInfo || {};
    return this;
  }

  addHistory(turn) {
    this.context.history.push(turn);
    if (this.context.history.length > 20) {
      this.context.history = this.context.history.slice(-20);
    }
  }

  // Track completed actions for better follow-up suggestions
  addCompletedAction(action) {
    this.context.previousActions.push(action);
    if (this.context.previousActions.length > 8) {
      this.context.previousActions.shift();
    }
  }

  // ==================== IMPROVED PLANNING ====================

  /**
   * Smart keyword groups for better intent detection
   */
  getIntentMatchers() {
    return {
      read: [
        'read', 'show', 'open', 'view', 'look', 'display', 'get content', 'what is in',
        'contents of', 'tell me about', 'inspect', 'check file'
      ],
      write: [
        'write', 'create', 'add', 'save', 'edit', 'update', 'modify', 'append',
        'make a file', 'new file', 'generate', 'implement'
      ],
      delete: [
        'delete', 'remove', 'erase', 'trash', 'get rid of', 'clean up'
      ],
      rename: [
        'rename', 'move', 'relocate', 'change name', 'mv '
      ],
      search: [
        'search', 'find', 'look for', 'where is', 'locate', 'grep', 'list files'
      ],
      plan: [
        'plan', 'break down', 'steps', 'how to', 'roadmap', 'outline'
      ],
      explain: [
        'explain', 'what does', 'how does', 'why', 'describe', 'summarize'
      ],
      fix: [
        'fix', 'bug', 'error', 'broken', 'not working', 'debug', 'repair'
      ],
      refactor: [
        'refactor', 'improve', 'clean up', 'optimize', 'reorganize', 'modernize'
      ],
      list: [
        'list', 'show all', 'what files', 'directory', 'ls', 'tree'
      ],
    };
  }

  /**
   * Detect intents with priority (more specific first)
   */
  detectIntents(message) {
    const msgLower = (message || '').toLowerCase();
    const matchers = this.getIntentMatchers();
    const detected = new Set();

    // Priority order: more specific actions first
    const priorityOrder = ['fix', 'refactor', 'explain', 'plan', 'write', 'read', 'delete', 'rename', 'search', 'list'];

    for (const intent of priorityOrder) {
      const keywords = matchers[intent] || [];
      if (keywords.some(kw => msgLower.includes(kw))) {
        detected.add(intent);
      }
    }

    return Array.from(detected);
  }

  /**
   * Resolve the best target path using context
   */
  resolveTargetPath(workspace) {
    const ws = workspace || this.context.workspace || {};
    return ws.selectedPath || ws.path || '';
  }

  /**
   * Find relevant files in workspace based on message
   */
  findRelevantFiles(message, workspace) {
    const ws = workspace || this.context.workspace || {};
    const tree = ws.tree || [];
    if (!tree.length) return [];

    const msgLower = message.toLowerCase();
    const relevant = [];

    function search(nodes) {
      for (const node of nodes) {
        const nameLower = (node.name || '').toLowerCase();
        if (msgLower.includes(nameLower) || nameLower.includes(msgLower.split(' ').pop())) {
          relevant.push(node);
        }
        if (node.children) search(node.children);
      }
    }

    search(tree);
    return relevant.slice(0, 3); // Limit to top 3
  }

  /**
   * Main improved planning function
   */
  planTask(userMessage, workspace) {
    const steps = [];
    const intents = this.detectIntents(userMessage);
    const targetPath = this.resolveTargetPath(workspace);
    const relevantFiles = this.findRelevantFiles(userMessage, workspace);

    // === READ / EXPLAIN / LIST ===
    if (intents.includes('read') || intents.includes('explain') || intents.includes('list')) {
      const pathToUse = targetPath || (relevantFiles[0]?.path || '');
      steps.push({
        intent: 'read_file',
        description: intents.includes('explain') 
          ? 'Read and explain the selected/relevant file' 
          : 'Read file content from workspace',
        targetPath: pathToUse,
      });
    }

    // === WRITE / CREATE / EDIT ===
    if (intents.includes('write')) {
      const suggestedContent = this.generateSuggestedContent(userMessage, targetPath);
      steps.push({
        intent: 'write_file',
        description: 'Write or edit a file in the workspace',
        targetPath: targetPath || 'new-file.txt',
        proposedContent: suggestedContent,
      });
    }

    // === FIX / REFACTOR ===
    if (intents.includes('fix') || intents.includes('refactor')) {
      const pathToUse = targetPath || (relevantFiles[0]?.path || '');
      steps.push({
        intent: 'read_file',
        description: intents.includes('fix') ? 'Read file to identify the issue' : 'Read file for refactoring',
        targetPath: pathToUse,
      });
      steps.push({
        intent: 'write_file',
        description: intents.includes('fix') ? 'Apply fix to the file' : 'Apply refactoring improvements',
        targetPath: pathToUse,
        proposedContent: `// ${intents.includes('fix') ? 'Fixed' : 'Refactored'} version based on: ${userMessage}`,
      });
    }

    // === DELETE ===
    if (intents.includes('delete')) {
      steps.push({
        intent: 'delete',
        description: 'Delete file or folder',
        targetPath: targetPath,
      });
    }

    // === RENAME / MOVE ===
    if (intents.includes('rename')) {
      steps.push({
        intent: 'rename',
        description: 'Rename or move file/folder',
        targetPath: targetPath,
      });
    }

    // === SEARCH / FIND ===
    if (intents.includes('search')) {
      steps.push({
        intent: 'search',
        description: 'Search workspace for files matching request',
        query: userMessage,
      });
    }

    // === PLAN / BREAK DOWN ===
    if (intents.includes('plan')) {
      steps.push({
        intent: 'plan_task',
        description: 'Create a structured plan for the request',
        originalRequest: userMessage,
      });
    }

    // === Always end with review ===
    steps.push({
      intent: 'review',
      description: 'Review the proposed changes and results',
    });

    // Smart follow-up suggestions based on recent actions
    if (lastAction && lastAction.type === 'write_file' && intents.includes('read')) {
      steps.push({
        intent: 'read_file',
        description: 'Verify the changes made',
        targetPath: lastAction.path,
      });
    }

    // Remove duplicate intents
    const uniqueSteps = [];
    const seenIntents = new Set();
    for (const step of steps) {
      if (!seenIntents.has(step.intent)) {
        seenIntents.add(step.intent);
        uniqueSteps.push(step);
      }
    }

    this.context.plan = uniqueSteps;
    return { steps: uniqueSteps, message: userMessage, workspace };
  }

  /**
   * Generate better suggested content for write operations
   */
  generateSuggestedContent(userMessage, targetPath) {
    const ext = (targetPath || '').split('.').pop()?.toLowerCase() || 'txt';
    
    if (ext === 'js' || ext === 'jsx' || ext === 'ts' || ext === 'tsx') {
      return `// ${userMessage}\n\nexport default function Component() {\n  return (\n    <div>\n      {/* TODO: Implement based on request */}\n    </div>\n  );\n}`;
    }
    
    if (ext === 'html') {
      return `<!DOCTYPE html>\n<html>\n<head>\n  <title>${userMessage}</title>\n</head>\n<body>\n  <!-- TODO: Content based on: ${userMessage} -->\n</body>\n</html>`;
    }

    if (ext === 'css') {
      return `/* Styles for: ${userMessage} */\n\nbody {\n  /* Add your styles here */\n}`;
    }

    if (ext === 'py') {
      return `# ${userMessage}\n\ndef main():\n    print("Hello from ForgeAI")\n\nif __name__ == "__main__":\n    main()`;
    }

    return `// Content based on request: ${userMessage}\n// Target: ${targetPath || 'new file'}`;
  }

  // ==================== TOOL SELECTION & EXECUTION ====================

  selectTool(step) {
    const available = this.pluginRegistry.listTools();

    for (const tool of available) {
      if (tool.name === step.intent || tool.name.includes(step.intent)) {
        return tool;
      }
    }

    for (const tool of available) {
      if (step.intent && step.intent.includes(tool.name)) {
        return tool;
      }
    }

    if (this.toolRegistry) {
      const appTool = this.toolRegistry.get(step.intent);
      if (appTool) {
        return {
          name: appTool.name,
          description: appTool.description,
          permission: appTool.permission || AGENT_PERMISSIONS.READ,
          execute: appTool.execute,
        };
      }
    }

    return null;
  }

  proposeActions(plan) {
    if (!this.approvalGate) {
      throw new Error('AgentCore: ApprovalGate is required for manual approval flow');
    }

    const proposed = [];

    for (const step of plan.steps || []) {
      if (step.intent === 'review' || step.intent === 'plan_task') {
        proposed.push({
          id: `agent-plan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'agent_review',
          description: step.description,
          content: JSON.stringify({ step, review: 'Awaiting user confirmation on plan' }),
        });
        continue;
      }

      const tool = this.selectTool(step);
      if (!tool) continue;

      const input = this.buildInput(step, tool.name);
      const approvalRequest = this.approvalGate.request(tool.name, input);

      proposed.push({
        id: approvalRequest.id,
        type: tool.name,
        path: input.path || input.targetPath || this.context.workspace?.path || '',
        content: input.content || input.proposedContent || input.query || '',
        description: step.description,
        permission: tool.permission,
      });
    }

    return proposed;
  }

  buildInput(step, toolName) {
    const workspace = this.context.workspace || {};
    const input = {};

    if (step.targetPath) input.path = step.targetPath;
    if (step.proposedContent) input.content = step.proposedContent;
    if (step.query) input.query = step.query;
    if (step.originalRequest) input.request = step.originalRequest;

    if (toolName === 'rename' && step.originalRequest) {
      const match = step.originalRequest.match(/rename\s+.+?\s+to\s+(.+)/i);
      if (match) input.newName = match[1].trim();
    }

    if (toolName === 'read_file' && !input.path) {
      input.path = workspace.selectedPath || workspace.path || '';
    }

    return input;
  }

  async executeApprovedAction(actionId) {
    if (!this.approvalGate || !this.toolRegistry) {
      throw new Error('AgentCore: ApprovalGate and ToolRegistry required for execution');
    }
    const result = await executeWithApproval(
      this.toolRegistry,
      this.approvalGate,
      actionId,
      true
    );
    this.context.review = { actionId, result, status: 'completed', timestamp: Date.now() };
    
    // Record the action for future planning intelligence
    this.addCompletedAction({ 
      id: actionId, 
      type: result?.type || 'unknown',
      path: result?.path,
      timestamp: Date.now() 
    });
    
    return result;
  }

  reviewPlan(plan, results = []) {
    const completedSteps = results.filter((r) => r && r.status === 'completed').length;
    const totalSteps = (plan.steps || []).length;
    return {
      completed: completedSteps,
      total: totalSteps,
      status: completedSteps === totalSteps ? 'complete' : 'in_progress',
      message: `Agent reviewed ${completedSteps}/${totalSteps} steps.`,
    };
  }

  async processMessage({ message, workspace }) {
    this.setWorkspace(workspace);
    this.addHistory({ role: 'user', content: message, timestamp: Date.now() });

    const plan = this.planTask(message, workspace);
    const proposedActions = this.proposeActions(plan);
    const review = this.reviewPlan(plan, []);

    return {
      agentResponse: `Agent planned ${plan.steps.length} steps. ${proposedActions.length} actions proposed for your approval.`,
      plan,
      proposedActions,
      review,
    };
  }
}
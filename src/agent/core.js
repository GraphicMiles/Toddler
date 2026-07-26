/**
 * Agent Core
 * The brain module. Understands user goals, selects registered tools,
 * maintains context, plans tasks, proposes actions (with manual approval),
 * and reviews outputs. Never hardcodes behavior for new capabilities.
 */

import { AgentPluginRegistry, AGENT_PERMISSIONS } from './pluginContract.js';
import { ToolRegistry } from '../tools/toolRegistry.js';
import { ApprovalGate, executeWithApproval } from '../tools/toolApproval.js';

export class AgentCore {
  constructor(options = {}) {
    // Internal plugin/tool registry for agent-level contract
    this.pluginRegistry = new AgentPluginRegistry();
    // Reference to app-level registry for execution
    this.toolRegistry = options.toolRegistry || null;
    this.approvalGate = options.approvalGate || null;
    this.provider = options.provider || null;

    // Context maintained across interactions
    this.context = {
      history: [],        // recent conversation turns
      workspace: {},      // workspace info from Workspace component
      plan: [],           // current plan steps
      review: null,       // last review result
      activeModel: null,
    };
  }

  /**
   * Register a plugin that may expose agent-level tools.
   * This makes future integrations (Git, Memory, Search) possible
   * without changing core logic.
   */
  registerPlugin(plugin) {
    this.pluginRegistry.registerPlugin(plugin);
    return this;
  }

  /**
   * Register an individual agent tool directly.
   */
  registerTool(toolDef) {
    const { name, description, permission, execute } = toolDef;
    // Mirror into plugin registry for agent visibility
    this.pluginRegistry.registerPlugin({
      id: `direct-${name}`,
      name: `Direct: ${name}`,
      version: '0.0.0',
      registerTools: ({ register }) => register({ name, description, permission, execute }),
    });
    return this;
  }

  /**
   * Set workspace context for planning.
   */
  setWorkspace(workspaceInfo) {
    this.context.workspace = workspaceInfo || {};
    return this;
  }

  /**
   * Push conversation turn into context.
   */
  addHistory(turn) {
    this.context.history.push(turn);
    // Keep last 20 turns to prevent unbounded growth
    if (this.context.history.length > 20) {
      this.context.history = this.context.history.slice(-20);
    }
  }

  /**
   * Plan the user's goal into executable steps.
   * Returns an array of step descriptors.
   */
  planTask(userMessage, workspace) {
    const steps = [];
    const msgLower = (userMessage || '').toLowerCase();
    const workspacePath = workspace?.path || this.context.workspace?.path || '';
    const selectedPath = workspace?.selectedPath || this.context.workspace?.selectedPath || '';

    // Resolve target path: prefer selected file, then workspace root
    const resolvePath = () => selectedPath || workspacePath;

    if (msgLower.includes('read') || msgLower.includes('show') || msgLower.includes('open') || msgLower.includes('look') || msgLower.includes('view')) {
      steps.push({
        intent: 'read_file',
        description: 'Read a file in the workspace',
        targetPath: resolvePath(),
      });
    }

    if (msgLower.includes('write') || msgLower.includes('create') || msgLower.includes('add') || msgLower.includes('save')) {
      steps.push({
        intent: 'write_file',
        description: 'Write content to a file',
        targetPath: resolvePath(),
        proposedContent: `// Content based on: ${userMessage}`,
      });
    }

    if (msgLower.includes('delete') || msgLower.includes('remove')) {
      steps.push({
        intent: 'delete',
        description: 'Delete a file or folder',
        targetPath: resolvePath(),
      });
    }

    if (msgLower.includes('rename') || msgLower.includes('move')) {
      steps.push({
        intent: 'rename',
        description: 'Rename a file or folder',
        targetPath: resolvePath(),
      });
    }

    if (msgLower.includes('search') || msgLower.includes('find')) {
      steps.push({
        intent: 'search',
        description: 'Search project files or docs',
        query: userMessage,
      });
    }

    if (msgLower.includes('plan') || msgLower.includes('break') || msgLower.includes('step')) {
      steps.push({
        intent: 'plan_task',
        description: 'Break the request into subtasks',
        originalRequest: userMessage,
      });
    }

    // Always include a review step
    steps.push({
      intent: 'review',
      description: 'Review outputs and confirm results',
    });

    this.context.plan = steps;
    return { steps, message: userMessage, workspace };
  }

  /**
   * Select a registered tool for a given step.
   * Scalable: checks agent plugin registry, then falls back to app registry.
   */
  selectTool(step) {
    const available = this.pluginRegistry.listTools();
    // Try direct match by intent
    for (const tool of available) {
      if (tool.name === step.intent || tool.name.includes(step.intent)) {
        return tool;
      }
    }
    // Try partial name match
    for (const tool of available) {
      if (step.intent && step.intent.includes(tool.name)) {
        return tool;
      }
    }
    // Fallback to app-level registry if linked
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

  /**
   * Propose actions through the approval gate (manual approval path).
   * Returns proposed action descriptors for the UI to display.
   */
  proposeActions(plan) {
    if (!this.approvalGate) {
      throw new Error('AgentCore: ApprovalGate is required for manual approval flow');
    }

    const proposed = [];
    for (const step of plan.steps || []) {
      if (step.intent === 'review' || step.intent === 'plan_task') {
        // Planning/review steps don't produce external actions
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

      // For manual approval, create an approval request rather than executing
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

  /**
   * Build execution input for a selected tool.
   */
  buildInput(step, toolName) {
    const workspace = this.context.workspace || {};
    const input = {};
    if (step.targetPath) input.path = step.targetPath;
    if (step.proposedContent) input.content = step.proposedContent;
    if (step.query) input.query = step.query;
    if (step.originalRequest) input.request = step.originalRequest;
    // For rename, extract new name from the message if available
    if (toolName === 'rename' && step.originalRequest) {
      const match = step.originalRequest.match(/rename\s+.+\s+to\s+(.+)/i);
      if (match) input.newName = match[1].trim();
    }
    // For read_file, ensure we have a meaningful path
    if (toolName === 'read_file' && !input.path) {
      input.path = workspace.selectedPath || workspace.path || '';
    }
    return input;
  }

  /**
   * Execute an approved action through the app-level tool registry.
   * Used when the user approves a pending action in the UI.
   */
  async executeApprovedAction(actionId) {
    if (!this.approvalGate || !this.toolRegistry) {
      throw new Error('AgentCore: ApprovalGate and ToolRegistry required for execution');
    }
    const result = await executeWithApproval(
      this.toolRegistry,
      this.approvalGate,
      actionId,
      true // approved
    );
    this.context.review = { actionId, result, status: 'completed', timestamp: Date.now() };
    return result;
  }

  /**
   * Review the completed plan/actions and produce a summary.
   */
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

  /**
   * Main entry point: process a user message through planning,
   * proposal (manual approval), and initial review.
   */
  async processMessage({ message, workspace }) {
    this.setWorkspace(workspace);
    this.addHistory({ role: 'user', content: message, timestamp: Date.now() });

    // 1. Plan
    const plan = this.planTask(message, workspace);

    // 2. Propose actions (manual approval path - does not auto-execute)
    const proposedActions = this.proposeActions(plan);

    // 3. Build review summary
    const review = this.reviewPlan(plan, []);

    // 4. Return structured result for chat integration
    return {
      agentResponse: `Agent planned ${plan.steps.length} steps. ${proposedActions.length} actions proposed for your approval.`,
      plan,
      proposedActions,
      review,
    };
  }
}

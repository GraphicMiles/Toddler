const SAFE_READ = 'read';

export class ApprovalGate {
  constructor() { this.pending = new Map(); }
  request(toolName, input = {}) {
    const id = `${toolName}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    this.pending.set(id, { id, toolName, input, createdAt: Date.now() });
    return this.pending.get(id);
  }
  list() { return [...this.pending.values()]; }
  consume(id) { const request = this.pending.get(id); this.pending.delete(id); return request; }
  clear() { this.pending.clear(); }
}

export async function executeWithApproval(registry, gate, requestId, approved = false) {
  const request = gate.consume(requestId);
  if (!request) throw new Error('Approval request is missing or expired.');
  const tool = registry.get(request.toolName);
  if (!tool) throw new Error(`Unknown tool: ${request.toolName}`);
  if (tool.permission !== SAFE_READ && !approved) throw new Error('This action requires explicit user approval.');
  return registry.execute(request.toolName, request.input, { approved });
}

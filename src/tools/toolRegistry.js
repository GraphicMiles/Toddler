/**
 * Small, explicit tool registry foundation.
 * Tools declare whether they are read-only; write/execute tools are rejected
 * until an approval system is connected.
 */
export class ToolRegistry {
  #tools = new Map();
  register(tool) {
    if (!tool?.name || typeof tool.execute !== 'function') throw new Error('A tool needs a name and execute function.');
    if (this.#tools.has(tool.name)) throw new Error(`Tool already registered: ${tool.name}`);
    this.#tools.set(tool.name, Object.freeze({ permission: 'read', ...tool }));
    return this;
  }
  get(name) { return this.#tools.get(name); }
  list() { return [...this.#tools.values()].map(({ execute, ...metadata }) => metadata); }
  async execute(name, input = {}, { approved = false } = {}) {
    const tool = this.#tools.get(name);
    if (!tool) throw new Error(`Unknown tool: ${name}`);
    if (tool.permission !== 'read' && !approved) throw new Error(`Tool requires explicit approval: ${name}`);
    return tool.execute(input);
  }
}

export function createReadOnlyRegistry(fileSystem) {
  if (!fileSystem?.readFile) throw new Error('A filesystem readFile implementation is required.');
  return new ToolRegistry().register({
    name: 'read_file',
    description: 'Read a user-selected workspace file without changing it.',
    permission: 'read',
    execute: async ({ path }) => {
      if (typeof path !== 'string' || !path.trim()) throw new Error('A file path is required.');
      return { path, content: await fileSystem.readFile(path) };
    },
  });
}

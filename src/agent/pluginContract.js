/**
 * Agent Plugin Contract
 * Defines the interface for scalable future integrations (Git, Docker,
 * Memory, Search, etc.). Every plugin/tool must conform to this contract
 * so the Agent Core never needs hardcoded behavior for new capabilities.
 */

export const AGENT_PERMISSIONS = {
  READ: 'read',
  WRITE: 'write',
  EXECUTE: 'execute',
  DANGEROUS: 'dangerous',
};

/**
 * Standard agent tool descriptor.
 * @param {string} name - unique tool identifier
 * @param {string} description - human-readable purpose
 * @param {string} permission - one of AGENT_PERMISSIONS
 * @param {Function} execute - async (input) => result
 */
export function createAgentTool({ name, description, permission, execute }) {
  if (!name || typeof name !== 'string') throw new Error('Agent tool requires a name');
  if (typeof execute !== 'function') throw new Error(`Agent tool ${name} requires an execute function`);
  if (!Object.values(AGENT_PERMISSIONS).includes(permission)) {
    throw new Error(`Agent tool ${name}: invalid permission ${permission}`);
  }
  return Object.freeze({
    name,
    description: description || '',
    permission,
    execute,
  });
}

/**
 * Plugin descriptor for higher-level capabilities (Git, Memory, etc.).
 * A plugin may register multiple agent tools.
 */
export function createAgentPlugin({ id, name, version, registerTools }) {
  if (!id || typeof id !== 'string') throw new Error('Agent plugin requires an id');
  if (typeof registerTools !== 'function') throw new Error(`Agent plugin ${id} requires a registerTools function`);
  return Object.freeze({
    id,
    name: name || id,
    version: version || '0.0.0',
    registerTools,
  });
}

/**
 * Simple plugin registry independent of ToolRegistry,
 * allowing future capabilities to register before the core is initialized.
 */
export class AgentPluginRegistry {
  #plugins = new Map();
  #tools = new Map();

  registerPlugin(plugin) {
    if (!plugin?.id) throw new Error('Agent plugin must have an id');
    if (this.#plugins.has(plugin.id)) throw new Error(`Agent plugin already registered: ${plugin.id}`);
    this.#plugins.set(plugin.id, plugin);
    // Immediately register any tools the plugin exposes
    if (typeof plugin.registerTools === 'function') {
      plugin.registerTools({
        register: (toolDef) => {
          const tool = createAgentTool(toolDef);
          this.#tools.set(tool.name, tool);
        },
      });
    }
    return this;
  }

  getPlugin(id) {
    return this.#plugins.get(id);
  }

  listPlugins() {
    return [...this.#plugins.values()];
  }

  getTool(name) {
    return this.#tools.get(name);
  }

  listTools() {
    return [...this.#tools.values()];
  }

  unregisterPlugin(id) {
    const plugin = this.#plugins.get(id);
    if (!plugin) return false;
    // Note: does not remove registered tools automatically in this version
    this.#plugins.delete(id);
    return true;
  }
}

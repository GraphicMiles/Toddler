/**
 * MLCProvider (Placeholder)
 * 
 * This is a **stub** for future MLC-LLM integration.
 * 
 * Current behavior:
 * - Always reports as unavailable
 * - Shows clear message to the user
 * - Does not attempt real inference
 * 
 * When MLC-LLM is properly integrated later, this class can be replaced
 * with real implementation without changing the rest of the app.
 */

export class MLCProvider {
  constructor() {
    this.kind = 'mlc-llm';
    this.modelLoaded = false;
    this.currentModel = null;
  }

  async getStatus() {
    return {
      connected: false,
      available: false,
      kind: this.kind,
      reason: 'MLC-LLM on-device inference is coming soon. Currently using Ollama or local llama-server.',
      ready: false,
      isStub: true,
      comingSoon: true
    };
  }

  async loadModel(modelPathOrId) {
    return { 
      loaded: false, 
      error: 'MLC-LLM not available',
      message: 'On-device inference via MLC-LLM is not ready yet.'
    };
  }

  async stream({ messages, signal, onToken }) {
    const message = "MLC-LLM support is not enabled. Please use Ollama or mount a local model.";
    
    if (onToken) {
      for (const char of message) {
        if (signal?.aborted) break;
        onToken(char);
        await new Promise(r => setTimeout(r, 10));
      }
    }
    
    return { done: true, fallback: true, isStub: true };
  }

  async stop() {
    return { stopped: true };
  }

  async unloadModel() {
    this.modelLoaded = false;
    this.currentModel = null;
    return { unloaded: true };
  }
}

export function createMLCProvider() {
  return new MLCProvider();
}
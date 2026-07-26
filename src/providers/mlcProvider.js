/**
 * MLCProvider
 * 
 * On-device inference using MLC-LLM (recommended for Android).
 * This is the simplest path to real local inference.
 * 
 * Note: This is a stub implementation. Full integration requires:
 * - Adding MLC-LLM Android SDK
 * - Registering the native module
 * 
 * For now, it gracefully falls back to showing "MLC not yet integrated".
 */

export class MLCProvider {
  constructor() {
    this.kind = 'mlc-llm';
    this.modelLoaded = false;
    this.currentModel = null;
  }

  async getStatus() {
    // In a real implementation, this would check if MLC runtime is available
    return {
      connected: false,
      available: false,
      kind: this.kind,
      reason: 'MLC-LLM integration not yet enabled. Using Ollama fallback.',
      ready: false,
    };
  }

  async loadModel(modelPathOrId) {
    console.log('[MLCProvider] loadModel called with:', modelPathOrId);
    
    // Placeholder — real implementation would call native MLC-LLM
    this.currentModel = modelPathOrId;
    this.modelLoaded = true;
    
    return { 
      loaded: true, 
      path: modelPathOrId,
      message: 'MLC-LLM support coming soon. Currently falling back to Ollama.'
    };
  }

  async stream({ messages, signal, onToken }) {
    // Placeholder streaming
    const fallbackMessage = "MLC-LLM is not yet integrated. Please use Ollama for now.";
    
    // Simulate streaming the fallback message
    for (const char of fallbackMessage) {
      if (signal?.aborted) break;
      onToken?.(char);
      await new Promise(r => setTimeout(r, 15));
    }
    
    return { done: true, fallback: true };
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
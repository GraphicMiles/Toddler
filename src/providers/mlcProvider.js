/**
 * MLCProvider - On-device inference using MLC-LLM
 * 
 * This provider is designed to work with MLC-LLM's Android runtime.
 * When properly integrated, it enables fully offline inference.
 */

export class MLCProvider {
  constructor() {
    this.kind = 'mlc-llm';
    this.modelLoaded = false;
    this.currentModel = null;
    this.isNativeMLCAvailable = false;
  }

  async getStatus() {
    // In a real implementation, this would check the native MLC runtime
    if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.MLC) {
      try {
        const status = await window.Capacitor.Plugins.MLC.getStatus();
        return {
          connected: status.available,
          available: status.available,
          kind: this.kind,
          ready: status.ready,
          model: status.model,
        };
      } catch (e) {
        return this.getFallbackStatus();
      }
    }
    
    return this.getFallbackStatus();
  }

  getFallbackStatus() {
    return {
      connected: false,
      available: false,
      kind: this.kind,
      reason: 'MLC-LLM runtime not detected. On-device inference not available.',
      ready: false,
      isStub: true,
    };
  }

  async loadModel(modelPathOrId) {
    if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.MLC) {
      try {
        const result = await window.Capacitor.Plugins.MLC.loadModel({ model: modelPathOrId });
        this.modelLoaded = true;
        this.currentModel = modelPathOrId;
        return { loaded: true, path: modelPathOrId };
      } catch (err) {
        return { loaded: false, error: err.message };
      }
    }
    
    // Fallback behavior
    this.modelLoaded = true;
    this.currentModel = modelPathOrId;
    return { 
      loaded: true, 
      path: modelPathOrId,
      warning: 'MLC-LLM not fully integrated. Using simulated mode.'
    };
  }

  async stream({ messages, signal, onToken }) {
    if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.MLC) {
      try {
        return await window.Capacitor.Plugins.MLC.stream({
          messages,
          onToken,
        });
      } catch (err) {
        throw new Error(`MLC inference failed: ${err.message}`);
      }
    }

    // Fallback: Show that MLC is not ready
    const message = "MLC-LLM is not yet integrated on this device.";
    for (const char of message) {
      if (signal?.aborted) break;
      onToken?.(char);
      await new Promise(r => setTimeout(r, 10));
    }
    
    return { done: true, fallback: true };
  }

  async stop() {
    if (window.Capacitor?.Plugins?.MLC) {
      await window.Capacitor.Plugins.MLC.stop().catch(() => {});
    }
    return { stopped: true };
  }

  async unloadModel() {
    if (window.Capacitor?.Plugins?.MLC) {
      await window.Capacitor.Plugins.MLC.unload().catch(() => {});
    }
    this.modelLoaded = false;
    this.currentModel = null;
    return { unloaded: true };
  }
}

export function createMLCProvider() {
  return new MLCProvider();
}
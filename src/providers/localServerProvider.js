/**
 * LocalServerProvider
 * 
 * Talks to a locally running llama-server (via llama.cpp) on the device.
 * Uses the same OpenAI-compatible HTTP API as OllamaProvider.
 */

export class LocalServerProvider {
  constructor(baseUrl = 'http://127.0.0.1:8080') {
    this.baseUrl = baseUrl;
    this.kind = 'local-server';
    this.mountedModel = null;
  }

  setBaseUrl(url) {
    this.baseUrl = url;
  }

  async getStatus() {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2500),
      });
      
      if (response.ok) {
        return {
          connected: true,
          available: true,
          kind: this.kind,
          mounted: this.mountedModel,
          url: this.baseUrl,
        };
      }
      return { 
        connected: false, 
        available: false, 
        kind: this.kind,
        reason: 'Local server is not responding'
      };
    } catch (err) {
      return { 
        connected: false, 
        available: false, 
        kind: this.kind,
        reason: 'Local inference server is not running. Please mount a model first.',
        error: err.message 
      };
    }
  }

  async loadModel(modelPath) {
    // In this architecture, "loading" = mounting via the native service
    // The actual model is loaded by llama-server when mounted
    this.mountedModel = modelPath;
    return { loaded: true, path: modelPath };
  }

  async stream({ messages, signal, onToken }) {
    const prompt = this.messagesToPrompt(messages);
    
    try {
      const response = await fetch(`${this.baseUrl}/v1/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          max_tokens: 512,
          temperature: 0.7,
          stream: true,
        }),
        signal,
      });

      if (!response.ok) {
        throw new Error(`Local server error (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;
          
          const data = line.replace('data: ', '').trim();
          if (data === '[DONE]') return;

          try {
            const json = JSON.parse(data);
            const token = json.choices?.[0]?.text;
            if (token) {
              onToken?.(token);
            }
          } catch (e) {}
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
      
      throw new Error(
        `Local inference server is not running. Please mount a model first.`
      );
    }
  }

  async stop() {
    return { stopped: true };
  }

  async unloadModel() {
    this.mountedModel = null;
    return { unloaded: true };
  }

  // Helper: Convert chat messages to a single prompt
  messagesToPrompt(messages) {
    return messages
      .map(msg => {
        if (msg.role === 'user') return `User: ${msg.content}`;
        if (msg.role === 'assistant') return `Assistant: ${msg.content}`;
        return msg.content;
      })
      .join('\n') + '\nAssistant:';
  }
}

export function createLocalServerProvider(port = 8080) {
  return new LocalServerProvider(`http://127.0.0.1:${port}`);
}
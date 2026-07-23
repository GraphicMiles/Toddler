/**
 * useOllama - Hook for Ollama local model integration
 * 
 * Works in:
 * - Web (via fetch to localhost:11434)
 * - Capacitor mobile (via localhost/network)
 * - Tauri desktop (via localhost)
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { checkOllamaConnection } from '../nativeBridge';

const OLLAMA_URL = import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434';

export default function useOllama() {
  const [status, setStatus] = useState('disconnected');
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('llama3.1');
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef(null);

  // Check connection on mount
  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const checkConnection = useCallback(async () => {
    const result = await checkOllamaConnection(OLLAMA_URL);
    if (result.connected) {
      setStatus('connected');
      setModels(result.models.map(m => m.name));
      if (result.models.length > 0 && !models.includes(selectedModel)) {
        setSelectedModel(result.models[0].name);
      }
    } else {
      setStatus('disconnected');
    }
  }, [OLLAMA_URL, selectedModel]);

  /**
   * Send chat message to Ollama
   */
  const chat = useCallback(async (messages, options = {}) => {
    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          stream: false,
          options: {
            temperature: options.temperature || 0.7,
            top_p: options.topP || 0.9,
            num_predict: options.maxTokens || 512,
            ...options,
          },
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return {
        content: data.message?.content || '',
        done: data.done || true,
        totalDuration: data.total_duration,
        loadDuration: data.load_duration,
        promptEvalCount: data.prompt_eval_count,
        evalCount: data.eval_count,
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        return { content: '', done: false, cancelled: true };
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [selectedModel, OLLAMA_URL]);

  /**
   * Stream chat response
   */
  const streamChat = useCallback(async function* (messages, options = {}) {
    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          stream: true,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(Boolean);

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            yield {
              content: data.message?.content || '',
              done: data.done || false,
            };
            if (data.done) break;
          } catch {
            // Skip invalid JSON
          }
        }
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [selectedModel, OLLAMA_URL]);

  /**
   * Cancel current request
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  }, []);

  /**
   * Generate completion (non-chat)
   */
  const generate = useCallback(async (prompt, options = {}) => {
    setIsLoading(true);

    try {
      const response = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          prompt,
          stream: false,
          ...options,
        }),
      });

      const data = await response.json();
      return {
        content: data.response || '',
        done: data.done || true,
      };
    } finally {
      setIsLoading(false);
    }
  }, [selectedModel, OLLAMA_URL]);

  /**
   * Pull a new model
   */
  const pullModel = useCallback(async (modelName, onProgress) => {
    try {
      const response = await fetch(`${OLLAMA_URL}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName, stream: true }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(Boolean);

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            onProgress?.(data);
          } catch {
            // Skip invalid JSON
          }
        }
      }

      // Refresh model list
      await checkConnection();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [checkConnection]);

  return {
    status,
    models,
    selectedModel,
    setSelectedModel,
    isLoading,
    chat,
    streamChat,
    generate,
    pullModel,
    cancel,
    checkConnection,
  };
}

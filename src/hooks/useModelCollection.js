import { useState, useEffect, useCallback, useRef } from 'react';
import { checkOllamaConnection, pullOllamaModel, deleteOllamaModel, downloadOnDeviceModel, pauseOnDeviceDownload, isNative } from '../nativeBridge';

const STORAGE_KEY = 'forgeai_models';
const ACTIVE_MODEL_KEY = 'forgeai_active_model';
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };

export default function useModelCollection({ endpoint = 'http://localhost:11434' } = {}) {
  const [models, setModels] = useState(() => read(STORAGE_KEY, []));
  const [activeModel, setActiveModelState] = useState(() => read(ACTIVE_MODEL_KEY, null));
  const [isLoading, setIsLoading] = useState(true);
  const [downloads, setDownloads] = useState({});
  const controllers = useRef(new Map());

  useEffect(() => { setIsLoading(false); }, []);
  const saveModels = useCallback((next) => { setModels(next); localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }, []);
  const downloadModel = useCallback(async (model, onProgress) => {
    if (models.some(m => m.id === model.id)) return { success: false, error: 'Model already downloaded' };
    const names = { 'smollm-360m': 'smollm2:360m', 'smollm-1.7b': 'smollm2:1.7b', 'llama-3.2-1b': 'llama3.2:1b', 'qwen-0.5b': 'qwen2.5:0.5b', 'phi-3-mini': 'phi3:mini', 'codellama-3b': 'codellama:3b', 'qwen-1.5b-code': 'qwen2.5-coder:1.5b', 'deepseek-1.3b': 'deepseek-coder:1.3b', 'llama-3.1-8b': 'llama3.1:8b', 'qwen-2.5-7b': 'qwen2.5:7b' };
    const name = model.ollamaName || names[model.id] || model.id;
    setDownloads(d => ({ ...d, [model.id]: { status: 'queued', progress: 0 } }));
    const controller = new AbortController(); controllers.current.set(model.id, controller);
    try {
      let result;
      if (isNative && model.downloadUrl) {
        result = await downloadOnDeviceModel(model.downloadUrl, model.file || `${model.id}.gguf`);
        onProgress?.({ status: 'completed', progress: 100, completed: result.size || 0, total: result.size || 0 });
      } else {
        result = await pullOllamaModel(name, endpoint, (progress) => { setDownloads(d => ({ ...d, [model.id]: progress })); onProgress?.(progress); }, controller.signal);
      }
      if (result.paused) {
        setDownloads(d => ({ ...d, [model.id]: { status: 'paused', progress: 0, completed: result.size || 0 } }));
        return { success: false, paused: true };
      }
      const installed = { ...model, ollamaName: name, localPath: result.path, downloadedAt: new Date().toISOString(), status: 'ready', downloadedBytes: result.total || result.size || undefined };
      saveModels([...models, installed]);
      controllers.current.delete(model.id);
      setDownloads(d => { const n = { ...d }; delete n[model.id]; return n; });
      return { success: true, model: installed };
    } catch (error) {
      controllers.current.delete(model.id);
      setDownloads(d => ({ ...d, [model.id]: { status: error.name === 'AbortError' ? 'cancelled' : 'failed', error: error.message } }));
      return { success: false, error: error.message };
    }
  }, [models, saveModels, endpoint]);
  const retryDownload = useCallback((model, onProgress) => downloadModel(model, onProgress), [downloadModel]);
  const cancelDownload = useCallback((modelId) => controllers.current.get(modelId)?.abort(), []);
  const pauseDownload = useCallback(async (model) => { if (isNative) return pauseOnDeviceDownload(model.file || `${model.id}.gguf`); controllers.current.get(model.id)?.abort(); }, []);
  const deleteModel = useCallback(async (modelId) => {
    const model = models.find(m => m.id === modelId); if (!model) return;
    try { await deleteOllamaModel(model.ollamaName || model.id, endpoint); } catch (e) { console.warn('Ollama delete failed', e); }
    if (activeModel?.id === modelId) setActiveModel(null);
    saveModels(models.filter(m => m.id !== modelId));
  }, [models, activeModel, saveModels, endpoint]);
  const setActiveModel = useCallback((model) => { setActiveModelState(model); if (model) localStorage.setItem(ACTIVE_MODEL_KEY, JSON.stringify(model)); else localStorage.removeItem(ACTIVE_MODEL_KEY); }, []);
  const stopModel = useCallback(() => setActiveModel(null), [setActiveModel]);
  const isDownloaded = useCallback((id) => models.some(m => m.id === id), [models]);
  return { models, activeModel, isLoading, downloads, downloadModel, retryDownload, cancelDownload, pauseDownload, deleteModel, setActiveModel, stopModel, isDownloaded, refresh: async () => checkOllamaConnection(endpoint) };
}

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  checkOllamaConnection, pullOllamaModel, deleteOllamaModel,
  downloadOnDeviceModel, pauseOnDeviceDownload, deleteOnDeviceModel, isNative
} from '../nativeBridge';

const STORAGE_KEY = 'forgeai_models';
const ACTIVE_MODEL_KEY = 'forgeai_active_model';
const read = (key, fallback) => { try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; } };
const readModels = () => { const v = read(STORAGE_KEY, []); return Array.isArray(v) ? v.filter(i => i && typeof i.id === 'string') : []; };
const readActive = () => { const v = read(ACTIVE_MODEL_KEY, null); return v && typeof v.id === 'string' ? v : null; };

export default function useModelCollection({ endpoint = 'http://localhost:11434' } = {}) {
  const [models, setModels] = useState(readModels);
  const [activeModel, setActiveModelState] = useState(readActive);
  const [isLoading, setIsLoading] = useState(true);
  const [downloads, setDownloads] = useState({});
  const controllers = useRef(new Map());

  useEffect(() => { setIsLoading(false); }, []);

  const saveModels = useCallback((nextOrUpdater) => {
    setModels(prev => {
      const next = typeof nextOrUpdater === 'function' ? nextOrUpdater(prev) : nextOrUpdater;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch (e) { console.warn('Unable to persist model metadata', e); }
      return next;
    });
  }, []);

  const downloadModel = useCallback(async (model, onProgress) => {
    if (models.some(m => m.id === model.id)) return { success: false, error: 'Model already downloaded' };

    const name = model.ollamaName || model.id;
    setDownloads(d => ({ ...d, [model.id]: { status: 'downloading', progress: 0 } }));
    const controller = new AbortController();
    controllers.current.set(model.id, controller);

    try {
      let result;
      if (isNative && model.downloadUrl) {
        // Android native download via Capacitor plugin
        result = await downloadOnDeviceModel(model.downloadUrl, model.file || `${model.id}.gguf`, onProgress);
        onProgress?.({ status: 'completed', progress: 100, completed: result.size || 0, total: result.size || 0 });
      } else {
        // Ollama pull (web/desktop)
        result = await pullOllamaModel(name, endpoint, (p) => {
          setDownloads(d => ({ ...d, [model.id]: p }));
          onProgress?.(p);
        }, controller.signal);
      }

      // Check if the result indicates a pause
      if (result && result.paused) {
        setDownloads(d => ({ ...d, [model.id]: { status: 'paused', completed: result.size || 0 } }));
        return { success: false, paused: true };
      }

      // Success — save to collection
      const installed = {
        ...model,
        ollamaName: name,
        localPath: result.path,
        downloadedAt: new Date().toISOString(),
        status: 'ready',
        downloadedBytes: result.total || result.size || undefined,
      };
      saveModels(prev => prev.some(i => i.id === model.id) ? prev : [...prev, installed]);
      controllers.current.delete(model.id);
      setDownloads(d => { const n = { ...d }; delete n[model.id]; return n; });
      return { success: true, model: installed };
    } catch (error) {
      controllers.current.delete(model.id);
      const isAbort = error.name === 'AbortError' || error.message?.includes('aborted');
      setDownloads(d => ({ ...d, [model.id]: { status: isAbort ? 'cancelled' : 'failed', error: error.message } }));
      return { success: false, error: error.message };
    }
  }, [models, saveModels, endpoint]);

  const pauseDownload = useCallback(async (model) => {
    if (isNative) {
      // Tell native plugin to pause
      return pauseOnDeviceDownload(model.file || `${model.id}.gguf`);
    }
    // On web/Ollama: abort the fetch (download will need to restart, Ollama pull doesn't support resume)
    controllers.current.get(model.id)?.abort();
    setDownloads(d => ({ ...d, [model.id]: { ...d[model.id], status: 'paused' } }));
    return { paused: true };
  }, []);

  const cancelDownload = useCallback((modelId) => {
    controllers.current.get(modelId)?.abort();
    controllers.current.delete(modelId);
    setDownloads(d => { const n = { ...d }; delete n[modelId]; return n; });
  }, []);

  const retryDownload = useCallback((model, onProgress) => downloadModel(model, onProgress), [downloadModel]);

  const deleteModel = useCallback(async (modelId) => {
    const model = models.find(m => m.id === modelId);
    if (!model) return;
    try {
      if (isNative && model.localPath) await deleteOnDeviceModel(model.localPath);
      else await deleteOllamaModel(model.ollamaName || model.id, endpoint);
    } catch (e) {
      console.warn('Model delete failed', e);
      return;
    }
    if (activeModel?.id === modelId) {
      setActiveModelState(null);
      localStorage.removeItem(ACTIVE_MODEL_KEY);
    }
    saveModels(models.filter(m => m.id !== modelId));
  }, [models, activeModel, saveModels, endpoint]);

  const setActiveModel = useCallback((model) => {
    setActiveModelState(model);
    if (model) localStorage.setItem(ACTIVE_MODEL_KEY, JSON.stringify(model));
    else localStorage.removeItem(ACTIVE_MODEL_KEY);
  }, []);

  const stopModel = useCallback(() => setActiveModel(null), [setActiveModel]);
  const isDownloaded = useCallback((id) => models.some(m => m.id === id), [models]);

  return {
    models, activeModel, isLoading, downloads,
    downloadModel, retryDownload, cancelDownload, pauseDownload,
    deleteModel, setActiveModel, stopModel, isDownloaded,
    refresh: async () => checkOllamaConnection(endpoint),
  };
}

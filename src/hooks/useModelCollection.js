import { useState, useEffect, useCallback, useRef } from 'react';
import {
  checkOllamaConnection, pullOllamaModel, deleteOllamaModel,
  downloadOnDeviceModel, pauseOnDeviceDownload, deleteOnDeviceModel, isNative, downloadModelToWorkspace, importModelToRuntime, listWorkspace
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

  // Re-discover durable SAF models after reinstall or APK replacement.
  useEffect(() => {
    if (!isNative) return;
    const uri = localStorage.getItem('forgeai_model_folder_uri');
    if (!uri?.startsWith('content://')) return;
    let cancelled = false;
    const flatten = (nodes, out = []) => { for (const node of nodes || []) { if (node.type === 'folder') flatten(node.children, out); else if (node.path?.toLowerCase().endsWith('.gguf')) out.push(node.path); } return out; };
    (async () => {
      try {
        const treeResult = await listWorkspace(uri);
        const paths = flatten(treeResult?.children || treeResult?.value || treeResult || []);
        for (const path of paths) {
          if (cancelled || models.some(model => model.sourcePath === path)) continue;
          try {
            const imported = await importModelToRuntime(uri, path);
            const id = `imported-${path.split('/').pop().replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
            saveModels(prev => prev.some(model => model.id === id) ? prev : [...prev, { id, name: path.split('/').pop(), file: path.split('/').pop(), localPath: imported.runtimePath, sourcePath: path, sourceUri: uri, runtime: 'llama.cpp', format: 'GGUF', sha256: imported.sha256, verified: true, status: 'ready', downloadedAt: new Date().toISOString(), downloadedBytes: imported.size }]);
          } catch (error) { console.warn('Durable model import skipped:', path, error); }
        }
      } catch (error) { console.warn('Durable model scan failed:', error); }
    })();
    return () => { cancelled = true; };
  }, [models, saveModels]);


  const downloadModel = useCallback(async (model, externalOnProgress) => {
    if (models.some(m => m.id === model.id)) return { success: false, error: 'Model already downloaded' };

    const name = model.ollamaName || model.id;
    setDownloads(d => ({ ...d, [model.id]: { status: 'downloading', progress: 0 } }));
    const controller = new AbortController();
    controllers.current.set(model.id, controller);

    // Internal progress handler that always updates downloads state
    const trackProgress = (p) => {
      setDownloads(d => ({ ...d, [model.id]: { ...d[model.id], ...p } }));
      externalOnProgress?.(p);
    };

    try {
      let result;
      if (isNative && model.downloadUrl) {
        // Android native download via Capacitor plugin
        const modelFolderUri = localStorage.getItem('forgeai_model_folder_uri') || '';
        if (modelFolderUri.startsWith('content://')) {
          const durablePath = `models/${model.file || `${model.id}.gguf`}`;
          await trackProgress({ status: 'downloading', progress: 0 });
          const durable = await downloadModelToWorkspace(modelFolderUri, model.downloadUrl, durablePath);
          const imported = await importModelToRuntime(modelFolderUri, durablePath);
          result = { ...durable, ...imported, sourceUri: modelFolderUri, durablePath };
          trackProgress({ status: 'completed', progress: 100, completed: result.size || 0, total: result.size || 0 });
        } else {
          result = await downloadOnDeviceModel(model.downloadUrl, model.file || `${model.id}.gguf`, trackProgress);
        }
        trackProgress({ status: 'completed', progress: 100, completed: result.size || 0, total: result.size || 0 });
      } else {
        // Ollama pull (web/desktop)
        result = await pullOllamaModel(name, endpoint, trackProgress, controller.signal);
      }

      // Check if the result indicates a pause
      if (result && result.paused) {
        setDownloads(d => ({ ...d, [model.id]: { status: 'paused', completed: result.size || 0 } }));
        return { success: false, paused: true };
      }

      // Success - save to collection
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
      // Guard: if a newer download replaced this one, don't touch state
      if (controllers.current.get(model.id) !== controller) {
        return { success: false, error: error.message };
      }
      controllers.current.delete(model.id);
      const isAbort = error.name === 'AbortError' || error.message?.includes('aborted');
      setDownloads(d => {
        if (!d[model.id]) return d; // already cleared by cancel
        return { ...d, [model.id]: { status: isAbort ? 'cancelled' : 'failed', error: error.message } };
      });
      return { success: false, error: error.message };
    }
  }, [models, saveModels, endpoint]);

  const pauseDownload = useCallback(async (model) => {
    if (isNative) {
      return pauseOnDeviceDownload(model.file || `${model.id}.gguf`);
    }
    controllers.current.get(model.id)?.abort();
    setDownloads(d => ({ ...d, [model.id]: { ...d[model.id], status: 'paused' } }));
    return { paused: true };
  }, []);

  const cancelDownload = useCallback((modelId) => {
    // Abort the network request
    controllers.current.get(modelId)?.abort();
    controllers.current.delete(modelId);
    // Remove from downloads entirely so it can be retried immediately
    setDownloads(d => { const n = { ...d }; delete n[modelId]; return n; });
  }, []);

  const retryDownload = useCallback((model, onProgress) => {
    // Clear any stale entry before retrying
    setDownloads(d => { const n = { ...d }; delete n[model.id]; return n; });
    return downloadModel(model, onProgress);
  }, [downloadModel]);

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

  const mountModel = useCallback(async (model) => {
    if (isNative && model.localPath) {
      try { await (await import('../nativeBridge')).loadOnDeviceModel(model.localPath); }
      catch (error) { return { success: false, error: error.message }; }
    }
    setActiveModel(model);
    return { success: true, mounted: isNative };
  }, [setActiveModel]);

  const unmountModel = useCallback(async () => {
    if (isNative) await (await import('../nativeBridge')).unloadOnDeviceModel().catch(() => {});
    setActiveModel(null);
    return { success: true, message: 'Model unloaded' };
  }, [setActiveModel]);

  const stopModel = useCallback(() => setActiveModel(null), [setActiveModel]);
  const isDownloaded = useCallback((id) => models.some(m => m.id === id), [models]);

  return {
    models, activeModel, isLoading, downloads,
    downloadModel, retryDownload, cancelDownload, pauseDownload,
    deleteModel, setActiveModel, stopModel, isDownloaded,
    mountModel, unmountModel,
    refresh: async () => checkOllamaConnection(endpoint),
  };
}

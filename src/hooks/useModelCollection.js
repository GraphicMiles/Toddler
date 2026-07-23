/**
 * useModelCollection - Hook for managing downloaded models
 * Uses localStorage for persistence (can upgrade to IndexedDB later)
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'forgeai_models';
const ACTIVE_MODEL_KEY = 'forgeai_active_model';

export default function useModelCollection() {
  const [models, setModels] = useState([]);
  const [activeModel, setActiveModelState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load from storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setModels(parsed);
      }

      const activeStored = localStorage.getItem(ACTIVE_MODEL_KEY);
      if (activeStored) {
        setActiveModelState(JSON.parse(activeStored));
      }
    } catch (e) {
      console.error('Failed to load models:', e);
    }
    setIsLoading(false);
  }, []);

  // Save to storage when models change
  const saveModels = useCallback((newModels) => {
    setModels(newModels);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newModels));
  }, []);

  // Download a model
  const downloadModel = useCallback(async (model) => {
    // Check if already downloaded
    if (models.some(m => m.id === model.id)) {
      return { success: false, error: 'Model already downloaded' };
    }

    // In a real app, this would:
    // 1. Download the model from Ollama or a CDN
    // 2. Store it in the file system
    // 3. Save metadata to IndexedDB
    
    // For now, we simulate the download
    return new Promise((resolve) => {
      setTimeout(() => {
        const newModel = {
          ...model,
          id: model.id,
          downloadedAt: new Date().toISOString(),
          status: 'ready',
        };
        
        saveModels([...models, newModel]);
        resolve({ success: true, model: newModel });
      }, 2000);
    });
  }, [models, saveModels]);

  // Delete a model
  const deleteModel = useCallback((modelId) => {
    const model = models.find(m => m.id === modelId);
    if (!model) return;

    // If it's the active model, clear it
    if (activeModel?.id === modelId) {
      setActiveModel(null);
    }

    // Remove from list
    const newModels = models.filter(m => m.id !== modelId);
    saveModels(newModels);

    // In a real app, also delete the model files from storage
  }, [models, activeModel, saveModels]);

  // Set active model
  const setActiveModel = useCallback((model) => {
    setActiveModelState(model);
    if (model) {
      localStorage.setItem(ACTIVE_MODEL_KEY, JSON.stringify(model));
    } else {
      localStorage.removeItem(ACTIVE_MODEL_KEY);
    }
  }, []);

  // Stop model (when closing app or switching)
  const stopModel = useCallback(() => {
    // In a real app, this would:
    // 1. Stop the Ollama process for this model
    // 2. Free up memory
    setActiveModel(null);
  }, [setActiveModel]);

  // Check if model is downloaded
  const isDownloaded = useCallback((modelId) => {
    return models.some(m => m.id === modelId);
  }, [models]);

  return {
    models,
    activeModel,
    isLoading,
    downloadModel,
    deleteModel,
    setActiveModel,
    stopModel,
    isDownloaded,
  };
}

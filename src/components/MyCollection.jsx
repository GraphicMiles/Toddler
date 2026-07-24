import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, Trash2, Play, Pause, Settings, 
  ChevronDown, Wifi, WifiOff, RefreshCw, Database
} from 'lucide-react';
import { formatModelSize, formatStorageCapacity, getModelSizeBytes } from '../utils/deviceCapacity';
import './MyCollection.css';

export default function MyCollection({ 
  models = [], 
  activeModel,
  onSelect,
  onDelete,
  onStop,
  isRunning = false,
  ollamaConnected = false,
  runtimeMode,
  deviceCapability = {},
  onOpenZoo
}) {
  const [expandedId, setExpandedId] = useState(null);
  const usedStorageBytes = models.reduce(
    (total, model) => total + getModelSizeBytes(model),
    0,
  );
  const storageSummary = deviceCapability.storageBytes
    ? `Using ${formatModelSize(usedStorageBytes)} of ${formatStorageCapacity(deviceCapability.storageBytes)}`
    : `Using ${formatModelSize(usedStorageBytes)}`;

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString();
  };

  return (
    <div className="my-collection">
      {/* Header */}
      <div className="collection-header">
        <div className="collection-title">
          <h2 className="display">My Collection</h2>
          <span className="model-count">{models.length} models</span>
        </div>
        
        <div className="collection-actions">
          {/* Ollama Status */}
          <div className={`ollama-status ${ollamaConnected ? 'connected' : 'disconnected'}`}>
            {ollamaConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{runtimeMode || (ollamaConnected ? 'Ollama active' : 'Runtime offline')}</span>
          </div>
        </div>
      </div>

      {/* Active Model Banner */}
      {activeModel && (
        <motion.div 
          className="active-model-banner"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="active-model-info">
            <div className="active-indicator">
              {isRunning ? (
                <motion.span 
                  className="pulse"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
              ) : (
                <span className="static" />
              )}
            </div>
            <div>
              <span className="active-label">Active Model</span>
              <span className="active-name">{activeModel.name}</span>
            </div>
          </div>
          <div className="active-model-actions">
            {isRunning ? (
              <button 
                className="btn-stop"
                onClick={() => onStop?.()}
              >
                <Pause size={14} />
                Stop
              </button>
            ) : (
              <button 
                className="btn-start"
                onClick={() => onSelect?.(activeModel)}
              >
                <Play size={14} />
                Start
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Model List */}
      <div className="model-list">
        {models.length === 0 ? (
          <div className="empty-collection">
            <div className="empty-icon">
              <Database size={32} />
            </div>
            <h3>No models downloaded</h3>
            <p>Download models from the Model Zoo to start chatting.</p>
            <button className="btn-open-zoo" onClick={onOpenZoo}>
              Open Model Zoo
            </button>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {models.map((model, index) => {
              const isActive = activeModel?.id === model.id;
              const isExpanded = expandedId === model.id;

              return (
                <motion.div
                  key={model.id}
                  className={`model-item ${isActive ? 'active' : ''} ${isRunning && isActive ? 'running' : ''}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                  layout
                >
                  {/* Main Row */}
                  <div 
                    className="model-item-main"
                    onClick={() => setExpandedId(isExpanded ? null : model.id)}
                  >
                    <div className="model-item-left">
                      <div className="model-radio">
                        {isActive ? (
                          <motion.span 
                            className="radio-active"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                          />
                        ) : (
                          <span className="radio-inactive" />
                        )}
                      </div>
                      <div className="model-item-info">
                        <span className="model-item-name">{model.name}</span>
                        <span className="model-item-size mono">
                          {model.size}{model.sizeUnit}
                        </span>
                      </div>
                    </div>

                    <div className="model-item-right">
                      {isActive && isRunning && (
                        <span className="running-badge">Running</span>
                      )}
                      {isActive && (
                        <span className="active-badge">Active</span>
                      )}
                      <ChevronDown 
                        size={16} 
                        className={`expand-icon ${isExpanded ? 'expanded' : ''}`}
                      />
                    </div>
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        className="model-item-details"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="details-grid">
                          <div className="detail">
                            <span className="detail-label">Size</span>
                            <span className="detail-value mono">{model.size}{model.sizeUnit}</span>
                          </div>
                          <div className="detail">
                            <span className="detail-label">Params</span>
                            <span className="detail-value mono">{model.params}</span>
                          </div>
                          <div className="detail">
                            <span className="detail-label">Task</span>
                            <span className="detail-value">{model.task}</span>
                          </div>
                          <div className="detail">
                            <span className="detail-label">Downloaded</span>
                            <span className="detail-value">{formatDate(model.downloadedAt)}</span>
                          </div>
                        </div>

                        <div className="details-actions">
                          {isActive ? (
                            <button 
                              className="btn-deselect"
                              onClick={(e) => {
                                e.stopPropagation();
                                onStop?.();
                              }}
                            >
                              Deselect
                            </button>
                          ) : (
                            <button 
                              className="btn-select"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelect?.(model);
                              }}
                            >
                              <Check size={14} />
                              Select
                            </button>
                          )}
                          <button 
                            className="btn-delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete?.(model);
                            }}
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Footer */}
      <div className="collection-footer">
        <span className="storage-info mono">
          {storageSummary}
        </span>
      </div>
    </div>
  );
}

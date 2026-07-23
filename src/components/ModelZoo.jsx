import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, X, Check, Wifi, WifiOff, HardDrive, 
  Cpu, ChevronRight, Sparkles, Code, MessageSquare, RefreshCw
} from 'lucide-react';
import './ModelZoo.css';

const MODEL_CATALOG = [
  // Chat Models
  {
    id: 'smollm-360m',
    name: 'SmolLM 360M',
    family: 'smollm2',
    params: '360M',
    size: 150,
    sizeUnit: 'MB',
    minRam: 2,
    task: 'chat',
    description: 'Ultra-lightweight. Runs on any device with 2GB+ RAM.',
    badge: 'Fastest',
    runsOn: ['mobile', 'desktop'],
    quantizations: ['Q4_K_M'],
    license: 'Apache-2.0',
  },
  {
    id: 'smollm-1.7b',
    name: 'SmolLM 1.7B',
    family: 'smollm2',
    params: '1.7B',
    size: 900,
    sizeUnit: 'MB',
    minRam: 4,
    task: 'chat',
    description: 'Better quality, still lightweight. Great for phones.',
    badge: 'Popular',
    runsOn: ['mobile', 'desktop'],
    quantizations: ['Q4_K_M', 'Q8_0'],
    license: 'Apache-2.0',
  },
  {
    id: 'llama-3.2-1b',
    name: 'Llama 3.2 1B',
    family: 'llama',
    params: '1B',
    size: 650,
    sizeUnit: 'MB',
    minRam: 4,
    task: 'chat',
    description: 'Meta\'s latest small model. Excellent instruction following.',
    badge: 'New',
    runsOn: ['mobile', 'desktop'],
    quantizations: ['Q4_K_M'],
    license: 'Llama 3.2',
  },
  {
    id: 'qwen-0.5b',
    name: 'Qwen 0.5B',
    family: 'qwen',
    params: '0.5B',
    size: 300,
    sizeUnit: 'MB',
    minRam: 2,
    task: 'chat',
    description: 'Multilingual support. Great for Asian languages.',
    runsOn: ['mobile', 'desktop'],
    quantizations: ['Q4_K_M'],
    license: 'Apache-2.0',
  },
  {
    id: 'phi-3-mini',
    name: 'Phi-3 Mini',
    family: 'phi',
    params: '3.8B',
    size: 2200,
    sizeUnit: 'MB',
    minRam: 6,
    task: 'chat',
    description: 'Microsoft\'s reasoning powerhouse. Desktop recommended.',
    badge: 'Quality',
    runsOn: ['desktop'],
    quantizations: ['Q4_K_M', 'Q8_0'],
    license: 'MIT',
  },
  // Code Models
  {
    id: 'codellama-3b',
    name: 'CodeLlama 3B',
    family: 'codellama',
    params: '3B',
    size: 1700,
    sizeUnit: 'MB',
    minRam: 6,
    task: 'code',
    description: 'Meta\'s coding specialist. Great for code completion.',
    badge: 'Code',
    runsOn: ['desktop'],
    quantizations: ['Q4_K_M', 'Q8_0'],
    license: 'Llama 3.2',
  },
  {
    id: 'qwen-1.5b-code',
    name: 'Qwen Coder 1.5B',
    family: 'qwen',
    params: '1.5B',
    size: 800,
    sizeUnit: 'MB',
    minRam: 4,
    task: 'code',
    description: 'Alibaba\'s code model. Good balance of speed and quality.',
    runsOn: ['mobile', 'desktop'],
    quantizations: ['Q4_K_M'],
    license: 'Apache-2.0',
  },
  {
    id: 'deepseek-1.3b',
    name: 'DeepSeek Coder 1.3B',
    family: 'deepseek',
    params: '1.3B',
    size: 750,
    sizeUnit: 'MB',
    minRam: 4,
    task: 'code',
    description: 'Specialized for code. Great for fill-in-the-middle.',
    runsOn: ['mobile', 'desktop'],
    quantizations: ['Q4_K_M'],
    license: 'DeepSeek',
  },
  // Balanced Models
  {
    id: 'llama-3.1-8b',
    name: 'Llama 3.1 8B',
    family: 'llama',
    params: '8B',
    size: 4700,
    sizeUnit: 'MB',
    minRam: 8,
    task: 'balanced',
    description: 'Powerful all-rounder. Best quality but needs more RAM.',
    badge: 'Best',
    runsOn: ['desktop'],
    quantizations: ['Q4_K_M', 'Q8_0'],
    license: 'Llama 3.2',
  },
  {
    id: 'qwen-2.5-7b',
    name: 'Qwen 2.5 7B',
    family: 'qwen',
    params: '7B',
    size: 4100,
    sizeUnit: 'MB',
    minRam: 8,
    task: 'balanced',
    description: 'Excellent multilingual + code. Very popular.',
    badge: 'Popular',
    runsOn: ['desktop'],
    quantizations: ['Q4_K_M', 'Q8_0'],
    license: 'Apache-2.0',
  },
];

const TASK_ICONS = {
  chat: MessageSquare,
  code: Code,
  balanced: Sparkles,
};

const TASK_LABELS = {
  chat: 'Chat',
  code: 'Code',
  balanced: 'Balanced',
};

export default function ModelZoo({ 
  downloadedModels = [], 
  onDownload, 
  deviceCapability = { ram: 8, storage: 64 },
  onClose 
}) {
  const [filter, setFilter] = useState('all');
  const [showOnlyCompatible, setShowOnlyCompatible] = useState(true);
  const [downloading, setDownloading] = useState({});
  const [downloadProgress, setDownloadProgress] = useState({});

  // Filter models based on device and category
  const filteredModels = MODEL_CATALOG.filter(model => {
    const isCompatible = model.minRam <= deviceCapability.ram;
    const matchesFilter = filter === 'all' || model.task === filter;
    const isDownloaded = downloadedModels.some(d => d.id === model.id);
    
    if (showOnlyCompatible && !isCompatible) return false;
    if (!matchesFilter) return false;
    
    return true;
  });

  const handleDownload = async (model) => {
    setDownloading(prev => ({ ...prev, [model.id]: true }));
    setDownloadProgress(prev => ({ ...prev, [model.id]: 0 }));

    // Simulate download progress
    // In real app, this would use Ollama API or direct download
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 300));
      setDownloadProgress(prev => ({ ...prev, [model.id]: i }));
    }

    // Call the download handler
    await onDownload?.(model);

    setDownloading(prev => {
      const newState = { ...prev };
      delete newState[model.id];
      return newState;
    });
    setDownloadProgress(prev => {
      const newState = { ...prev };
      delete newState[model.id];
      return newState;
    });
  };

  const isDownloaded = (modelId) => downloadedModels.some(d => d.id === modelId);
  const isCompatible = (model) => model.minRam <= deviceCapability.ram;

  return (
    <motion.div 
      className="model-zoo"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Header */}
      <div className="zoo-header">
        <div className="zoo-title">
          <h2 className="display">Model Zoo</h2>
          <p className="zoo-subtitle">
            Choose a model that fits your device
          </p>
        </div>
        {onClose && (
          <button className="zoo-close" onClick={onClose}>
            <X size={20} />
          </button>
        )}
      </div>

      {/* Device Info */}
      <div className="device-info">
        <div className="device-stat">
          <Cpu size={14} />
          <span>{deviceCapability.ram}GB RAM detected</span>
        </div>
        <div className="device-stat">
          <HardDrive size={14} />
          <span>{deviceCapability.storage}GB storage</span>
        </div>
        <label className="compatible-toggle">
          <input 
            type="checkbox" 
            checked={showOnlyCompatible}
            onChange={(e) => setShowOnlyCompatible(e.target.checked)}
          />
          <span>Show compatible only</span>
        </label>
      </div>

      {/* Filter Tabs */}
      <div className="zoo-filters">
        {['all', 'chat', 'code', 'balanced'].map((f) => (
          <button
            key={f}
            className={`filter-tab ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : TASK_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Model Grid */}
      <div className="model-grid">
        <AnimatePresence mode="popLayout">
          {filteredModels.map((model, index) => {
            const TaskIcon = TASK_ICONS[model.task];
            const downloaded = isDownloaded(model.id);
            const compatible = isCompatible(model);
            const isDownloading = downloading[model.id];
            const progress = downloadProgress[model.id] || 0;

            return (
              <motion.div
                key={model.id}
                className={`model-card ${!compatible ? 'incompatible' : ''} ${downloaded ? 'downloaded' : ''}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                layout
              >
                {/* Badge */}
                {model.badge && (
                  <span className="model-badge">{model.badge}</span>
                )}

                {/* Header */}
                <div className="model-header">
                  <div className="model-icon">
                    <TaskIcon size={20} />
                  </div>
                  <div className="model-info">
                    <h3 className="model-name">{model.name}</h3>
                    <span className="model-params mono">{model.params} params</span>
                  </div>
                </div>

                {/* Description */}
                <p className="model-description">{model.description}</p>

                {/* Specs */}
                <div className="model-specs">
                  <div className="spec">
                    <HardDrive size={12} />
                    <span className="mono">{model.size}{model.sizeUnit}</span>
                  </div>
                  <div className="spec">
                    <Cpu size={12} />
                    <span className="mono">{model.minRam}GB+ RAM</span>
                  </div>
                  <div className="spec">
                    <span className="task-badge">{TASK_LABELS[model.task]}</span>
                  </div>
                </div>

                {/* Compatibility warning */}
                {!compatible && (
                  <div className="compatibility-warning">
                    <WifiOff size={12} />
                    <span>Requires {model.minRam}GB RAM</span>
                  </div>
                )}

                {/* Action */}
                <div className="model-action">
                  {downloaded ? (
                    <button className="btn-downloaded" disabled>
                      <Check size={16} />
                      Downloaded
                    </button>
                  ) : isDownloading ? (
                    <div className="download-progress">
                      <div className="progress-bar">
                        <motion.div 
                          className="progress-fill"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="progress-text mono">{progress}%</span>
                    </div>
                  ) : (
                    <button 
                      className="btn-download"
                      onClick={() => handleDownload(model)}
                      disabled={!compatible}
                    >
                      <Download size={16} />
                      {compatible ? 'Download' : 'Not compatible'}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="zoo-footer">
        <span className="footer-text">
          {filteredModels.length} models available
          {showOnlyCompatible && ` • Showing compatible only`}
        </span>
      </div>
    </motion.div>
  );
}

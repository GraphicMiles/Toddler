import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, X, Check, WifiOff, HardDrive,
  Cpu, Sparkles, Code, MessageSquare, Smartphone
} from 'lucide-react';
import {
  formatMemoryCapacity,
  formatModelSize,
  formatStorageCapacity,
  getModelSizeBytes,
  ramGigabytesForCompatibility,
} from '../utils/deviceCapacity';
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

function heatLevel(model) {
  if (model.size < 500) return 1;
  if (model.size < 1500) return 2;
  return 3;
}

function DeviceMetric({ icon: Icon, label, value, detail }) {
  return (
    <div className="device-metric">
      <span className="device-metric-icon" aria-hidden="true"><Icon size={16} /></span>
      <div className="device-metric-copy">
        <span className="device-metric-label">{label}</span>
        <strong className="device-metric-value mono">{value}</strong>
        <span className="device-metric-detail mono">{detail}</span>
      </div>
    </div>
  );
}

function HeatMeter({ level }) {
  return (
    <div className="heat-meter" title="Speed versus quality" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span key={i} className={`heat-dot ${i < level ? 'lit' : ''}`} />
      ))}
    </div>
  );
}

export default function ModelZoo({
  downloadedModels = [],
  onDownload,
  deviceCapability = { ram: 4 },
  onClose
}) {
  const [filter, setFilter] = useState('all');
  const [showOnlyCompatible, setShowOnlyCompatible] = useState(true);
  const [downloading, setDownloading] = useState({});
  const [downloadProgress, setDownloadProgress] = useState({});

  const ram = ramGigabytesForCompatibility(
    deviceCapability.ramBytes,
    deviceCapability.ram || 4,
  );
  const usedStorageBytes = downloadedModels.reduce(
    (sum, model) => sum + getModelSizeBytes(model),
    0,
  );
  const memoryValue = deviceCapability.ramBytes
    ? formatMemoryCapacity(deviceCapability.ramBytes)
    : `${ram} GB estimated`;
  const memoryDetail = deviceCapability.availableRamBytes
    ? `${formatMemoryCapacity(deviceCapability.availableRamBytes)} available`
    : 'Device memory';
  const storageLabel = deviceCapability.storageScope === 'browser' ? 'Browser quota' : 'Storage';
  const storageValue = formatStorageCapacity(deviceCapability.storageBytes);
  const storageDetail = deviceCapability.storageBytes
    ? deviceCapability.availableStorageBytes
      ? `${formatModelSize(usedStorageBytes)} models · ${formatStorageCapacity(deviceCapability.availableStorageBytes)} free`
      : `${formatModelSize(usedStorageBytes)} used by models`
    : `${formatModelSize(usedStorageBytes)} used by models`;

  // Filter models based on device and category
  const filteredModels = MODEL_CATALOG.filter(model => {
    const freeStorage = deviceCapability.availableStorageBytes;
    const hasStorage = !freeStorage || getModelSizeBytes(model) <= freeStorage;
    const isCompatible = model.minRam <= ram && hasStorage;
    const matchesFilter = filter === 'all' || model.task === filter;

    if (showOnlyCompatible && !isCompatible) return false;
    if (!matchesFilter) return false;
    
    return true;
  });

  const handleDownload = async (model) => {
    setDownloading(prev => ({ ...prev, [model.id]: true }));
    setDownloadProgress(prev => ({ ...prev, [model.id]: 0 }));
    await onDownload?.(model, (progress) => setDownloadProgress(prev => ({ ...prev, [model.id]: progress.progress ?? 0 })));
    setDownloading(prev => { const next = { ...prev }; delete next[model.id]; return next; });
    setDownloadProgress(prev => { const next = { ...prev }; delete next[model.id]; return next; });
  };

  const isDownloaded = (modelId) => downloadedModels.some(d => d.id === modelId);
  const isCompatible = (model) => model.minRam <= ram && (!deviceCapability.availableStorageBytes || getModelSizeBytes(model) <= deviceCapability.availableStorageBytes);

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

      {/* Compact live device summary */}
      <section className="device-summary" aria-label="Device capacity">
        <div className="device-summary-head">
          <div className="device-summary-title">
            <Smartphone size={15} aria-hidden="true" />
            <span>Device</span>
          </div>
          <span className="device-summary-status">Live capacity</span>
        </div>
        <div className="device-metrics">
          <DeviceMetric
            icon={Cpu}
            label="RAM"
            value={memoryValue}
            detail={memoryDetail}
          />
          <DeviceMetric
            icon={HardDrive}
            label={storageLabel}
            value={storageValue}
            detail={storageDetail}
          />
        </div>
      </section>

      <div className="compatible-controls">
        <label className="compatible-toggle">
          <input
            type="checkbox"
            checked={showOnlyCompatible}
            onChange={(e) => setShowOnlyCompatible(e.target.checked)}
          />
          <span>Show compatible only</span>
        </label>
        <span className="available-models" aria-live="polite">
          {filteredModels.length} models available
        </span>
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
                  <HeatMeter level={heatLevel(model)} />
                </div>

                {/* Compatibility warning */}
                {!compatible && (
                  <div className="compatibility-warning">
                    <WifiOff size={12} />
                    <span>{model.minRam > ram ? `Requires ${model.minRam}GB RAM` : 'Not enough device storage'}</span>
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
    </motion.div>
  );
}

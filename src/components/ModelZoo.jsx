import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, X, Check, WifiOff, HardDrive, Cpu, MessageSquare,
  Smartphone, Pause, Play, Ban
} from 'lucide-react';
import {
  formatMemoryCapacity, formatModelSize, formatStorageCapacity,
  getModelSizeBytes, ramGigabytesForCompatibility,
} from '../utils/deviceCapacity';
import './ModelZoo.css';

const MODEL_CATALOG = [
  {
    id: 'smollm2-360m-q3', name: 'SmolLM2 360M Q3', family: 'smollm2', params: '360M',
    size: 235, sizeUnit: 'MB', minRam: 2, task: 'chat',
    description: 'Small offline model for compatible Android devices.', badge: 'Offline',
    runsOn: ['mobile'], quantizations: ['Q3_K_M'], license: 'Apache-2.0',
    ollamaName: 'smollm2:360m',
    file: 'SmolLM-360M-Q3_K_M.gguf',
    downloadUrl: 'https://huggingface.co/tensorblock/SmolLM-360M-GGUF/resolve/main/SmolLM-360M-Q3_K_M.gguf?download=true',
  },
  {
    id: 'smollm2-135m-q3', name: 'SmolLM2 135M Q3', family: 'smollm2', params: '135M',
    size: 94, sizeUnit: 'MB', minRam: 1.5, task: 'chat',
    description: 'Tiny offline test model. Fastest download for compatible Android devices.', badge: 'Tiny',
    runsOn: ['mobile'], quantizations: ['Q3_K_M'], license: 'Apache-2.0',
    ollamaName: 'smollm2:135m',
    file: 'SmolLM-135M-Q3_K_M.gguf',
    downloadUrl: 'https://huggingface.co/tensorblock/SmolLM-135M-GGUF/resolve/main/SmolLM-135M-Q3_K_M.gguf?download=true',
  },
  {
    id: 'smollm-360m', name: 'SmolLM2 360M', family: 'smollm2', params: '360M',
    size: 235, sizeUnit: 'MB', minRam: 2, task: 'chat',
    description: 'Lightweight chat model. Great for quick conversations on modest hardware.',
    badge: 'Fast', runsOn: ['web', 'mobile'], quantizations: ['Q4_K_M'], license: 'Apache-2.0',
    ollamaName: 'smollm2:360m',
  },
  {
    id: 'smollm-1.7b', name: 'SmolLM2 1.7B', family: 'smollm2', params: '1.7B',
    size: 1000, sizeUnit: 'MB', minRam: 3, task: 'chat',
    description: 'Balanced quality and speed. Good for general coding chat.',
    runsOn: ['web', 'mobile'], quantizations: ['Q4_K_M'], license: 'Apache-2.0',
    ollamaName: 'smollm2:1.7b',
  },
  {
    id: 'llama-3.2-1b', name: 'Llama 3.2 1B', family: 'llama', params: '1B',
    size: 700, sizeUnit: 'MB', minRam: 2, task: 'chat',
    description: "Meta's compact model. Strong reasoning for its size.",
    runsOn: ['web', 'mobile'], quantizations: ['Q4_K_M'], license: 'Llama 3.2',
    ollamaName: 'llama3.2:1b',
  },
  {
    id: 'qwen-0.5b', name: 'Qwen 2.5 0.5B', family: 'qwen', params: '0.5B',
    size: 380, sizeUnit: 'MB', minRam: 1.5, task: 'chat',
    description: 'Tiny multilingual model by Alibaba. Fast inference.',
    badge: 'Tiny', runsOn: ['web', 'mobile'], quantizations: ['Q4_K_M'], license: 'Apache-2.0',
    ollamaName: 'qwen2.5:0.5b',
  },
  {
    id: 'phi-3-mini', name: 'Phi-3 Mini', family: 'phi', params: '3.8B',
    size: 2200, sizeUnit: 'MB', minRam: 4, task: 'chat',
    description: "Microsoft's small-but-mighty model. Excellent reasoning.",
    runsOn: ['web'], quantizations: ['Q4_K_M'], license: 'MIT',
    ollamaName: 'phi3:mini',
  },
  {
    id: 'codellama-3b', name: 'Code Llama 3B', family: 'codellama', params: '3B',
    size: 1800, sizeUnit: 'MB', minRam: 4, task: 'chat',
    description: "Meta's code-specialized model. Good for code generation.",
    runsOn: ['web'], quantizations: ['Q4_K_M'], license: 'Llama 2',
    ollamaName: 'codellama:3b',
  },
  {
    id: 'qwen-1.5b-code', name: 'Qwen 2.5 Coder 1.5B', family: 'qwen', params: '1.5B',
    size: 900, sizeUnit: 'MB', minRam: 3, task: 'chat',
    description: 'Code-focused variant of Qwen. Good at code tasks.',
    runsOn: ['web', 'mobile'], quantizations: ['Q4_K_M'], license: 'Apache-2.0',
    ollamaName: 'qwen2.5-coder:1.5b',
  },
  {
    id: 'deepseek-1.3b', name: 'DeepSeek Coder 1.3B', family: 'deepseek', params: '1.3B',
    size: 800, sizeUnit: 'MB', minRam: 2.5, task: 'chat',
    description: 'Compact code model by DeepSeek. Strong at code completion.',
    runsOn: ['web', 'mobile'], quantizations: ['Q4_K_M'], license: 'DeepSeek',
    ollamaName: 'deepseek-coder:1.3b',
  },
];

const TASK_ICONS = { chat: MessageSquare };
const TASK_LABELS = { chat: 'Chat' };

function heatLevel(model) {
  if (model.size < 500) return 1;
  if (model.size < 1500) return 2;
  return 3;
}

function HeatMeter({ level }) {
  const labels = ['Fast', 'Balanced', 'Heavy'];
  return (
    <div className="heat-meter" title={`Speed: ${labels[level - 1] || 'Unknown'}`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={`heat-dot ${i < level ? 'lit' : ''}`} />
      ))}
      <span className="heat-label">{labels[level - 1] || ''}</span>
    </div>
  );
}

function DeviceMetric({ icon: Icon, label, value, detail }) {
  return (
    <div className="device-metric">
      <span className="device-metric-icon"><Icon size={16} /></span>
      <div className="device-metric-copy">
        <span className="device-metric-label">{label}</span>
        <strong className="device-metric-value mono">{value}</strong>
        <span className="device-metric-detail mono">{detail}</span>
      </div>
    </div>
  );
}

export default function ModelZoo({
  downloadedModels = [],
  downloads = {},
  onDownload,
  onPause,
  onCancel,
  onUseModel,
  deviceCapability = { ram: 4 },
  ollamaConnected = false,
  isNative = false,
  onClose,
}) {
  const [filter, setFilter] = useState('all');
  const [showOnlyCompatible, setShowOnlyCompatible] = useState(true);

  // Derive download state from the app-level downloads map (persists across tab switches)
  const activeDownloadId = Object.keys(downloads).find(id =>
    downloads[id]?.status === 'downloading' || downloads[id]?.status === 'paused'
  ) || null;
  const progress = activeDownloadId ? (downloads[activeDownloadId]?.progress ?? 0) : 0;
  const paused = activeDownloadId ? downloads[activeDownloadId]?.status === 'paused' : false;
  // Show error for any failed download that isn't currently active
  const failedEntry = Object.entries(downloads).find(([, v]) => v?.status === 'failed');
  const error = failedEntry ? (failedEntry[1]?.error || 'Download failed') : null;
  const failedModelId = failedEntry ? failedEntry[0] : null;

  const ram = ramGigabytesForCompatibility(deviceCapability.ramBytes, deviceCapability.ram || 4);
  const usedStorageBytes = downloadedModels.reduce((sum, m) => sum + getModelSizeBytes(m), 0);
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

  const filteredModels = MODEL_CATALOG.filter((model) => {
    const freeStorage = deviceCapability.availableStorageBytes;
    const hasStorage = !freeStorage || getModelSizeBytes(model) <= freeStorage;
    const isCompatible = model.minRam <= ram && hasStorage;
    const matchesFilter = filter === 'all' || model.task === filter;
    if (showOnlyCompatible && !isCompatible) return false;
    if (!matchesFilter) return false;
    return true;
  });

  const isDownloaded = (id) => downloadedModels.some((d) => d.id === id);
  const isCompatible = (model) =>
    model.minRam <= ram &&
    (!deviceCapability.availableStorageBytes || getModelSizeBytes(model) <= deviceCapability.availableStorageBytes);

  // ── Download handlers (state is in downloads prop, survives tab switches) ──

  const handleStart = async (model) => {
    if (activeDownloadId) return; // one at a time
    await onDownload?.(model);
  };

  const handlePause = (model) => {
    onPause?.(model);
  };

  const handleResume = (model) => {
    onDownload?.(model);
  };

  const handleCancel = (model) => {
    onCancel?.(model);
  };

  const handleRetry = (model) => {
    onDownload?.(model);
  };

  // ── Render a single model card ──

  const renderCard = (model, index) => {
    const TaskIcon = TASK_ICONS[model.task];
    const downloaded = isDownloaded(model.id);
    const compatible = isCompatible(model);
    const isActive = activeDownloadId === model.id;
    const otherActive = activeDownloadId && activeDownloadId !== model.id;

    return (
      <motion.div
        key={model.id}
        className={`model-card${!compatible ? ' incompatible' : ''}${downloaded ? ' downloaded' : ''}`}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04 }}
      >
        {model.badge && <span className="model-badge">{model.badge}</span>}

        <div className="model-header">
          <div className="model-icon">
            <TaskIcon size={20} />
          </div>
          <div className="model-info">
            <h3 className="model-name">{model.name}</h3>
            <span className="model-params mono">{model.params} params</span>
          </div>
        </div>

        <p className="model-description">{model.description}</p>

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

        {!compatible && (
          <div className="compatibility-warning">
            <WifiOff size={12} />
            <span>{model.minRam > ram ? `Requires ${model.minRam}GB RAM` : 'Not enough storage'}</span>
          </div>
        )}

        {/* ── Action area ── */}
        <div className="model-action">
          {downloaded ? (
            <button className="btn-use-model" onClick={() => {
              const full = downloadedModels.find(d => d.id === model.id);
              if (full) onUseModel?.(full);
            }}>
              <MessageSquare size={16} /> Chat with this model
            </button>
          ) : isActive ? (
            <div className="download-progress-wrap">
              <div className="download-progress">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <span className="progress-text mono">{Math.round(progress)}%</span>
              </div>
              <div className="download-actions">
                {paused ? (
                  <button className="btn-pause-download resume" onClick={() => handleResume(model)}>
                    <Play size={14} /> Resume
                  </button>
                ) : (
                  <button className="btn-pause-download" onClick={() => handlePause(model)}>
                    <Pause size={14} /> Pause
                  </button>
                )}
                <button className="btn-cancel-download" onClick={() => handleCancel(model)}>
                  <Ban size={14} /> Cancel
                </button>
              </div>
            </div>
          ) : error && failedModelId === model.id ? (
            <div className="download-error">
              <span className="error-text">{error}</span>
              <button className="btn-retry" onClick={() => handleRetry(model)}>
                Retry
              </button>
            </div>
          ) : (
            <button
              className="btn-download"
              onClick={() => handleStart(model)}
              disabled={!compatible || otherActive || (!isNative && !ollamaConnected)}
            >
              <Download size={16} />
              {!compatible
                ? 'Not compatible'
                : !isNative && !ollamaConnected
                  ? 'Ollama offline'
                  : otherActive
                    ? 'Download in progress…'
                    : 'Download'}
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <motion.div className="model-zoo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {/* Header */}
      <div className="zoo-header">
        <div className="zoo-title">
          <h2 className="display">Model Zoo</h2>
          <p className="zoo-subtitle">Choose a model that fits your device</p>
        </div>
        {onClose && (
          <button className="zoo-close" onClick={onClose}>
            <X size={20} />
          </button>
        )}
      </div>

      {/* Scrollable body */}
      <div className="zoo-body">
        {/* Setup guidance when runtime is offline on web */}
        {!isNative && !ollamaConnected && (
          <div className="zoo-setup-banner">
            <h3>Ollama is not connected</h3>
            <p>Models are downloaded and run through Ollama. Install and start it to continue:</p>
            <ol>
              <li>Install: <code>curl -fsSL https://ollama.com/install.sh | sh</code></li>
              <li>Start: <code>ollama serve</code></li>
              <li>Come back here and download a model</li>
            </ol>
            <p className="setup-note">On Android, no setup is needed — models download directly.</p>
          </div>
        )}

        {/* Device info toggle */}
        <div className="zoo-section">
          <details>
            <summary className="zoo-section-toggle">
              <span className="toggle-label">
                <span className="toggle-icon">+</span>
                Device info
              </span>
              <span className="toggle-meta">{storageLabel}</span>
            </summary>
            <div className="device-summary">
              <div className="device-summary-head">
                <div className="device-summary-title">
                  <Smartphone size={15} />
                  <span>Device</span>
                </div>
                <span className="device-summary-status">Live capacity</span>
              </div>
              <div className="device-metrics">
                <DeviceMetric icon={Cpu} label="RAM" value={memoryValue} detail={memoryDetail} />
                <DeviceMetric icon={HardDrive} label={storageLabel} value={storageValue} detail={storageDetail} />
              </div>
            </div>
          </details>
        </div>

        {/* Filters toggle */}
        <div className="zoo-section">
          <details open>
            <summary className="zoo-section-toggle">
              <span className="toggle-label">
                <span className="toggle-icon">−</span>
                Filters & compatibility
              </span>
              <span className="toggle-meta">{filteredModels.length} available</span>
            </summary>
            <div className="zoo-controls">
              <label className="compatible-toggle">
                <input
                  type="checkbox"
                  checked={showOnlyCompatible}
                  onChange={(e) => setShowOnlyCompatible(e.target.checked)}
                />
                <span>Compatible only</span>
              </label>
              <div className="zoo-filters">
                {['all', 'chat'].map((f) => (
                  <button
                    key={f}
                    className={`filter-tab ${filter === f ? 'active' : ''}`}
                    onClick={() => setFilter(f)}
                  >
                    {f === 'all' ? 'All' : TASK_LABELS[f]}
                  </button>
                ))}
              </div>
            </div>
          </details>
        </div>

        {/* Model cards */}
        <div className="model-grid">
          <AnimatePresence mode="popLayout">
            {filteredModels.map((model, i) => renderCard(model, i))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

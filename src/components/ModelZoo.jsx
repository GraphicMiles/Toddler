import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, X, WifiOff, HardDrive, Cpu, MessageSquare,
  Smartphone, Pause, Play, Ban, FolderOpen, ChevronRight, CheckCircle2, Circle
} from 'lucide-react';
import {
  assessModelCompatibility, formatMemoryCapacity, formatModelSize, formatStorageCapacity,
  getModelSizeBytes, ramGigabytesForCompatibility,
} from '../utils/deviceCapacity';
import { MODEL_CATALOG } from '../models/catalog.js';
import './ModelZoo.css';

const TASK_ICONS = { chat: MessageSquare, coding: Cpu, 'smoke-test': Smartphone };
const TASK_LABELS = { chat: 'Chat', coding: 'Coding', 'smoke-test': 'Smoke test' };

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
  onMountModel,
  deviceCapability = { ram: 4 },
  ollamaConnected = false,
  isNative = false,
  onClose,
  onChooseModelFolder,
  modelFolderSelected = false,
}) {
  const [filter, setFilter] = useState('all');
  const [showOnlyCompatible, setShowOnlyCompatible] = useState(false);

  // Derive download state from the app-level downloads map (persists across tab switches)
  const activeDownloadId = Object.keys(downloads).find(id =>
    downloads[id]?.status === 'downloading' || downloads[id]?.status === 'paused'
  ) || null;
  // Get per-model download info
  const getModelDownload = (id) => downloads[id] || null;

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

  const compatibilityFor = model => {
    if (!isNative) return { compatible: model.runsOn.includes('web'), reason: 'Available through the Ollama development preview.' };
    return assessModelCompatibility(model, deviceCapability);
  };
  const filteredModels = MODEL_CATALOG.filter(model => {
    const compatibility = compatibilityFor(model);
    const platformSupported = model.runsOn.includes(isNative ? 'mobile' : 'web');
    const matchesFilter = filter === 'all' || model.task === filter;
    return platformSupported && matchesFilter && (!showOnlyCompatible || compatibility.compatible);
  });

  const isDownloaded = id => downloadedModels.some(model => model.id === id);

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
    const TaskIcon = TASK_ICONS[model.task] || MessageSquare;
    const downloaded = isDownloaded(model.id);
    const compatibility = compatibilityFor(model);
    const compatible = compatibility.compatible;
    const dl = getModelDownload(model.id);
    const isDownloading = dl?.status === 'downloading';
    const isPaused = dl?.status === 'paused';
    const isActive = isDownloading || isPaused;
    const hasError = dl?.status === 'failed' || dl?.status === 'cancelled';
    const modelProgress = dl?.progress ?? 0;
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

        {(!compatible || compatibility.caution) && (
          <div className="compatibility-warning">
            <WifiOff size={12} />
            <span>{compatibility.reason}</span>
          </div>
        )}

        {/* ── Action area ── */}
        <div className="model-action">
          {downloaded ? (
              <div className="model-actions">
                <button 
                  className="btn-use-model" 
                  onClick={() => {
                    const full = downloadedModels.find(d => d.id === model.id);
                    if (full) onUseModel?.(full);
                  }}
                >
                  <MessageSquare size={16} /> Chat
                </button>
                
                {isNative && (
                  <button 
                    className="btn-mount-model"
                    onClick={async () => {
                      const full = downloadedModels.find(d => d.id === model.id);
                      if (full && onMountModel) {
                        await onMountModel(full);
                      }
                    }}
                  >
                    Mount (Local)
                  </button>
                )}
              </div>
          ) : isActive ? (
            <div className="download-progress-wrap">
              <div className="download-progress">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${modelProgress}%` }} />
                </div>
                <span className="progress-text mono">{Math.round(modelProgress)}%</span>
              </div>
              <div className="download-actions">
                {isPaused ? (
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
          ) : hasError ? (
            <div className="download-error">
              <span className="error-text">{dl?.error || 'Download cancelled'}</span>
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
                    ? 'Busy'
                    : 'Download'}
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <motion.div className="model-zoo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {/* Compact header: title left, close right - subtitle removed */}
      <div className="zoo-header">
        <h2 className="display">Model Zoo</h2>
        {isNative && (
          <button
            type="button"
            className={`zoo-folder-button ${modelFolderSelected ? 'selected' : ''}`}
            onClick={onChooseModelFolder}
          >
            <FolderOpen size={14} />
            <span>{modelFolderSelected ? 'Model folder selected' : 'Choose model folder'}</span>
            <ChevronRight size={14} className="zoo-folder-chevron" aria-hidden="true" />
          </button>
        )}
        {onClose && (
          <button className="zoo-close" onClick={onClose} aria-label="Close">
            <X size={18} />
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
            <p className="setup-note">On Android, no setup is needed - models download directly.</p>
          </div>
        )}

        {/* Inline chip bar + filters - single compact row */}
        <div className="zoo-toolbar">
          <div className="zoo-chips">
            <span className="zoo-chip" title={`${memoryValue} RAM · ${storageDetail}`}>
              <HardDrive size={12} /> {storageValue || '-'}
            </span>
            <span className="zoo-chip">{filteredModels.length} models</span>
          </div>
          <div className="zoo-toolbar-right">
            {/* Compatibility is a distinct filter type from the task pills — styled as a
                toggle chip with a divider, not a bare native checkbox mixed into the row */}
            <button
              type="button"
              role="checkbox"
              aria-checked={showOnlyCompatible}
              className={`compatible-chip ${showOnlyCompatible ? 'active' : ''}`}
              onClick={() => setShowOnlyCompatible(value => !value)}
            >
              {showOnlyCompatible ? <CheckCircle2 size={12} /> : <Circle size={12} />}
              <span>Compatible</span>
            </button>
            <div className="zoo-filter-divider" aria-hidden="true" />
            <div className="zoo-filters">
              {['all', 'chat', 'coding', 'smoke-test'].map((f) => (
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
        </div>

        {/* Device info - collapsible, tucked under toolbar */}
        <details className="zoo-device-details">
          <summary className="zoo-device-toggle">
            <Smartphone size={12} /> Device info
          </summary>
          <div className="device-metrics">
            <DeviceMetric icon={Cpu} label="RAM" value={memoryValue} detail={memoryDetail} />
            <DeviceMetric icon={HardDrive} label={storageLabel} value={storageValue} detail={storageDetail} />
          </div>
        </details>

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

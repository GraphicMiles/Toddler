import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, Trash2, Pause, MessageSquare,
  ChevronDown, Wifi, WifiOff, Database, RefreshCw,
  UserPlus, Settings
} from 'lucide-react';
import CustomProfileModal from './CustomProfileModal.jsx';
import { isRawModeEnabled, setRawMode } from '../models/customPromptProfiles.js';
import { CLOUD_PROVIDER_PRESETS, getCloudProviderPreset } from '../providers/cloudProviderStore.js';
import { formatModelSize, formatStorageCapacity, getModelSizeBytes } from '../utils/deviceCapacity';
import './MyCollection.css';

function CloudProviderPanel({ providers = [], onAdd, onRemove, onSelectModel }) {
  const [provider, setProvider] = useState('openai');
  const preset = getCloudProviderPreset(provider);
  const [label, setLabel] = useState(preset.label);
  const [baseUrl, setBaseUrl] = useState(preset.baseUrl);
  const [modelId, setModelId] = useState(preset.defaultModel);
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');

  const changeProvider = (nextProvider) => {
    const next = getCloudProviderPreset(nextProvider);
    setProvider(nextProvider);
    setLabel(next.label);
    setBaseUrl(next.baseUrl);
    setModelId(next.defaultModel);
    setError('');
  };

  const submit = (event) => {
    event.preventDefault();
    setError('');
    try {
      onAdd?.({ provider, label, baseUrl, modelId, apiKey });
      setApiKey('');
    } catch (err) {
      setError(err.message || 'Could not save cloud provider.');
    }
  };

  return (
    <div className="model-list">
      <div className="active-model-banner" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <span className="active-label">Cloud Provider</span>
          <p style={{ margin: '6px 0 0', color: '#9ca3af', fontSize: 13 }}>
            Add an OpenAI-compatible cloud endpoint. Cloud models use provider API quota; local GGUF models do not.
          </p>
        </div>
      </div>

      <form className="model-item-details" onSubmit={submit} style={{ height: 'auto', opacity: 1 }}>
        <div className="details-grid">
          <label className="detail">
            <span className="detail-label">Provider</span>
            <select value={provider} onChange={event => changeProvider(event.target.value)}>
              {CLOUD_PROVIDER_PRESETS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label className="detail">
            <span className="detail-label">Display name</span>
            <input value={label} onChange={event => setLabel(event.target.value)} placeholder="Grok" />
          </label>
          <label className="detail">
            <span className="detail-label">API key</span>
            <input type="password" value={apiKey} onChange={event => setApiKey(event.target.value)} placeholder="Provider API key" />
          </label>
          <label className="detail">
            <span className="detail-label">Base URL</span>
            <input value={baseUrl} onChange={event => setBaseUrl(event.target.value)} placeholder="https://api.example.com/v1" />
          </label>
          <label className="detail">
            <span className="detail-label">Model ID</span>
            <input value={modelId} onChange={event => setModelId(event.target.value)} placeholder="grok-4" />
          </label>
        </div>
        {error && <p className="setting-help" style={{ color: '#f87171' }}>{error}</p>}
        <div className="details-actions">
          <button className="btn-select" type="submit"><Check size={14} /> Save Provider</button>
        </div>
      </form>

      {providers.length === 0 ? (
        <div className="empty-collection">
          <div className="empty-icon"><Wifi size={32} /></div>
          <h3>No cloud providers connected</h3>
          <p>Add an API key above to make the cloud model available in chat.</p>
        </div>
      ) : providers.map(item => {
        const providerPreset = getCloudProviderPreset(item.provider);
        return (
          <div className="model-item" key={item.id}>
            <div className="model-item-main" onClick={() => onSelectModel?.(item)}>
              <div className="model-item-left">
                <div className="model-radio"><span className="radio-inactive" /></div>
                <div className="model-item-info">
                  <span className="model-item-name">{item.label}</span>
                  <span className="model-item-size mono">{providerPreset.label} · {item.modelId}</span>
                </div>
              </div>
              <div className="model-item-right">
                <span className="running-badge">Cloud</span>
              </div>
            </div>
            <div className="model-item-details" style={{ height: 'auto', opacity: 1 }}>
              <div className="details-grid">
                <div className="detail"><span className="detail-label">Base URL</span><span className="detail-value mono">{item.baseUrl}</span></div>
                <div className="detail"><span className="detail-label">Quota</span><span className="detail-value">Provider token/API limits apply</span></div>
              </div>
              <div className="details-actions">
                <button className="btn-select" onClick={() => onSelectModel?.(item)}><MessageSquare size={14} /> Select & Chat</button>
                <button className="btn-delete" onClick={() => onRemove?.(item.id)}><Trash2 size={14} /> Remove</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function MyCollection({ 
  models = [], 
  activeModel,
  onSelect,
  onDelete,
  onStop,
  isRunning = false,
  ollamaConnected = false,
  runtimeMode,
  runtimeInfo = null,
  benchmark = null,
  deviceCapability = {},
  onOpenZoo,
  onImportModel,
  onRefreshDevice,
  onMountModel,
  onUnmountModel,
  isNative = false,
  cloudProviders = [],
  onAddCloudProvider,
  onRemoveCloudProvider,
  onSelectCloudModel,
}) {
  const [providerTab, setProviderTab] = useState('local');
  const [expandedId, setExpandedId] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedModelForProfile, setSelectedModelForProfile] = useState(null);
  const [rawMode, setRawModeState] = useState(isRawModeEnabled());

  const usedStorageBytes = models.reduce(
    (total, model) => total + getModelSizeBytes(model),
    0,
  );
  const storageSummary = deviceCapability.storageBytes
    ? `Using ${formatModelSize(usedStorageBytes)} of ${formatStorageCapacity(deviceCapability.storageBytes)}`
    : `Using ${formatModelSize(usedStorageBytes)}`;

  const formatBytes = bytes => bytes ? formatModelSize(bytes) : 'Catalog estimate';

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString();
  };

  // Tapping the model row selects it + navigates to chat
  const handleTap = (model) => {
    onSelect?.(model);
  };

  // Chevron toggles details expand/collapse
  const toggleExpand = (e, modelId) => {
    e.stopPropagation();
    setExpandedId(prev => prev === modelId ? null : modelId);
  };

  return (
    <div className="my-collection">
      {/* Compact header: everything on one row */}
      <div className="collection-header">
        <div className="collection-title">
          <h2 className="display">My Collection</h2>
          <span className="model-count">{models.length}</span>
          {isNative && <button className="collection-import" onClick={onImportModel}>Import GGUF</button>}
          
          {/* Raw Mode Toggle */}
          <button 
            className={`raw-mode-toggle ${rawMode ? 'active' : ''}`}
            onClick={() => {
              const next = !rawMode;
              setRawMode(next);
              setRawModeState(next);
            }}
            title="Raw Mode: disables all system prompt injection"
          >
            <Settings size={13} /> {rawMode ? 'Raw' : 'Raw Mode'}
          </button>

          <button 
            className="collection-import"
            onClick={() => {
              setSelectedModelForProfile(null);
              setShowProfileModal(true);
            }}
          >
            <UserPlus size={14} /> Create Profile
          </button>

          <div className={`ollama-status ${ollamaConnected ? 'connected' : 'disconnected'}`}>
            {ollamaConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span>{runtimeMode || (ollamaConnected ? 'Ollama active' : 'Offline')}</span>
          </div>
        </div>
      </div>

      <div className="setting-row" style={{ margin: '12px 0', gap: 8 }}>
        <button className={providerTab === 'local' ? 'btn-select' : 'collection-import'} onClick={() => setProviderTab('local')}>
          Local Provider
        </button>
        <button className={providerTab === 'cloud' ? 'btn-select' : 'collection-import'} onClick={() => setProviderTab('cloud')}>
          Cloud Provider
        </button>
      </div>

      {providerTab === 'cloud' ? (
        <CloudProviderPanel
          providers={cloudProviders}
          onAdd={onAddCloudProvider}
          onRemove={onRemoveCloudProvider}
          onSelectModel={onSelectCloudModel}
        />
      ) : (
        <>

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
            <button 
              className="btn-chat"
              onClick={() => onSelect?.(activeModel)}
            >
              <MessageSquare size={14} />
              Chat
            </button>
            {isRunning ? (
              <button 
                className="btn-stop"
                onClick={() => onStop?.()}
              >
                <Pause size={14} />
                Stop
              </button>
            ) : null}
          </div>
        </motion.div>
      )}

      {isNative && benchmark && benchmark.modelId === activeModel?.id && (
        <section className="active-model-banner" aria-label="Last on-device benchmark">
          <div className="active-model-info">
            <Database size={18} />
            <div>
              <span className="active-label">Last benchmark</span>
              <span className="active-name">{benchmark.tokensPerSecond?.toFixed(1) || '0.0'} tok/s</span>
            </div>
          </div>
          <div className="mono" style={{ fontSize: 11, lineHeight: 1.5, textAlign: 'right' }}>
            <div>Load {Math.round(benchmark.loadMs || 0)} ms{benchmark.loadReused ? ' (cached)' : ''}</div>
            <div>Prefill {benchmark.prefillTokensPerSecond?.toFixed(1) || '0.0'} tok/s</div>
            <div>{benchmark.contextTokens} ctx · {benchmark.threads} threads · {benchmark.abi || runtimeInfo?.abi || 'unknown'}</div>
          </div>
        </section>
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
                  {/* Main Row - tap to select & chat */}
                  <div 
                    className="model-item-main"
                    onClick={() => handleTap(model)}
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
                          {formatModelSize(getModelSizeBytes(model))}
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
                      <button
                        className="expand-toggle"
                        onClick={(e) => toggleExpand(e, model.id)}
                        aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                      >
                        <ChevronDown 
                          size={16} 
                          className={`expand-icon ${isExpanded ? 'expanded' : ''}`}
                        />
                      </button>
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
                            <span className="detail-label">Disk usage</span>
                            <span className="detail-value mono">{formatBytes(model.downloadedBytes || getModelSizeBytes(model))}</span>
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
                            <span className="detail-label">Quantization</span>
                            <span className="detail-value mono">{model.quantizations?.join(', ') || 'Unknown'}</span>
                          </div>
                          <div className="detail">
                            <span className="detail-label">License</span>
                            <span className="detail-value">{model.license || 'Unknown'}</span>
                          </div>
                          <div className="detail">
                            <span className="detail-label">Source</span>
                            <span className="detail-value mono">{model.source || (model.sourceUri ? 'Device import' : 'Unknown')}</span>
                          </div>
                          <div className="detail">
                            <span className="detail-label">Revision</span>
                            <span className="detail-value mono">{model.revision?.slice(0, 12) || 'User supplied'}</span>
                          </div>
                          <div className="detail">
                            <span className="detail-label">Integrity</span>
                            <span className="detail-value">{model.integrity || (model.verified ? 'publisher-verified' : 'unverified')}</span>
                          </div>
                          <div className="detail">
                            <span className="detail-label">SHA-256</span>
                            <span className="detail-value mono" title={model.sha256 || ''}>{model.sha256 ? `${model.sha256.slice(0, 12)}…` : 'Unavailable'}</span>
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
                              Select & Chat
                            </button>
                          )}

                          {/* Load/unload direct on-device model */}
                          {isNative && (
                            isActive ? (
                              <button 
                                className="btn-unmount"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (onUnmountModel) await onUnmountModel(model);
                                }}
                              >
                                Unmount
                              </button>
                            ) : (
                              <button 
                                className="btn-mount"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (onMountModel) await onMountModel(model);
                                }}
                              >
                                Mount
                              </button>
                            )
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

                          {/* Custom Profile Button */}
                          <button 
                            className="btn-custom-profile"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedModelForProfile(model);
                              setShowProfileModal(true);
                            }}
                            title="Create custom prompt profile for this model"
                          >
                            <UserPlus size={13} /> Profile
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
        <span className="storage-info mono">{storageSummary}</span>
        <button type="button" className="refresh-storage" onClick={() => onRefreshDevice?.()} aria-label="Refresh device storage"><RefreshCw size={14} /> Refresh</button>
      </div>

        </>
      )}

      {/* Custom Profile Modal */}
      <CustomProfileModal
        isOpen={showProfileModal}
        onClose={() => {
          setShowProfileModal(false);
          setSelectedModelForProfile(null);
        }}
        model={selectedModelForProfile}
        onSave={(profile) => {
          // Optional: show success toast or refresh list
          console.log('Custom profile saved:', profile.name);
        }}
      />
    </div>
  );
}

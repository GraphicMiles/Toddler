import { motion, AnimatePresence } from 'framer-motion';
import { FolderOpen, Settings, Wifi, WifiOff } from 'lucide-react';
import './Layout.css';

const MODEL_OPTIONS = [
  { id: 'llama3.1', name: 'llama3.1', type: 'local' },
  { id: 'codellama', name: 'codellama', type: 'local' },
  { id: 'qwen2.5', name: 'qwen2.5', type: 'local' },
];

export default function Layout({ 
  children, 
  workspace = 'No workspace',
  model = 'llama3.1',
  status = 'idle',
  onToggleFilePanel,
  filePanelOpen,
  onWorkspaceChange,
  onModelChange 
}) {
  const getStatusClass = () => {
    switch (status) {
      case 'busy': return 'busy';
      case 'off': return 'off';
      default: return '';
    }
  };

  return (
    <div className="layout-root">
      {/* Top Bar */}
      <header className="topbar">
        <div className="topbar-left">
          <motion.button
            className={`icon-btn ${filePanelOpen ? 'active' : ''}`}
            onClick={onToggleFilePanel}
            aria-label="Browse workspace files"
            aria-expanded={filePanelOpen}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FolderOpen size={15} />
          </motion.button>
          
          <div className="brand display">
            <motion.span 
              className={`brand-dot ${getStatusClass()}`}
              animate={status === 'busy' ? { scale: [1, 1.2, 1] } : {}}
              transition={{ repeat: Infinity, duration: 1 }}
            />
            ForgeAI
          </div>
        </div>

        <div className="topbar-center">
          <select 
            className="workspace-select mono"
            value={workspace}
            onChange={(e) => onWorkspaceChange?.(e.target.value)}
          >
            <option value="no-workspace">No workspace</option>
            <option value="forgeai-mvp">forgeai-mvp</option>
            <option value="my-project">my-project</option>
          </select>
        </div>

        <div className="topbar-right">
          <div className="meta mono">
            <span className="workspace-label">{workspace}</span>
            <span className="meta-sep">·</span>
            <span className="model-label">{model}</span>
          </div>

          <motion.button
            className="icon-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Settings size={15} />
          </motion.button>
        </div>
      </header>

      {/* Main Content */}
      <main className="layout-main">
        <AnimatePresence mode="wait">
          {children}
        </AnimatePresence>
      </main>
    </div>
  );
}

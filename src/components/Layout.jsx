import { motion } from 'framer-motion';
import { FolderOpen, MessageSquare, Database, Download, Settings } from 'lucide-react';
import './Layout.css';

const SCREENS = {
  CHAT: 'chat',
  ZOO: 'zoo',
  COLLECTION: 'collection',
};

export default function Layout({ 
  children, 
  workspace = 'No workspace',
  model = 'No model',
  status = 'idle',
  onToggleFilePanel,
  filePanelOpen,
  onScreenChange,
  currentScreen = SCREENS.CHAT,
  modelCount = 0,
}) {
  const getStatusClass = () => {
    switch (status) {
      case 'busy': return 'busy';
      case 'off': return 'off';
      default: return '';
    }
  };

  const navItems = [
    { id: SCREENS.CHAT, label: 'Chat', icon: MessageSquare },
    { id: SCREENS.ZOO, label: 'Model Zoo', icon: Download },
    { id: SCREENS.COLLECTION, label: 'My Collection', icon: Database, badge: modelCount },
  ];

  return (
    <div className="layout-root">
      {/* Top Bar */}
      <header className="topbar">
        <div className="topbar-left">
          <motion.button
            className={`icon-btn ${filePanelOpen ? 'active' : ''}`}
            onClick={onToggleFilePanel}
            aria-label="Browse workspace files"
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

        {/* Navigation Tabs */}
        <nav className="topbar-nav">
          {navItems.map((item) => (
            <motion.button
              key={item.id}
              className={`nav-tab ${currentScreen === item.id ? 'active' : ''}`}
              onClick={() => onScreenChange?.(item.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <item.icon size={14} />
              <span>{item.label}</span>
              {item.badge > 0 && (
                <span className="nav-badge">{item.badge}</span>
              )}
            </motion.button>
          ))}
        </nav>

        <div className="topbar-right">
          <div className="meta mono">
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
        {children}
      </main>
    </div>
  );
}

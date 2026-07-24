import { MessageSquare, Boxes, Database, UserRound } from 'lucide-react';
import './Layout.css';

export const SCREENS = {
  CHAT: 'chat',
  ZOO: 'zoo',
  COLLECTION: 'collection',
  WORKSPACE: 'workspace',
  SETTINGS: 'settings',
};

const TABS = [
  { id: SCREENS.CHAT, label: 'Chat', icon: MessageSquare },
  { id: SCREENS.ZOO, label: 'Model Zoo', icon: Boxes },
  { id: SCREENS.COLLECTION, label: 'Collection', icon: Database },
  { id: SCREENS.WORKSPACE, label: 'Workspace', icon: Boxes },
  { id: SCREENS.SETTINGS, label: 'User', icon: UserRound },
];

export default function Layout({
  children,
  model = 'No model',
  status = 'idle',
  ollamaConnected = false,
  modelCount = 0,
  currentScreen = SCREENS.CHAT,
  onScreenChange,
}) {
  const statusMeta =
    status === 'busy'
      ? { color: 'var(--warn)', label: 'Working' }
      : status === 'off'
        ? { color: 'var(--danger)', label: 'Offline' }
        : { color: 'var(--success)', label: ollamaConnected ? 'Ready' : 'Idle' };

  return (
    <div className="layout-root">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-text">
            <span className="brand-name display">ForgeAI</span>
            <span className="brand-sub mono">{model}</span>
          </span>
        </div>

        <div className="topbar-right">
          <div className="status-pill" title="Model status">
            <span className="status-dot" style={{ background: statusMeta.color }} />
            <span className="status-label mono">{statusMeta.label}</span>
          </div>
        </div>
      </header>

      <nav className="tabbar" aria-label="Primary">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = currentScreen === tab.id;
          const badge = tab.id === SCREENS.COLLECTION ? modelCount : 0;
          return (
            <button
              key={tab.id}
              type="button"
              className={`tab ${active ? 'active' : ''}`}
              onClick={() => onScreenChange?.(tab.id)}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
              <span className="tab-label">{tab.label}</span>
              {badge > 0 && <span className="tab-badge">{badge}</span>}
            </button>
          );
        })}
      </nav>

      <main className="layout-main">{children}</main>
    </div>
  );
}

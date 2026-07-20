import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { auth } from '../firebase'

const NAV = [
  { path: '/zoo', icon: '🔍', label: 'Model Zoo' },
  { path: '/models', icon: '🧠', label: 'My Models' },
  { path: '/marketplace', icon: '🏪', label: 'Marketplace' },
  { path: '/devices', icon: '📱', label: 'Devices' },
]

export default function Sidebar({ onClose }) {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path) => {
    if (path === '/zoo') return location.pathname.startsWith('/zoo')
    if (path === '/models') return location.pathname.startsWith('/models')
    return location.pathname === path
  }

  return (
    <aside style={{
      width: 240,
      background: 'var(--surface)',
      borderRight: '1px solid var(--line)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      height: '100vh',
      position: 'sticky',
      top: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid var(--line)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: 18,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          color: 'white',
          textDecoration: 'none',
        }} onClick={() => { navigate('/zoo'); onClose?.() }}>
          <span style={{
            width: 18, height: 18, border: '2px solid var(--lime)',
            display: 'inline-block', position: 'relative',
          }}>
            <span style={{ position:'absolute', top:-2, left:-2, width:5, height:5, borderTop:'2px solid var(--lime)', borderLeft:'2px solid var(--lime)' }} />
            <span style={{ position:'absolute', bottom:-2, right:-2, width:5, height:5, borderBottom:'2px solid var(--lime)', borderRight:'2px solid var(--lime)' }} />
          </span>
          TODDLER
        </span>
        {onClose && (
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:18 }}>✕</button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: 12, overflowY: 'auto' }}>
        {NAV.map(item => (
          <div
            key={item.path}
            onClick={() => { navigate(item.path); onClose?.() }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 4, cursor: 'pointer',
              marginBottom: 2, transition: 'all 0.15s',
              background: isActive(item.path) ? 'rgba(198,255,51,0.08)' : 'transparent',
              color: isActive(item.path) ? 'var(--lime)' : 'var(--text-dim)',
            }}
          >
            <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
            <span style={{ fontSize: 13 }}>{item.label}</span>
          </div>
        ))}
      </nav>

      {/* User */}
      <div style={{ padding: 12, borderTop: '1px solid var(--line)' }}>
        <div style={{
          fontSize: 12, color: 'var(--text-faint)',
          padding: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {auth.currentUser?.email || 'User'}
        </div>
        <button
          onClick={() => auth.signOut()}
          style={{
            width: '100%', padding: '8px', marginTop: 4,
            background: 'transparent', border: '1px solid var(--line)',
            color: 'var(--text-faint)', fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10, letterSpacing: 1, textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          Log out
        </button>
      </div>
    </aside>
  )
}

import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import LandingPage from './LandingPage'
import Auth from './Auth'
import Dashboard from './Dashboard'
import MobileDashboard from './MobileDashboard'
import MobileWrapper from './MobileWrapper'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { auth } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { Toaster } from 'react-hot-toast'

function DeepLinkHandler() {
  const navigate = useNavigate()
  React.useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const handler = ({ url }) => {
      try {
        const u = new URL(url)
        // toddler://login, toddler://signup, https://toddler.ai/login, etc.
        const path = u.host + u.pathname.replace(/\/+$/, '')
        if (path === 'login' || path === 'signup') navigate(`/${path}`)
        else if (path === 'dashboard' || path === '') navigate('/dashboard')
      } catch {}
    }
    CapApp.addListener('appUrlOpen', handler)
    return () => { try { CapApp.removeAllListeners() } catch {} }
  }, [navigate])
  return null
}

function App() {
  const [user, setUser] = React.useState(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    try {
      const unsubscribe = onAuthStateChanged(auth, (u) => {
        setUser(u)
        setLoading(false)
      }, () => setLoading(false))
      return () => unsubscribe()
    } catch {
      setLoading(false)
    }
  }, [])

  if (loading) return (
    <div style={{minHeight: '100vh', backgroundColor: '#14130F', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{width: '32px', height: '32px', border: '3px solid #C6FF33', borderTopColor: 'transparent', borderRadius: '50%'}} className="animate-spin"></div>
    </div>
  )

  return (
    <MobileWrapper>
      <Toaster 
        position={Capacitor.isNativePlatform() ? "top-center" : "bottom-right"}
        toastOptions={{
          style: { background: '#1D1B16', color: '#F2EFE6', border: '1px solid #38352B', borderRadius: '0', fontFamily: '"IBM Plex Mono", monospace', fontSize: '12px' }
        }}
      />
      <BrowserRouter>
        <DeepLinkHandler />
        <Routes>
          <Route path="/" element={Capacitor.isNativePlatform() ? (user ? <Navigate to="/dashboard" replace /> : <Auth mode="login" />) : <LandingPage />} />
          <Route path="/login" element={<Auth mode="login" />} />
          <Route path="/signup" element={<Auth mode="signup" />} />
          <Route path="/dashboard/*" element={user ? (Capacitor.isNativePlatform() ? <MobileDashboard /> : <Dashboard />) : <Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </MobileWrapper>
  )
}

export default App

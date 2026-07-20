import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './LandingPage'
import Auth from './Auth'
import Dashboard from './Dashboard'
import { auth } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { Capacitor } from '@capacitor/core'
import { Toaster } from 'react-hot-toast'

function App() {
  const [user, setUser] = React.useState(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => { setUser(u); setLoading(false) }, () => setLoading(false))
    return () => unsub()
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#14130F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, border: '3px solid #38352B', borderTopColor: '#C6FF33', borderRadius: '50%' }} className="animate-spin" />
    </div>
  )

  return (
    <>
      <Toaster position={Capacitor.isNativePlatform() ? 'top-center' : 'bottom-right'}
        toastOptions={{ style: { background: '#1D1B16', color: '#F2EFE6', border: '1px solid #38352B', borderRadius: 0, fontFamily: '"IBM Plex Mono", monospace', fontSize: 12 } }} />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <LandingPage />} />
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Auth mode="login" />} />
          <Route path="/signup" element={user ? <Navigate to="/dashboard" /> : <Auth mode="signup" />} />
          <Route path="/dashboard/*" element={user ? <Dashboard /> : <Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App

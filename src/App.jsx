import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './LandingPage'
import Auth from './Auth'
import Dashboard from './Dashboard'
import MobileDashboard from './MobileDashboard'
import { Capacitor } from '@capacitor/core'
import { auth } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { Toaster } from 'react-hot-toast'

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
    } catch (e) {
      setLoading(false)
    }
  }, [])

  if (loading) return (
    <div style={{minHeight: '100vh', backgroundColor: '#14130F', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{width: '32px', height: '32px', border: '3px solid #C6FF33', borderTopColor: 'transparent', borderRadius: '50%'}} className="animate-spin"></div>
    </div>
  )

  return (
    <>
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: { background: '#1D1B16', color: '#F2EFE6', border: '1px solid #38352B', borderRadius: '0', fontFamily: '"IBM Plex Mono", monospace', fontSize: '12px' }
        }}
      />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={Capacitor.isNativePlatform() ? (user ? <Navigate to="/dashboard" replace /> : <Auth mode="login" />) : <LandingPage />} />
          <Route path="/login" element={<Auth mode="login" />} />
          <Route path="/signup" element={<Auth mode="signup" />} />
          <Route path="/dashboard/*" element={user ? (Capacitor.isNativePlatform() ? <MobileDashboard /> : <Dashboard />) : <Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App

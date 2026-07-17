import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './LandingPage'
import Auth from './Auth'
import Dashboard from './Dashboard'
import { auth } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { Toaster } from 'react-hot-toast'

import MobileWrapper from './MobileWrapper'

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
    <div style={{minHeight: '100vh', backgroundColor: '#0A0812', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{width: '32px', height: '32px', border: '4px solid #C6FF33', borderTopColor: 'transparent', borderRadius: '50%'}} className="animate-spin"></div>
    </div>
  )

  return (
    <MobileWrapper>
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: { background: '#141020', color: '#F3F1F7', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }
        }}
      />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Auth mode="login" />} />
          <Route path="/signup" element={<Auth mode="signup" />} />
          <Route path="/dashboard/*" element={user ? <Dashboard /> : <Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </MobileWrapper>
  )
}

export default App

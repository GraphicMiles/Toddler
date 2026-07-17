import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './LandingPage'
import Auth from './Auth'
import Dashboard from './Dashboard'
import { auth } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { Toaster } from 'react-hot-toast'

function App() {
  const [user, setUser] = React.useState(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    try {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user)
        setLoading(false)
      }, (e) => {
        setLoading(false)
      })
      return () => unsubscribe()
    } catch (e) {
      setLoading(false)
    }
  }, [])

  if (loading) return (
    <div style={{minHeight: '100vh', backgroundColor: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif'}}>
      <div style={{width: '32px', height: '32px', border: '4px solid #1B4332', borderTopColor: 'transparent', borderRadius: '50%'}} className="animate-spin"></div>
    </div>
  )

  return (
    <>
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#111111',
            color: '#F5F5F3',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '600',
            padding: '16px 24px'
          },
          success: { iconTheme: { primary: '#1B4332', secondary: '#F5F5F3' } }
        }}
      />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Auth mode="login" />} />
          <Route path="/signup" element={<Auth mode="signup" />} />
          <Route 
            path="/dashboard/*" 
            element={user ? <Dashboard /> : <Navigate to="/login" />} 
          />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App

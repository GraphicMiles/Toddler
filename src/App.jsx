import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './LandingPage'
import Auth from './Auth'
import Dashboard from './Dashboard'
import { auth } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { Toaster } from 'react-hot-toast'
import { Skeleton } from './components/UI'

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
    <div className="min-h-screen bg-[var(--color-bg-base)] flex flex-col items-center justify-center p-[var(--spacing-6)]">
      <div className="space-y-[var(--spacing-6)] flex flex-col items-center">
        <div className="w-12 h-12 bg-[var(--color-text-primary)] rounded-xl flex items-center justify-center text-[var(--color-text-inverse)] font-display font-bold text-xl animate-bounce">T</div>
        <div className="flex items-center gap-[var(--spacing-3)] text-[var(--color-text-muted)] font-bold uppercase tracking-[0.2em] text-[11px]">
          <div className="w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
          Harmonizing Engine...
        </div>
      </div>
    </div>
  )

  return (
    <>
      <Toaster 
        position="bottom-right"
        toastOptions={{
          className: 'font-sans font-bold text-[13px] uppercase tracking-widest',
          style: {
            background: 'var(--color-bg-dark)',
            color: 'var(--color-text-inverse)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--spacing-4) var(--spacing-6)',
            border: '1px solid rgba(255,255,255,0.1)'
          },
          success: {
            iconTheme: {
              primary: 'var(--color-accent)',
              secondary: 'var(--color-text-inverse)',
            },
          },
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

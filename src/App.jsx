import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './LandingPage'
import Auth from './Auth'
import Dashboard from './Dashboard'
import { auth } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'

function App() {
  const [user, setUser] = React.useState(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    // If firebase initialization fails or is in progress, this prevents crashing
    try {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user)
        setLoading(false)
      }, (error) => {
        console.error("Auth error:", error);
        setLoading(false);
      })
      return () => unsubscribe()
    } catch (e) {
      console.error("Firebase Auth not available:", e);
      setLoading(false);
    }
  }, [])

  if (loading) return <div style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif'}}>Loading...</div>

  return (
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
  )
}

export default App

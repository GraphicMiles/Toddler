import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import LandingPage from './LandingPage'
import Auth from './Auth'
import Zoo from './Zoo'
import ModelDetail from './ModelDetail'
import TrainWizard from './TrainWizard'
import MyModels from './MyModels'
import ModelWorkspace from './ModelWorkspace'
import MobileApp from './MobileApp'
import MobileWrapper from './MobileWrapper'
import { Capacitor } from '@capacitor/core'

function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(() => {
    if (Capacitor.isNativePlatform()) return true
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 839px), (pointer: coarse) and (max-width: 1024px)').matches
  })
  React.useEffect(() => {
    if (Capacitor.isNativePlatform()) return
    const mq = window.matchMedia('(max-width: 839px), (pointer: coarse) and (max-width: 1024px)')
    const handler = e => setIsMobile(e.matches)
    mq.addEventListener?.('change', handler)
    handler(mq)
    return () => mq.removeEventListener?.('change', handler)
  }, [])
  return isMobile
}

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
        const path = u.host + u.pathname.replace(/\/+$/, '')
        if (path === 'login' || path === 'signup') navigate(`/${path}`)
        else if (path === 'zoo' || path === 'dashboard' || path === '') navigate('/zoo')
      } catch {}
    }
    CapApp.addListener('appUrlOpen', handler)
    return () => { try { CapApp.removeAllListeners() } catch {} }
  }, [navigate])
  return null
}

function App() {
  const isMobile = useIsMobile()
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

  // Native mobile → always use MobileApp
  if (Capacitor.isNativePlatform()) {
    return (
      <MobileWrapper>
        <Toaster 
          position="top-center"
          toastOptions={{
            style: { background: '#1D1B16', color: '#F2EFE6', border: '1px solid #38352B', borderRadius: '0', fontFamily: '"IBM Plex Mono", monospace', fontSize: '12px' }
          }}
        />
        <BrowserRouter>
          <DeepLinkHandler />
          <Routes>
            <Route path="/" element={user ? <MobileApp /> : <Auth mode="login" />} />
            <Route path="/login" element={<Auth mode="login" />} />
            <Route path="/signup" element={<Auth mode="signup" />} />
            <Route path="/zoo" element={user ? <MobileApp /> : <Navigate to="/login" />} />
            <Route path="/zoo/:modelId" element={user ? <MobileApp /> : <Navigate to="/login" />} />
            <Route path="/zoo/:modelId/train" element={user ? <MobileApp /> : <Navigate to="/login" />} />
            <Route path="/models" element={user ? <MobileApp /> : <Navigate to="/login" />} />
            <Route path="/models/:projectId" element={user ? <MobileApp /> : <Navigate to="/login" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </MobileWrapper>
    )
  }

  // Web → responsive (mobile web gets MobileApp, desktop gets Zoo layout)
  return (
    <MobileWrapper>
      <Toaster 
        position={isMobile ? "top-center" : "bottom-right"}
        toastOptions={{
          style: { background: '#1D1B16', color: '#F2EFE6', border: '1px solid #38352B', borderRadius: '0', fontFamily: '"IBM Plex Mono", monospace', fontSize: '12px' }
        }}
      />
      <BrowserRouter>
        <DeepLinkHandler />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Auth mode="login" />} />
          <Route path="/signup" element={<Auth mode="signup" />} />
          <Route path="/zoo" element={user ? (isMobile ? <MobileApp /> : <Zoo />) : <Navigate to="/login" />} />
          <Route path="/zoo/:modelId" element={user ? (isMobile ? <MobileApp /> : <ModelDetail />) : <Navigate to="/login" />} />
          <Route path="/zoo/:modelId/train" element={user ? (isMobile ? <MobileApp /> : <TrainWizard />) : <Navigate to="/login" />} />
          <Route path="/models" element={user ? (isMobile ? <MobileApp /> : <MyModels />) : <Navigate to="/login" />} />
          <Route path="/models/:projectId" element={user ? (isMobile ? <MobileApp /> : <ModelWorkspace />) : <Navigate to="/login" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </MobileWrapper>
  )
}

export default App

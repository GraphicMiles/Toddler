import React from 'react'

function App() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#FAFAF8',
      color: '#111111',
      textAlign: 'center',
      padding: '24px'
    }}>
      <h1 style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '16px' }}>Toddler is Restarting</h1>
      <p style={{ fontSize: '18px', color: '#6B6B68' }}>This is a base render to confirm the environment is working.</p>
      <div style={{ marginTop: '32px', padding: '12px 24px', backgroundColor: '#111111', color: 'white', borderRadius: '9999px', fontWeight: 'bold' }}>
        App Mounted Successfully
      </div>
    </div>
  )
}

export default App

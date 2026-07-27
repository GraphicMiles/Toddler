import { Component } from 'react';
import { recordError } from '../utils/errorLog.js';

export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { recordError(error, 'react-boundary'); console.error('ForgeAI UI error', error, info); }
  reset = () => { this.setState({ error: null }); };
  reload = () => { window.location.reload(); };
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#131418', color: '#f1efe9', fontFamily: 'system-ui, sans-serif', padding: 24 }}>
        <div style={{ maxWidth: 400, textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Something went wrong</h2>
          <p style={{ fontSize: 14, color: '#a4a3a0', lineHeight: 1.6, marginBottom: 24 }}>
            {this.state.error.message || 'The app encountered an unexpected error.'}
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button type="button" onClick={this.reset} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid rgba(241,239,233,0.16)', background: '#212226', color: '#f1efe9', fontSize: 13, cursor: 'pointer' }}>Try again</button>
            <button type="button" onClick={this.reload} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#c8f24d', color: '#12150a', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Reload app</button>
          </div>
        </div>
      </div>
    );
  }
}

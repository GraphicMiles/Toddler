import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('ForgeAI UI error', error, info); }
  reset = () => { this.setState({ error: null }); };
  render() {
    if (!this.state.error) return this.props.children;
    return <div className="screen-scroll"><div className="screen-pad error-state"><h2>ForgeAI needs a refresh</h2><p>{this.state.error.message || 'The app encountered an unexpected error.'}</p><button type="button" onClick={this.reset}>Try again</button></div></div>;
  }
}

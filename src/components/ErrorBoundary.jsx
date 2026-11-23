import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="hud-panel hud-corner-bracket"
          style={{
            position: 'absolute',
            top: 20,
            left: 20,
            zIndex: 1300,
            padding: '16px 20px',
            maxWidth: 420,
            background: 'rgba(5, 14, 24, 0.96)',
            border: '1px solid rgba(249, 115, 22, 0.5)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.8), 0 0 16px rgba(249, 115, 22, 0.2)',
            fontFamily: 'monospace',
            color: '#f8fafc'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <AlertTriangle size={18} color="#f97316" />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#f97316', letterSpacing: '0.08em' }}>
              TELEMETRY DISPLAY FAULT
            </span>
          </div>

          <p style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5, margin: '0 0 8px 0' }}>
            A parameter rendering fault occurred:
          </p>

          <pre style={{
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(249,115,22,0.3)',
            padding: '6px 8px',
            borderRadius: 3,
            fontSize: 10,
            color: '#fca5a5',
            overflowX: 'auto',
            marginBottom: 10,
            whiteSpace: 'pre-wrap'
          }}>
            {this.state.error?.message || String(this.state.error)}
          </pre>

          <button
            onClick={this.handleReset}
            style={{
              background: 'rgba(249, 115, 22, 0.2)',
              border: '1px solid #f97316',
              color: '#f97316',
              borderRadius: 3,
              padding: '6px 12px',
              fontFamily: 'monospace',
              fontSize: 10,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <RefreshCw size={12} />
            RESET TELEMETRY
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

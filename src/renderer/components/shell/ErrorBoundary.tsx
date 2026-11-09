import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, FolderOpen, X } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  filePath?: string;
  onClose?: () => void;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  private handleOpenExternally = () => {
    if (this.props.filePath && window.studyApi?.showInFolder) {
      window.studyApi.showInFolder(this.props.filePath);
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          textAlign: 'center',
          color: 'var(--text)',
          background: 'var(--bg-page)'
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#f87171',
            display: 'grid',
            placeItems: 'center',
            marginBottom: 16
          }}>
            <AlertTriangle size={24} />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            {this.props.fallbackTitle || "Couldn't display this document"}
          </h2>
          <p style={{ color: 'var(--text-dim)', fontSize: 13, maxWidth: 440, marginBottom: 20, lineHeight: 1.5 }}>
            {this.state.error?.message || "The file may be corrupted, password-protected, or in an unsupported format."}
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={this.handleReset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 6,
                background: 'var(--bg-hover)',
                color: 'var(--text)',
                fontSize: 13
              }}
            >
              <RefreshCw size={14} /> Try Again
            </button>
            {this.props.filePath && (
              <button
                onClick={this.handleOpenExternally}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 6,
                  background: 'var(--bg-hover)',
                  color: 'var(--text)',
                  fontSize: 13
                }}
              >
                <FolderOpen size={14} /> Show in Folder
              </button>
            )}
            {this.props.onClose && (
              <button
                onClick={this.props.onClose}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 6,
                  background: '#2c2c2e',
                  color: 'var(--text-faint)',
                  fontSize: 13
                }}
              >
                <X size={14} /> Close Tab
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}


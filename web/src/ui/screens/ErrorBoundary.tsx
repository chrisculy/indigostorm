import { Component, type ErrorInfo, type ReactNode } from 'react';
import { clearSave, rawSave } from '../../state/persistence.ts';
import { Logo } from '../art/index.ts';

interface Props {
  children: ReactNode;
  /** Discard only the episode in progress (keeps campaign and settings). */
  onResetEpisode: () => void;
}
interface State {
  error: Error | null;
  copied: 'idle' | 'ok' | 'failed';
}

/** Last-resort recovery screen: copy the raw save, then reset the episode or everything. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null, copied: 'idle' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.warn('Indigo Storm hit an error', error, info.componentStack);
  }

  private copy = async () => {
    try {
      await navigator.clipboard.writeText(rawSave() || '{}');
      this.setState({ copied: 'ok' });
    } catch {
      this.setState({ copied: 'failed' });
    }
  };

  override render() {
    const { error, copied } = this.state;
    if (!error) return this.props.children;
    return (
      <main className="error-screen" id="main">
        <Logo variant="mark" size="4em" />
        <h1>Something went wrong</h1>
        <p>The game hit an unexpected error. Your save is still in this browser.</p>
        <pre className="error-screen__msg">{error.message}</pre>
        <div className="error-screen__actions">
          <button type="button" className="btn" data-variant="secondary" data-size="md" onClick={this.copy}>
            <span className="btn__label">Copy save to clipboard</span>
          </button>
          <button
            type="button"
            className="btn"
            data-variant="primary"
            data-size="md"
            onClick={() => {
              this.props.onResetEpisode();
              this.setState({ error: null, copied: 'idle' });
            }}
          >
            <span className="btn__label">Discard the episode and continue</span>
          </button>
          <button
            type="button"
            className="btn"
            data-variant="danger"
            data-size="md"
            onClick={() => {
              clearSave();
              location.hash = '';
              location.reload();
            }}
          >
            <span className="btn__label">Reset all data</span>
          </button>
        </div>
        {copied === 'ok' && <p role="status">Save copied.</p>}
        {copied === 'failed' && <p role="status">Copy failed. Your browser blocked clipboard access.</p>}
      </main>
    );
  }
}

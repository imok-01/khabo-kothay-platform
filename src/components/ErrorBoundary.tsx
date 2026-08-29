import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ChefHat, RotateCcw, RefreshCw } from 'lucide-react';
import { Button } from './ui';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Khabo Kothay crashed:', error, info);
  }

  private reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return (
        <main className="section">
          <div className="section__inner">
            <div className="empty" role="alert">
              <span className="empty__icon" aria-hidden="true"><ChefHat size={36} /></span>
              <h3>Something on this page broke</h3>
              <p>Not your connection — ours. Reloading usually clears it, and nothing you saved has been lost.</p>
              <div className="empty__actions">
                <Button variant="primary" icon={RotateCcw} onClick={this.reset}>
                  Try again
                </Button>
                <Button variant="ghost" icon={RefreshCw} onClick={() => window.location.reload()}>
                  Reload page
                </Button>
              </div>
            </div>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

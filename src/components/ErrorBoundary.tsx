import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ChefHat } from 'lucide-react';

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
              <h3>Something went wrong</h3>
              <p>We dropped the curry. Try reloading the page — if it keeps happening, come back later.</p>
              <div className="empty__actions">
                <button type="button" className="btn btn--primary" onClick={this.reset}>
                  Try again
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => window.location.reload()}>
                  Reload page
                </button>
              </div>
            </div>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

import { Component, ErrorInfo, ReactNode } from 'preact/compat';
import { AlertTriangle, RefreshCcw } from 'lucide-preact';
import Button from './Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    // Optionnel : recharger la page si nécessaire ou juste remonter le composant
    window.location.reload(); 
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-paper animate-fade-in">
          <div className="p-4 bg-red-50 rounded-full mb-4 text-red-500">
            <AlertTriangle size={48} />
          </div>
          <h2 className="text-xl font-serif font-bold text-ink mb-2">Une erreur est survenue</h2>
          <p className="text-sm text-ink-light mb-6 max-w-xs mx-auto">
            Le vestiaire est un peu agité. L'entraîneur a trébuché sur une tactique.
          </p>
          <div className="bg-white p-4 rounded-lg border border-red-100 shadow-sm mb-6 max-w-full overflow-auto">
            <code className="text-xs text-red-800 font-mono block whitespace-pre-wrap">
              {this.state.error?.message || "Erreur inconnue"}
            </code>
          </div>
          <Button onClick={this.handleRetry} variant="primary" className="flex items-center gap-2">
            <RefreshCcw size={16} /> Recharger le jeu
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

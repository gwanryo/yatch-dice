import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Translation } from 'react-i18next';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) return this.props.fallback;
      return (
        <Translation>
          {(t) => (
            <div className="min-h-screen bg-gradient-to-br from-gray-950 via-emerald-950 to-gray-950 flex items-center justify-center">
              <div className="text-center space-y-4">
                <p className="text-white text-lg">{t('error.somethingWentWrong')}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-white"
                >
                  {t('error.reloadPage')}
                </button>
              </div>
            </div>
          )}
        </Translation>
      );
    }
    return this.props.children;
  }
}

import { Component, useEffect, useRef } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { LanguageProvider } from './i18n/LanguageContext';
import { ErpDataProvider } from './context/ErpDataContext';
import { ToastContainer } from './components/common/ToastContainer';
import { AppRoutes } from './routes/AppRoutes';

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected rendering error.',
    };
  }

  clearError = () => {
    if (this.state.hasError) {
      this.setState({ hasError: false, errorMessage: '' });
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#E7E9F0] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#FEFEFE] border border-[#535F80]/25 rounded-xl p-6 shadow-lg">
            <h1 className="text-base font-semibold text-[#051747]">
              Suvidh ERP — Session Reload Required
            </h1>
            <p className="text-xs text-[#535F80] mt-2 leading-relaxed">
              The interface encountered a state update ({this.state.errorMessage}). Retry or
              reload the page to resume your Suvidh ERP session.
            </p>
            <div className="mt-4 flex items-center gap-2.5">
              <button
                type="button"
                onClick={this.clearError}
                className="flex-1 py-2 px-4 rounded-lg border border-[#535F80]/30 bg-[#FEFEFE] hover:bg-[#E7E9F0] text-[#051747] text-xs font-medium cursor-pointer"
              >
                Retry View
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex-1 py-2 px-4 rounded-lg bg-[#081F62] hover:bg-[#051747] text-[#FEFEFE] text-xs font-medium cursor-pointer"
              >
                Reload Suvidh ERP
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function App() {
  const boundaryRef = useRef(null);

  useEffect(() => {
    if (!import.meta.hot) return undefined;
    const handleViteAfterUpdate = () => {
      boundaryRef.current?.clearError();
    };
    import.meta.hot.on('vite:afterUpdate', handleViteAfterUpdate);
    return () => {
      import.meta.hot.off?.('vite:afterUpdate', handleViteAfterUpdate);
    };
  }, []);

  return (
    <AppErrorBoundary key="suvidh-erp-root-v3" ref={boundaryRef}>
      <BrowserRouter>
        <AppProvider>
          <LanguageProvider>
            <ErpDataProvider>
              <AppRoutes />
              <ToastContainer />
            </ErpDataProvider>
          </LanguageProvider>
        </AppProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}

export default App;

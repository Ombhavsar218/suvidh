import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { ErpDataProvider } from './context/ErpDataContext';
import { AppLayout } from './components/layout/AppLayout';
import { AppRoutes } from './routes/AppRoutes';

export function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <ErpDataProvider>
          <AppLayout>
            <AppRoutes />
          </AppLayout>
        </ErpDataProvider>
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;

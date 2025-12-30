import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { Layout } from '@/components/Layout';
import { LoginPage } from '@/pages/Login';
import { DashboardPage } from '@/pages/Dashboard';
import { FechamentosPage } from '@/pages/Fechamentos';
import { FechamentoDetailPage } from '@/pages/Fechamentos/FechamentoDetail';
import { ImobiliariasPage } from '@/pages/Imobiliarias';
import { VistoriadoresPage } from '@/pages/Vistoriadores';
import { VistoriasPage } from '@/pages/Vistorias';
import { ConfiguracoesPage } from '@/pages/Configuracoes';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <PrivateRoute>
            <DashboardPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/fechamentos"
        element={
          <PrivateRoute>
            <FechamentosPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/fechamentos/:id"
        element={
          <PrivateRoute>
            <FechamentoDetailPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/imobiliarias"
        element={
          <PrivateRoute>
            <ImobiliariasPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/vistoriadores"
        element={
          <PrivateRoute>
            <VistoriadoresPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/vistorias"
        element={
          <PrivateRoute>
            <VistoriasPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/configuracoes"
        element={
          <PrivateRoute>
            <ConfiguracoesPage />
          </PrivateRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

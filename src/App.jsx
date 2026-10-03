import { useContext } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { AuthContext, AuthProvider } from "./context/AuthContext";
import { RealtimeProvider } from "./context/RealtimeContext";
import Login from "./pages/Login";
import PasswordRecovery from "./pages/PasswordRecovery";
import Dashboard from "./pages/Dashboard";
import Deployments from "./pages/Deployments";
import CreateDeploymentRequest from "./pages/CreateDeploymentRequest";
import DeploymentRequestDetail from "./pages/DeploymentRequestDetail";
import ClientsStatus from "./pages/ClientsStatus";
import Packages from "./pages/Packages";
import Catalogs from "./pages/Catalogs";
import Profile from "./pages/Profile";
import UsersInner from "./pages/Users";
import Forbidden403 from "./pages/403_Forbidden";
import Notfound from "./pages/NotFound";

// Sin sesión → login. Con roles indicados, el usuario debe tener alguno (ADMIN siempre pasa).
// Es solo navegación: la API vuelve a validar el rol en cada llamada.
function ProtectedRoute({ authorizedRoles, children }) {
  const { user, token, hasRole } = useContext(AuthContext);
  const location = useLocation();
  if (!token || !user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (authorizedRoles && !hasRole(...authorizedRoles.filter((r) => r !== "ADMIN"))) {
    return <Navigate to="/403forbidden" replace />;
  }
  return children;
}

// Rutas anteriores que siguen funcionando para no romper enlaces guardados.
function LegacyRequestEdit() {
  const { id } = useParams();
  return <Navigate to={`/deployments/${id}`} replace />;
}

const page = (element, authorizedRoles) => <ProtectedRoute authorizedRoles={authorizedRoles}>{element}</ProtectedRoute>;

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RealtimeProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/auth/password_recovery" element={<PasswordRecovery />} />

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={page(<Dashboard />)} />

            <Route path="/deployments" element={page(<Deployments />)} />
            <Route path="/deployments/new" element={page(<CreateDeploymentRequest />, ["DEVELOPER"])} />
            <Route path="/deployments/create" element={<Navigate to="/deployments/new" replace />} />
            <Route path="/deployments/:id" element={page(<DeploymentRequestDetail />)} />
            <Route path="/deployments/:id/update" element={<LegacyRequestEdit />} />

            <Route path="/clients-status" element={page(<ClientsStatus />)} />
            <Route path="/packages" element={page(<Packages />)} />
            <Route path="/catalogs" element={<Navigate to="/catalogs/products" replace />} />
            <Route path="/catalogs/:section" element={page(<Catalogs />)} />

            <Route path="/users" element={page(<UsersInner />, ["ADMIN"])} />
            <Route path="/profile" element={page(<Profile />)} />
            <Route path="/users/me" element={<Navigate to="/profile" replace />} />
            <Route path="/settings" element={<Navigate to="/profile" replace />} />

            <Route path="/403forbidden" element={page(<Forbidden403 />)} />
            <Route path="/*" element={<Notfound />} />
          </Routes>
        </RealtimeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

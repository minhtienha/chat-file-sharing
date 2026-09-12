import {
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
  Route,
  Navigate,
  Outlet,
} from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ChatPage from './pages/ChatPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { AuthInit } from './components/auth/AuthInit';
import { useBearerTokenStore } from './stores/auth.store';
import DrivePage from './pages/DrivePage';
import ProfilePage from './pages/ProfilePage';

const RouteGuard = ({ isProtected }: { isProtected?: boolean }) => {
  const token = useBearerTokenStore((state) => state.accessToken);

  if (isProtected) {
    return token ? <Outlet /> : <Navigate to="/login" replace />;
  }
  return token ? <Navigate to="/" replace /> : <Outlet />;
};

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<AuthInit />}>
      {/* Public routes */}
      <Route element={<RouteGuard />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Protected routes */}
      <Route element={<RouteGuard isProtected />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<ChatPage />} />
          <Route path="/chat" element={<Navigate to="/" replace />} />
          <Route path="/drive" element={<DrivePage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>,
  ),
);

const App = () => (
  <RouterProvider
    router={router}
    future={{
      v7_startTransition: true,
    }}
  />
);

export default App;

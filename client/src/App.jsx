import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import OfflineBanner from './components/OfflineBanner';
import InstallPrompt from './components/InstallPrompt';
import Login from './pages/Login';
import Register from './pages/Register';
import AcceptInvite from './pages/AcceptInvite';
import Dashboard from './pages/Dashboard';
import Family from './pages/Family';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Contact from './pages/Contact';
import About from './pages/About';
import AdminDashboard from './pages/AdminDashboard';
import Account from './pages/Account';
import Welcome from './pages/Welcome';
import './index.css';

function ProtectedRoute({ children, requireRole }) {
  const { user, loading } = useAuth();

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: '#b3b3b3' }}>Loading...</div>;
  if (!user) return <Navigate to="/" />;
  if (user.isSuperAdmin) return <Navigate to="/admin" />;
  if (requireRole && user.role !== requireRole) return <Navigate to="/dashboard" />;

  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: '#b3b3b3' }}>Loading...</div>;
  if (user) return <Navigate to={user.isSuperAdmin ? '/admin' : '/dashboard'} />;

  return children;
}

function HomePage() {
  const { user, loading } = useAuth();

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: '#b3b3b3' }}>Loading...</div>;
  if (user) return <Navigate to={user.isSuperAdmin ? '/admin' : '/dashboard'} />;

  return <About />;
}

function ContactRoute() {
  const { user } = useAuth();
  if (user && user.isSuperAdmin) return <Navigate to="/admin" />;
  return <Contact />;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: '#b3b3b3' }}>Loading...</div>;
  if (!user || !user.isSuperAdmin) return <Navigate to="/dashboard" />;
  return children;
}

function AppRoutes() {
  return (
    <>
      <OfflineBanner />
      <InstallPrompt />
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/join/:token" element={<PublicRoute><AcceptInvite /></PublicRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/family" element={<ProtectedRoute requireRole="parent"><Family /></ProtectedRoute>} />
        <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
        <Route path="/welcome" element={<ProtectedRoute><Welcome /></ProtectedRoute>} />
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/contact" element={<ContactRoute />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to restore session from httpOnly cookie via /me endpoint
    api.getMe()
      .then(data => {
        setUser(data.user);
        setFamily(data.family);
        // Cache user info for offline fallback (no secrets stored)
        localStorage.setItem('familysync_user', JSON.stringify({ id: data.user.id, name: data.user.name }));
      })
      .catch((err) => {
        if (err.isOffline) {
          // Offline: restore cached user info for basic UI
          try {
            const cached = JSON.parse(localStorage.getItem('familysync_user'));
            if (cached) setUser(cached);
          } catch { /* ignore */ }
        } else {
          // Token invalid or expired — clear cached user info
          localStorage.removeItem('familysync_user');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const data = await api.login({ email, password });
    setUser(data.user);
    localStorage.setItem('familysync_user', JSON.stringify({ id: data.user.id, name: data.user.name }));
    return data;
  };

  const registerFamily = async (familyName, name, email, password) => {
    const data = await api.registerFamily({ familyName, name, email, password });
    setUser(data.user);
    localStorage.setItem('familysync_user', JSON.stringify({ id: data.user.id, name: data.user.name }));
    return data;
  };

  const acceptInvite = async (token, name, password) => {
    const data = await api.acceptInvite({ token, name, password });
    setUser(data.user);
    localStorage.setItem('familysync_user', JSON.stringify({ id: data.user.id, name: data.user.name }));
    return data;
  };

  const googleLogin = async (idToken) => {
    const data = await api.googleLogin({ idToken });
    setUser(data.user);
    localStorage.setItem('familysync_user', JSON.stringify({ id: data.user.id, name: data.user.name }));
    return data;
  };

  const googleRegisterFamily = async (idToken, familyName, name) => {
    const data = await api.googleRegisterFamily({ idToken, familyName, name });
    setUser(data.user);
    localStorage.setItem('familysync_user', JSON.stringify({ id: data.user.id, name: data.user.name }));
    return data;
  };

  const googleAcceptInvite = async (idToken, inviteToken, name) => {
    const data = await api.googleAcceptInvite({ idToken, inviteToken, name });
    setUser(data.user);
    localStorage.setItem('familysync_user', JSON.stringify({ id: data.user.id, name: data.user.name }));
    return data;
  };

  const biometricLogin = async (email, response) => {
    const data = await api.webauthnLogin({ email, response });
    setUser(data.user);
    localStorage.setItem('familysync_user', JSON.stringify({ id: data.user.id, name: data.user.name }));
    return data;
  };

  const refreshUser = async () => {
    const data = await api.getMe();
    setUser(data.user);
    setFamily(data.family);
    localStorage.setItem('familysync_user', JSON.stringify({ id: data.user.id, name: data.user.name }));
  };

  const logout = async () => {
    try { await api.logout(); } catch { /* ignore */ }
    setUser(null);
    setFamily(null);
    localStorage.removeItem('familysync_user');
    localStorage.removeItem('familysync_biometric_email');
    // Clear service worker caches to remove cached API data
    if ('caches' in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
      } catch { /* ignore */ }
    }
  };

  return (
    <AuthContext.Provider value={{ user, family, loading, login, biometricLogin, googleLogin, googleRegisterFamily, googleAcceptInvite, registerFamily, acceptInvite, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

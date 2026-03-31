import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('familysync_token');
    if (token) {
      api.getMe()
        .then(data => {
          setUser(data.user);
          setFamily(data.family);
        })
        .catch((err) => {
          // If offline, try to decode JWT payload for basic user state
          if (err.isOffline) {
            try {
              const payload = JSON.parse(atob(token.split('.')[1]));
              setUser({ id: payload.id, name: payload.name, email: payload.email, role: payload.role, isAdmin: payload.isAdmin, isSuperAdmin: payload.isSuperAdmin, familyId: payload.familyId });
            } catch {
              localStorage.removeItem('familysync_token');
            }
          } else {
            localStorage.removeItem('familysync_token');
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const data = await api.login({ email, password });
    localStorage.setItem('familysync_token', data.token);
    setUser(data.user);
    return data;
  };

  const registerFamily = async (familyName, name, email, password) => {
    const data = await api.registerFamily({ familyName, name, email, password });
    localStorage.setItem('familysync_token', data.token);
    setUser(data.user);
    return data;
  };

  const acceptInvite = async (token, name, password) => {
    const data = await api.acceptInvite({ token, name, password });
    localStorage.setItem('familysync_token', data.token);
    setUser(data.user);
    return data;
  };

  const googleLogin = async (idToken) => {
    const data = await api.googleLogin({ idToken });
    localStorage.setItem('familysync_token', data.token);
    setUser(data.user);
    return data;
  };

  const googleRegisterFamily = async (idToken, familyName, name) => {
    const data = await api.googleRegisterFamily({ idToken, familyName, name });
    localStorage.setItem('familysync_token', data.token);
    setUser(data.user);
    return data;
  };

  const googleAcceptInvite = async (idToken, inviteToken, name) => {
    const data = await api.googleAcceptInvite({ idToken, inviteToken, name });
    localStorage.setItem('familysync_token', data.token);
    setUser(data.user);
    return data;
  };

  const biometricLogin = async (email, response) => {
    const data = await api.webauthnLogin({ email, response });
    localStorage.setItem('familysync_token', data.token);
    setUser(data.user);
    return data;
  };

  const updateToken = (token) => {
    localStorage.setItem('familysync_token', token);
  };

  const refreshUser = async () => {
    const data = await api.getMe();
    setUser(data.user);
    setFamily(data.family);
  };

  const logout = () => {
    localStorage.removeItem('familysync_token');
    setUser(null);
    setFamily(null);
  };

  return (
    <AuthContext.Provider value={{ user, family, loading, login, biometricLogin, googleLogin, googleRegisterFamily, googleAcceptInvite, registerFamily, acceptInvite, logout, updateToken, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

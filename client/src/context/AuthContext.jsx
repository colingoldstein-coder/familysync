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
        .catch(() => {
          localStorage.removeItem('familysync_token');
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

  const logout = () => {
    localStorage.removeItem('familysync_token');
    setUser(null);
    setFamily(null);
  };

  return (
    <AuthContext.Provider value={{ user, family, loading, login, registerFamily, acceptInvite, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

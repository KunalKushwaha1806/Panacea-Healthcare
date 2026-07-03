import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
  phone?: string;
  doctorProfile?: any;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string; role?: string }) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('panacea_token');
    const savedUser = localStorage.getItem('panacea_user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      // Verify token is still valid
      api.get('/auth/me')
        .then(res => {
          setUser(res.data.data);
          localStorage.setItem('panacea_user', JSON.stringify(res.data.data));
        })
        .catch(() => {
          localStorage.removeItem('panacea_token');
          localStorage.removeItem('panacea_user');
          setToken(null);
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { user: userData, token: tokenData } = res.data.data;
    setUser(userData);
    setToken(tokenData);
    localStorage.setItem('panacea_token', tokenData);
    localStorage.setItem('panacea_user', JSON.stringify(userData));
  };

  const register = async (data: { email: string; password: string; name: string; role?: string }) => {
    const res = await api.post('/auth/register', data);
    const { user: userData, token: tokenData } = res.data.data;
    setUser(userData);
    setToken(tokenData);
    localStorage.setItem('panacea_token', tokenData);
    localStorage.setItem('panacea_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('panacea_token');
    localStorage.removeItem('panacea_user');
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoading,
      login,
      register,
      logout,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

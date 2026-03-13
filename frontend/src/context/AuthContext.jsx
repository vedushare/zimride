import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('zimride_token');
    const savedUser = localStorage.getItem('zimride_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  function login(tokenVal, userVal) {
    setToken(tokenVal);
    setUser(userVal);
    localStorage.setItem('zimride_token', tokenVal);
    localStorage.setItem('zimride_user', JSON.stringify(userVal));
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem('zimride_token');
    localStorage.removeItem('zimride_user');
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

import React, { createContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

// Use the server's IP address instead of localhost
// This can be set either from an environment variable or hardcoded for local network use
const SERVER_IP = process.env.REACT_APP_SERVER_IP || window.location.hostname;
const SERVER_PORT = process.env.REACT_APP_SERVER_PORT || '5000';

const API_URL = `http://${SERVER_IP}:${SERVER_PORT}/api`;

console.log('API URL configured as:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [requestLoading, setRequestLoading] = useState(false);

  // Define loadEmployees with useCallback to prevent unnecessary rerenders
  const loadEmployees = useCallback(async () => {
    try {
      const res = await api.get('/users/employees');
      setEmployees(res.data);
    } catch (err) {
      console.error('Failed to load employees', err);
    }
  }, []);

  // Define logout function before its usage in the useEffect
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setCurrentUser(null);
    setEmployees([]);
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          const res = await api.get('/auth/me');
          setCurrentUser(res.data);
          
          if (res.data.role === 'admin') {
            loadEmployees();
          }
        } catch (err) {
          console.error('Failed to load user', err);
          localStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
        }
      }
      
      setLoading(false);
    };

    loadUser();
    
    const interceptor = api.interceptors.response.use(
      response => response,
      error => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          logout();
        }
        return Promise.reject(error);
      }
    );
    
    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, [loadEmployees, logout]);

  const login = async (email, password) => {
    try {
      setRequestLoading(true);
      setError(null);
      
      console.log(`Attempting login for ${email} to ${API_URL}/auth/login`);
      
      const res = await api.post('/auth/login', { email, password });
      
      console.log('Login successful, storing token');
      localStorage.setItem('token', res.data.token);
      
      api.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      
      setCurrentUser(res.data.user);
      
      if (res.data.user.role === 'admin') {
        loadEmployees();
      }
      
      return true;
    } catch (err) {
      console.error('Login error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        url: err.config?.url
      });
      
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
      return false;
    } finally {
      setRequestLoading(false);
    }
  };

  const createAdmin = async (name, email, password) => {
    try {
      setRequestLoading(true);
      setError(null);
      
      console.log('Creating admin with:', { name, email, password: password ? '****' : 'missing' });
      
      // Validate input data
      if (!name || !email || !password) {
        setError('All fields are required');
        return false;
      }
      
      const res = await api.post('/auth/create-admin', {
        name,
        email,
        password
      });
      
      localStorage.setItem('token', res.data.token);
      api.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      
      setCurrentUser(res.data.user);
      return true;
    } catch (err) {
      console.error('Admin creation error:', err.response?.data || err);
      setError(err.response?.data?.message || 'Admin creation failed. Please try again.');
      return false;
    } finally {
      setRequestLoading(false);
    }
  };

  const registerEmployee = async (employeeData) => {
    try {
      setRequestLoading(true);
      setError(null);
      
      // Make sure we're sending the authorization token
      const token = localStorage.getItem('token');
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await api.post('/auth/register', employeeData);
      
      await loadEmployees();
      
      return { success: true, employee: res.data.user };
    } catch (err) {
      console.error('Registration error:', err.response || err);
      setError(err.response?.data?.message || 'Employee registration failed');
      return { success: false, error: err.response?.data?.message || 'Failed to register employee' };
    } finally {
      setRequestLoading(false);
    }
  };

  const deleteEmployee = async (employeeId) => {
    try {
      setRequestLoading(true);
      setError(null);
      await api.delete(`/users/employee/${employeeId}`);
      
      await loadEmployees();
      
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Delete employee failed');
      return false;
    } finally {
      setRequestLoading(false);
    }
  };

  const updateProfile = async (userData) => {
    try {
      setRequestLoading(true);
      setError(null);
      const res = await api.put('/users/profile', userData);
      setCurrentUser(res.data);
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Profile update failed');
      return false;
    } finally {
      setRequestLoading(false);
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      setRequestLoading(true);
      setError(null);
      const res = await api.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      
      return { success: true, message: res.data.message };
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
      return { success: false, error: err.response?.data?.message || 'Failed to change password' };
    } finally {
      setRequestLoading(false);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        error,
        clearError,
        requestLoading,
        employees,
        login,
        createAdmin,
        registerEmployee,
        deleteEmployee,
        logout,
        updateProfile,
        changePassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
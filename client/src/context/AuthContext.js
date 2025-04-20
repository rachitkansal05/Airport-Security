import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 10000,
});

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [requestLoading, setRequestLoading] = useState(false);

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
  }, []);

  const loadEmployees = async () => {
    try {
      const res = await api.get('/users/employees');
      setEmployees(res.data);
    } catch (err) {
      console.error('Failed to load employees', err);
    }
  };

  const login = async (email, password) => {
    try {
      setRequestLoading(true);
      setError(null);
      const res = await api.post('/auth/login', { email, password });
      
      localStorage.setItem('token', res.data.token);
      
      api.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      
      setCurrentUser(res.data.user);
      
      if (res.data.user.role === 'admin') {
        loadEmployees();
      }
      
      return true;
    } catch (err) {
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
      const res = await api.post('/auth/register', employeeData);
      
      await loadEmployees();
      
      return { success: true, employee: res.data.user };
    } catch (err) {
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

  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setCurrentUser(null);
    setEmployees([]);
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
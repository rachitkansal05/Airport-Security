import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is already logged in (from localStorage)
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          // Set default headers for all axios requests
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Get current user data
          const res = await axios.get('http://localhost:5000/api/auth/me');
          setCurrentUser(res.data);
        } catch (err) {
          console.error('Failed to load user', err);
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
        }
      }
      
      setLoading(false);
    };

    loadUser();
  }, []);

  // Login user
  const login = async (email, password) => {
    try {
      setError(null);
      const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      
      // Save token to localStorage
      localStorage.setItem('token', res.data.token);
      
      // Set default headers for all axios requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      
      setCurrentUser(res.data.user);
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      return false;
    }
  };

  // Register user
  const register = async (name, email, password, contactInfo, residentialAddress, gender, age) => {
    try {
      setError(null);
      const res = await axios.post('http://localhost:5000/api/auth/register', {
        name,
        email,
        password,
        contactInfo,
        residentialAddress,
        gender,
        age
      });
      
      // Save token to localStorage
      localStorage.setItem('token', res.data.token);
      
      // Set default headers for all axios requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      
      setCurrentUser(res.data.user);
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
      return false;
    }
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setCurrentUser(null);
  };

  // Update user profile
  const updateProfile = async (userData) => {
    try {
      setError(null);
      const res = await axios.put('http://localhost:5000/api/users/profile', userData);
      setCurrentUser(res.data);
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Profile update failed');
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        error,
        login,
        register,
        logout,
        updateProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
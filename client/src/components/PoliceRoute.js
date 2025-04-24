import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/Auth.css';

const PoliceRoute = ({ children }) => {
  const { currentUser, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return (
      <div className="auth-loading-container">
        <div className="auth-loading-spinner"></div>
        <p className="auth-loading-text">Loading...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  if (currentUser.role !== 'police') {
    return <Navigate to="/profile" replace />;
  }

  return children;
};

export default PoliceRoute;
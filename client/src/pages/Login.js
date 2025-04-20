import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Formik, Form, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { AuthContext } from '../context/AuthContext';
import '../styles/Login.css';

const LoginSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .required('Password is required')
});

const AdminSchema = Yup.object().shape({
  name: Yup.string()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters'),
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters')
});

const Login = () => {
  const { login, createAdmin, error, clearError, requestLoading, currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const moveX = (x - centerX) / 25;
    const moveY = (y - centerY) / 25;
    
    card.style.transform = `perspective(1000px) rotateY(${moveX}deg) rotateX(${-moveY}deg)`;
  };

  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    
    cardRef.current.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg)';
    cardRef.current.style.transition = 'transform 0.5s ease';
  };

  useEffect(() => {
    clearError();
    
    if (currentUser) {
      if (currentUser.role === 'admin') {
        navigate('/dashboard');
      } else {
        navigate('/profile');
      }
    }
  }, [currentUser, navigate, clearError, showAdminForm]);

  const handleLoginSubmit = async (values, { setSubmitting, resetForm }) => {
    if (rememberMe) {
      localStorage.setItem('rememberedEmail', values.email);
    } else {
      localStorage.removeItem('rememberedEmail');
    }
    
    const success = await login(values.email, values.password);
    
    if (!success) {
      setSubmitting(false);
    } else {
      resetForm();
    }
  };

  const handleAdminSubmit = async (values, { setSubmitting, resetForm }) => {
    const success = await createAdmin(values.name, values.email, values.password);
    
    if (!success) {
      setSubmitting(false);
    } else {
      resetForm();
    }
  };

  const rememberedEmail = localStorage.getItem('rememberedEmail') || '';

  return (
    <div className="login-container">
      <div className="login-card-container">
        <div 
          className="login-card" 
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <div className="card-highlight"></div>
          
          <div className="logo-container">
            <div className="airport-logo">
              <div className="logo-icon"></div>
              <span className="logo-text">AIRPORT SECURITY</span>
            </div>
          </div>
          
          <h2 className="login-title">
            {showAdminForm ? 'Create Admin Account' : 'System Login'}
          </h2>
          
          <div className="form-toggle">
            <button 
              type="button"
              className={`toggle-button ${!showAdminForm ? 'active' : ''}`}
              onClick={() => setShowAdminForm(false)}
            >
              Login
            </button>
            <button 
              type="button"
              className={`toggle-button ${showAdminForm ? 'active' : ''}`}
              onClick={() => setShowAdminForm(true)}
            >
              First Time Setup
            </button>
          </div>
          
          {error && <div className="alert error">{error}</div>}
          
          {!showAdminForm ? (
            <Formik
              initialValues={{ email: rememberedEmail, password: '' }}
              validationSchema={LoginSchema}
              validateOnBlur={true}
              validateOnChange={false}
              onSubmit={handleLoginSubmit}
            >
              {({ isSubmitting, handleChange, handleBlur, values }) => (
                <Form className="login-form">
                  <div className="form-group">
                    <div className="input-container">
                      <div className="input-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-4.41 3.59-8 8-8s8 3.59 8 8c0 4.41-3.59 8-8 8zm4-8c0 2.21-1.79 4-4 4s-4-1.79-4-4V9.5C8 8.12 9.12 7 10.5 7h3C14.88 7 16 8.12 16 9.5V12z" 
                            fill="rgba(0, 225, 255, 0.7)"/>
                        </svg>
                      </div>
                      <input 
                        type="email" 
                        name="email" 
                        id="email" 
                        placeholder="Email"
                        onChange={handleChange}
                        onBlur={handleBlur}
                        value={values.email}
                        className="form-input"
                        autoComplete="email"
                      />
                    </div>
                    <ErrorMessage name="email" component="div" className="error-text" />
                  </div>
                  
                  <div className="form-group">
                    <div className="input-container">
                      <div className="input-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" 
                            fill="rgba(0, 225, 255, 0.7)"/>
                        </svg>
                      </div>
                      <input 
                        type="password" 
                        name="password" 
                        id="password" 
                        placeholder="Password"
                        onChange={handleChange}
                        onBlur={handleBlur}
                        value={values.password}
                        className="form-input"
                        autoComplete="current-password"
                      />
                    </div>
                    <ErrorMessage name="password" component="div" className="error-text" />
                  </div>
                  
                  <div className="form-options">
                    <label className="remember-me">
                      <input 
                        type="checkbox" 
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <span className="checkbox-label">Remember me</span>
                    </label>
                    <a href="#" className="forgot-password" onClick={(e) => {
                      e.preventDefault();
                      alert('Please contact your administrator to reset your password.');
                    }}>Forgot password?</a>
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={isSubmitting || requestLoading} 
                    className="login-button"
                  >
                    <span className="button-text">
                      {requestLoading ? 'Logging in...' : 'Login'}
                    </span>
                    <span className="button-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                        <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" fill="currentColor"/>
                      </svg>
                    </span>
                  </button>
                </Form>
              )}
            </Formik>
          ) : (
            <Formik
              initialValues={{ name: '', email: '', password: '' }}
              validationSchema={AdminSchema}
              validateOnBlur={true}
              validateOnChange={false}
              onSubmit={handleAdminSubmit}
            >
              {({ isSubmitting, handleChange, handleBlur, values }) => (
                <Form className="login-form">
                  <div className="setup-info">
                    <p>Use this form for initial setup only. Create the admin account to manage your organization.</p>
                  </div>
                  
                  <div className="form-group">
                    <div className="input-container">
                      <div className="input-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0-6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 7c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4zm6 5H6v-.99c.2-.72 3.3-2.01 6-2.01s5.8 1.29 6 2v1z" 
                            fill="rgba(0, 225, 255, 0.7)"/>
                        </svg>
                      </div>
                      <input 
                        type="text" 
                        name="name" 
                        id="name" 
                        placeholder="Full Name"
                        onChange={handleChange}
                        onBlur={handleBlur}
                        value={values.name}
                        className="form-input"
                        autoComplete="name"
                      />
                    </div>
                    <ErrorMessage name="name" component="div" className="error-text" />
                  </div>
                  
                  <div className="form-group">
                    <div className="input-container">
                      <div className="input-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-4.41 3.59-8 8-8s8 3.59 8 8c0 4.41-3.59 8-8 8zm4-8c0 2.21-1.79 4-4 4s-4-1.79-4-4V9.5C8 8.12 9.12 7 10.5 7h3C14.88 7 16 8.12 16 9.5V12z" 
                            fill="rgba(0, 225, 255, 0.7)"/>
                        </svg>
                      </div>
                      <input 
                        type="email" 
                        name="email" 
                        id="email" 
                        placeholder="Admin Email"
                        onChange={handleChange}
                        onBlur={handleBlur}
                        value={values.email}
                        className="form-input"
                        autoComplete="email"
                      />
                    </div>
                    <ErrorMessage name="email" component="div" className="error-text" />
                  </div>
                  
                  <div className="form-group">
                    <div className="input-container">
                      <div className="input-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" 
                            fill="rgba(0, 225, 255, 0.7)"/>
                        </svg>
                      </div>
                      <input 
                        type="password" 
                        name="password" 
                        id="password" 
                        placeholder="Create a strong password"
                        onChange={handleChange}
                        onBlur={handleBlur}
                        value={values.password}
                        className="form-input"
                        autoComplete="new-password"
                      />
                    </div>
                    <ErrorMessage name="password" component="div" className="error-text" />
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={isSubmitting || requestLoading} 
                    className="login-button"
                  >
                    <span className="button-text">
                      {requestLoading ? 'Creating...' : 'Create Admin Account'}
                    </span>
                    <span className="button-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                        <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" fill="currentColor"/>
                      </svg>
                    </span>
                  </button>
                </Form>
              )}
            </Formik>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
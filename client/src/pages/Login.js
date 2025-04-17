import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Formik, Form, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { AuthContext } from '../context/AuthContext';
import '../styles/Login.css';

// Validation schema
const LoginSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .required('Password is required')
});

const Login = () => {
  const { login, error, currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loginError, setLoginError] = useState(null);

  useEffect(() => {
    // If user is already logged in, redirect to profile
    if (currentUser) {
      navigate('/profile');
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (values, { setSubmitting }) => {
    const success = await login(values.email, values.password);
    if (!success) {
      setLoginError(error || 'Failed to login. Please check your credentials.');
    }
    setSubmitting(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Welcome Back</h2>
        
        <Formik
          initialValues={{ email: '', password: '' }}
          validationSchema={LoginSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting, handleChange, handleBlur, values }) => (
            <Form className="login-form">
              {loginError && <div className="alert">{loginError}</div>}
              
              <div className="form-group">
                <label htmlFor="email" className="form-label">Email</label>
                <input 
                  type="email" 
                  name="email" 
                  id="email" 
                  placeholder="Enter your email"
                  onChange={handleChange}
                  onBlur={handleBlur}
                  value={values.email}
                  className="form-input"
                />
                <ErrorMessage name="email" component="div" className="error-text" />
              </div>
              
              <div className="form-group">
                <label htmlFor="password" className="form-label">Password</label>
                <input 
                  type="password" 
                  name="password" 
                  id="password" 
                  placeholder="Enter your password"
                  onChange={handleChange}
                  onBlur={handleBlur}
                  value={values.password}
                  className="form-input"
                />
                <ErrorMessage name="password" component="div" className="error-text" />
              </div>
              
              <button type="submit" disabled={isSubmitting} className="form-button">
                {isSubmitting ? 'Logging in...' : 'Login'}
              </button>
            </Form>
          )}
        </Formik>
        
        <p className="register-link">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
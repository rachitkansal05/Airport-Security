import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Formik, Form, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { AuthContext } from '../context/AuthContext';
import '../styles/Register.css';

// Validation schema
const RegisterSchema = Yup.object().shape({
  name: Yup.string()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters'),
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  contactInfo: Yup.string()
    .required('Contact information is required'),
  residentialAddress: Yup.string()
    .required('Residential address is required'),
  gender: Yup.string()
    .required('Gender is required'),
  age: Yup.number()
    .required('Age is required')
    .positive('Age must be a positive number')
    .integer('Age must be an integer'),
  password: Yup.string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Confirm Password is required')
});

const Register = () => {
  const { register, error, currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [registerError, setRegisterError] = useState(null);

  useEffect(() => {
    // If user is already logged in, redirect to profile
    if (currentUser) {
      navigate('/profile');
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (values, { setSubmitting }) => {
    const success = await register(
      values.name, 
      values.email, 
      values.password,
      values.contactInfo,
      values.residentialAddress,
      values.gender,
      values.age
    );
    if (!success) {
      setRegisterError(error || 'Registration failed. Please try again.');
    }
    setSubmitting(false);
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <h2 className="register-title">Create an Account</h2>
        
        <Formik
          initialValues={{ 
            name: '', 
            email: '', 
            contactInfo: '', 
            residentialAddress: '', 
            gender: '', 
            age: '', 
            password: '', 
            confirmPassword: '' 
          }}
          validationSchema={RegisterSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting, handleChange, handleBlur, values }) => (
            <Form className="register-form">
              {registerError && <div className="alert">{registerError}</div>}
              
              <div className="form-group">
                <label htmlFor="name" className="form-label">Name</label>
                <input 
                  type="text" 
                  name="name" 
                  id="name" 
                  placeholder="Enter your name" 
                  onChange={handleChange}
                  onBlur={handleBlur}
                  value={values.name}
                  className="form-input"
                />
                <ErrorMessage name="name" component="div" className="error-text" />
              </div>
              
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
                <label htmlFor="contactInfo" className="form-label">Contact Information</label>
                <input 
                  type="text" 
                  name="contactInfo" 
                  id="contactInfo" 
                  placeholder="Enter your phone number" 
                  onChange={handleChange}
                  onBlur={handleBlur}
                  value={values.contactInfo}
                  className="form-input"
                />
                <ErrorMessage name="contactInfo" component="div" className="error-text" />
              </div>
              
              <div className="form-group">
                <label htmlFor="residentialAddress" className="form-label">Residential Address</label>
                <input 
                  type="text" 
                  name="residentialAddress" 
                  id="residentialAddress" 
                  placeholder="Enter your residential address" 
                  onChange={handleChange}
                  onBlur={handleBlur}
                  value={values.residentialAddress}
                  className="form-input"
                />
                <ErrorMessage name="residentialAddress" component="div" className="error-text" />
              </div>
              
              <div className="form-group">
                <label htmlFor="gender" className="form-label">Gender</label>
                <select
                  name="gender"
                  id="gender"
                  onChange={handleChange}
                  onBlur={handleBlur}
                  value={values.gender}
                  className="form-input"
                >
                  <option value="">Select your gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                <ErrorMessage name="gender" component="div" className="error-text" />
              </div>
              
              <div className="form-group">
                <label htmlFor="age" className="form-label">Age</label>
                <input 
                  type="number" 
                  name="age" 
                  id="age" 
                  placeholder="Enter your age" 
                  onChange={handleChange}
                  onBlur={handleBlur}
                  value={values.age}
                  className="form-input"
                />
                <ErrorMessage name="age" component="div" className="error-text" />
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
              
              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
                <input 
                  type="password" 
                  name="confirmPassword" 
                  id="confirmPassword" 
                  placeholder="Confirm your password" 
                  onChange={handleChange}
                  onBlur={handleBlur}
                  value={values.confirmPassword}
                  className="form-input"
                />
                <ErrorMessage name="confirmPassword" component="div" className="error-text" />
              </div>
              
              <button type="submit" disabled={isSubmitting} className="form-button">
                {isSubmitting ? 'Registering...' : 'Register'}
              </button>
            </Form>
          )}
        </Formik>
        
        <p className="login-link">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
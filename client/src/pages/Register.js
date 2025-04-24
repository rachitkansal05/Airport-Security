import React, { useState, useContext, useEffect } from 'react';
import { Formik, Form, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/Register.css';

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
    .required('Confirm password is required')
});

const Register = () => {
  const { registerEmployee, error, clearError, requestLoading, currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  useEffect(() => {
    clearError();
    
    if (currentUser) {
      if (currentUser.role === 'admin') {
        navigate('/dashboard');
      } else {
        navigate('/profile');
      }
    }
  }, [currentUser, navigate, clearError]);

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    // Clear any previous errors before attempting registration
    clearError();
    
    try {
      const result = await registerEmployee({
        name: values.name, 
        email: values.email, 
        password: values.password,
        contactInfo: values.contactInfo,
        residentialAddress: values.residentialAddress,
        gender: values.gender,
        age: values.age
      });
      
      if (result.success) {
        setRegistrationSuccess(true);
        resetForm();
      } else {
        setRegistrationSuccess(false);
      }
    } catch (error) {
      console.error('Registration error:', error);
      setRegistrationSuccess(false);
    } finally {
      setSubmitting(false);
      
      setTimeout(() => {
        setRegistrationSuccess(false);
      }, 5000);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <h2 className="register-title">Add New Employee</h2>
        <p className="register-subtitle">Create a new employee account for your organization</p>
        
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
              {registrationSuccess && (
                <div className="alert success">
                  Employee {values.name} has been successfully registered.
                </div>
              )}
              
              {error && (
                <div className="alert error">
                  {error}
                </div>
              )}
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name" className="form-label">Name *</label>
                  <input 
                    type="text" 
                    name="name" 
                    id="name" 
                    placeholder="Employee name" 
                    onChange={handleChange}
                    onBlur={handleBlur}
                    value={values.name}
                    className="form-input"
                  />
                  <ErrorMessage name="name" component="div" className="error-text" />
                </div>
                
                <div className="form-group">
                  <label htmlFor="email" className="form-label">Email *</label>
                  <input 
                    type="email" 
                    name="email" 
                    id="email" 
                    placeholder="Employee email" 
                    onChange={handleChange}
                    onBlur={handleBlur}
                    value={values.email}
                    className="form-input"
                  />
                  <ErrorMessage name="email" component="div" className="error-text" />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="password" className="form-label">Password *</label>
                  <input 
                    type="password" 
                    name="password" 
                    id="password" 
                    placeholder="Create password" 
                    onChange={handleChange}
                    onBlur={handleBlur}
                    value={values.password}
                    className="form-input"
                  />
                  <ErrorMessage name="password" component="div" className="error-text" />
                </div>
                
                <div className="form-group">
                  <label htmlFor="confirmPassword" className="form-label">Confirm Password *</label>
                  <input 
                    type="password" 
                    name="confirmPassword" 
                    id="confirmPassword" 
                    placeholder="Confirm password" 
                    onChange={handleChange}
                    onBlur={handleBlur}
                    value={values.confirmPassword}
                    className="form-input"
                  />
                  <ErrorMessage name="confirmPassword" component="div" className="error-text" />
                </div>
              </div>
              
              <div className="section-title">Additional Information (Optional)</div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="contactInfo" className="form-label">Contact Information</label>
                  <input 
                    type="text" 
                    name="contactInfo" 
                    id="contactInfo" 
                    placeholder="Phone number" 
                    onChange={handleChange}
                    onBlur={handleBlur}
                    value={values.contactInfo}
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="residentialAddress" className="form-label">Residential Address</label>
                  <input 
                    type="text" 
                    name="residentialAddress" 
                    id="residentialAddress" 
                    placeholder="Home address" 
                    onChange={handleChange}
                    onBlur={handleBlur}
                    value={values.residentialAddress}
                    className="form-input"
                  />
                </div>
              </div>
              
              <div className="form-row">
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
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="age" className="form-label">Age</label>
                  <input 
                    type="number" 
                    name="age" 
                    id="age" 
                    placeholder="Employee age" 
                    onChange={handleChange}
                    onBlur={handleBlur}
                    value={values.age}
                    className="form-input"
                  />
                  {values.age && <ErrorMessage name="age" component="div" className="error-text" />}
                </div>
              </div>
              
              <div className="button-container">
                <button type="submit" disabled={isSubmitting} className="form-button">
                  {isSubmitting ? 'Adding Employee...' : 'Add Employee'}
                </button>
                <button 
                  type="button" 
                  className="form-button cancel-button"
                  onClick={() => navigate('/dashboard')}
                >
                  Back to Dashboard
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default Register;
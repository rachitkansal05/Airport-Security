import React, { useState, useContext, useEffect } from 'react';
import { Formik, Form, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/Register.css';

const AddEmployeeSchema = Yup.object().shape({
  name: Yup.string()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters'),
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  contactInfo: Yup.string(),
  address: Yup.string(),
  gender: Yup.string(),
  age: Yup.number()
    .positive('Age must be a positive number')
    .integer('Age must be an integer')
    .nullable(),
  password: Yup.string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Confirm password is required'),
  role: Yup.string()
    .required('Role is required')
});

const AddEmployee = () => {
  const { registerEmployee, error, clearError, requestLoading, currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    clearError();
    
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/');
    }
  }, [currentUser, navigate, clearError]);

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    const result = await registerEmployee({
      name: values.name, 
      email: values.email, 
      password: values.password,
      contactInfo: values.contactInfo,
      address: values.address,
      gender: values.gender,
      age: values.age,
      role: values.role
    });
    
    if (result.success) {
      setSuccessMessage(`${values.role === 'admin' ? 'Admin' : 'Employee'} ${values.name} has been successfully added.`);
      setRegistrationSuccess(true);
      resetForm();
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } else {
      setRegistrationSuccess(false);
      setSuccessMessage('');
    }
    
    setSubmitting(false);
  };

  return (
    <div className="register-container">
      <div className="profile-card register-card">
        <h2 className="section-title">Add New Staff Member</h2>
        <p className="register-subtitle">Create a new account for your organization</p>
        
        <Formik
          initialValues={{ 
            name: '', 
            email: '', 
            contactInfo: '', 
            address: '', 
            gender: '', 
            age: '', 
            password: '', 
            confirmPassword: '',
            role: 'employee'
          }}
          validationSchema={AddEmployeeSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting, handleChange, handleBlur, values }) => (
            <Form className="profile-form">
              {registrationSuccess && (
                <div className="alert success">
                  {successMessage}
                </div>
              )}
              
              {error && (
                <div className="alert error">
                  {error}
                </div>
              )}
              
              <div className="form-section-title">
                <i className="section-icon"></i>
                Staff Identity
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name" className="form-label">Name *</label>
                  <input 
                    type="text" 
                    name="name" 
                    id="name" 
                    placeholder="Staff name" 
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
                    placeholder="Staff email" 
                    onChange={handleChange}
                    onBlur={handleBlur}
                    value={values.email}
                    className="form-input"
                  />
                  <ErrorMessage name="email" component="div" className="error-text" />
                </div>
              </div>
              
              <div className="form-section-title">
                <i className="section-icon"></i>
                Account Type & Permissions
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="role" className="form-label">Account Role *</label>
                  <div className="role-selector">
                    <div className="role-option">
                      <input 
                        type="radio" 
                        id="role-employee" 
                        name="role" 
                        value="employee"
                        checked={values.role === 'employee'}
                        onChange={handleChange}
                        className="role-radio"
                      />
                      <label htmlFor="role-employee" className="role-label">
                        <div className="role-icon employee-icon">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0-6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 7c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4zm6 5H6v-.99c.2-.72 3.3-2.01 6-2.01s5.8 1.29 6 2v1z" 
                              fill="currentColor"/>
                          </svg>
                        </div>
                        <div className="role-details">
                          <span className="role-title">Regular Employee</span>
                          <span className="role-description">Can access their profile and limited features</span>
                        </div>
                      </label>
                    </div>
                    
                    <div className="role-option">
                      <input 
                        type="radio" 
                        id="role-admin" 
                        name="role" 
                        value="admin"
                        checked={values.role === 'admin'}
                        onChange={handleChange}
                        className="role-radio"
                      />
                      <label htmlFor="role-admin" className="role-label">
                        <div className="role-icon admin-icon">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 2.18l7 3.12v5.7c0 4.83-3.4 8.94-7 10-3.6-1.06-7-5.17-7-10V6.3l7-3.12z M12 11.5c-1.93 0-3.5-1.57-3.5-3.5S10.07 4.5 12 4.5s3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" 
                              fill="currentColor"/>
                          </svg>
                        </div>
                        <div className="role-details">
                          <span className="role-title">Administrator</span>
                          <span className="role-description">Full access to manage all users and system settings</span>
                        </div>
                      </label>
                    </div>
                  </div>
                  <ErrorMessage name="role" component="div" className="error-text" />
                </div>
              </div>
              
              <div className="form-section-title">
                <i className="section-icon"></i>
                Security Credentials
              </div>
              
              <div className="password-requirements-card">
                <h4 className="requirements-title">Password Requirements:</h4>
                <ul className="requirements-list">
                  <li>Minimum 6 characters in length</li>
                  <li>Create a strong password for better security</li>
                  <li>Both password fields must match</li>
                </ul>
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
              
              <div className="form-section-title">
                <i className="section-icon"></i>
                Personal Information
              </div>
              
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
                  <label htmlFor="address" className="form-label">Address</label>
                  <textarea 
                    name="address" 
                    id="address" 
                    placeholder="Enter full address" 
                    onChange={handleChange}
                    onBlur={handleBlur}
                    value={values.address}
                    className="form-textarea"
                    rows="3"
                  ></textarea>
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
                    placeholder="Staff age" 
                    onChange={handleChange}
                    onBlur={handleBlur}
                    value={values.age}
                    className="form-input"
                  />
                  {values.age && <ErrorMessage name="age" component="div" className="error-text" />}
                </div>
              </div>
              
              <div className="form-divider"></div>
              
              <div className="button-container">
                <button 
                  type="button" 
                  className="secondary-button"
                  onClick={() => navigate('/dashboard')}
                >
                  Back to Dashboard
                </button>
                <button type="submit" disabled={isSubmitting} className="primary-button">
                  {isSubmitting ? 'Adding Staff Member...' : `Add ${values.role === 'admin' ? 'Admin' : 'Employee'}`}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default AddEmployee;
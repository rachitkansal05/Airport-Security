import React, { useState, useEffect, useContext } from 'react';
import { Formik, Form, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { AuthContext } from '../context/AuthContext';
import '../styles/Profile.css';

const AdminProfileSchema = Yup.object().shape({
  name: Yup.string()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters'),
  contactInfo: Yup.string()
    .required('Contact information is required'),
  address: Yup.string()
    .required('Address is required'),
  gender: Yup.string()
    .required('Gender is required'),
  age: Yup.number()
    .required('Age is required')
    .positive('Age must be a positive number')
    .integer('Age must be an integer'),
  profilePicture: Yup.string()
    .url('Must be a valid URL')
});

const EmployeeProfileSchema = Yup.object().shape({
  contactInfo: Yup.string(),
  address: Yup.string(),
  gender: Yup.string(),
  age: Yup.number()
    .positive('Age must be a positive number')
    .integer('Age must be an integer')
    .nullable(),
  profilePicture: Yup.string()
    .url('Must be a valid URL')
});

const PasswordChangeSchema = Yup.object().shape({
  currentPassword: Yup.string()
    .required('Current password is required'),
  newPassword: Yup.string()
    .required('New password is required')
    .min(6, 'Password must be at least 6 characters'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('newPassword'), null], 'Passwords must match')
    .required('Confirm password is required')
});

const Profile = () => {
  const { currentUser, updateProfile, changePassword, error, clearError, requestLoading } = useContext(AuthContext);
  const [updateStatus, setUpdateStatus] = useState({ type: '', message: '' });
  const [activeTab, setActiveTab] = useState('profile');
  const [passwordChangeStatus, setPasswordChangeStatus] = useState({ type: '', message: '' });
  const [previewImage, setPreviewImage] = useState(currentUser?.profilePicture || '');

  useEffect(() => {
    clearError();
  }, [clearError]);

  if (!currentUser) {
    return (
      <div className="profile-container">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (values, { setSubmitting }) => {
    const dataToUpdate = currentUser.role === 'admin' 
      ? values 
      : { 
          contactInfo: values.contactInfo,
          address: values.address,
          gender: values.gender,
          age: values.age,
          profilePicture: values.profilePicture
        };
    
    const success = await updateProfile(dataToUpdate);
    
    if (success) {
      setUpdateStatus({
        type: 'success',
        message: 'Profile updated successfully'
      });
    } else {
      setUpdateStatus({
        type: 'error',
        message: error || 'Failed to update profile'
      });
    }
    
    setSubmitting(false);
    
    setTimeout(() => {
      setUpdateStatus({ type: '', message: '' });
    }, 3000);
  };
  
  const handlePasswordChange = async (values, { setSubmitting, resetForm }) => {
    const result = await changePassword(values.currentPassword, values.newPassword);
    
    if (result.success) {
      setPasswordChangeStatus({
        type: 'success',
        message: result.message || 'Password changed successfully'
      });
      resetForm();
    } else {
      setPasswordChangeStatus({
        type: 'error',
        message: result.error || 'Failed to change password'
      });
    }
    
    setSubmitting(false);
    
    setTimeout(() => {
      setPasswordChangeStatus({ type: '', message: '' });
    }, 3000);
  };

  const handleProfilePictureChange = (e, setFieldValue) => {
    const url = e.target.value;
    setFieldValue('profilePicture', url);
    setPreviewImage(url);
  };

  const profilePictureStyle = previewImage
    ? { backgroundImage: `url(${previewImage})` }
    : { backgroundColor: '#1a1a1a' };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div 
          className="profile-avatar" 
          style={profilePictureStyle}
        >
          {!previewImage && (
            <div className="profile-avatar-placeholder">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : '?'}
            </div>
          )}
        </div>
        <div className="profile-info">
          <h1 className="profile-name">{currentUser?.name}</h1>
          <p className="profile-email">{currentUser?.email}</p>
          {currentUser?.role && (
            <p className="profile-role">
              Role: <span className="role-badge">{currentUser.role}</span>
            </p>
          )}
        </div>
      </div>

      <div className="profile-tabs">
        <button 
          className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`} 
          onClick={() => setActiveTab('profile')}
        >
          <i className="tab-icon profile-icon"></i>
          Profile Information
        </button>
        <button 
          className={`tab-button ${activeTab === 'password' ? 'active' : ''}`}
          onClick={() => setActiveTab('password')}
        >
          <i className="tab-icon password-icon"></i>
          Change Password
        </button>
        <button 
          className={`tab-button ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <i className="tab-icon security-icon"></i>
          Security Settings
        </button>
      </div>

      <div className="profile-content">
        {activeTab === 'profile' && (
          <div className="profile-card">
            <h2 className="section-title">Edit Profile</h2>
            
            <Formik
              initialValues={{
                name: currentUser?.name || '',
                contactInfo: currentUser?.contactInfo || '',
                address: currentUser?.address || '',
                gender: currentUser?.gender || '',
                age: currentUser?.age || '',
                profilePicture: currentUser?.profilePicture || ''
              }}
              validationSchema={currentUser?.role === 'admin' ? AdminProfileSchema : EmployeeProfileSchema}
              onSubmit={handleSubmit}
              enableReinitialize
            >
              {({ isSubmitting, handleChange, handleBlur, values, setFieldValue }) => (
                <Form className="profile-form">
                  {updateStatus.message && (
                    <div className={`alert ${updateStatus.type}`}>
                      {updateStatus.message}
                    </div>
                  )}
                  
                  <div className="form-section-title">
                    <i className="section-icon"></i>
                    Personal Information
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="name" className="form-label">Full Name</label>
                      {currentUser?.role === 'admin' ? (
                        <>
                          <input 
                            type="text" 
                            name="name" 
                            id="name" 
                            placeholder="Your name" 
                            onChange={handleChange}
                            onBlur={handleBlur}
                            value={values.name}
                            className="form-input"
                          />
                          <ErrorMessage name="name" component="div" className="error-text" />
                        </>
                      ) : (
                        <div className="form-value">{values.name}</div>
                      )}
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="email" className="form-label">Email Address</label>
                      <div className="form-value">{currentUser?.email}</div>
                      <p className="form-hint">Email address cannot be changed</p>
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="contactInfo" className="form-label">Contact Number</label>
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
                      <label htmlFor="address" className="form-label">Address</label>
                      <textarea 
                        name="address" 
                        id="address" 
                        placeholder="Enter your address" 
                        rows="3"
                        onChange={handleChange}
                        onBlur={handleBlur}
                        value={values.address}
                        className="form-textarea"
                      ></textarea>
                      <ErrorMessage name="address" component="div" className="error-text" />
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
                  </div>
                  
                  <div className="form-section-title">
                    <i className="section-icon"></i>
                    Profile Picture
                  </div>
                  
                  <div className="profile-picture-section">
                    <div className="profile-picture-preview">
                      <div 
                        className="preview-container" 
                        style={profilePictureStyle}
                      >
                        {!previewImage && (
                          <div className="profile-avatar-placeholder">
                            {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : '?'}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="profile-picture-input">
                      <div className="form-group">
                        <label htmlFor="profilePicture" className="form-label">Profile Picture URL</label>
                        <input
                          type="text"
                          name="profilePicture"
                          id="profilePicture"
                          placeholder="https://example.com/your-image.jpg"
                          onChange={(e) => handleProfilePictureChange(e, setFieldValue)}
                          onBlur={handleBlur}
                          value={values.profilePicture}
                          className="form-input"
                        />
                        <ErrorMessage name="profilePicture" component="div" className="error-text" />
                        <p className="form-hint">Enter the URL of an image to use as your profile picture</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="form-divider"></div>
                  
                  <div className="button-container">
                    <button type="submit" disabled={isSubmitting} className="primary-button">
                      {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        )}
        
        {activeTab === 'password' && (
          <div className="profile-card">
            <h2 className="section-title">Change Password</h2>
            
            <Formik
              initialValues={{
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
              }}
              validationSchema={PasswordChangeSchema}
              onSubmit={handlePasswordChange}
            >
              {({ isSubmitting, handleChange, handleBlur, values }) => (
                <Form className="profile-form">
                  {passwordChangeStatus.message && (
                    <div className={`alert ${passwordChangeStatus.type}`}>
                      {passwordChangeStatus.message}
                    </div>
                  )}
                  
                  <div className="password-requirements-card">
                    <h4 className="requirements-title">Password Requirements:</h4>
                    <ul className="requirements-list">
                      <li>Minimum 6 characters in length</li>
                      <li>Must be different from your current password</li>
                      <li>Create a strong password for better security</li>
                    </ul>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="currentPassword" className="form-label">Current Password</label>
                    <input 
                      type="password" 
                      name="currentPassword" 
                      id="currentPassword" 
                      placeholder="Enter your current password" 
                      onChange={handleChange}
                      onBlur={handleBlur}
                      value={values.currentPassword}
                      className="form-input"
                    />
                    <ErrorMessage name="currentPassword" component="div" className="error-text" />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="newPassword" className="form-label">New Password</label>
                    <input 
                      type="password" 
                      name="newPassword" 
                      id="newPassword" 
                      placeholder="Enter your new password" 
                      onChange={handleChange}
                      onBlur={handleBlur}
                      value={values.newPassword}
                      className="form-input"
                    />
                    <ErrorMessage name="newPassword" component="div" className="error-text" />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="confirmPassword" className="form-label">Confirm New Password</label>
                    <input 
                      type="password" 
                      name="confirmPassword" 
                      id="confirmPassword" 
                      placeholder="Confirm your new password" 
                      onChange={handleChange}
                      onBlur={handleBlur}
                      value={values.confirmPassword}
                      className="form-input"
                    />
                    <ErrorMessage name="confirmPassword" component="div" className="error-text" />
                  </div>
                  
                  <div className="button-container">
                    <button type="submit" disabled={isSubmitting} className="primary-button">
                      {isSubmitting ? 'Changing Password...' : 'Change Password'}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        )}
        
        {activeTab === 'security' && (
          <div className="profile-card">
            <h2 className="section-title">Security Settings</h2>
            
            <div className="security-settings-container">
              <div className="security-setting">
                <div className="security-setting-info">
                  <h3 className="security-setting-title">Two-Factor Authentication</h3>
                  <p className="security-setting-description">
                    Add an extra layer of security to your account by enabling two-factor authentication.
                  </p>
                </div>
                <div className="security-setting-action">
                  <button className="secondary-button" disabled>Coming Soon</button>
                </div>
              </div>
              
              <div className="security-setting">
                <div className="security-setting-info">
                  <h3 className="security-setting-title">Login History</h3>
                  <p className="security-setting-description">
                    View your recent login activity and ensure no unauthorized access.
                  </p>
                </div>
                <div className="security-setting-action">
                  <button className="secondary-button" disabled>Coming Soon</button>
                </div>
              </div>
              
              <div className="security-setting">
                <div className="security-setting-info">
                  <h3 className="security-setting-title">Active Sessions</h3>
                  <p className="security-setting-description">
                    Manage and terminate active sessions on different devices.
                  </p>
                </div>
                <div className="security-setting-action">
                  <button className="secondary-button" disabled>Coming Soon</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
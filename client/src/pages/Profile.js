import React, { useState, useContext } from 'react';
import { Formik, Form, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { AuthContext } from '../context/AuthContext';
import '../styles/Profile.css';

// Validation schema
const ProfileSchema = Yup.object().shape({
  name: Yup.string()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters'),
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
  profilePicture: Yup.string()
    .url('Must be a valid URL')
});

const Profile = () => {
  const { currentUser, updateProfile, error } = useContext(AuthContext);
  const [updateStatus, setUpdateStatus] = useState({ type: '', message: '' });

  const handleSubmit = async (values, { setSubmitting }) => {
    const success = await updateProfile(values);
    
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
    
    // Clear status message after 3 seconds
    setTimeout(() => {
      setUpdateStatus({ type: '', message: '' });
    }, 3000);
  };

  // Determine if there's a valid profile picture URL to display
  const profilePictureStyle = currentUser?.profilePicture
    ? { backgroundImage: `url(${currentUser.profilePicture})` }
    : { backgroundColor: '#1a1a1a' };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div 
          className="profile-avatar" 
          style={profilePictureStyle}
        >
          {!currentUser?.profilePicture && (
            <div className="profile-avatar-placeholder">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : '?'}
            </div>
          )}
        </div>
        <div className="profile-info">
          <h1 className="profile-name">{currentUser?.name}</h1>
          <p className="profile-email">{currentUser?.email}</p>
        </div>
      </div>

      <div className="profile-card">
        <h2 className="section-title">Edit Profile</h2>
        
        <Formik
          initialValues={{
            name: currentUser?.name || '',
            contactInfo: currentUser?.contactInfo || '',
            residentialAddress: currentUser?.residentialAddress || '',
            gender: currentUser?.gender || '',
            age: currentUser?.age || '',
            profilePicture: currentUser?.profilePicture || ''
          }}
          validationSchema={ProfileSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ isSubmitting, handleChange, handleBlur, values }) => (
            <Form className="profile-form">
              {updateStatus.message && (
                <div className={`alert ${updateStatus.type}`}>
                  {updateStatus.message}
                </div>
              )}
              
              <div className="form-group">
                <label htmlFor="name" className="form-label">Name</label>
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
              </div>
              
              <div className="form-group">
                <label htmlFor="profilePicture" className="form-label">Profile Picture URL</label>
                <input
                  type="text"
                  name="profilePicture"
                  id="profilePicture"
                  placeholder="https://example.com/your-image.jpg"
                  onChange={handleChange}
                  onBlur={handleBlur}
                  value={values.profilePicture}
                  className="form-input"
                />
                <ErrorMessage name="profilePicture" component="div" className="error-text" />
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
              
              <div className="button-container">
                <button type="submit" disabled={isSubmitting} className="form-button">
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default Profile;
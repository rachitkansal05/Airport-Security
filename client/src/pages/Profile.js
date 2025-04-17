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
  bio: Yup.string()
    .max(300, 'Bio must be at most 300 characters'),
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
            bio: currentUser?.bio || '',
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
              
              <div className="form-group full-width">
                <label htmlFor="bio" className="form-label">Bio</label>
                <textarea
                  name="bio"
                  id="bio"
                  placeholder="Tell us about yourself"
                  onChange={handleChange}
                  onBlur={handleBlur}
                  value={values.bio}
                  className="form-textarea"
                ></textarea>
                <ErrorMessage name="bio" component="div" className="error-text" />
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
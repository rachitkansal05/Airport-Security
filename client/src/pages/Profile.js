import React, { useState, useEffect, useContext, useRef } from 'react';
import { Formik, Form, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { AuthContext } from '../context/AuthContext';
import '../styles/Profile.css';
import axios from 'axios';

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
  const [verificationResult, setVerificationResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({ type: '', message: '' });
  const proofFileInputRef = useRef(null);
  const publicFileInputRef = useRef(null);
  
  // New state variables for biometric processing
  const [fingerprint1, setFingerprint1] = useState(null);
  const [fingerprint2, setFingerprint2] = useState(null);
  const [processingStep, setProcessingStep] = useState(0);
  const [processingStatus, setProcessingStatus] = useState({ type: '', message: '' });
  const [fingerprint1Path, setFingerprint1Path] = useState('');
  const [fingerprint2Path, setFingerprint2Path] = useState('');
  const [pklFile1Path, setPklFile1Path] = useState('');
  const [pklFile2Path, setPklFile2Path] = useState('');
  const [circomInputPath, setCircomInputPath] = useState('');
  const [witnessPath, setWitnessPath] = useState('');
  const [proofPath, setProofPath] = useState('');
  const [publicPath, setPublicPath] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState({ type: '', message: '' });
  const [showSubmitButton, setShowSubmitButton] = useState(false);
  
  // State for proof submissions (police only)
  const [proofSubmissions, setProofSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [submissionDetailLoading, setSubmissionDetailLoading] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState('');

  useEffect(() => {
    clearError();
  }, [clearError]);
  
  // Effect to fetch proof submissions for police users
  useEffect(() => {
    if (currentUser?.role === 'police' && activeTab === 'submissions') {
      fetchProofSubmissions();
    }
  }, [currentUser, activeTab]);

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
  
  // Create a utility function to create an authenticated axios instance
  const createAuthAxiosInstance = () => {
    const token = localStorage.getItem('token');
    return axios.create({
      baseURL: 'http://localhost:5000/api',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      }
    });
  };

  // Function to fetch proof submissions (police only)
  const fetchProofSubmissions = async () => {
    try {
      setSubmissionLoading(true);
      const authAxios = createAuthAxiosInstance();
      console.log("Fetching submissions with token:", localStorage.getItem('token'));
      
      const response = await authAxios.get('/biometric/proof-submissions');
      console.log("Submissions response:", response.data);
      
      setProofSubmissions(response.data);
    } catch (error) {
      console.error('Error fetching proof submissions:', error);
      setProcessingStatus({
        type: 'error',
        message: error.response?.data?.message || 'Failed to fetch proof submissions'
      });
    } finally {
      setSubmissionLoading(false);
    }
  };
  
  // Function to fetch a specific proof submission with details
  const fetchSubmissionDetails = async (id) => {
    try {
      setSubmissionDetailLoading(true);
      const authAxios = createAuthAxiosInstance();
      
      const response = await authAxios.get(`/biometric/proof-submissions/${id}`);
      
      setSelectedSubmission(response.data);
      setVerificationNotes(response.data.verificationNotes || '');
    } catch (error) {
      console.error('Error fetching submission details:', error);
      setProcessingStatus({
        type: 'error',
        message: error.response?.data?.message || 'Failed to fetch submission details'
      });
    } finally {
      setSubmissionDetailLoading(false);
    }
  };
  
  // Function to download proof or public file
  const downloadSubmissionFile = async (id, fileType) => {
    try {
      const token = localStorage.getItem('token');
      const url = `http://localhost:5000/api/biometric/proof-submissions/${id}/${fileType}`;
      
      // Create axios instance with proper headers for binary data
      const authAxios = axios.create({
        baseURL: 'http://localhost:5000/api',
        headers: {
          'x-auth-token': token
        },
        responseType: 'blob'
      });
      
      // Make the request
      const response = await authAxios.get(`/biometric/proof-submissions/${id}/${fileType}`);
      
      // Create a blob URL from the response data
      const blob = new Blob([response.data], { type: 'application/json' });
      const objectUrl = URL.createObjectURL(blob);
      
      // Create a temporary link element to trigger the download
      const link = document.createElement('a');
      link.href = objectUrl;
      link.setAttribute('download', `${fileType}-${id}.json`);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error(`Error downloading ${fileType} file:`, error);
      setProcessingStatus({
        type: 'error',
        message: `Failed to download ${fileType} file`
      });
    }
  };
  
  // Function to update submission status
  const updateSubmissionStatus = async (id, status) => {
    try {
      const authAxios = createAuthAxiosInstance();
      
      await authAxios.put(`/biometric/proof-submissions/${id}/status`, {
        status,
        verificationNotes
      });
      
      // Update the selected submission and the list
      if (selectedSubmission) {
        setSelectedSubmission({
          ...selectedSubmission,
          status,
          verificationNotes
        });
      }
      
      // Refresh the submissions list
      fetchProofSubmissions();
      
      setProcessingStatus({
        type: 'success',
        message: 'Submission status updated successfully'
      });
    } catch (error) {
      console.error('Error updating submission status:', error);
      setProcessingStatus({
        type: 'error',
        message: error.response?.data?.message || 'Failed to update submission status'
      });
    }
  };

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
    
  const handleVerification = async (e) => {
    e.preventDefault();
    
    // Check if both files are selected
    if (!proofFileInputRef.current.files[0] || !publicFileInputRef.current.files[0]) {
      setUploadStatus({
        type: 'error',
        message: 'Please select both proof.json and public.json files'
      });
      return;
    }
    
    setIsVerifying(true);
    setVerificationResult(null);
    setUploadStatus({ type: '', message: '' });
    
    try {
      const formData = new FormData();
      formData.append('proof', proofFileInputRef.current.files[0]);
      formData.append('public', publicFileInputRef.current.files[0]);
      
      const token = localStorage.getItem('token');
      
      // Create axios instance with proper headers for form data
      const authAxios = axios.create({
        baseURL: 'http://localhost:5000/api',
        headers: {
          'x-auth-token': token
        }
      });
      
      // Make API request to verify the files
      const response = await authAxios.post(
        '/biometric/verify-zkp',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      setVerificationResult(response.data);
      setUploadStatus({
        type: response.data.verified ? 'success' : 'error',
        message: response.data.message
      });
    } catch (error) {
      console.error('Verification error:', error);
      setUploadStatus({
        type: 'error',
        message: error.response?.data?.message || 'An error occurred during verification'
      });
    } finally {
      setIsVerifying(false);
    }
  };
  
  const resetVerification = () => {
    setVerificationResult(null);
    setUploadStatus({ type: '', message: '' });
    if (proofFileInputRef.current) proofFileInputRef.current.value = '';
    if (publicFileInputRef.current) publicFileInputRef.current.value = '';
  };
  
  // New function to handle fingerprint uploading
  const handleFingerprintUpload = async (fileInput, setFingerprint, setPath, setPklPath) => {
    if (!fileInput.files[0]) {
      setProcessingStatus({
        type: 'error',
        message: 'Please select a fingerprint image (TIFF format)'
      });
      return null;
    }
    
    const file = fileInput.files[0];
    setFingerprint(file);
    
    try {
      const formData = new FormData();
      formData.append('fingerprint', file);
      
      const token = localStorage.getItem('token');
      
      // Create axios instance with proper headers for form data
      const authAxios = axios.create({
        baseURL: 'http://localhost:5000/api',
        headers: {
          'x-auth-token': token
        }
      });
      
      const response = await authAxios.post(
        '/biometric/upload-fingerprint',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      setPath(response.data.filePath);
      setPklPath(response.data.pklFilePath);
      
      return response.data;
    } catch (error) {
      console.error('Fingerprint upload error:', error);
      setProcessingStatus({
        type: 'error',
        message: error.response?.data?.message || 'Error uploading fingerprint'
      });
      return null;
    }
  };
  
  // Function to handle the biometric processing workflow
  const processBiometrics = async () => {
    try {
      setIsProcessing(true);
      setProcessingStatus({ type: '', message: '' });
      
      // Step 1: Upload fingerprints if they haven't been uploaded yet
      if (processingStep === 0) {
        const fingerprint1Input = document.getElementById('fingerprint1');
        const fingerprint2Input = document.getElementById('fingerprint2');
        
        if (!fingerprint1Input.files[0] || !fingerprint2Input.files[0]) {
          setProcessingStatus({
            type: 'error',
            message: 'Please select both fingerprint images'
          });
          setIsProcessing(false);
          return;
        }
        
        // Upload first fingerprint
        const result1 = await handleFingerprintUpload(
          fingerprint1Input, 
          setFingerprint1, 
          setFingerprint1Path, 
          setPklFile1Path
        );
        
        if (!result1) {
          setIsProcessing(false);
          return;
        }
        
        // Upload second fingerprint
        const result2 = await handleFingerprintUpload(
          fingerprint2Input, 
          setFingerprint2, 
          setFingerprint2Path, 
          setPklFile2Path
        );
        
        if (!result2) {
          setIsProcessing(false);
          return;
        }
        
        setProcessingStep(1);
        setProcessingStatus({
          type: 'success',
          message: 'Fingerprints uploaded and preprocessed successfully'
        });
      }
      
      // Step 2: Generate circom input
      if (processingStep <= 1) {
        const authAxios = createAuthAxiosInstance();
        
        const response = await authAxios.post(
          '/biometric/generate-circom-input',
          {
            pklFile1: pklFile1Path,
            pklFile2: pklFile2Path
          }
        );
        
        setCircomInputPath(response.data.circomInputFile);
        setProcessingStep(2);
        setProcessingStatus({
          type: 'success',
          message: 'Circom input generated successfully'
        });
      }
      
      // Step 3: Generate witness
      if (processingStep <= 2) {
        const authAxios = createAuthAxiosInstance();
        
        const response = await authAxios.post(
          '/biometric/generate-witness',
          {
            circomInputFile: circomInputPath
          }
        );
        
        setWitnessPath(response.data.witnessFile);
        setProcessingStep(3);
        setProcessingStatus({
          type: 'success',
          message: 'Witness generated successfully'
        });
      }
      
      // Step 4: Generate proof
      if (processingStep <= 3) {
        const authAxios = createAuthAxiosInstance();
        
        const response = await authAxios.post(
          '/biometric/generate-proof',
          {
            witnessFile: witnessPath
          }
        );
        
        // Store the proof and public file paths
        setProofPath(response.data.proofPath);
        setPublicPath(response.data.publicPath);
        setProcessingStep(4);
        setShowSubmitButton(true);
        
        setProcessingStatus({
          type: 'success',
          message: 'Proof generated successfully! You can now submit the proof for archiving.'
        });
      }
    } catch (error) {
      console.error('Biometric processing error:', error);
      setProcessingStatus({
        type: 'error',
        message: error.response?.data?.message || 'Error during biometric processing'
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Function to submit proof for archiving
  const submitProof = async () => {
    try {
      setIsProcessing(true);
      setSubmissionStatus({ type: '', message: '' });
      
      const authAxios = createAuthAxiosInstance();
      
      const response = await authAxios.post(
        '/biometric/submit-proof',
        {
          proofPath,
          publicPath
        }
      );
      
      setSubmissionStatus({
        type: 'success',
        message: 'Proof submitted successfully! Your proof has been archived with a timestamp and can be accessed by authorized personnel.'
      });
      
      // Reset the form after successful submission
      setProcessingStep(0);
      setShowSubmitButton(false);
      setFingerprint1(null);
      setFingerprint2(null);
      setFingerprint1Path('');
      setFingerprint2Path('');
      setPklFile1Path('');
      setPklFile2Path('');
      setCircomInputPath('');
      setWitnessPath('');
      setProofPath('');
      setPublicPath('');
      
      // Clear file inputs
      document.getElementById('fingerprint1').value = '';
      document.getElementById('fingerprint2').value = '';
      
    } catch (error) {
      console.error('Proof submission error:', error);
      setSubmissionStatus({
        type: 'error',
        message: error.response?.data?.message || 'Error submitting proof'
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Reset biometric processing form
  const resetBiometricForm = () => {
    setProcessingStep(0);
    setProcessingStatus({ type: '', message: '' });
    setSubmissionStatus({ type: '', message: '' });
    setFingerprint1(null);
    setFingerprint2(null);
    setFingerprint1Path('');
    setFingerprint2Path('');
    setPklFile1Path('');
    setPklFile2Path('');
    setCircomInputPath('');
    setWitnessPath('');
    setProofPath('');
    setPublicPath('');
    setShowSubmitButton(false);
    
    // Clear file inputs
    if (document.getElementById('fingerprint1')) {
      document.getElementById('fingerprint1').value = '';
    }
    if (document.getElementById('fingerprint2')) {
      document.getElementById('fingerprint2').value = '';
    }
  };

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
        
        {activeTab === 'verification' && currentUser.role === 'police' && (
          <div className="profile-card">
            <h2 className="section-title">ZKP Verification</h2>
            
            <form onSubmit={handleVerification} className="verification-form">
              {uploadStatus.message && (
                <div className={`alert ${uploadStatus.type}`}>
                  {uploadStatus.message}
                </div>
              )}
              
              <div className="form-group">
                <label htmlFor="proofFile" className="form-label">Proof File (proof.json)</label>
                <input 
                  type="file" 
                  accept=".json" 
                  ref={proofFileInputRef} 
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="publicFile" className="form-label">Public File (public.json)</label>
                <input 
                  type="file" 
                  accept=".json" 
                  ref={publicFileInputRef} 
                  className="form-input"
                />
              </div>
              
              <div className="button-container">
                <button type="submit" className="primary-button" disabled={isVerifying}>
                  {isVerifying ? 'Verifying...' : 'Verify'}
                </button>
                <button type="button" className="secondary-button" onClick={resetVerification}>
                  Reset
                </button>
              </div>
            </form>
            
            {isVerifying && <p>Verifying, please wait...</p>}
            
            {verificationResult && (
              <div className="verification-result">
                <h3>Verification Result:</h3>
                <pre>{JSON.stringify(verificationResult, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'biometrics' && currentUser.role === 'employee' && (
          <div className="profile-card">
            <h2 className="section-title">Biometric Processing</h2>
            
            <div className="biometric-processing-container">
              {processingStatus.message && (
                <div className={`alert ${processingStatus.type}`}>
                  {processingStatus.message}
                </div>
              )}
              
              {submissionStatus.message && (
                <div className={`alert ${submissionStatus.type}`}>
                  {submissionStatus.message}
                </div>
              )}
              
              <div className="form-group">
                <label htmlFor="fingerprint1" className="form-label">First Fingerprint Image (TIFF)</label>
                <input 
                  type="file" 
                  id="fingerprint1" 
                  accept=".tif,.tiff" 
                  className="form-input"
                  disabled={processingStep > 0 || isProcessing}
                />
                {fingerprint1Path && (
                  <div className="form-hint">Uploaded: {fingerprint1Path}</div>
                )}
              </div>
              
              <div className="form-group">
                <label htmlFor="fingerprint2" className="form-label">Second Fingerprint Image (TIFF)</label>
                <input 
                  type="file" 
                  id="fingerprint2" 
                  accept=".tif,.tiff" 
                  className="form-input"
                  disabled={processingStep > 0 || isProcessing}
                />
                {fingerprint2Path && (
                  <div className="form-hint">Uploaded: {fingerprint2Path}</div>
                )}
              </div>
              
              <div className="processing-steps">
                <div className={`step ${processingStep >= 0 ? 'completed' : ''}`}>
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <h4>Upload Fingerprints</h4>
                    <p>Upload two fingerprint images in TIFF format</p>
                  </div>
                </div>
                
                <div className={`step ${processingStep >= 1 ? 'completed' : ''}`}>
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <h4>Generate Circom Input</h4>
                    <p>Process fingerprints to generate circuit input</p>
                  </div>
                </div>
                
                <div className={`step ${processingStep >= 2 ? 'completed' : ''}`}>
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <h4>Generate Witness</h4>
                    <p>Create witness for zero-knowledge proof</p>
                  </div>
                </div>
                
                <div className={`step ${processingStep >= 3 ? 'completed' : ''}`}>
                  <div className="step-number">4</div>
                  <div className="step-content">
                    <h4>Generate Proof</h4>
                    <p>Create the final ZK proof</p>
                  </div>
                </div>
              </div>
              
              <div className="button-container">
                <button 
                  type="button" 
                  className="primary-button" 
                  onClick={processBiometrics}
                  disabled={isProcessing || showSubmitButton}
                >
                  {isProcessing ? 'Processing...' : (processingStep === 0 ? 'Start Processing' : 'Continue Processing')}
                </button>
                
                <button 
                  type="button" 
                  className="secondary-button" 
                  onClick={resetBiometricForm}
                  disabled={isProcessing}
                >
                  Reset
                </button>
              </div>
              
              {showSubmitButton && (
                <div className="submit-proof-container">
                  <div className="alert info">
                    <strong>Processing complete!</strong> Your proof has been generated successfully.
                  </div>
                  
                  <div className="generated-files-info">
                    <h4>Generated Files:</h4>
                    <ul className="files-list">
                      {proofPath && (
                        <li className="file-item">
                          <span className="file-name">Proof File:</span> 
                          <span className="file-path">{proofPath}</span>
                        </li>
                      )}
                      {publicPath && (
                        <li className="file-item">
                          <span className="file-name">Public File:</span> 
                          <span className="file-path">{publicPath}</span>
                        </li>
                      )}
                    </ul>
                  </div>
                  
                  <div className="submission-actions">
                    <p className="submission-note">
                      Please submit your proof for secure archiving and verification by police officers.
                      This is required to complete the biometric verification process.
                    </p>
                    
                    <button 
                      type="button" 
                      className="primary-button submit-button" 
                      onClick={submitProof}
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Submitting...' : 'Submit Proof for Archiving'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'submissions' && currentUser.role === 'police' && (
          <div className="profile-card">
            <h2 className="section-title">Proof Submissions</h2>
            
            {processingStatus.message && (
              <div className={`alert ${processingStatus.type}`}>
                {processingStatus.message}
              </div>
            )}
            
            <div className="submissions-container">
              <div className="submissions-sidebar">
                <div className="submissions-header">
                  <h3>All Submissions</h3>
                  <button 
                    className="refresh-button"
                    onClick={fetchProofSubmissions}
                    disabled={submissionLoading}
                  >
                    <i className="refresh-icon"></i>
                    Refresh
                  </button>
                </div>
                
                {submissionLoading ? (
                  <div className="loading-indicator">Loading submissions...</div>
                ) : proofSubmissions.length === 0 ? (
                  <div className="no-submissions">No submissions found</div>
                ) : (
                  <ul className="submissions-list">
                    {proofSubmissions.map(submission => (
                      <li 
                        key={submission._id} 
                        className={`submission-item ${selectedSubmission && selectedSubmission._id === submission._id ? 'selected' : ''} ${submission.status}`}
                        onClick={() => fetchSubmissionDetails(submission._id)}
                      >
                        <div className="submission-name">{submission.userName}</div>
                        <div className="submission-date">
                          {new Date(submission.timestamp).toLocaleString()}
                        </div>
                        <div className="submission-status">
                          {submission.status}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              <div className="submission-details">
                {submissionDetailLoading ? (
                  <div className="loading-indicator">Loading submission details...</div>
                ) : !selectedSubmission ? (
                  <div className="no-submission-selected">
                    <p>Select a submission from the list to view details</p>
                  </div>
                ) : (
                  <>
                    <div className="submission-detail-header">
                      <h3>Submission Details</h3>
                      <div className={`submission-status ${selectedSubmission.status}`}>
                        {selectedSubmission.status}
                      </div>
                    </div>
                    
                    <div className="submission-detail-content">
                      <div className="detail-group">
                        <div className="detail-label">Submitted By</div>
                        <div className="detail-value">{selectedSubmission.userName}</div>
                      </div>
                      
                      <div className="detail-group">
                        <div className="detail-label">Submission Date</div>
                        <div className="detail-value">
                          {new Date(selectedSubmission.timestamp).toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="detail-group">
                        <div className="detail-label">Files</div>
                        <div className="detail-value file-buttons">
                          <button 
                            className="file-button"
                            onClick={() => downloadSubmissionFile(selectedSubmission._id, 'proof')}
                          >
                            <i className="download-icon"></i>
                            Download proof.json
                          </button>
                          <button 
                            className="file-button"
                            onClick={() => downloadSubmissionFile(selectedSubmission._id, 'public')}
                          >
                            <i className="download-icon"></i>
                            Download public.json
                          </button>
                        </div>
                      </div>
                      
                      <div className="detail-group">
                        <div className="detail-label">Verification Notes</div>
                        <textarea
                          className="notes-textarea"
                          value={verificationNotes}
                          onChange={(e) => setVerificationNotes(e.target.value)}
                          placeholder="Add verification notes here..."
                        ></textarea>
                      </div>
                      
                      <div className="detail-actions">
                        <button 
                          className="approve-button"
                          onClick={() => updateSubmissionStatus(selectedSubmission._id, 'verified')}
                          disabled={selectedSubmission.status === 'verified'}
                        >
                          Approve
                        </button>
                        <button 
                          className="reject-button"
                          onClick={() => updateSubmissionStatus(selectedSubmission._id, 'rejected')}
                          disabled={selectedSubmission.status === 'rejected'}
                        >
                          Reject
                        </button>
                        <button 
                          className="pending-button"
                          onClick={() => updateSubmissionStatus(selectedSubmission._id, 'pending')}
                          disabled={selectedSubmission.status === 'pending'}
                        >
                          Mark as Pending
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
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
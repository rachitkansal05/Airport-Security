import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import '../styles/FileUpload.css';

// Use the server's IP address instead of localhost
const SERVER_IP = process.env.REACT_APP_SERVER_IP || window.location.hostname;
const SERVER_PORT = process.env.REACT_APP_SERVER_PORT || '5000';

// Create an axios instance with a moderate timeout
const api = axios.create({
  baseURL: `http://${SERVER_IP}:${SERVER_PORT}/api`,
  timeout: 60000, // 1 minute timeout is sufficient for verification
});

const PoliceVerificationPage = () => {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [proofFile, setProofFile] = useState(null);
  const [proofFileName, setProofFileName] = useState('');
  const [publicFile, setPublicFile] = useState(null);
  const [publicFileName, setPublicFileName] = useState('');
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [logMessages, setLogMessages] = useState([]);
  
  const [verificationResult, setVerificationResult] = useState(null);

  useEffect(() => {
    // Initialize token in axios headers from localStorage
    const token = localStorage.getItem('token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    
    // Redirect non-police users away from this page
    if (currentUser && currentUser.role !== 'police') {
      navigate('/profile');
    }
  }, [currentUser, navigate]);

  const addLogMessage = (message) => {
    setLogMessages(prevMessages => [...prevMessages, {
      message,
      timestamp: new Date().toISOString()
    }]);
  };

  const handleProofFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    if (selectedFile && (selectedFile.type === 'application/json' || selectedFile.name.endsWith('.json'))) {
      setProofFile(selectedFile);
      setProofFileName(selectedFile.name);
      setError('');
      setSuccess(`Proof file "${selectedFile.name}" selected.`);
    } else {
      setProofFile(null);
      setProofFileName('');
      setError('Please select a valid JSON file for proof.json');
      setSuccess('');
    }
  };

  const handlePublicFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    if (selectedFile && (selectedFile.type === 'application/json' || selectedFile.name.endsWith('.json'))) {
      setPublicFile(selectedFile);
      setPublicFileName(selectedFile.name);
      setError('');
      setSuccess(`Public file "${selectedFile.name}" selected.`);
    } else {
      setPublicFile(null);
      setPublicFileName('');
      setError('Please select a valid JSON file for public.json');
      setSuccess('');
    }
  };

  const verifyFiles = async () => {
    setError('');
    setSuccess('');
    setVerificationResult(null);
    setLogMessages([]);
    setCurrentStep(1);
    
    try {
      // Validate files are selected
      if (!proofFile || !publicFile) {
        setError('Please select both proof.json and public.json files');
        return;
      }
      
      setIsVerifying(true);
      
      // Create form data for file upload
      const formData = new FormData();
      formData.append('proof', proofFile);
      formData.append('public', publicFile);
      
      // Step 1: Upload files
      addLogMessage("Step 1: Uploading JSON files...");
      
      // Step 2: Verifying proof
      setCurrentStep(2);
      addLogMessage("Step 2: Verifying zero-knowledge proof...");
      
      const response = await api.post('/biometric/verify-zkp', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Set the final result
      setVerificationResult(response.data);
      setCurrentStep(3);
      
      addLogMessage(`Verification completed. Result: ${response.data.verified ? 'PROOF VERIFIED' : 'PROOF INVALID'}`);
      
      // Display appropriate message based on verification result
      if (response.data.verified) {
        setSuccess('Verification completed. The proof is valid!');
      } else {
        setError('Verification completed. The proof is invalid.');
      }
    } catch (error) {
      console.error('Verification error:', error);
      const errorMessage = error.response?.data?.message || error.message;
      const errorDetails = error.response?.data?.error || '';
      
      addLogMessage(`Error: ${errorMessage}`);
      if (errorDetails) {
        addLogMessage(`Details: ${errorDetails}`);
      }
      
      setError(`Verification process failed: ${errorMessage}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const resetVerification = () => {
    setProofFile(null);
    setProofFileName('');
    setPublicFile(null);
    setPublicFileName('');
    setVerificationResult(null);
    setError('');
    setSuccess('');
    setLogMessages([]);
    setCurrentStep(1);
  };

  const renderStepIndicator = () => {
    return (
      <div className="steps-indicator">
        <div className={`step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
          <div className="step-number">1</div>
          <div className="step-label">Upload</div>
        </div>
        <div className="step-connector"></div>
        <div className={`step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
          <div className="step-number">2</div>
          <div className="step-label">Verify</div>
        </div>
        <div className="step-connector"></div>
        <div className={`step ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}>
          <div className="step-number">3</div>
          <div className="step-label">Results</div>
        </div>
      </div>
    );
  };

  const renderLogConsole = () => {
    return (
      <div className="log-console">
        <div className="log-header">
          <h4>Process Log</h4>
        </div>
        <div className="log-content">
          {logMessages.map((log, index) => (
            <div key={index} className="log-entry">
              <span className="log-timestamp">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
              <span className="log-message">{log.message}</span>
            </div>
          ))}
          {isVerifying && (
            <div className="log-entry">
              <span className="log-timestamp">[{new Date().toLocaleTimeString()}]</span>
              <span className="log-message processing">Processing</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderVerificationResult = () => {
    if (!verificationResult) return null;
    
    // Determine the correct icon and colors based on verification result
    const isValid = verificationResult.verified;
    const isTampered = verificationResult.tampered;
    
    // Determine the CSS class based on the verification result
    let resultClass = isValid ? 'match' : 'no-match';
    
    return (
      <div className={`verification-result ${resultClass}`}>
        <div className="result-icon">
          {isValid ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          )}
        </div>
        <h3 className="result-title">
          {isValid ? 'Proof Verified' : isTampered ? 'Proof Tampered' : 'Proof Invalid'}
        </h3>
        <p className="result-description">
          {isValid 
            ? 'The zero-knowledge proof is valid. The verification was successful.' 
            : isTampered
              ? 'The zero-knowledge proof appears to have been modified or corrupted. This may indicate tampering.'
              : 'The zero-knowledge proof is invalid. Verification failed.'}
        </p>
        <div className="proof-info">
          <h4>Verification Details</h4>
          <p>Command executed: <code>snarkjs groth16 verify verification_key.json public.json proof.json</code></p>
          <p>{verificationResult.details || "No additional details available."}</p>
          
          {isTampered && (
            <div className="tampering-alert" style={{ 
              backgroundColor: 'rgba(255, 82, 82, 0.1)', 
              border: '1px solid rgba(255, 82, 82, 0.3)',
              borderRadius: '8px',
              padding: '1rem',
              marginTop: '1rem'
            }}>
              <h4 style={{ color: '#ff5252', marginTop: '0.5rem' }}>⚠️ Security Alert</h4>
              <p>The cryptographic proof appears to have been altered after its creation. This could indicate:</p>
              <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                <li>Intentional tampering with the proof file</li>
                <li>Corruption during file transfer or storage</li>
                <li>Incompatible proof format</li>
              </ul>
              <p style={{ marginTop: '0.5rem' }}>Please report this incident to security personnel.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="file-upload-container">
      <div className="file-upload-card">
        <h2 className="section-title">Police Verification Portal</h2>
        <p className="file-upload-subtitle">Upload and verify zero-knowledge proof files (proof.json and public.json)</p>
        
        {renderStepIndicator()}
        
        {error && (
          <div className="alert error">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            {error}
          </div>
        )}
        
        {success && (
          <div className="alert success">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            {success}
          </div>
        )}
        
        <div className="biometric-upload-section">
          <div className="fingerprint-upload-container">
            <div className="fingerprint-upload reference">
              <h3>Proof File (proof.json)</h3>
              <div className="file-input-container">
                <input 
                  type="file" 
                  id="proof-file-upload" 
                  onChange={handleProofFileChange} 
                  accept=".json"
                  className="file-input"
                  disabled={isVerifying}
                />
                <label htmlFor="proof-file-upload" className={`file-input-label ${isVerifying ? 'disabled' : ''}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  {proofFileName ? proofFileName : 'Select proof.json file'}
                </label>
              </div>
            </div>
            
            <div className="fingerprint-upload person">
              <h3>Public File (public.json)</h3>
              <div className="file-input-container">
                <input 
                  type="file" 
                  id="public-file-upload" 
                  onChange={handlePublicFileChange} 
                  accept=".json"
                  className="file-input"
                  disabled={isVerifying}
                />
                <label htmlFor="public-file-upload" className={`file-input-label ${isVerifying ? 'disabled' : ''}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  {publicFileName ? publicFileName : 'Select public.json file'}
                </label>
              </div>
            </div>
          </div>
          
          <div className="button-container" style={{ justifyContent: 'center', marginTop: '1rem' }}>
            <button 
              onClick={verifyFiles} 
              className="process-button"
              disabled={!proofFile || !publicFile || isVerifying}
              style={{ maxWidth: '300px' }}
            >
              {isVerifying ? (
                <>
                  <span className="button-text">Verifying</span>
                  <span className="button-dots">...</span>
                </>
              ) : 'Verify Proof'}
            </button>
            
            <button 
              onClick={resetVerification}
              className="secondary-button"
              disabled={isVerifying}
              style={{ marginLeft: '1rem', maxWidth: '150px' }}
            >
              Reset
            </button>
          </div>
        </div>
        
        {(isVerifying || logMessages.length > 0) && renderLogConsole()}
        
        {verificationResult && renderVerificationResult()}
        
        <div className="button-container">
          <button 
            type="button" 
            className="secondary-button"
            onClick={() => navigate('/police-submissions')}
            disabled={isVerifying}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            View Submissions
          </button>
        </div>
      </div>
    </div>
  );
};

export default PoliceVerificationPage;
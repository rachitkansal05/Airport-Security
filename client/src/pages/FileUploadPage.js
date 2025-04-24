import React, { useState, useContext, useEffect } from 'react';
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
  timeout: 60000, // 1 minute timeout is sufficient for each step
});

const FileUploadPage = () => {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [referenceFingerprintFile, setReferenceFingerprintFile] = useState(null);
  const [referenceFingerprintName, setReferenceFingerprintName] = useState('');
  const [personFingerprintFile, setPersonFingerprintFile] = useState(null);
  const [personFingerprintName, setPersonFingerprintName] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [logMessages, setLogMessages] = useState([]);
  
  const [referencePklPath, setReferencePklPath] = useState('');
  const [personPklPath, setPersonPklPath] = useState('');
  
  const [verificationResult, setVerificationResult] = useState(null);
  const [proofGenerated, setProofGenerated] = useState(false);

  useEffect(() => {
    // Initialize token in axios headers from localStorage
    const token = localStorage.getItem('token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    
    // Redirect police users away from this page since they shouldn't have access
    if (currentUser && currentUser.role === 'police') {
      navigate('/profile');
    }
  }, [currentUser, navigate]);

  const addLogMessage = (message) => {
    setLogMessages(prevMessages => [...prevMessages, {
      message,
      timestamp: new Date().toISOString()
    }]);
  };

  const handleReferenceFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    if (selectedFile && selectedFile.type === 'image/tiff') {
      setReferenceFingerprintFile(selectedFile);
      setReferenceFingerprintName(selectedFile.name);
      setError('');
      setSuccess(`Reference fingerprint file "${selectedFile.name}" selected.`);
    } else {
      setReferenceFingerprintFile(null);
      setReferenceFingerprintName('');
      setError('Please select a valid TIFF image file for the reference fingerprint');
      setSuccess('');
    }
  };

  const handlePersonFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    if (selectedFile && selectedFile.type === 'image/tiff') {
      setPersonFingerprintFile(selectedFile);
      setPersonFingerprintName(selectedFile.name);
      setError('');
      setSuccess(`Person's fingerprint file "${selectedFile.name}" selected.`);
    } else {
      setPersonFingerprintFile(null);
      setPersonFingerprintName('');
      setError('Please select a valid TIFF image file for the person\'s fingerprint');
      setSuccess('');
    }
  };

  const uploadFingerprint = async (file, isReference) => {
    try {
      const formData = new FormData();
      formData.append('fingerprint', file);

      setIsProcessing(true);
      addLogMessage(`Uploading ${isReference ? 'reference' : 'person\'s'} fingerprint for preprocessing...`);

      const response = await api.post('/biometric/upload-fingerprint', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (isReference) {
        setReferencePklPath(response.data.pklFilePath);
      } else {
        setPersonPklPath(response.data.pklFilePath);
      }

      addLogMessage(`${isReference ? 'Reference' : 'Person\'s'} fingerprint preprocessed successfully.`);
      return response.data.pklFilePath;
    } catch (error) {
      console.error('Fingerprint upload error:', error);
      const errorMessage = error.response?.data?.message || error.message;
      addLogMessage(`Error: ${errorMessage}`);
      setError(`Failed to upload ${isReference ? 'reference' : 'person\'s'} fingerprint: ${errorMessage}`);
      return null;
    }
  };

  // Step-by-step verification process
  const processFingerprints = async () => {
    setError('');
    setSuccess('');
    setVerificationResult(null);
    setProofGenerated(false);
    setLogMessages([]);
    setCurrentStep(1);
    
    try {
      // Step 1: Upload and preprocess reference fingerprint
      addLogMessage("Step 1: Uploading and preprocessing fingerprints...");
      const referencePklPath = await uploadFingerprint(referenceFingerprintFile, true);
      if (!referencePklPath) {
        setIsProcessing(false);
        return;
      }
      
      // Step 1 continued: Upload and preprocess person's fingerprint
      const personPklPath = await uploadFingerprint(personFingerprintFile, false);
      if (!personPklPath) {
        setIsProcessing(false);
        return;
      }
      
      setCurrentStep(2);
      
      // Step 2: Generate circom input
      addLogMessage("Step 2: Comparing fingerprints and generating circom input...");
      const circomInputResponse = await api.post('/biometric/generate-circom-input', {
        pklFile1: referencePklPath,
        pklFile2: personPklPath
      });
      
      const { circomInputFile } = circomInputResponse.data;
      addLogMessage("Fingerprint comparison completed and circom input generated successfully.");
      
      // Step 3: Generate witness
      addLogMessage("Step 3: Generating witness for ZK proof...");
      const witnessResponse = await api.post('/biometric/generate-witness', {
        circomInputFile
      });
      
      const { witnessFile } = witnessResponse.data;
      addLogMessage("Witness generation completed successfully.");
      
      // Step 4: Generate proof
      addLogMessage("Step 4: Generating zero-knowledge proof...");
      const proofResponse = await api.post('/biometric/generate-proof', {
        witnessFile
      });
      
      // Set the final result
      setVerificationResult(proofResponse.data);
      setProofGenerated(true);
      setCurrentStep(3);
      
      addLogMessage(`Verification completed. Match result: ${proofResponse.data.matchFound ? 'MATCH FOUND' : 'NO MATCH'}`);
      addLogMessage("Zero-knowledge proof generated successfully.");
      
      // Auto-download files if they are available
      if (proofResponse.data.fileContents) {
        if (proofResponse.data.fileContents.proofJson) {
          addLogMessage("Saving proof.json to your device...");
          downloadFile(proofResponse.data.fileContents.proofJson, 'proof.json');
        }
        
        if (proofResponse.data.fileContents.publicJson) {
          addLogMessage("Saving public.json to your device...");
          downloadFile(proofResponse.data.fileContents.publicJson, 'public.json');
        }
      }
      
      setSuccess(`Fingerprint verification completed. ${proofResponse.data.matchFound ? 'Match found!' : 'No match found.'}`);
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
      setIsProcessing(false);
    }
  };

  // New function to submit proof for archiving
  const submitProofForArchiving = async () => {
    if (!verificationResult || !proofGenerated) {
      setError('No proof files available to submit. Please complete the verification process first.');
      return;
    }
    
    try {
      setIsProcessing(true);
      addLogMessage('Submitting proof files for secure archiving...');
      
      // Submit the proof files to the server
      const response = await api.post('/biometric/submit-proof', {
        proofPath: verificationResult.proofPath,
        publicPath: verificationResult.publicPath
      });
      
      addLogMessage('Proof files submitted successfully!');
      setSuccess('Your proof has been archived successfully and can be accessed by authorized personnel.');
      
      // Reset the verification state after successful submission
      setCurrentStep(4); // New step for completion
      setProofGenerated(false); // Mark as submitted
      
    } catch (error) {
      console.error('Proof submission error:', error);
      const errorMessage = error.response?.data?.message || error.message;
      addLogMessage(`Error submitting proof: ${errorMessage}`);
      setError(`Failed to submit proof: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to download files to client machine
  const downloadFile = (content, filename) => {
    // Create a blob with the file content
    const blob = new Blob([content], { type: 'application/json' });
    
    // Create a URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link element
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // Append to the document, click it, and remove it
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
    
    addLogMessage(`File ${filename} downloaded to your device.`);
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
          <div className="step-label">Process</div>
        </div>
        <div className="step-connector"></div>
        <div className={`step ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}>
          <div className="step-number">3</div>
          <div className="step-label">Verify</div>
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
          {isProcessing && (
            <div className="log-entry">
              <span className="log-timestamp">[{new Date().toLocaleTimeString()}]</span>
              <span className="log-message processing">Processing...</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderVerificationResult = () => {
    if (!verificationResult) return null;
    
    return (
      <div className={`verification-result ${verificationResult.matchFound ? 'match' : 'no-match'}`}>
        <div className="result-icon">
          {verificationResult.matchFound ? (
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
          {verificationResult.matchFound ? 'Identity Verified' : 'Identity Not Verified'}
        </h3>
        <p className="result-description">
          {verificationResult.matchFound 
            ? 'The fingerprints match. Identity has been verified with a zero-knowledge proof.' 
            : 'The fingerprints do not match. Identity verification failed.'}
        </p>
        <div className="proof-info">
          <h4>Zero-Knowledge Proof Generated</h4>
          <p>The proof has been generated and can be verified by authorized personnel without revealing the actual fingerprint data.</p>
          
          {/* Add download buttons for the files */}
          {verificationResult.fileContents && (
            <div className="download-buttons">
              <p className="download-instructions">Files have been automatically saved to your device. You can also download them again below:</p>
              <div className="download-button-container">
                {verificationResult.fileContents.proofJson && (
                  <button 
                    className="download-button"
                    onClick={() => downloadFile(verificationResult.fileContents.proofJson, 'proof.json')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download proof.json
                  </button>
                )}
                
                {verificationResult.fileContents.publicJson && (
                  <button 
                    className="download-button"
                    onClick={() => downloadFile(verificationResult.fileContents.publicJson, 'public.json')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download public.json
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="file-upload-container">
      <div className="file-upload-card">
        <h2 className="section-title">Biometric Verification Portal</h2>
        <p className="file-upload-subtitle">Upload fingerprint images for secure identity verification</p>
        
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
              <h3>Reference Fingerprint</h3>
              <div className="file-input-container">
                <input 
                  type="file" 
                  id="reference-fingerprint-upload" 
                  onChange={handleReferenceFileChange} 
                  accept=".tif,.tiff"
                  className="file-input"
                  disabled={isProcessing}
                />
                <label htmlFor="reference-fingerprint-upload" className={`file-input-label ${isProcessing ? 'disabled' : ''}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  {referenceFingerprintName ? referenceFingerprintName : 'Select Reference Fingerprint (TIFF)'}
                </label>
              </div>
            </div>
            
            <div className="fingerprint-upload person">
              <h3>Person's Fingerprint</h3>
              <div className="file-input-container">
                <input 
                  type="file" 
                  id="person-fingerprint-upload" 
                  onChange={handlePersonFileChange} 
                  accept=".tif,.tiff"
                  className="file-input"
                  disabled={isProcessing}
                />
                <label htmlFor="person-fingerprint-upload" className={`file-input-label ${isProcessing ? 'disabled' : ''}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  {personFingerprintName ? personFingerprintName : 'Select Person\'s Fingerprint (TIFF)'}
                </label>
              </div>
            </div>
          </div>
          
          <button 
            onClick={processFingerprints} 
            className="process-button"
            disabled={!referenceFingerprintFile || !personFingerprintFile || isProcessing}
          >
            {isProcessing ? (
              <>
                <span className="button-text">Processing</span>
                <span className="button-dots">...</span>
              </>
            ) : 'Verify Fingerprints'}
          </button>
        </div>
        
        {(isProcessing || logMessages.length > 0) && renderLogConsole()}
        
        {verificationResult && renderVerificationResult()}
        
        <div className="button-container">
          <button 
            type="button" 
            className="secondary-button"
            onClick={() => navigate('/profile')}
            disabled={isProcessing}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back to Profile
          </button>
        </div>

        {/* New submit button for archiving proof */}
        {verificationResult && proofGenerated && (
          <div className="submit-proof-container">
            <h3>Submit Proof for Archiving</h3>
            
            <div className="proof-info-section">
              <p className="info-text">
                Your biometric verification has been successfully processed and proof files have been generated. 
                To complete the process, you must submit these files for secure archiving.
              </p>
              
              <div className="generated-files-list">
                <h4>Generated Files:</h4>
                <ul>
                  {verificationResult.proofPath && (
                    <li><span className="file-type">Proof File:</span> {verificationResult.proofPath}</li>
                  )}
                  {verificationResult.publicPath && (
                    <li><span className="file-type">Public File:</span> {verificationResult.publicPath}</li>
                  )}
                </ul>
              </div>
              
              <div className="submission-note">
                <strong>Important:</strong> Submitting these files is required to complete the biometric verification process. 
                The archived proof can be accessed by authorized police officers for verification without revealing your 
                actual fingerprint data.
              </div>
            </div>
            
            <button 
              onClick={submitProofForArchiving} 
              className="submit-proof-button"
              disabled={isProcessing}
            >
              {isProcessing ? 'Submitting...' : 'Submit Proof for Archiving'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploadPage;
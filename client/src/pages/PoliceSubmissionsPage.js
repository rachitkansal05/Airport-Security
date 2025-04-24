import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import '../styles/FileUpload.css';
import '../styles/PoliceSubmissions.css'; // We'll create this new CSS file

// Use the server's IP address instead of localhost
const SERVER_IP = process.env.REACT_APP_SERVER_IP || window.location.hostname;
const SERVER_PORT = process.env.REACT_APP_SERVER_PORT || '5000';

// Create an axios instance with a moderate timeout
const api = axios.create({
  baseURL: `http://${SERVER_IP}:${SERVER_PORT}/api`,
  timeout: 60000, // 1 minute timeout is sufficient
});

const PoliceSubmissionsPage = () => {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [statusUpdate, setStatusUpdate] = useState({ submissionId: '', status: '', notes: '' });
  const [updateStatus, setUpdateStatus] = useState({ type: '', message: '' });
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });

  useEffect(() => {
    // Initialize token in axios headers from localStorage
    const token = localStorage.getItem('token');
    if (token) {
      api.defaults.headers.common['x-auth-token'] = token;
    }
    
    // Redirect non-police users away from this page
    if (currentUser && currentUser.role !== 'police') {
      navigate('/profile');
    } else {
      // Fetch submissions immediately when the page loads
      fetchProofSubmissions();
    }
  }, [currentUser, navigate]);

  // Filter and sort submissions when they change or when filter/sort settings change
  useEffect(() => {
    let result = [...submissions];
    
    // Apply status filter
    if (filterStatus !== 'all') {
      result = result.filter(submission => submission.status === filterStatus);
    }
    
    // Apply search query filter (case insensitive)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(submission => 
        submission.userName.toLowerCase().includes(query) || 
        new Date(submission.timestamp).toLocaleString().toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    setFilteredSubmissions(result);
  }, [submissions, filterStatus, searchQuery, sortConfig]);

  // Function to create an authenticated axios instance
  const createAuthAxiosInstance = () => {
    const token = localStorage.getItem('token');
    return axios.create({
      baseURL: `http://${SERVER_IP}:${SERVER_PORT}/api`,
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      }
    });
  };

  // Function to fetch proof submissions
  const fetchProofSubmissions = async () => {
    try {
      setSubmissionLoading(true);
      const authAxios = createAuthAxiosInstance();
      const response = await authAxios.get('/biometric/proof-submissions');
      setSubmissions(response.data);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      setUpdateStatus({
        type: 'error',
        message: 'Failed to fetch submissions. Please try again.'
      });
    } finally {
      setSubmissionLoading(false);
    }
  };

  // Function to view a specific submission
  const viewSubmission = async (submissionId) => {
    try {
      setSubmissionLoading(true);
      const authAxios = createAuthAxiosInstance();
      const response = await authAxios.get(`/biometric/proof-submissions/${submissionId}`);
      setSelectedSubmission(response.data);
      
      // Pre-fill the status update form with current values
      setStatusUpdate({
        submissionId,
        status: response.data.status,
        notes: response.data.verificationNotes || ''
      });
      
      // Clear any previous status messages
      setUpdateStatus({ type: '', message: '' });
    } catch (error) {
      console.error('Error fetching submission details:', error);
      setUpdateStatus({
        type: 'error',
        message: 'Failed to fetch submission details. Please try again.'
      });
    } finally {
      setSubmissionLoading(false);
    }
  };

  // Function to download proof file
  const downloadProofFile = async (submissionId) => {
    try {
      window.open(`http://${SERVER_IP}:${SERVER_PORT}/api/biometric/proof-submissions/${submissionId}/proof`, '_blank');
      setUpdateStatus({
        type: 'success',
        message: 'Downloading proof file...'
      });
      
      // Clear the success message after 3 seconds
      setTimeout(() => {
        setUpdateStatus({ type: '', message: '' });
      }, 3000);
    } catch (error) {
      console.error('Error downloading proof file:', error);
      setUpdateStatus({
        type: 'error',
        message: 'Failed to download proof file. Please try again.'
      });
    }
  };

  // Function to download public file
  const downloadPublicFile = async (submissionId) => {
    try {
      window.open(`http://${SERVER_IP}:${SERVER_PORT}/api/biometric/proof-submissions/${submissionId}/public`, '_blank');
      setUpdateStatus({
        type: 'success',
        message: 'Downloading public file...'
      });
      
      // Clear the success message after 3 seconds
      setTimeout(() => {
        setUpdateStatus({ type: '', message: '' });
      }, 3000);
    } catch (error) {
      console.error('Error downloading public file:', error);
      setUpdateStatus({
        type: 'error',
        message: 'Failed to download public file. Please try again.'
      });
    }
  };

  // Function to handle status update form changes
  const handleStatusUpdateChange = (e) => {
    const { name, value } = e.target;
    setStatusUpdate(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Function to submit status update
  const submitStatusUpdate = async (e) => {
    e.preventDefault();
    
    try {
      setSubmissionLoading(true);
      const authAxios = createAuthAxiosInstance();
      
      await authAxios.put(
        `/biometric/proof-submissions/${statusUpdate.submissionId}/status`,
        {
          status: statusUpdate.status,
          verificationNotes: statusUpdate.notes
        }
      );
      
      // Show success message
      setUpdateStatus({
        type: 'success',
        message: 'Submission status updated successfully'
      });
      
      // Refresh submissions list and selected submission
      fetchProofSubmissions();
      viewSubmission(statusUpdate.submissionId);
    } catch (error) {
      console.error('Error updating submission status:', error);
      setUpdateStatus({
        type: 'error',
        message: 'Failed to update submission status. Please try again.'
      });
    } finally {
      setSubmissionLoading(false);
    }
  };

  // Function to close selected submission view
  const closeSubmissionView = () => {
    setSelectedSubmission(null);
    setStatusUpdate({ submissionId: '', status: '', notes: '' });
    setUpdateStatus({ type: '', message: '' });
  };

  // Function to handle sorting
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Format date for display
  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Function to get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'verified':
        return 'status-badge-verified';
      case 'rejected':
        return 'status-badge-rejected';
      case 'pending':
      default:
        return 'status-badge-pending';
    }
  };

  // Get the count of submissions by status
  const getSubmissionCountByStatus = (status) => {
    if (status === 'all') {
      return submissions.length;
    }
    return submissions.filter(submission => submission.status === status).length;
  };

  return (
    <div className="police-submissions-container">
      <div className="police-submissions-card">
        <div className="page-header">
          <div className="header-content">
            <h1 className="page-title">Proof Submissions</h1>
            <p className="page-subtitle">Review and manage employee biometric proof submissions</p>
          </div>
          <div className="header-actions">
            <button 
              className="action-button verify-button"
              onClick={() => navigate('/police-verification')}
            >
              <i className="fas fa-shield-alt"></i>
              Go to Verification
            </button>
          </div>
        </div>
        
        {updateStatus.message && (
          <div className={`alert alert-${updateStatus.type}`}>
            {updateStatus.type === 'success' ? (
              <i className="fas fa-check-circle alert-icon"></i>
            ) : (
              <i className="fas fa-exclamation-triangle alert-icon"></i>
            )}
            <span>{updateStatus.message}</span>
          </div>
        )}
        
        {/* Submissions List View */}
        {!selectedSubmission && (
          <div className="submissions-view">
            <div className="submissions-controls">
              <div className="search-filter-container">
                {/* Search Bar */}
                <div className="search-container">
                  <i className="fas fa-search search-icon"></i>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search by name or date..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button 
                      className="clear-search-button"
                      onClick={() => setSearchQuery('')}
                    >
                      ×
                    </button>
                  )}
                </div>
                
                {/* Status Filter Tabs */}
                <div className="status-tabs">
                  <button 
                    className={`status-tab ${filterStatus === 'all' ? 'active' : ''}`}
                    onClick={() => setFilterStatus('all')}
                  >
                    All <span className="count-badge">{getSubmissionCountByStatus('all')}</span>
                  </button>
                  <button 
                    className={`status-tab ${filterStatus === 'pending' ? 'active' : ''}`}
                    onClick={() => setFilterStatus('pending')}
                  >
                    Pending <span className="count-badge">{getSubmissionCountByStatus('pending')}</span>
                  </button>
                  <button 
                    className={`status-tab ${filterStatus === 'verified' ? 'active' : ''}`}
                    onClick={() => setFilterStatus('verified')}
                  >
                    Verified <span className="count-badge">{getSubmissionCountByStatus('verified')}</span>
                  </button>
                  <button 
                    className={`status-tab ${filterStatus === 'rejected' ? 'active' : ''}`}
                    onClick={() => setFilterStatus('rejected')}
                  >
                    Rejected <span className="count-badge">{getSubmissionCountByStatus('rejected')}</span>
                  </button>
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="action-buttons">
                <button 
                  className="refresh-button"
                  onClick={fetchProofSubmissions}
                  disabled={submissionLoading}
                >
                  <i className={`fas fa-sync ${submissionLoading ? 'fa-spin' : ''}`}></i>
                  {submissionLoading ? 'Refreshing...' : 'Refresh List'}
                </button>
              </div>
            </div>
            
            {submissionLoading && filteredSubmissions.length === 0 ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading submissions...</p>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <i className="fas fa-folder-open"></i>
                </div>
                <h3>No submissions found</h3>
                <p>
                  {searchQuery || filterStatus !== 'all' ? 
                    'Try adjusting your search or filter criteria.' : 
                    'When employees submit their biometric proofs, they will appear here.'}
                </p>
              </div>
            ) : (
              <div className="submissions-table-container">
                <table className="submissions-table">
                  <thead>
                    <tr>
                      <th className="sortable" onClick={() => requestSort('userName')}>
                        <div className="th-content">
                          User
                          {sortConfig.key === 'userName' && (
                            <i className={`fas fa-chevron-${sortConfig.direction === 'asc' ? 'up' : 'down'}`}></i>
                          )}
                        </div>
                      </th>
                      <th className="sortable" onClick={() => requestSort('timestamp')}>
                        <div className="th-content">
                          Submission Date
                          {sortConfig.key === 'timestamp' && (
                            <i className={`fas fa-chevron-${sortConfig.direction === 'asc' ? 'up' : 'down'}`}></i>
                          )}
                        </div>
                      </th>
                      <th className="sortable" onClick={() => requestSort('status')}>
                        <div className="th-content">
                          Status
                          {sortConfig.key === 'status' && (
                            <i className={`fas fa-chevron-${sortConfig.direction === 'asc' ? 'up' : 'down'}`}></i>
                          )}
                        </div>
                      </th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubmissions.map(submission => (
                      <tr key={submission._id} className="submission-row">
                        <td className="user-cell">
                          <div className="user-info">
                            <div className="user-avatar">
                              {submission.userName.charAt(0).toUpperCase()}
                            </div>
                            <span className="user-name">{submission.userName}</span>
                          </div>
                        </td>
                        <td>{formatDate(submission.timestamp)}</td>
                        <td>
                          <div className={`status-badge ${getStatusBadgeClass(submission.status)}`}>
                            <span className="status-indicator"></span>
                            {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                          </div>
                        </td>
                        <td>
                          <button 
                            onClick={() => viewSubmission(submission._id)}
                            className="view-button"
                          >
                            <i className="fas fa-eye"></i> View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        
        {/* Selected Submission Detail View */}
        {selectedSubmission && (
          <div className="submission-detail-view">
            <div className="detail-header">
              <button className="back-button" onClick={closeSubmissionView}>
                <i className="fas fa-arrow-left"></i> Back to List
              </button>
              <div className={`detail-status-badge ${getStatusBadgeClass(selectedSubmission.status)}`}>
                <span className="status-indicator"></span>
                {selectedSubmission.status.charAt(0).toUpperCase() + selectedSubmission.status.slice(1)}
              </div>
            </div>
            
            <div className="detail-content">
              <div className="detail-main">
                <div className="detail-card user-info-card">
                  <h3 className="card-title">
                    <i className="fas fa-user-circle"></i> User Information
                  </h3>
                  <div className="card-content">
                    <div className="detail-field">
                      <span className="field-label">Name</span>
                      <span className="field-value user-name-large">{selectedSubmission.userName}</span>
                    </div>
                    <div className="detail-field">
                      <span className="field-label">Submission ID</span>
                      <span className="field-value submission-id">{selectedSubmission._id}</span>
                    </div>
                    <div className="detail-field">
                      <span className="field-label">Submitted At</span>
                      <span className="field-value">{formatDate(selectedSubmission.timestamp)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="detail-card files-card">
                  <h3 className="card-title">
                    <i className="fas fa-file-alt"></i> Proof Files
                  </h3>
                  <div className="card-content">
                    <div className="file-cards">
                      <div className="file-card">
                        <div className="file-icon">
                          <i className="fas fa-file-code"></i>
                        </div>
                        <div className="file-info">
                          <h4>Proof File</h4>
                          <p>Contains the ZKP cryptographic proof data</p>
                        </div>
                        <button 
                          className="download-button"
                          onClick={() => downloadProofFile(selectedSubmission._id)}
                        >
                          <i className="fas fa-download"></i> Download
                        </button>
                      </div>
                      
                      <div className="file-card">
                        <div className="file-icon">
                          <i className="fas fa-file-code"></i>
                        </div>
                        <div className="file-info">
                          <h4>Public File</h4>
                          <p>Contains the public inputs for verification</p>
                        </div>
                        <button 
                          className="download-button"
                          onClick={() => downloadPublicFile(selectedSubmission._id)}
                        >
                          <i className="fas fa-download"></i> Download
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {selectedSubmission.verificationNotes && (
                  <div className="detail-card notes-card">
                    <h3 className="card-title">
                      <i className="fas fa-clipboard-list"></i> Verification Notes
                    </h3>
                    <div className="card-content">
                      <div className="notes-content">
                        {selectedSubmission.verificationNotes}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="detail-sidebar">
                <div className="detail-card update-status-card">
                  <h3 className="card-title">
                    <i className="fas fa-edit"></i> Update Status
                  </h3>
                  <div className="card-content">
                    <form onSubmit={submitStatusUpdate} className="status-form">
                      <div className="form-group">
                        <label htmlFor="status">Status</label>
                        <select 
                          id="status"
                          name="status"
                          value={statusUpdate.status}
                          onChange={handleStatusUpdateChange}
                          className="status-select"
                          required
                        >
                          <option value="pending">Pending Review</option>
                          <option value="verified">Verified & Approved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="notes">Verification Notes</label>
                        <textarea 
                          id="notes"
                          name="notes"
                          value={statusUpdate.notes}
                          onChange={handleStatusUpdateChange}
                          placeholder="Add notes about this verification..."
                          rows={5}
                          className="notes-textarea"
                        ></textarea>
                      </div>
                      
                      <button 
                        type="submit"
                        className="update-status-button"
                        disabled={submissionLoading}
                      >
                        {submissionLoading ? (
                          <>
                            <i className="fas fa-spinner fa-spin"></i> Updating...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-save"></i> Update Status
                          </>
                        )}
                      </button>
                    </form>
                    
                    <div className="status-help">
                      <h4>Status Descriptions:</h4>
                      <ul className="status-descriptions">
                        <li>
                          <span className="status-dot pending"></span>
                          <strong>Pending:</strong> Submission is awaiting review
                        </li>
                        <li>
                          <span className="status-dot verified"></span>
                          <strong>Verified:</strong> Proof has been verified as authentic
                        </li>
                        <li>
                          <span className="status-dot rejected"></span>
                          <strong>Rejected:</strong> Proof is invalid or has been denied
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="detail-card verification-actions-card">
                  <h3 className="card-title">
                    <i className="fas fa-shield-alt"></i> Verification Actions
                  </h3>
                  <div className="card-content">
                    <button 
                      className="verify-proof-button"
                      onClick={() => navigate('/police-verification')}
                    >
                      <i className="fas fa-check-circle"></i> Go to ZKP Verification Page
                    </button>
                    <p className="verification-help">
                      Use the verification page to validate proof files directly using the ZKP system.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PoliceSubmissionsPage;
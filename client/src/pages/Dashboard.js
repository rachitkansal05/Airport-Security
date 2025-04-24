import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const { currentUser, employees, deleteEmployee, error } = useContext(AuthContext);
  const navigate = useNavigate();
  const [actionStatus, setActionStatus] = useState({ type: '', message: '' });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
  const [view, setView] = useState('table');

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      setActionStatus({
        type: 'error',
        message: 'You do not have permission to access this page'
      });
    }
  }, [currentUser]);
  
  const sortedEmployees = React.useMemo(() => {
    const sortableEmployees = [...employees];
    
    if (sortConfig.key) {
      sortableEmployees.sort((a, b) => {
        if (!a[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (!b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
        
        if (typeof a[sortConfig.key] === 'string') {
          const comparison = a[sortConfig.key].localeCompare(b[sortConfig.key]);
          return sortConfig.direction === 'ascending' ? comparison : -comparison;
        } else {
          const comparison = a[sortConfig.key] - b[sortConfig.key];
          return sortConfig.direction === 'ascending' ? comparison : -comparison;
        }
      });
    }
    
    return sortableEmployees;
  }, [employees, sortConfig]);
  
  const filteredEmployees = React.useMemo(() => {
    return sortedEmployees.filter(employee => {
      const searchFields = [
        employee.name, 
        employee.email, 
        employee.contactInfo, 
        employee.gender, 
        employee.age?.toString(),
        employee.residentialAddress
      ];
      
      return searchFields.some(field => 
        field && field.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [sortedEmployees, searchTerm]);
  
  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? ' ↑' : ' ↓';
  };

  const handleAddEmployeeClick = () => {
    navigate('/add-employee');
  };

  const handleDeleteClick = (employee) => {
    setConfirmDelete(employee);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    
    const success = await deleteEmployee(confirmDelete._id);
    
    if (success) {
      setActionStatus({
        type: 'success',
        message: `Employee ${confirmDelete.name} removed successfully`
      });
    } else {
      setActionStatus({
        type: 'error',
        message: error || 'Failed to remove employee'
      });
    }
    
    setConfirmDelete(null);
    
    setTimeout(() => {
      setActionStatus({ type: '', message: '' });
    }, 3000);
  };

  const handleCancelDelete = () => {
    setConfirmDelete(null);
  };

  const toggleView = () => {
    setView(view === 'table' ? 'grid' : 'table');
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="dashboard-container">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Manage organization staff</p>
        </div>
        <div className="dashboard-metrics">
          <div className="metric">
            <span className="metric-value">{employees.length}</span>
            <span className="metric-label">Total Staff</span>
          </div>
        </div>
      </div>

      {actionStatus.message && (
        <div className={`alert ${actionStatus.type}`}>
          {actionStatus.message}
        </div>
      )}

      <div className="dashboard-controls">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search staff..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>
        <div className="dashboard-actions">
          <button 
            className="action-button view-toggle-button"
            onClick={toggleView}
          >
            {view === 'table' ? 'Grid View' : 'Table View'}
          </button>
          <button 
            className="action-button add-button"
            onClick={handleAddEmployeeClick}
          >
            Add New Staff Member
          </button>
        </div>
      </div>

      <div className="employees-list">
        <h2>Staff Members</h2>
        
        {filteredEmployees.length === 0 ? (
          <p className="no-employees">
            {searchTerm 
              ? 'No staff members found matching your search criteria.' 
              : 'No staff members found. Add employees or police officers to get started.'}
          </p>
        ) : view === 'table' ? (
          <div className="employees-table-container">
            <table className="employees-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('name')}>
                    Name{getSortIndicator('name')}
                  </th>
                  <th onClick={() => handleSort('email')}>
                    Email{getSortIndicator('email')}
                  </th>
                  <th onClick={() => handleSort('role')}>
                    Role{getSortIndicator('role')}
                  </th>
                  <th onClick={() => handleSort('contactInfo')}>
                    Contact Info{getSortIndicator('contactInfo')}
                  </th>
                  <th onClick={() => handleSort('gender')}>
                    Gender{getSortIndicator('gender')}
                  </th>
                  <th onClick={() => handleSort('age')}>
                    Age{getSortIndicator('age')}
                  </th>
                  <th onClick={() => handleSort('residentialAddress')}>
                    Address{getSortIndicator('residentialAddress')}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map(employee => (
                  <tr key={employee._id}>
                    <td>{employee.name}</td>
                    <td>{employee.email}</td>
                    <td>
                      <span className={`role-badge ${employee.role}`}>
                        {employee.role === 'police' ? 'Police Officer' : employee.role}
                      </span>
                    </td>
                    <td>{employee.contactInfo || 'N/A'}</td>
                    <td>{employee.gender || 'N/A'}</td>
                    <td>{employee.age || 'N/A'}</td>
                    <td>{employee.residentialAddress || 'N/A'}</td>
                    <td>
                      <button 
                        className="action-button delete-button"
                        onClick={() => handleDeleteClick(employee)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="employees-grid">
            {filteredEmployees.map(employee => (
              <div key={employee._id} className="employee-card">
                <div className="employee-avatar">
                  {employee.name.charAt(0)}
                </div>
                <div className="employee-details">
                  <h3>{employee.name}</h3>
                  <p className="employee-email">{employee.email}</p>
                  <p className="employee-role">
                    <span className={`role-badge ${employee.role}`}>
                      {employee.role === 'police' ? 'Police Officer' : employee.role}
                    </span>
                  </p>
                  <p><strong>Contact:</strong> {employee.contactInfo || 'N/A'}</p>
                  <p><strong>Gender:</strong> {employee.gender || 'N/A'}</p>
                  <p><strong>Age:</strong> {employee.age || 'N/A'}</p>
                  <p><strong>Address:</strong> {employee.residentialAddress || 'N/A'}</p>
                  <div className="employee-actions">
                    <button 
                      className="action-button delete-button"
                      onClick={() => handleDeleteClick(employee)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmDelete && (
        <div className="modal-overlay">
          <div className="delete-modal">
            <h3>Confirm Delete</h3>
            <p>
              Are you sure you want to delete employee <strong>{confirmDelete.name}</strong>?
              This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button 
                className="action-button delete-button"
                onClick={handleConfirmDelete}
              >
                Delete
              </button>
              <button 
                className="action-button cancel-button"
                onClick={handleCancelDelete}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
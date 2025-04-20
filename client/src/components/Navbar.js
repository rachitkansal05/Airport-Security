import React, { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/Navbar.css';

const Navbar = () => {
  const { currentUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/" className={`navbar-logo ${location.pathname === '/' ? 'active' : ''}`}>
        <div className="logo-icon-small"></div>
        Airport Security
      </Link>
      <div className="navbar-items">
        {currentUser ? (
          <>
            {currentUser.role === 'admin' && (
              <>
                <Link to="/dashboard" className={`navbar-link ${location.pathname === '/dashboard' ? 'active' : ''}`}>
                  <i className="nav-icon dashboard-icon"></i>
                  Dashboard
                </Link>
                <Link to="/add-employee" className={`navbar-link ${location.pathname === '/add-employee' ? 'active' : ''}`}>
                  <i className="nav-icon add-icon"></i>
                  Add Employee
                </Link>
              </>
            )}
            
            <Link to="/profile" className={`navbar-link ${location.pathname === '/profile' ? 'active' : ''}`}>
              <i className="nav-icon profile-icon"></i>
              Profile
            </Link>
            
            <button className="navbar-button" onClick={handleLogout}>
              <span>Logout</span>
              {currentUser.name && <span className="user-name">({currentUser.name})</span>}
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className={`navbar-link ${location.pathname === '/login' ? 'active' : ''}`}>
              <i className="nav-icon login-icon"></i>
              Login
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
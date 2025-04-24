const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async function(req, res, next) {
  // Check both Authorization header (Bearer token) and x-auth-token header
  const authHeader = req.header('Authorization');
  const xAuthToken = req.header('x-auth-token');
  
  let token;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (xAuthToken) {
    token = xAuthToken;
  }
  
  if (!token) {
    console.log('Auth middleware: No token found in headers', {
      Authorization: req.header('Authorization'),
      'x-auth-token': req.header('x-auth-token')
    });
    return res.status(401).json({ message: 'No token, authorization denied' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'defaultsecret');
    
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      console.log('Auth middleware: User not found for decoded token', { userId: decoded.userId });
      return res.status(401).json({ message: 'User not found' });
    }
    
    req.user = user;
    next();
  } catch (err) {
    console.log('Auth middleware: Invalid token', { error: err.message });
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const admin = async function(req, res, next) {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }
    
    next();
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const police = async function(req, res, next) {
  try {
    if (!req.user || req.user.role !== 'police') {
      return res.status(403).json({ message: 'Access denied. Police role required.' });
    }
    
    next();
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { auth, admin, police };
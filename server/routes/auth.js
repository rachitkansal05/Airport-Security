const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { auth, admin } = require('../middleware/auth');
const User = require('../models/User');
const { sendEmployeeCredentials, sendPasswordChangeConfirmation } = require('../utils/email');

router.post('/register', auth, admin, async (req, res) => {
  const { name, email, password, contactInfo, residentialAddress, gender, age, role } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const originalPassword = password;

    user = new User({
      name,
      email,
      password,
      role: role === 'admin' ? 'admin' : (role === 'police' ? 'police' : 'employee'),
      contactInfo,
      residentialAddress,
      gender,
      age
    });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();
    
    await sendEmployeeCredentials({
      name,
      email,
      password: originalPassword,
      role: user.role
    });
    
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        contactInfo: user.contactInfo,
        residentialAddress: user.residentialAddress,
        gender: user.gender,
        age: user.age
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.post('/create-admin', async (req, res) => {
  const { name, email, password } = req.body;

  // Add validation for required fields
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (adminExists) {
      return res.status(400).json({ message: 'Admin already exists. Only one admin allowed.' });
    }

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    user = new User({
      name,
      email,
      password,
      role: 'admin'
    });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    const payload = {
      userId: user.id
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'defaultsecret',
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          }
        });
      }
    );
  } catch (err) {
    console.error('Admin creation server error:', err.message);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  console.log(`Login attempt for email: ${email} from IP: ${req.ip || req.connection.remoteAddress}`);
  console.log('Request headers:', JSON.stringify(req.headers));

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`Login failed: User not found for email ${email}`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`Login failed: Invalid password for email ${email}`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    console.log(`Login successful for user: ${user.name}, role: ${user.role}`);

    const payload = {
      userId: user.id
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'defaultsecret',
      { expiresIn: '7d' },
      (err, token) => {
        if (err) {
          console.error('JWT signing error:', err);
          throw err;
        }
        console.log('Token generated successfully');
        res.json({
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            profilePicture: user.profilePicture,
            contactInfo: user.contactInfo,
            residentialAddress: user.residentialAddress,
            gender: user.gender,
            age: user.age
          }
        });
      }
    );
  } catch (err) {
    console.error('Login server error:', err.message);
    res.status(500).send('Server error');
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    res.json(req.user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.post('/change-password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Please provide both current and new password' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters long' });
  }

  try {
    const user = await User.findById(req.user.id);
    
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({ message: 'New password must be different from current password' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    await sendPasswordChangeConfirmation({
      name: user.name,
      email: user.email
    });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
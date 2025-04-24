const express = require('express');
const router = express.Router();
const { auth, admin } = require('../middleware/auth');
const User = require('../models/User');

router.get('/employees', auth, admin, async (req, res) => {
  try {
    const employees = await User.find({ role: { $in: ['employee', 'police'] } }).select('-password');
    res.json(employees);
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/profile/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Access denied. Not authorized to view this profile.' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/profile', auth, async (req, res) => {
  const { name, contactInfo, residentialAddress, gender, age, profilePicture } = req.body;

  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.role === 'admin') {
      if (name) user.name = name;
      if (contactInfo !== undefined) user.contactInfo = contactInfo;
      if (residentialAddress !== undefined) user.residentialAddress = residentialAddress;
      if (gender !== undefined) user.gender = gender;
      if (age !== undefined) user.age = age;
      if (profilePicture !== undefined) user.profilePicture = profilePicture;
    } else {
      if (profilePicture !== undefined) user.profilePicture = profilePicture;
    }
    
    await user.save();
    
    const updatedUser = await User.findById(req.user.id).select('-password');
    res.json(updatedUser);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.delete('/employee/:id', auth, admin, async (req, res) => {
  try {
    const employee = await User.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    if (employee.role === 'admin') {
      return res.status(400).json({ message: 'Cannot delete admin user' });
    }
    
    await User.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Employee removed successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
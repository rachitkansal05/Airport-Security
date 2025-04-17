const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');


router.get('/profile/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
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
    // Find the user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update fields
    if (name) user.name = name;
    if (contactInfo !== undefined) user.contactInfo = contactInfo;
    if (residentialAddress !== undefined) user.residentialAddress = residentialAddress;
    if (gender !== undefined) user.gender = gender;
    if (age !== undefined) user.age = age;
    if (profilePicture !== undefined) user.profilePicture = profilePicture;
    
    // Save the updated user
    await user.save();
    
    // Return updated user data (without password)
    const updatedUser = await User.findById(req.user.id).select('-password');
    res.json(updatedUser);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
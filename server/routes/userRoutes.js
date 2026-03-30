const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

// All routes are protected
router.use(protect);

// @route   GET /api/user/profile
// @desc    Get authenticated user's profile
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      'name email subscriptionDays createdAt isEmailVerified'
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// @route   GET /api/user/service-principals
// @desc    Get all connected Service Principals (secrets masked)
router.get('/service-principals', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('servicePrincipals');
    res.json(user.servicePrincipals || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch service principals' });
  }
});

// @route   POST /api/user/service-principals
// @desc    Save a connected Service Principal (metadata only, no secret)
router.post('/service-principals', async (req, res) => {
  const { clientId, tenantId } = req.body;
  if (!clientId || !tenantId) {
    return res.status(400).json({ error: 'clientId and tenantId are required' });
  }

  try {
    const user = await User.findById(req.user._id);

    // Avoid duplicates by clientId
    const exists = user.servicePrincipals.find(sp => sp.clientId === clientId);
    if (!exists) {
      user.servicePrincipals.push({ clientId, tenantId });
      await user.save();
    }

    res.json({ message: 'Service Principal saved', count: user.servicePrincipals.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save service principal' });
  }
});

// @route   POST /api/user/reset-password
// @desc    Reset password with old password verification
router.post('/reset-password', async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Password strength validation
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({
      error: 'New password must be 8+ chars with 1 uppercase, 1 lowercase, 1 number, and 1 special char.'
    });
  }

  try {
    const user = await User.findById(req.user._id);

    // Verify old password
    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Old password is incorrect' });
    }

    // Set new password (pre-save hook will hash it)
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully ✅' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// @route   PUT /api/user/update-username
// @desc    Update user's display name/username
router.put('/update-username', async (req, res) => {
  const { name } = req.body;
  
  if (!name || name.trim().length < 3 || name.trim().length > 30) {
    return res.status(400).json({ error: 'Username must be between 3 and 30 characters' });
  }

  try {
    const trimmedName = name.trim();
    
    // Enforce uniqueness
    const existingUser = await User.findOne({ name: trimmedName, _id: { $ne: req.user._id } });
    if (existingUser) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    const user = await User.findById(req.user._id);
    user.name = trimmedName;
    await user.save();

    res.json({ message: 'Username updated successfully', name: user.name });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update username' });
  }
});

module.exports = router;

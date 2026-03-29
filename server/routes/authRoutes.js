const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { sendOTP } = require('../utils/email');
const { protect } = require('../middleware/authMiddleware');

// @route   POST /api/auth/send-otp
// @desc    Send OTP to email for verification (or just to verify email)
router.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // Upsert a partially initialized user to store OTP
    let user = await User.findOne({ email });
    if (user && user.isEmailVerified) {
       return res.status(400).json({ error: 'Email already verified' });
    }

    if (!user) {
      // Create skeleton user for verification
      user = new User({ 
        name: 'Pending', 
        email, 
        password: 'temp_password_not_used', // Model requires it
        otp, 
        otpExpiry 
      });
    } else {
      user.otp = otp;
      user.otpExpiry = otpExpiry;
      user.otpAttempts = 0; // Reset attempts
    }

    await user.save();
    await sendOTP(email, otp);
    
    res.json({ message: 'OTP sent to email' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify the OTP received via email
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

  try {
    const user = await User.findOne({ email });

    if (!user || user.otp !== otp) {
      if (user) {
        user.otpAttempts += 1;
        await user.save();
        
        if (user.otpAttempts >= 3) {
           // Disable for 1 minute (logic: just clear OTP and set expiry to +1m)
           user.otp = null;
           user.otpExpiry = new Date(Date.now() + 60 * 1000);
           await user.save();
           return res.status(400).json({ error: 'Too many wrong attempts. Please wait 1 minute before requesting a new OTP.' });
        }
      }
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (new Date() > user.otpExpiry) {
      return res.status(400).json({ error: 'OTP expired' });
    }

    // Success
    user.isEmailVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    res.json({ message: 'Email verified successfully ✅' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during verification' });
  }
});

// @route   POST /api/auth/signup
// @desc    Complete user signup after email verification
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Password Rules
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({ error: 'Password must be 8+ chars, include 1 uppercase, 1 lowercase, 1 number, and 1 special char.' });
  }

  try {
    const user = await User.findOne({ email });

    if (!user || !user.isEmailVerified) {
      return res.status(400).json({ error: 'Email must be verified first' });
    }

    // Update the pending user with real data
    user.name = name;
    user.password = password; // Pre-save hook will hash this
    await user.save();

    const { generateToken } = require('../utils/auth');
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'Signup successful!',
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide email and password' });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(403).json({ error: 'Please verify your email first' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { generateToken } = require('../utils/auth');
    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile (protected)
router.get('/me', protect, async (req, res) => {
  res.json(req.user);
});

module.exports = router;

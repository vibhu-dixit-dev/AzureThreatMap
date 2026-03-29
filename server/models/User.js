const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const servicePrincipalSchema = new mongoose.Schema({
  clientId:          { type: String, required: true },
  tenantId:          { type: String, required: true },
  clientSecretEnc:   { type: String, required: true }, // AES-256 encrypted
  isActive:          { type: Boolean, default: false },
  createdAt:         { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isEmailVerified: { type: Boolean, default: false },
  otp: { type: String, default: null },
  otpExpiry: { type: Date, default: null },
  otpAttempts: { type: Number, default: 0 },
  subscriptionDays: { type: Number, default: 10 },
  servicePrincipals: [servicePrincipalSchema],
  createdAt: { type: Date, default: Date.now }
});

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Method to verify password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

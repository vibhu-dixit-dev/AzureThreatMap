const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { initSubscriptionCron } = require('./utils/cron');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Cron Jobs
initSubscriptionCron();

// Intelligent CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://securityastra.me',
  'https://www.securityastra.me',
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    // Explicit list
    if (allowedOrigins.includes(origin)) return callback(null, true);

    // Dynamic FRONTEND_URL check (tolerates trailing slashes)
    if (process.env.FRONTEND_URL) {
      const cleanEnvUrl = process.env.FRONTEND_URL.replace(/\/$/, '');
      if (origin === cleanEnvUrl) return callback(null, true);
    }

    // Allow Vercel preview URLs automatically
    if (origin.endsWith('.vercel.app')) return callback(null, true);

    var msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/user', require('./routes/userRoutes'));
app.use('/api/service-principal', require('./routes/spRoutes'));
app.use('/api/report', require('./routes/reportRoutes'));

// Basic Route
app.get('/', (req, res) => {
  res.send('AzureThreatMap Auth API is running...');
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});

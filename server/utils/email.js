const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS, // App Password
  },
});

const sendOTP = async (email, otp) => {
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: email,
    subject: 'AzureThreatMap - Verify Your Email',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #3b82f6;">Verify Your Email</h2>
        <p>Your OTP for AzureThreatMap signup is:</p>
        <div style="font-size: 24px; font-weight: bold; background: #f3f4f6; padding: 10px; display: inline-block; border-radius: 5px;">
          ${otp}
        </div>
        <p>This OTP will expire in 10 minutes.</p>
      </div>
    `,
  };

  return await transporter.sendMail(mailOptions);
};

module.exports = { sendOTP };

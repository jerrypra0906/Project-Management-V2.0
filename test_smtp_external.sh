#!/bin/bash
# Test SMTP with external email address

echo "=== Testing SMTP with External Email ==="
echo ""

# Create test script
cat > /tmp/test_smtp_external.js << 'EOFSCRIPT'
const nodemailer = require('nodemailer');
require('dotenv').config({ path: '/opt/Project-Management-V2.0/.env' });

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  },
  tls: {
    rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false'
  }
});

// CHANGE THIS TO YOUR PERSONAL EMAIL (Gmail, Yahoo, etc.)
const testEmail = 'your-personal-email@gmail.com';

const mailOptions = {
  from: `"Test" <${process.env.EMAIL_FROM}>`,
  to: testEmail,
  subject: 'Test Email - SMTP Configuration',
  text: 'This is a test email to verify SMTP works for external emails.',
  html: '<p>This is a test email to verify SMTP works for external emails.</p><p>If you receive this, SMTP works for external addresses.</p>'
};

console.log('Testing SMTP configuration...');
console.log('From:', process.env.EMAIL_FROM);
console.log('To (external):', testEmail);
console.log('SMTP Host:', process.env.SMTP_HOST);
console.log('');

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('❌ Error sending email:', error.message);
    process.exit(1);
  } else {
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    console.log('');
    console.log('Check your inbox at:', testEmail);
    process.exit(0);
  }
});
EOFSCRIPT

# Run the test
cd /opt/Project-Management-V2.0
docker exec project_management_backend node /tmp/test_smtp_external.js

echo ""
echo "=== Test Complete ==="
echo ""
echo "IMPORTANT: Edit the script and change 'your-personal-email@gmail.com' to your actual email address!"
echo "Then run: docker exec project_management_backend node /tmp/test_smtp_external.js"


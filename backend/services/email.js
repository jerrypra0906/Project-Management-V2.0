import nodemailer from 'nodemailer';
import 'dotenv/config';

const ALLOWED_DOMAINS = ['energi-up.com', 'kpn-corp.com', 'cemindo.com'];

export function isEmailDomainAllowed(email) {
  if (!email) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return ALLOWED_DOMAINS.includes(domain);
}

// Validate email address format
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

// Filter and validate email addresses
function filterValidEmails(emails) {
  const validEmails = [];
  const invalidEmails = [];
  
  emails.forEach(email => {
    if (!email) {
      invalidEmails.push(email);
      return;
    }
    
    const trimmedEmail = email.trim();
    if (isValidEmail(trimmedEmail)) {
      if (!validEmails.includes(trimmedEmail)) {
        validEmails.push(trimmedEmail);
      }
    } else {
      invalidEmails.push(email);
    }
  });
  
  if (invalidEmails.length > 0) {
    console.log(`[EMAIL] Filtered out ${invalidEmails.length} invalid email(s):`, invalidEmails);
  }
  
  return validEmails;
}

// Create email transporter based on environment variables
function createEmailTransporter() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
  const fromEmail = process.env.EMAIL_FROM || 'noreply@energi-up.com';

  // If SMTP is not configured, return null (will fall back to console logging)
  if (!smtpHost || !smtpUser || !smtpPassword) {
    console.log('[EMAIL] SMTP not configured. Email will be logged to console.');
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
    // Optional: Add TLS options if needed
    tls: {
      rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false',
    },
  });
}

export async function sendCRCreationEmail(crData, userLookups, documents = []) {
  console.log('[EMAIL] sendCRCreationEmail called');
  console.log('[EMAIL] CR Name:', crData.name);
  console.log('[EMAIL] Documents count:', documents.length);
  
  const toEmail = 'sap.support@kpndomain.com';
  const fromEmail = process.env.EMAIL_FROM || 'noreply@energi-up.com';
  
  console.log('[EMAIL] To:', toEmail);
  console.log('[EMAIL] From:', fromEmail);
  
  // Get email addresses for CC
  const ccEmails = [];
  
  // Business Owner/Requestor
  if (crData.businessOwnerId) {
    const businessOwner = userLookups.find(u => u.id === crData.businessOwnerId);
    if (businessOwner && businessOwner.email) {
      ccEmails.push(businessOwner.email);
    }
  }
  
  // Business Users
  if (crData.businessUserIds) {
    const businessUserIds = Array.isArray(crData.businessUserIds) 
      ? crData.businessUserIds 
      : crData.businessUserIds.split(',').map(id => id.trim()).filter(Boolean);
    businessUserIds.forEach(userId => {
      const user = userLookups.find(u => u.id === userId);
      if (user && user.email && !ccEmails.includes(user.email)) {
        ccEmails.push(user.email);
      }
    });
  }
  
  // IT PIC
  if (crData.itPicIds) {
    const itPicIds = Array.isArray(crData.itPicIds) 
      ? crData.itPicIds 
      : crData.itPicIds.split(',').map(id => id.trim()).filter(Boolean);
    itPicIds.forEach(userId => {
      const user = userLookups.find(u => u.id === userId);
      if (user && user.email && !ccEmails.includes(user.email)) {
        ccEmails.push(user.email);
      }
    });
  } else if (crData.itPicId) {
    const itPic = userLookups.find(u => u.id === crData.itPicId);
    if (itPic && itPic.email && !ccEmails.includes(itPic.email)) {
      ccEmails.push(itPic.email);
    }
  }
  
  // IT Manager
  if (crData.itManagerIds) {
    const itManagerIds = Array.isArray(crData.itManagerIds) 
      ? crData.itManagerIds 
      : crData.itManagerIds.split(',').map(id => id.trim()).filter(Boolean);
    itManagerIds.forEach(userId => {
      const user = userLookups.find(u => u.id === userId);
      if (user && user.email && !ccEmails.includes(user.email)) {
        ccEmails.push(user.email);
      }
    });
  }
  
  // Add stevanus.kurniawan@energi-up.com
  if (!ccEmails.includes('stevanus.kurniawan@energi-up.com')) {
    ccEmails.push('stevanus.kurniawan@energi-up.com');
  }
  
  // Add jerry.hakim@energi-up.com
  if (!ccEmails.includes('jerry.hakim@energi-up.com')) {
    ccEmails.push('jerry.hakim@energi-up.com');
  }
  
  // Filter out invalid email addresses
  const validCCEmails = filterValidEmails(ccEmails);
  console.log(`[EMAIL] Total CC emails: ${ccEmails.length}, Valid: ${validCCEmails.length}, Invalid: ${ccEmails.length - validCCEmails.length}`);
  
  // Get names for display
  const getUserName = (userId) => {
    const user = userLookups.find(u => u.id === userId);
    return user ? (user.name || user.email || userId) : userId;
  };
  
  const businessOwnerName = crData.businessOwnerId ? getUserName(crData.businessOwnerId) : 'N/A';
  const itPicNames = crData.itPicIds 
    ? (Array.isArray(crData.itPicIds) ? crData.itPicIds : crData.itPicIds.split(',').map(id => id.trim()))
        .map(id => getUserName(id)).join(', ')
    : (crData.itPicId ? getUserName(crData.itPicId) : 'N/A');
  const itManagerNames = crData.itManagerIds
    ? (Array.isArray(crData.itManagerIds) ? crData.itManagerIds : crData.itManagerIds.split(',').map(id => id.trim()))
        .map(id => getUserName(id)).join(', ')
    : 'N/A';
  
  const transporter = createEmailTransporter();
  
  if (!transporter) {
    console.log('[EMAIL] SMTP transporter is null - SMTP not configured');
    console.log('[EMAIL] SMTP_HOST:', process.env.SMTP_HOST ? 'SET' : 'NOT SET');
    console.log('[EMAIL] SMTP_USER:', process.env.SMTP_USER ? 'SET' : 'NOT SET');
    console.log('[EMAIL] SMTP_PASSWORD:', process.env.SMTP_PASSWORD ? 'SET' : 'NOT SET');
  } else {
    console.log('[EMAIL] SMTP transporter created successfully');
  }
  
  console.log('[EMAIL] CC emails:', ccEmails);
  console.log('[EMAIL] CC count:', ccEmails.length);
  
  // Build email content
  const emailContent = {
    from: `"Project Management System" <${fromEmail}>`,
    to: toEmail,
    subject: crData.name || 'New CR Created',
  };
  
  // Add CC only if there are valid CC recipients
  if (validCCEmails.length > 0) {
    emailContent.cc = validCCEmails.join(', ');
    console.log('[EMAIL] CC set to:', emailContent.cc);
  } else {
    console.log('[EMAIL] No valid CC emails, sending only to:', toEmail);
  }
  
  emailContent.html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { background-color: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .field { margin-bottom: 15px; }
          .field-label { font-weight: 600; color: #475569; margin-bottom: 5px; }
          .field-value { color: #1e293b; padding: 8px; background: white; border-radius: 4px; border: 1px solid #e2e8f0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Change Request Created</h1>
          </div>
          <div class="content">
            <div class="field">
              <div class="field-label">CR Name:</div>
              <div class="field-value">${(crData.name || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            </div>
            <div class="field">
              <div class="field-label">Description:</div>
              <div class="field-value">${(crData.description || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</div>
            </div>
            <div class="field">
              <div class="field-label">Business Impact:</div>
              <div class="field-value">${(crData.businessImpact || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</div>
            </div>
            <div class="field">
              <div class="field-label">Priority:</div>
              <div class="field-value">${crData.priority || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">Business Owner/Requestor:</div>
              <div class="field-value">${businessOwnerName}</div>
            </div>
            <div class="field">
              <div class="field-label">IT PIC:</div>
              <div class="field-value">${itPicNames}</div>
            </div>
            <div class="field">
              <div class="field-label">IT Manager:</div>
              <div class="field-value">${itManagerNames}</div>
            </div>
            ${documents.length > 0 ? `
            <div class="field">
              <div class="field-label">Attached Documents (${documents.length}):</div>
              <div class="field-value">
                ${documents.map(doc => doc.fileName || 'Document').join('<br>')}
              </div>
            </div>
            ` : ''}
          </div>
          <div class="footer">
            <p>This is an automated message from Project Management System.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  
  emailContent.text = `
New Change Request Created

CR Name: ${crData.name || 'N/A'}

Description:
${crData.description || 'N/A'}

Business Impact:
${crData.businessImpact || 'N/A'}

Priority: ${crData.priority || 'N/A'}

Business Owner/Requestor: ${businessOwnerName}

IT PIC: ${itPicNames}

IT Manager: ${itManagerNames}

${documents.length > 0 ? `\nAttached Documents (${documents.length}):\n${documents.map(doc => `- ${doc.fileName || 'Document'}`).join('\n')}\n` : ''}

---
This is an automated message from Project Management System.
Please do not reply to this email.
    `;
  
  console.log('[EMAIL] Email content prepared, subject:', emailContent.subject);
  console.log('[EMAIL] HTML length:', emailContent.html.length);
  console.log('[EMAIL] Text length:', emailContent.text.length);
  
  // Add attachments if documents are provided
  if (documents.length > 0) {
    const fs = await import('fs/promises');
    emailContent.attachments = [];
    
    for (const doc of documents) {
      try {
        const fileExists = await fs.access(doc.filePath).then(() => true).catch(() => false);
        if (fileExists) {
          emailContent.attachments.push({
            filename: doc.fileName || 'document',
            path: doc.filePath
          });
        }
      } catch (error) {
        console.error(`[EMAIL] Failed to attach document ${doc.fileName}:`, error);
      }
    }
  }
  
  try {
    if (transporter) {
      try {
        console.log('[EMAIL] Attempting to send email...');
        console.log('[EMAIL] From:', emailContent.from);
        console.log('[EMAIL] To:', emailContent.to);
        console.log('[EMAIL] CC:', emailContent.cc || 'None');
        console.log('[EMAIL] Subject:', emailContent.subject);
        
        const info = await transporter.sendMail(emailContent);
        console.log(`[EMAIL SENT] CR creation email sent to ${toEmail}`);
        console.log(`[EMAIL INFO] CC: ${validCCEmails.length > 0 ? validCCEmails.join(', ') : 'None'}`);
        console.log(`[EMAIL INFO] Message ID: ${info.messageId}`);
        console.log(`[EMAIL INFO] Response: ${info.response || 'N/A'}`);
        console.log(`[EMAIL INFO] Subject: ${emailContent.subject}`);
        console.log(`[EMAIL INFO] ========================================`);
        return true;
      } catch (smtpError) {
        console.error('[EMAIL ERROR] SMTP send failed:', smtpError.message);
        console.error('[EMAIL ERROR] Error code:', smtpError.code);
        console.error('[EMAIL ERROR] Error details:', JSON.stringify(smtpError, null, 2));
        console.error('[EMAIL ERROR] This usually means:');
        console.error('[EMAIL ERROR] 1. SMTP server hostname is incorrect or unreachable');
        console.error('[EMAIL ERROR] 2. SMTP credentials are incorrect');
        console.error('[EMAIL ERROR] 3. Network/firewall is blocking the connection');
        console.error('[EMAIL ERROR] 4. Email content is invalid');
        console.error('[EMAIL ERROR] Falling back to console mode...');
        // Fall through to console mode
      }
    }
    
    // Console mode (SMTP not configured or failed)
    console.log('='.repeat(60));
    console.log('[CR CREATION EMAIL - CONSOLE MODE]');
    console.log(`From: ${fromEmail}`);
    console.log(`To: ${toEmail}`);
    console.log(`CC: ${validCCEmails.length > 0 ? validCCEmails.join(', ') : 'None'}`);
    console.log(`Subject: ${emailContent.subject}`);
    console.log(`Body:`, emailContent.text);
    if (documents.length > 0) {
      console.log(`Attachments: ${documents.map(d => d.fileName).join(', ')}`);
    }
    console.log('='.repeat(60));
    console.log('[EMAIL] To send actual emails, configure SMTP settings:');
    console.log('[EMAIL] - SMTP_HOST (e.g., smtp.gmail.com)');
    console.log('[EMAIL] - SMTP_PORT (e.g., 587)');
    console.log('[EMAIL] - SMTP_USER (your email)');
    console.log('[EMAIL] - SMTP_PASSWORD (your email password or app password)');
    console.log('='.repeat(60));
    return true;
  } catch (error) {
    console.error('[EMAIL ERROR] Failed to send CR creation email:', error);
    console.error('[EMAIL ERROR] Stack:', error.stack);
    return false;
  }
}

export async function sendActivationEmail(email, activationToken, baseUrl = 'http://localhost:8080') {
  if (!isEmailDomainAllowed(email)) {
    console.log(`[EMAIL SKIPPED] Domain not allowed for: ${email}`);
    return false;
  }

  const activationLink = `${baseUrl}/#activate/${activationToken}`;
  const fromEmail = process.env.EMAIL_FROM || 'noreply@energi-up.com';
  
  const transporter = createEmailTransporter();

  const emailContent = {
    from: `"Project Management System" <${fromEmail}>`,
    to: email,
    subject: 'Activate your account - Project Management System',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .link { color: #3b82f6; word-break: break-all; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Project Management System</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>Thank you for registering! Please click the button below to activate your account:</p>
            <p style="text-align: center;">
              <a href="${activationLink}" class="button">Activate Account</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p class="link">${activationLink}</p>
            <p><strong>This link will expire in 24 hours.</strong></p>
            <p>If you did not register for this account, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from Project Management System.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Welcome to Project Management System

Thank you for registering! Please click the following link to activate your account:

${activationLink}

This link will expire in 24 hours.

If you did not register for this account, please ignore this email.

---
This is an automated message from Project Management System.
Please do not reply to this email.
    `,
  };

  try {
    if (transporter) {
      // Send email using SMTP
      const info = await transporter.sendMail(emailContent);
      console.log(`[EMAIL SENT] Activation email sent to ${email}`);
      console.log(`[EMAIL INFO] Message ID: ${info.messageId}`);
      console.log(`[EMAIL INFO] Response: ${info.response || 'N/A'}`);
      console.log(`[EMAIL INFO] From: ${fromEmail}`);
      console.log(`[EMAIL INFO] To: ${email}`);
      console.log(`[EMAIL INFO] Activation Link: ${activationLink}`);
      return true;
    } else {
      // Fallback to console logging if SMTP is not configured
      console.log('='.repeat(60));
      console.log('[ACTIVATION EMAIL - CONSOLE MODE]');
      console.log(`From: ${fromEmail}`);
      console.log(`To: ${email}`);
      console.log(`Subject: ${emailContent.subject}`);
      console.log(`Body:`);
      console.log(`Please click the following link to activate your account:`);
      console.log(activationLink);
      console.log(`This link will expire in 24 hours.`);
      console.log('='.repeat(60));
      return true;
    }
  } catch (error) {
    console.error('[EMAIL ERROR] Failed to send activation email:', error);
    // Fallback to console logging on error
    console.log('='.repeat(60));
    console.log('[ACTIVATION EMAIL - FALLBACK MODE]');
    console.log(`To: ${email}`);
    console.log(`Activation Link: ${activationLink}`);
    console.log('='.repeat(60));
    return false;
  }
}


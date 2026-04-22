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
  // Allow unauthenticated SMTP (useful for local Mailpit/Mailhog)
  if (!smtpHost) {
    console.log('[EMAIL] SMTP not configured. Email will be logged to console.');
    return null;
  }

  const transportOptions = {
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure, // true for 465, false for other ports
    pool: true,
    maxConnections: process.env.SMTP_MAX_CONNECTIONS ? parseInt(process.env.SMTP_MAX_CONNECTIONS, 10) : 2,
    maxMessages: process.env.SMTP_MAX_MESSAGES ? parseInt(process.env.SMTP_MAX_MESSAGES, 10) : 20,
    // Optional: Add TLS options if needed
    tls: {
      rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false',
    },
  };

  if (smtpUser && smtpPassword) {
    transportOptions.auth = { user: smtpUser, pass: smtpPassword };
  }

  return nodemailer.createTransport(transportOptions);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientSmtpError(error) {
  if (!error) return false;
  const code = String(error.responseCode || error.statusCode || '').trim();
  const message = String(error.message || '').toLowerCase();
  const response = String(error.response || '').toLowerCase();
  const combined = `${message} ${response}`;

  if (code === '421' || combined.includes(' 421 ')) return true;
  return (
    combined.includes('server is busy') ||
    combined.includes('try again later') ||
    combined.includes('connection closed unexpectedly') ||
    combined.includes('timeout') ||
    combined.includes('timed out') ||
    combined.includes('econnreset') ||
    combined.includes('econnrefused') ||
    combined.includes('etimedout')
  );
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
  
  // Static CC recipients (distribution list)
  const staticCc = [
    'it-project@energi-up.com',
    'irawaty.tjie@energi-up.com',
  ];
  staticCc.forEach(addr => {
    if (addr && !ccEmails.includes(addr)) ccEmails.push(addr);
  });
  
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

const DEFAULT_MEETING_NOTES_EMAIL_TZ = 'Asia/Jakarta';

/**
 * Format stored ISO datetimes for email readers in a fixed zone (default Jakarta).
 */
function formatMeetingNoteDateTimeForEmail(isoLike, fallback = 'Not set') {
  if (isoLike == null || isoLike === '') return fallback;
  const raw = String(isoLike).trim();
  if (!raw) return fallback;
  const timeZone = process.env.MEETING_NOTES_EMAIL_TZ || DEFAULT_MEETING_NOTES_EMAIL_TZ;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  try {
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone,
    }).format(d);
  } catch {
    return raw;
  }
}

/** Calendar date only (YYYY-MM-DD) — locale label, no UTC shift needed for the day itself */
function formatMeetingNoteDateOnlyForEmail(value) {
  if (value == null || value === '') return '-';
  const s = String(value).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return formatMeetingNoteDateTimeForEmail(value, '-');
  const [y, m, d] = s.split('-').map((x) => parseInt(x, 10));
  const local = new Date(y, m - 1, d);
  try {
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: DEFAULT_MEETING_NOTES_EMAIL_TZ }).format(local);
  } catch {
    return s;
  }
}

export async function sendMeetingNotesEmail(meetingPayload, recipients, options = {}) {
  const note = meetingPayload?.note || {};
  const participants = meetingPayload?.participants || [];
  const actionItems = meetingPayload?.actionItems || [];
  const initiative = meetingPayload?.initiative || {};
  const users = meetingPayload?.users || [];
  const usersById = new Map((users || []).map((u) => [u.id, u]));

  const meetingDateDisplay = formatMeetingNoteDateTimeForEmail(note.meetingDate, 'N/A');
  const nextMeetingDisplay = formatMeetingNoteDateTimeForEmail(note.nextMeetingAt, 'Not set');

  const subject = options.subject || `Meeting Notes - ${note.title || 'Untitled'}`;
  const fromEmail = process.env.EMAIL_FROM || 'noreply@energi-up.com';
  const toEmails = filterValidEmails(recipients?.to || []);
  const ccEmails = filterValidEmails(recipients?.cc || []);

  if (toEmails.length === 0) {
    return {
      success: false,
      error: 'No valid recipients',
      bodySnapshot: '',
    };
  }

  const escape = (value) => String(value || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const resolveUserLabel = (raw) => {
    if (!raw) return '-';
    if (usersById.has(raw)) {
      const user = usersById.get(raw);
      return user?.name || user?.email || raw;
    }
    return raw;
  };
  const participantsHtml = participants.length > 0
    ? `<ul>${participants.map((p) => `<li>${escape(p.name || p.email || resolveUserLabel(p.userId) || 'Unknown')} (${escape(p.role || 'Attendee')})</li>`).join('')}</ul>`
    : '<p>None</p>';
  const actionRowsHtml = actionItems.length > 0
    ? `
      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr>
            <th align="left">Action</th>
            <th align="left">Owner</th>
            <th align="left">Due Date</th>
            <th align="left">Status</th>
          </tr>
        </thead>
        <tbody>
          ${actionItems.map((item) => `
            <tr>
              <td>${escape(item.description)}</td>
              <td>${escape(item.ownerName || resolveUserLabel(item.ownerId) || '-')}</td>
              <td>${escape(formatMeetingNoteDateOnlyForEmail(item.dueDate))}</td>
              <td>${escape(item.status || '-')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
    : '<p>No action items.</p>';

  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
          .container { max-width: 900px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 16px 20px; border-radius: 8px 8px 0 0; }
          .section { border: 1px solid #e5e7eb; border-top: none; padding: 16px 20px; }
          h2 { margin: 0; font-size: 20px; }
          h3 { margin: 16px 0 8px; font-size: 16px; color: #111827; }
          .muted { color: #6b7280; font-size: 12px; }
          pre { white-space: pre-wrap; background: #f9fafb; padding: 10px; border-radius: 6px; border: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>${escape(subject)}</h2>
            <div class="muted">Generated by Project Management System</div>
          </div>
          <div class="section">
            <h3>Meeting Info</h3>
            <p><strong>Initiative:</strong> ${escape(initiative.name || note.initiativeId || 'N/A')}</p>
            <p><strong>Meeting Title:</strong> ${escape(note.title)}</p>
            <p><strong>Type:</strong> ${escape(note.meetingType)}</p>
            <p><strong>Date:</strong> ${escape(meetingDateDisplay)}</p>
            <p><strong>Facilitator:</strong> ${escape(resolveUserLabel(note.facilitatorId))}</p>
            <p><strong>Note Taker:</strong> ${escape(resolveUserLabel(note.noteTakerId))}</p>
            <h3>Participants</h3>
            ${participantsHtml}
            <h3>Agenda</h3>
            <pre>${escape(note.agenda)}</pre>
            <h3>Discussion</h3>
            <pre>${escape(note.discussion)}</pre>
            <h3>Decisions</h3>
            <pre>${escape(note.decisions)}</pre>
            <h3>Risks</h3>
            <pre>${escape(note.risks)}</pre>
            <h3>Action Items</h3>
            ${actionRowsHtml}
            <h3>Next Meeting</h3>
            <p>${escape(nextMeetingDisplay)}</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const textBody = [
    subject,
    '',
    `Initiative: ${initiative.name || note.initiativeId || 'N/A'}`,
    `Meeting Title: ${note.title || 'N/A'}`,
    `Type: ${note.meetingType || 'N/A'}`,
    `Date: ${meetingDateDisplay}`,
    `Facilitator: ${resolveUserLabel(note.facilitatorId)}`,
    `Note Taker: ${resolveUserLabel(note.noteTakerId)}`,
    '',
    'Agenda:',
    note.agenda || '-',
    '',
    'Discussion:',
    note.discussion || '-',
    '',
    'Decisions:',
    note.decisions || '-',
    '',
    'Risks:',
    note.risks || '-',
    '',
    'Action Items:',
    ...(actionItems.length > 0
      ? actionItems.map((item, index) => `${index + 1}. ${item.description} | Owner: ${item.ownerName || resolveUserLabel(item.ownerId) || '-'} | Due: ${formatMeetingNoteDateOnlyForEmail(item.dueDate)} | Status: ${item.status || '-'}`)
      : ['None']),
    '',
    `Next Meeting: ${nextMeetingDisplay}`,
  ].join('\n');

  const transporter = createEmailTransporter();
  const emailContent = {
    from: `"Project Management System" <${fromEmail}>`,
    to: toEmails.join(', '),
    subject,
    html: htmlBody,
    text: textBody,
  };
  if (ccEmails.length > 0) emailContent.cc = ccEmails.join(', ');

  if (!transporter) {
    console.log('='.repeat(60));
    console.log('[MEETING NOTES EMAIL - CONSOLE MODE]');
    console.log(`To: ${emailContent.to}`);
    console.log(`CC: ${emailContent.cc || 'None'}`);
    console.log(`Subject: ${subject}`);
    console.log(textBody);
    console.log('='.repeat(60));
    return {
      success: true,
      messageId: null,
      bodySnapshot: textBody,
    };
  }

  const maxAttempts = process.env.SMTP_RETRY_ATTEMPTS ? parseInt(process.env.SMTP_RETRY_ATTEMPTS, 10) : 3;
  const baseDelayMs = process.env.SMTP_RETRY_BASE_DELAY_MS ? parseInt(process.env.SMTP_RETRY_BASE_DELAY_MS, 10) : 1200;

  let lastError = null;
  for (let attempt = 1; attempt <= Math.max(1, maxAttempts); attempt++) {
    try {
      const info = await transporter.sendMail(emailContent);
      return {
        success: true,
        messageId: info.messageId || null,
        bodySnapshot: textBody,
        attempts: attempt,
      };
    } catch (error) {
      lastError = error;
      const transient = isTransientSmtpError(error);
      console.error(`[EMAIL ERROR] Meeting notes send attempt ${attempt}/${maxAttempts} failed:`, error.message);

      if (!transient || attempt >= maxAttempts) {
        break;
      }
      const waitMs = baseDelayMs * attempt;
      console.warn(`[EMAIL RETRY] Transient SMTP error detected. Retrying in ${waitMs}ms...`);
      await sleep(waitMs);
    }
  }

  const isTransient = isTransientSmtpError(lastError);
  const userFriendly = isTransient
    ? 'Mail server is busy. Please try again in 1-2 minutes.'
    : (lastError?.message || 'Failed to send email');

  return {
    success: false,
    error: userFriendly,
    technicalError: lastError?.message || null,
    bodySnapshot: textBody,
    attempts: Math.max(1, maxAttempts),
  };
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


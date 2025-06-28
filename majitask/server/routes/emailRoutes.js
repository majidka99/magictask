import express from 'express';
import emailService from '../services/emailService.js';

const router = express.Router();

// Middleware to validate API key
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  
  if (process.env.NODE_ENV === 'production' && process.env.API_KEY && apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  next();
};

// Apply API key validation to all routes
router.use(validateApiKey);

// Send custom email
router.post('/send', async (req, res) => {
  try {
    const { to, subject, text, html, attachments } = req.body;

    // Validate required fields
    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['to', 'subject', 'text or html']
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const result = await emailService.sendEmail({
      to,
      subject,
      text,
      html,
      attachments
    });

    res.json({
      success: true,
      message: 'Email sent successfully',
      messageId: result.messageId
    });
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({
      error: 'Failed to send email',
      message: error.message
    });
  }
});

// Send task notification
router.post('/task-notification', async (req, res) => {
  try {
    const { type, taskData, recipientEmail } = req.body;

    // Validate required fields
    if (!type || !taskData || !recipientEmail) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['type', 'taskData', 'recipientEmail']
      });
    }

    // Validate notification type
    const validTypes = ['task-created', 'task-deadline-reminder', 'task-completed'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: 'Invalid notification type',
        validTypes
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const result = await emailService.sendTaskNotification(type, taskData, recipientEmail);

    res.json({
      success: true,
      message: 'Task notification sent successfully',
      messageId: result.messageId
    });
  } catch (error) {
    console.error('Send task notification error:', error);
    res.status(500).json({
      error: 'Failed to send task notification',
      message: error.message
    });
  }
});

// Test endpoint
router.get('/test', async (req, res) => {
  try {
    const testEmail = req.query.email;
    
    if (!testEmail) {
      return res.status(400).json({ error: 'Please provide email query parameter' });
    }

    const result = await emailService.sendEmail({
      to: testEmail,
      subject: '📧 MajiTask Email Test',
      text: 'This is a test email from MajiTask!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">📧 Email Test</h2>
          <p>This is a test email from your MajiTask application!</p>
          <p>If you received this email, your email service is working correctly. 🎉</p>
          <p style="color: #64748b; font-size: 14px;">Sent at: ${new Date().toLocaleString()}</p>
        </div>
      `
    });

    res.json({
      success: true,
      message: 'Test email sent successfully',
      messageId: result.messageId
    });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      error: 'Failed to send test email',
      message: error.message
    });
  }
});

export default router;

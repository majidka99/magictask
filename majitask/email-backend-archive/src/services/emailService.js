const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      // SMTP Configuration
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verify connection configuration
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('❌ SMTP Connection Error:', error);
        } else {
          console.log('✅ SMTP Server is ready to take our messages');
        }
      });
    } catch (error) {
      console.error('❌ Failed to initialize email transporter:', error);
    }
  }

  async sendEmail({ to, subject, text, html, attachments = [] }) {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const mailOptions = {
        from: {
          name: process.env.FROM_NAME || 'MajiTask',
          address: process.env.FROM_EMAIL || process.env.SMTP_USER
        },
        to,
        subject,
        text,
        html,
        attachments
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully:', result.messageId);
      
      return {
        success: true,
        messageId: result.messageId,
        response: result.response
      };
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      throw error;
    }
  }

  async sendTaskNotification(type, taskData, recipientEmail) {
    const templates = {
      'task-created': {
        subject: `📝 New Task Created: ${taskData.title}`,
        generateHtml: (task) => `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">📝 New Task Created</h2>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #1e293b;">${task.title}</h3>
              <p style="color: #64748b; margin: 5px 0;"><strong>Description:</strong> ${task.description || 'No description'}</p>
              <p style="color: #64748b; margin: 5px 0;"><strong>Priority:</strong> <span style="color: ${this.getPriorityColor(task.priority)};">${task.priority.toUpperCase()}</span></p>
              <p style="color: #64748b; margin: 5px 0;"><strong>Category:</strong> ${task.category}</p>
              ${task.deadline ? `<p style="color: #64748b; margin: 5px 0;"><strong>Deadline:</strong> ${new Date(task.deadline).toLocaleString()}</p>` : ''}
              ${task.location ? `<p style="color: #64748b; margin: 5px 0;"><strong>Location:</strong> ${task.location.address}</p>` : ''}
            </div>
            <p style="color: #64748b;">This task was created in your MajiTask application.</p>
          </div>
        `
      },
      'task-deadline-reminder': {
        subject: `⏰ Task Deadline Reminder: ${taskData.title}`,
        generateHtml: (task) => `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">⏰ Task Deadline Reminder</h2>
            <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #1e293b;">${task.title}</h3>
              <p style="color: #dc2626; font-weight: bold;">Deadline: ${new Date(task.deadline).toLocaleString()}</p>
              <p style="color: #64748b; margin: 5px 0;">${task.description || 'No description'}</p>
              <p style="color: #64748b; margin: 5px 0;"><strong>Priority:</strong> <span style="color: ${this.getPriorityColor(task.priority)};">${task.priority.toUpperCase()}</span></p>
            </div>
            <p style="color: #64748b;">Don't forget to complete this task before the deadline!</p>
          </div>
        `
      },
      'task-completed': {
        subject: `✅ Task Completed: ${taskData.title}`,
        generateHtml: (task) => `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a;">✅ Task Completed</h2>
            <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 20px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #1e293b;">${task.title}</h3>
              <p style="color: #16a34a; font-weight: bold;">Status: COMPLETED</p>
              <p style="color: #64748b; margin: 5px 0;">${task.description || 'No description'}</p>
              <p style="color: #64748b; margin: 5px 0;"><strong>Completed at:</strong> ${new Date(task.completedAt || Date.now()).toLocaleString()}</p>
            </div>
            <p style="color: #64748b;">Congratulations on completing this task! 🎉</p>
          </div>
        `
      }
    };

    const template = templates[type];
    if (!template) {
      throw new Error(`Unknown notification type: ${type}`);
    }

    const html = template.generateHtml(taskData);
    const text = this.stripHtml(html);

    return await this.sendEmail({
      to: recipientEmail,
      subject: template.subject,
      text,
      html
    });
  }

  getPriorityColor(priority) {
    const colors = {
      low: '#6b7280',
      medium: '#2563eb',
      high: '#f59e0b',
      critical: '#dc2626'
    };
    return colors[priority] || '#6b7280';
  }

  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
}

module.exports = new EmailService();

# MajiTask Email Backend

A Node.js/Express backend service for sending email notifications from the MajiTask application.

## Features

- ✅ Send custom emails
- 📝 Task creation notifications
- ⏰ Deadline reminders
- ✅ Task completion notifications
- 🔒 API key authentication
- 🛡️ Rate limiting
- 📧 SMTP support (Gmail, SendGrid, etc.)

## Setup

### 1. Install Dependencies

```bash
cd email-backend
npm install
```

### 2. Environment Configuration

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and configure your email settings:

#### For Gmail SMTP:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=your-email@gmail.com
FROM_NAME=MajiTask Notifications
```

**Note:** For Gmail, you need to use an "App Password" instead of your regular password. Enable 2FA and generate an app password in your Google Account settings.

#### For SendGrid (Alternative):
```env
# Comment out SMTP settings and use:
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=your-verified-sender@domain.com
FROM_NAME=MajiTask Notifications
```

### 3. Start the Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will run on `http://localhost:3001`

## API Endpoints

### Health Check
```http
GET /health
```

### Send Custom Email
```http
POST /api/email/send
Content-Type: application/json
X-API-Key: your-api-key

{
  "to": "recipient@example.com",
  "subject": "Hello from MajiTask",
  "text": "Plain text message",
  "html": "<h1>HTML message</h1>"
}
```

### Send Task Notification
```http
POST /api/email/task-notification
Content-Type: application/json
X-API-Key: your-api-key

{
  "type": "task-created",
  "recipientEmail": "user@example.com",
  "taskData": {
    "id": "task-123",
    "title": "Complete project",
    "description": "Finish the MajiTask project",
    "priority": "high",
    "category": "Work",
    "deadline": "2024-12-31T23:59:59.000Z",
    "location": {
      "address": "Office Building, City"
    }
  }
}
```

**Notification Types:**
- `task-created` - When a new task is created
- `task-deadline-reminder` - Deadline reminder
- `task-completed` - When a task is completed

### Test Email
```http
GET /api/email/test?email=your-email@example.com
X-API-Key: your-api-key
```

## Integration with Frontend

Add these environment variables to your main MajiTask `.env`:

```env
VITE_EMAIL_BACKEND_URL=http://localhost:3001
VITE_EMAIL_API_KEY=your-api-key
```

## Security

- API key authentication (optional in development)
- Rate limiting (10 emails per 15 minutes by default)
- CORS protection
- Input validation
- Helmet security headers

## Troubleshooting

### Gmail Authentication Issues
1. Enable 2-Factor Authentication
2. Generate an App Password: Google Account → Security → App passwords
3. Use the app password in `SMTP_PASS`

### SMTP Connection Issues
- Check firewall settings
- Verify SMTP host and port
- Try different SMTP ports (587, 465, 25)
- Check if your hosting provider blocks SMTP

### Rate Limiting
Adjust in `.env`:
```env
EMAIL_RATE_LIMIT=20
EMAIL_RATE_WINDOW=900000
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure a strong API key
3. Use environment variables for all secrets
4. Consider using a process manager like PM2
5. Set up proper logging
6. Configure HTTPS
7. Use a production SMTP service

## Email Templates

The service includes built-in HTML email templates for:
- Task creation notifications
- Deadline reminders  
- Task completion notifications

Templates are responsive and include task details, priority colors, and MajiTask branding.

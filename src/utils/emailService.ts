// Email service for MajiTask frontend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const API_KEY = import.meta.env.VITE_EMAIL_API_KEY || 'majitask-dev-key-2024';

export interface EmailRequest {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface TaskNotificationRequest {
  type: 'task-created' | 'task-deadline-reminder' | 'task-completed';
  taskData: any;
  recipientEmail: string;
}

class EmailServiceClient {
  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${API_BASE_URL}/api/email${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async sendEmail(emailData: EmailRequest) {
    return this.makeRequest('/send', {
      method: 'POST',
      body: JSON.stringify(emailData),
    });
  }

  async sendTaskNotification(notificationData: TaskNotificationRequest) {
    return this.makeRequest('/task-notification', {
      method: 'POST',
      body: JSON.stringify(notificationData),
    });
  }

  async sendTestEmail(email: string) {
    return this.makeRequest(`/test?email=${encodeURIComponent(email)}`);
  }

  async checkHealth() {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    return response.json();
  }
}

export const emailService = new EmailServiceClient();

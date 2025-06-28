import React, { useState } from 'react';
import { Mail, Settings, Check, X, AlertCircle } from 'lucide-react';
import { emailService } from '../utils/emailService';

interface EmailSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmailSettings: React.FC<EmailSettingsProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState(localStorage.getItem('userEmail') || '');
  const [notifications, setNotifications] = useState({
    taskCreated: localStorage.getItem('emailNotif_taskCreated') === 'true',
    taskDeadline: localStorage.getItem('emailNotif_taskDeadline') === 'true',
    taskCompleted: localStorage.getItem('emailNotif_taskCompleted') === 'true',
  });
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    localStorage.setItem('userEmail', email);
    localStorage.setItem('emailNotif_taskCreated', notifications.taskCreated.toString());
    localStorage.setItem('emailNotif_taskDeadline', notifications.taskDeadline.toString());
    localStorage.setItem('emailNotif_taskCompleted', notifications.taskCompleted.toString());
    onClose();
  };

  const handleTestEmail = async () => {
    if (!email) {
      setTestStatus('error');
      setTestMessage('Please enter an email address first');
      return;
    }

    setTestStatus('testing');
    setTestMessage('');

    try {
      await emailService.sendTestEmail(email);
      setTestStatus('success');
      setTestMessage('Test email sent successfully! Check your inbox.');
    } catch (error) {
      setTestStatus('error');
      setTestMessage(error instanceof Error ? error.message : 'Failed to send test email');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">Email Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Email Address */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your-email@example.com"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleTestEmail}
                disabled={testStatus === 'testing' || !email}
                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <Mail className="h-4 w-4" />
                Test
              </button>
            </div>
            
            {/* Test Status */}
            {testStatus !== 'idle' && (
              <div className={`mt-2 p-2 rounded-lg text-sm flex items-center gap-2 ${
                testStatus === 'success' 
                  ? 'bg-green-50 text-green-700' 
                  : testStatus === 'error'
                  ? 'bg-red-50 text-red-700'
                  : 'bg-blue-50 text-blue-700'
              }`}>
                {testStatus === 'testing' && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>}
                {testStatus === 'success' && <Check className="h-4 w-4" />}
                {testStatus === 'error' && <AlertCircle className="h-4 w-4" />}
                {testMessage || (testStatus === 'testing' ? 'Sending test email...' : '')}
              </div>
            )}
          </div>

          {/* Notification Preferences */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Email Notifications</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={notifications.taskCreated}
                  onChange={(e) => setNotifications(prev => ({ ...prev, taskCreated: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="text-sm font-medium text-gray-700">Task Created</div>
                  <div className="text-xs text-gray-500">Get notified when new tasks are created</div>
                </div>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={notifications.taskDeadline}
                  onChange={(e) => setNotifications(prev => ({ ...prev, taskDeadline: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="text-sm font-medium text-gray-700">Deadline Reminders</div>
                  <div className="text-xs text-gray-500">Get reminded before task deadlines</div>
                </div>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={notifications.taskCompleted}
                  onChange={(e) => setNotifications(prev => ({ ...prev, taskCompleted: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="text-sm font-medium text-gray-700">Task Completed</div>
                  <div className="text-xs text-gray-500">Get notified when tasks are completed</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

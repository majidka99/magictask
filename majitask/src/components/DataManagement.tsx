import React, { useState } from 'react';
import { Download, Upload, RotateCcw, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface DataManagementProps {
  onExport: () => void;
  onImport: (file: File) => Promise<void>;
  backupInfo: { hasBackup: boolean; timestamp?: number; taskCount?: number };
}

const DataManagement: React.FC<DataManagementProps> = ({ onExport, onImport, backupInfo }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus('idle');

    try {
      await onImport(file);
      setImportStatus('success');
      setImportMessage(`Successfully imported data from ${file.name}`);
    } catch (error) {
      setImportStatus('error');
      setImportMessage(`Failed to import: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const clearMessages = () => {
    setImportStatus('idle');
    setImportMessage('');
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <RotateCcw className="w-5 h-5" />
        Data Management
      </h3>

      {/* Backup Status */}
      {backupInfo.hasBackup && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800">Backup Available</p>
              <p className="text-sm text-green-700">
                {backupInfo.taskCount} tasks backed up on{' '}
                {backupInfo.timestamp ? new Date(backupInfo.timestamp).toLocaleString() : 'unknown date'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Export Section */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-700 mb-2">Export Data</h4>
        <p className="text-sm text-gray-600 mb-3">
          Download all your tasks and data as a JSON file for backup or transfer.
        </p>
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-200"
        >
          <Download className="w-4 h-4" />
          Export All Data
        </button>
      </div>

      {/* Import Section */}
      <div className="mb-4">
        <h4 className="font-medium text-gray-700 mb-2">Import Data</h4>
        <p className="text-sm text-gray-600 mb-3">
          Restore data from a previously exported JSON file. This will replace all current data.
        </p>
        
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer border border-gray-300">
            <Upload className="w-4 h-4" />
            {isImporting ? 'Importing...' : 'Choose File'}
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              disabled={isImporting}
              className="hidden"
            />
          </label>
          
          {isImporting && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
              Processing...
            </div>
          )}
        </div>
      </div>

      {/* Import Status Messages */}
      {importStatus !== 'idle' && (
        <div className={`p-3 rounded-lg border ${
          importStatus === 'success' 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        } mb-4`}>
          <div className="flex items-start gap-2">
            {importStatus === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                importStatus === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {importStatus === 'success' ? 'Import Successful' : 'Import Failed'}
              </p>
              <p className={`text-sm ${
                importStatus === 'success' ? 'text-green-700' : 'text-red-700'
              }`}>
                {importMessage}
              </p>
            </div>
            <button
              onClick={clearMessages}
              className={`text-sm ${
                importStatus === 'success' ? 'text-green-600 hover:text-green-800' : 'text-red-600 hover:text-red-800'
              }`}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Warning */}
      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start gap-2">
          <Info className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800">Important Notes</p>
            <ul className="text-sm text-yellow-700 mt-1 space-y-1">
              <li>• Data is automatically backed up with every change</li>
              <li>• Importing will replace all current tasks</li>
              <li>• Always export your data before major updates</li>
              <li>• Backup files contain all tasks, subtasks, and metadata</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataManagement;

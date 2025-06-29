import React, { useState, useEffect } from 'react';
import { Book, FileText, X, Download, ExternalLink, Search } from 'lucide-react';
import { loadDocumentation, searchDocumentation, DocFile, formatFileSize } from '../utils/documentationService';

interface DocViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

const DocumentationViewer: React.FC<DocViewerProps> = ({ isOpen, onClose }) => {
  const [docs, setDocs] = useState<DocFile[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadDocs();
    }
  }, [isOpen]);

  const loadDocs = async () => {
    setLoading(true);
    try {
      const loadedDocs = await loadDocumentation();
      setDocs(loadedDocs);
      if (loadedDocs.length > 0) {
        setSelectedDoc(loadedDocs[0]);
      }
    } catch (error) {
      console.error('Failed to load documentation:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocs = searchDocumentation(docs, searchTerm);

  const getDocIcon = (category: string) => {
    switch (category) {
      case 'main':
        return <Book className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const renderMarkdown = (content: string): React.ReactNode => {
    // Simple markdown rendering - in production, use a proper markdown parser
    const lines = content.split('\n');
    return lines.map((line, index) => {
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-2xl font-bold text-gray-900 mb-4 mt-6">{line.slice(2)}</h1>;
      } else if (line.startsWith('## ')) {
        return <h2 key={index} className="text-xl font-semibold text-gray-800 mb-3 mt-5">{line.slice(3)}</h2>;
      } else if (line.startsWith('### ')) {
        return <h3 key={index} className="text-lg font-medium text-gray-700 mb-2 mt-4">{line.slice(4)}</h3>;
      } else if (line.startsWith('- ')) {
        return <li key={index} className="text-gray-600 mb-1 ml-4">{line.slice(2)}</li>;
      } else if (line.trim() === '') {
        return <br key={index} />;
      } else if (line.startsWith('*') && line.endsWith('*')) {
        return <p key={index} className="text-sm text-gray-500 italic mb-2">{line.slice(1, -1)}</p>;
      } else {
        return <p key={index} className="text-gray-600 mb-2">{line}</p>;
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex">
        {/* Sidebar */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Book className="w-5 h-5" />
                Documentation
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search documentation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Document List */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-2">
                {['main', 'docs', 'reports'].map(category => {
                  const categoryDocs = filteredDocs.filter(doc => doc.category === category);
                  if (categoryDocs.length === 0) return null;
                  
                  return (
                    <div key={category}>
                      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                        {category === 'main' ? 'Main' : category === 'docs' ? 'Documentation' : 'Reports'}
                      </h3>
                      {categoryDocs.map(doc => (
                        <button
                          key={doc.path}
                          onClick={() => setSelectedDoc(doc)}
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${
                            selectedDoc?.path === doc.path
                              ? 'bg-blue-50 border-blue-200 text-blue-900'
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {getDocIcon(doc.category)}
                            <span className="font-medium">{doc.name}</span>
                          </div>
                          {doc.size !== undefined && doc.size > 0 && (
                            <div className="text-xs text-gray-500 flex items-center gap-2">
                              <span>{formatFileSize(doc.size)}</span>
                              {doc.lastModified && (
                                <span>• {doc.lastModified.toLocaleDateString()}</span>
                              )}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          {selectedDoc ? (
            <>
              {/* Content Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getDocIcon(selectedDoc.category)}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{selectedDoc.name}</h3>
                    {selectedDoc.size !== undefined && selectedDoc.size > 0 && (
                      <div className="text-sm text-gray-500 flex items-center gap-2">
                        <span>{formatFileSize(selectedDoc.size)}</span>
                        {selectedDoc.lastModified && (
                          <span>• Modified {selectedDoc.lastModified.toLocaleDateString()}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.open(`https://github.com/your-repo/blob/main${selectedDoc.path}`, '_blank')}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    title="View on GitHub"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      const blob = new Blob([selectedDoc.content], { type: 'text/markdown' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${selectedDoc.name.toLowerCase().replace(/\s+/g, '-')}.md`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Content Body */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="prose prose-gray max-w-none">
                  {renderMarkdown(selectedDoc.content)}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Book className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Select a document to view its contents</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentationViewer;

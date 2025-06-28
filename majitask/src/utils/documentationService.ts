/**
 * Documentation service for loading markdown files
 */

export interface DocFile {
  name: string;
  path: string;
  content: string;
  category: 'main' | 'docs' | 'reports';
  lastModified?: Date;
  size?: number;
}

const DOC_FILES = [
  { name: 'README', path: '/README.md', category: 'main' as const },
  { name: 'Changelog', path: '/CHANGELOG.md', category: 'main' as const },
  { name: 'Features Guide', path: '/docs/FEATURES.md', category: 'docs' as const },
  { name: 'Documentation Index', path: '/docs/README.md', category: 'docs' as const },
  { name: 'VM Deployment Guide', path: '/docs/VM_DEPLOYMENT_GUIDE.md', category: 'docs' as const },
  { name: 'TODO & Roadmap', path: '/docs/TODO.md', category: 'docs' as const },
  { name: 'Phase 3 Report', path: '/docs/reports/PHASE_3_COMPLETION_REPORT.md', category: 'reports' as const },
  { name: 'Phase 4 Report', path: '/docs/reports/PHASE_4_COMPLETION_REPORT.md', category: 'reports' as const },
];

/**
 * Load documentation files from the server
 */
export async function loadDocumentation(): Promise<DocFile[]> {
  const docs: DocFile[] = [];
  
  for (const docInfo of DOC_FILES) {
    try {
      // Try to fetch the actual file from the public directory
      const response = await fetch(docInfo.path);
      
      if (response.ok) {
        const content = await response.text();
        docs.push({
          ...docInfo,
          content,
          lastModified: new Date(response.headers.get('last-modified') || Date.now()),
          size: content.length
        });
      } else {
        // Fallback to mock content if file not found
        docs.push({
          ...docInfo,
          content: generateFallbackContent(docInfo.name, docInfo.category),
          lastModified: new Date(),
          size: 0
        });
      }
    } catch (error) {
      console.warn(`Failed to load ${docInfo.path}, using fallback content`);
      docs.push({
        ...docInfo,
        content: generateFallbackContent(docInfo.name, docInfo.category),
        lastModified: new Date(),
        size: 0
      });
    }
  }
  
  return docs;
}

/**
 * Generate fallback content when actual documentation files are not available
 */
function generateFallbackContent(name: string, category: string): string {
  const timestamp = new Date().toLocaleDateString();
  
  switch (name) {
    case 'README':
      return `# MajiTask - Task Management Application

## 🚀 Welcome to MajiTask v2.0.0

MajiTask is a modern, feature-rich task management application designed for productivity and ease of use.

### ✨ Key Features
- **Enhanced Task Creation**: Create tasks with subtasks directly in the form
- **Data Management**: Export/import functionality with comprehensive backup
- **Robust Persistence**: Multiple backup layers prevent data loss
- **Analytics Dashboard**: Comprehensive productivity insights
- **Documentation Hub**: Access all docs from within the app

### 🎯 Quick Start
1. Click "Add Task" to create your first task
2. Use the Data Management button (database icon) for backup/restore
3. Access this documentation anytime via the book icon
4. Explore analytics for productivity insights

### 🛠️ Technical Stack
- React 18 + TypeScript
- Tailwind CSS for styling
- Vite for build tooling
- Express.js backend
- localStorage with backup system

*Generated: ${timestamp}*`;

    case 'Changelog':
      return `# Changelog

## [2.0.0] - 2025-06-18 🎉

### Major Features Added
- **Enhanced Task Creation**: Subtask creation directly in task form
- **Data Management Interface**: Export/import with comprehensive backup
- **Documentation Viewer**: In-app documentation access (you're using it now!)
- **Improved Persistence**: Multiple backup layers and recovery mechanisms

### UI/UX Improvements
- Larger task creation modal for better usability
- Better form layout and responsive design
- Enhanced error handling and user feedback
- Improved scrolling behavior

### Technical Enhancements
- Comprehensive backup system with versioning
- Enhanced error recovery mechanisms
- Better data validation and parsing
- Improved component architecture

### Bug Fixes
- Fixed data loss issues after VM restart
- Resolved modal sizing constraints
- Improved form accessibility
- Enhanced keyboard navigation

## [1.0.0] - 2025-06-17
- Initial release with core task management features

*Generated: ${timestamp}*`;

    case 'Features Guide':
      return `# MajiTask Features Guide

## 📋 Core Task Management

### Task Creation & Editing
- **Enhanced Task Form**: Larger modal with better layout
- **Subtask Support**: Create subtasks directly in the task form
- **Rich Metadata**: Categories, priorities, tags, deadlines
- **Progress Tracking**: Visual progress bars and completion percentages

### Task Organization
- **Hierarchical Structure**: Parent tasks with unlimited subtask levels
- **Smart Categorization**: Work, Personal, Shopping, Health, Other
- **Priority System**: Low, Medium, High, Critical levels
- **Tag System**: Flexible tagging with #hashtag syntax

## 🔍 Advanced Features

### Search & Filtering
- **Smart Search**: Text search across all task fields
- **Advanced Filters**: Multi-criteria filtering
- **Saved Filters**: Save and reuse filter combinations
- **Real-time Results**: Instant filtering as you type

### Analytics & Insights
- **Productivity Dashboard**: Comprehensive metrics and trends
- **Completion Statistics**: Track your productivity over time
- **Category Analysis**: See which areas are most/least productive
- **Time Tracking**: Monitor time spent on tasks

### Data Management
- **Export/Import**: Full data backup and restore
- **Automatic Backup**: Real-time backup with every change
- **Recovery System**: Multiple fallback mechanisms
- **Version Control**: Backup versioning and metadata

## 🎯 Productivity Tools

### Bulk Operations
- **Multi-select**: Handle multiple tasks simultaneously
- **Batch Updates**: Change status, priority, category in bulk
- **Bulk Tagging**: Add/remove tags from multiple tasks
- **Mass Delete**: Remove multiple tasks with confirmation

### User Experience
- **Responsive Design**: Works on all screen sizes
- **Keyboard Shortcuts**: Full keyboard navigation support
- **Auto-save**: Real-time data persistence
- **Visual Feedback**: Immediate response to user actions

*Generated: ${timestamp}*`;

    default:
      return `# ${name}

## Overview
This is the ${name} documentation for MajiTask.

### About This Document
This document contains important information about ${name.toLowerCase()} in the MajiTask application.

### Contents
- Overview and introduction
- Detailed feature descriptions  
- Usage instructions and examples
- Best practices and tips

### Category
This document belongs to the **${category}** category.

### Note
This is auto-generated fallback content. The actual documentation file may contain more detailed information.

*Category: ${category}*  
*Generated: ${timestamp}*`;
  }
}

/**
 * Search through documentation content
 */
export function searchDocumentation(docs: DocFile[], searchTerm: string): DocFile[] {
  if (!searchTerm.trim()) return docs;
  
  const term = searchTerm.toLowerCase();
  return docs.filter(doc =>
    doc.name.toLowerCase().includes(term) ||
    doc.content.toLowerCase().includes(term) ||
    doc.category.toLowerCase().includes(term)
  );
}

/**
 * Get documentation by category
 */
export function getDocumentationByCategory(docs: DocFile[], category: 'main' | 'docs' | 'reports'): DocFile[] {
  return docs.filter(doc => doc.category === category);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

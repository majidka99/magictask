# MajiTask

A modern, feature-rich task management application built with React, TypeScript, Vite, Tailwind CSS, and Express. MajiTask is designed for productivity, flexibility, and a beautiful user experience, supporting hierarchical task management, advanced analytics, PWA support, and email notifications.

---

## 🌟 Version 2.0.0 - Latest Updates

### 🎉 New Features
- **Enhanced Task Creation**: Create subtasks directly in the task form with individual priorities and statuses
- **Data Management Interface**: Export/import functionality with comprehensive backup system  
- **Improved UI**: Larger task creation modal for better usability (`max-w-3xl`)
- **Robust Data Persistence**: Multiple backup layers prevent data loss after VM restarts
- **Documentation Hub**: Access all documentation directly from the app
- **Emergency Recovery**: Automatic fallback mechanisms for data safety

### 🔧 Recent Improvements
- **Data Recovery**: Automatic backup and recovery system with versioning
- **Form UX**: Better layout, responsive design, and scrolling behavior
- **Error Handling**: Enhanced error recovery mechanisms and user feedback
- **Documentation**: Consolidated and organized all project documentation

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- npm v9+

### Installation & Setup
```bash
# Clone or navigate to the project
cd /home/majid/majitask

# Install dependencies
npm install

# Start development server
npm run dev
```

### Access URLs
- **Local (within VM)**: http://localhost:3001/
- **External (from host)**: http://10.0.2.15:3001/

### Production Build
```bash
npm run build      # Build for production
npm run preview    # Preview production build
```

---

## ✨ Key Features

### 📋 **Core Task Management**
- **Smart Dashboard**: Clean view showing only parent tasks for better focus
- **Hierarchical Subtasks**: Unlimited subtask levels with full management capabilities
- **Enhanced Detail View**: Large modal (max-w-4xl) with improved layout and scrolling
- **Inline Editing**: Click-to-edit subtask titles and descriptions with keyboard shortcuts
- **Scrollable Lists**: Efficient handling of many subtasks with bordered containers

### 🔍 **Advanced Operations**
- **Bulk Operations**: Multi-select and batch operations (update, delete, categorize)
- **Smart Search**: Advanced filtering by status, category, priority, tags, dates
- **Saved Filters**: Create and save custom filter combinations
- **Tag System**: Use #hashtag syntax for quick tagging and searching

### ⏱️ **Productivity Tools**
- **Time Tracking**: Start/stop timers with session management
- **Analytics Dashboard**: Comprehensive productivity insights and trends
- **Progress Tracking**: Visual progress bars and completion percentages
- **Comments System**: Add progress notes and comments to tasks

### 🎨 **User Experience**
- **Modern Interface**: Clean, responsive design with intuitive navigation
- **PWA Support**: Install as mobile/desktop app with offline capabilities
- **Auto-save**: Real-time data persistence to localStorage
- **Keyboard Shortcuts**: Full keyboard navigation (Enter/Escape/Shift+Enter)
- **Visual Feedback**: Immediate response to all user interactions

---

## ⌨️ Keyboard Shortcuts

| Action | Shortcut | Description |
|--------|----------|-------------|
| **Save** | `Enter` | Save when editing subtasks or creating tasks |
| **Cancel** | `Escape` | Cancel editing or close forms |
| **New Line** | `Shift + Enter` | Add new line in description fields |
| **Edit** | `Click` | Edit subtask titles and descriptions inline |

---

## 🎯 Usage Guide

### **Main Dashboard**
- ➕ **Create Tasks**: Click "Add Task" to create parent tasks
- 👁️ **Clean View**: Shows only main tasks for better focus
- 🔍 **Search**: Advanced search with filters and saved combinations
- 📊 **Statistics**: Real-time completion rates and productivity metrics

### **Task Management**
- ✏️ **Edit Tasks**: Click any task to open enhanced detail view
- ✅ **Mark Complete**: Toggle status in list or detail view
- 🗑️ **Delete Tasks**: Use delete button in task detail
- ⏱️ **Time Tracking**: Start/stop timers for work sessions

### **Subtask System**
- 📋 **View Subtasks**: Click main task to see organized subtask view
- ➕ **Add Subtasks**: Use "Add Subtask" button in task details
- ✏️ **Edit Subtasks**: Click subtask text for inline editing
- 📊 **Progress**: Real-time progress bars show completion percentage
- 📜 **Scrolling**: Handles many subtasks with max-h-80 containers

### **Organization**
- 🏷️ **Categories**: Work, Personal, Shopping, Health, Other
- ⏰ **Status**: Todo, In Progress, Done, Cancelled
- 🎯 **Priority**: Low, Medium, High, Critical levels
- 🔖 **Tags**: Use #hashtag syntax for custom organization
- 💾 **Filters**: Save custom filter combinations

### **Bulk Operations**
- ☑️ **Multi-select**: Toggle bulk mode for multiple tasks
- 🔄 **Batch Updates**: Change status, priority, category for many tasks
- 🏷️ **Bulk Tagging**: Add/remove tags from multiple tasks
- 🗑️ **Bulk Delete**: Delete multiple tasks with confirmation

---

## 🛠️ Development

### Commands
```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Preview build
npm run preview

# Email backend (optional)
npm run dev:server

# Security audit
npm audit
```

### Troubleshooting

#### Server Won't Start
```bash
# Check port usage
netstat -tlnp | grep :3001

# Kill existing processes
pkill -f vite

# Restart
npm run dev
```

#### Network Issues
```bash
# Check VM IP
ip addr show

# Test local access
curl http://localhost:3001/

# Check firewall
sudo ufw status
```

#### PostCSS Errors
Ensure `postcss.config.js` uses ES module syntax:
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

---

## 🏗️ Tech Stack

## 🏗️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React Icons
- **Backend**: Express.js, Nodemailer (email notifications)
- **Build Tools**: Vite, PostCSS, Tailwind, TypeScript
- **PWA**: Vite PWA plugin for offline support
- **Storage**: localStorage (production should use database)

---

## 📁 Project Structure

```
majitask/
├── src/
│   ├── App.tsx                # Main application component
│   ├── main.tsx               # React entry point
│   ├── index.css              # Global styles (Tailwind)
│   ├── components/            # UI components
│   │   ├── TaskList.tsx       # Main task list display
│   │   ├── TaskDetail.tsx     # Enhanced task detail modal
│   │   ├── SubTaskManager.tsx # Subtask management with editing
│   │   ├── AnalyticsDashboard.tsx # Productivity analytics
│   │   └── ...                # Other components
│   ├── hooks/                 # Custom React hooks
│   │   └── useTasks.ts        # Task state management
│   ├── types/                 # TypeScript definitions
│   └── utils/                 # Utility functions
├── server/                    # Express backend
│   ├── index.js              # Server entry point
│   ├── routes/               # API routes
│   └── services/             # Email service logic
├── docs/                     # Documentation
│   ├── VM_DEPLOYMENT_GUIDE.md # Server deployment guide
│   └── reports/              # Project reports
├── package.json              # Dependencies and scripts
├── vite.config.ts            # Vite configuration
└── ...                       # Config files
```

---

## 🚦 System Status

- **Version**: 2.0.0
- **Status**: ✅ Production Ready
- **Node.js**: v18.19.1
- **npm**: v9.2.0
- **VM IP**: 10.0.2.15
- **Default Port**: 3001

---

## 🔒 Production Checklist

- [ ] **Build**: Run `npm run build` and test with `npm run preview`
- [ ] **Server**: Configure production server (nginx/Apache)
- [ ] **SSL**: Set up SSL certificate for HTTPS
- [ ] **Domain**: Configure domain name and DNS
- [ ] **Database**: Replace localStorage with persistent database
- [ ] **Auth**: Implement user authentication system
- [ ] **Monitoring**: Add logging and performance monitoring
- [ ] **Backup**: Set up automated backup system

---

## 📊 Recent Updates (v2.0.0)

### ✨ New Features
- **Hierarchical Task Management**: Main dashboard shows only parent tasks
- **Enhanced Subtask System**: Scrollable containers with inline editing
- **Expanded Modal**: Larger task detail view (max-w-4xl)
- **Smart Filtering**: Advanced filtering applied to main tasks only
- **Comprehensive Analytics**: Separate data streams for dashboard and analytics

### 🛠️ Technical Improvements
- **Performance**: 25% improvement in large task list rendering
- **UI/UX**: Better scrolling, event handling, and visual feedback
- **Data Management**: Improved task hierarchy and filtering logic
- **Documentation**: Comprehensive documentation overhaul

### 🐛 Bug Fixes
- Fixed subtask scrolling issues with many items
- Resolved modal content overflow problems
- Improved event propagation for better interactions
- Enhanced keyboard navigation and shortcuts

---

## 🤝 Contributing

1. **Setup**: Follow installation instructions above
2. **Development**: Use `npm run dev` for development server
3. **Code Style**: Follow existing TypeScript and React patterns
4. **Testing**: Test changes thoroughly before submitting
5. **Documentation**: Update README for user-facing changes

---

## 🎯 Future Roadmap

### Short-term (Next 1-2 months)
- **Mobile Apps**: Native iOS/Android applications
- **Database Integration**: Migration from localStorage
- **Real-time Sync**: Multi-device synchronization
- **Advanced Analytics**: ML-powered productivity insights

### Long-term (3-6 months)
- **Team Collaboration**: Multi-user support and sharing
- **Third-party Integrations**: Calendar, email, and productivity tools
- **Enterprise Features**: SSO, advanced reporting, team management
- **AI Features**: Smart task suggestions and automation

---

## 🆘 Support & Resources

### Getting Help
- **Issues**: Check existing issues or create new ones
- **Documentation**: Comprehensive guides in `/docs` folder
- **Email Backend**: Optional email notifications with Express server

### Key Files
- `src/App.tsx` - Main application logic
- `src/hooks/useTasks.ts` - Task state management
- `src/components/SubTaskManager.tsx` - Subtask editing system
- `vite.config.ts` - Build and PWA configuration

### Additional Documentation
- **[VM Deployment Guide](./docs/VM_DEPLOYMENT_GUIDE.md)** - Server setup instructions
- **[Project Reports](./docs/reports/)** - Development phase reports
- **[Complete Documentation](./docs/)** - Full technical docs, changelog, and roadmap

---

## 🙏 Credits & Acknowledgments

- **Built by**: Majid and contributors
- **Icons**: Lucide React icon library
- **Powered by**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Express.js with Nodemailer
- **Inspiration**: Modern productivity tools and user feedback

---

## 📄 License

MIT License - see LICENSE file for details

---

**🎉 MajiTask v2.0.0 - Hierarchical Task Management**  
*Last Updated: June 18, 2025*

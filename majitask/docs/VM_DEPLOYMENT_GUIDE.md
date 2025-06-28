# MajiTask VirtualBox VM Deployment Guide

## 🎯 Overview

This guide documents the successful installation and deployment of MajiTask, a modern React TypeScript task management application, in a VirtualBox VM environment with external browser access capability.

## 📋 Application Features

MajiTask is a comprehensive task management application with the following features:

### Core Functionality
- ✅ **Task CRUD Operations**: Create, read, update, and delete tasks
- 🔍 **Advanced Filtering & Search**: Filter by status, category, priority, and search by title
- 📁 **Category Management**: Organize tasks with customizable categories
- ⏰ **Deadline Management**: Set and track task deadlines with visual indicators
- 💬 **Progress Comments**: Add detailed comments to track task progress
- 📱 **PWA Support**: Progressive Web App with offline capabilities
- 💾 **Local Storage**: Data persistence using browser localStorage

### Technical Features
- ⚡ **Modern Tech Stack**: React 18, TypeScript, Vite
- 🎨 **Beautiful UI**: Tailwind CSS with responsive design
- 🏗️ **Component Architecture**: Modular, reusable React components
- 🪝 **Custom Hooks**: Efficient state management with custom React hooks
- 🔧 **Build Tools**: Vite for fast development and optimized builds
- 🎯 **Type Safety**: Full TypeScript implementation

## 🖥️ System Requirements

### Host System
- VirtualBox installed and configured
- Network access between host and VM

### Virtual Machine
- Ubuntu Linux (tested on Ubuntu with kernel support)
- Minimum 2GB RAM recommended
- Minimum 2GB free disk space
- Network adapter configured (NAT or Bridged)

## 🚀 Installation Steps

### 1. Environment Setup

The following software was installed on the Ubuntu VM:

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js and npm
sudo apt install nodejs npm -y

# Verify installation
node --version  # v18.19.1
npm --version   # v9.2.0
```

### 2. Project Dependencies Installation

```bash
# Navigate to project directory
cd /home/majid/majitask

# Install all dependencies
npm install

# Dependencies installed: 545 packages including:
# - React & React DOM
# - TypeScript & Vite
# - Tailwind CSS & PostCSS
# - Lucide React (icons)
# - PWA plugin for Vite
```

### 3. Configuration Fix

A configuration issue was encountered and resolved:

**Problem**: PostCSS configuration was using CommonJS syntax in an ES module project.

**Solution**: Updated `postcss.config.js`:

```javascript
// Before (CommonJS - caused error)
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}

// After (ES Module - working)
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### 4. Development Server Configuration

The Vite configuration was already optimized for VM deployment:

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react(), VitePWA(...)],
  server: {
    host: true,    // Allows external connections
    port: 3000     // Default port (auto-increments if busy)
  }
})
```

## 🌐 Network Access Configuration

### VM Network Information
- **VM IP Address**: `10.0.2.15`
- **Network Interface**: `enp0s3`
- **Network Type**: NAT (VirtualBox default)

### Application URLs
- **Local Access (within VM)**: http://localhost:3001/
- **External Access (from host)**: http://10.0.2.15:3001/

### Port Configuration
- **Default Port**: 3000 (automatically switched to 3001 due to port conflict)
- **Host Binding**: 0.0.0.0 (accepts connections from any IP)

## 🔧 Running the Application

### Start Development Server
```bash
cd /home/majid/majitask
npm run dev
```

### Alternative Start Command
```bash
# Explicit host and port configuration
npx vite --host 0.0.0.0 --port 3000
```

### Expected Output
```
  VITE v4.5.14  ready in 1081 ms

  ➜  Local:   http://localhost:3001/
  ➜  Network: http://10.0.2.15:3001/
  ➜  press h to show help
```

## 🔄 Permanent Service Setup (Auto-Start on Boot)

### Systemd Service Configuration

The MajiTask application is configured to start automatically when the VM boots using a systemd service:

#### Service File Location
```bash
/etc/systemd/system/majitask.service
```

#### Service Management Commands
```bash
# Check service status
sudo systemctl status majitask.service

# Start the service manually
sudo systemctl start majitask.service

# Stop the service
sudo systemctl stop majitask.service

# Restart the service
sudo systemctl restart majitask.service

# Enable auto-start on boot (already enabled)
sudo systemctl enable majitask.service

# Disable auto-start on boot
sudo systemctl disable majitask.service

# View service logs
journalctl -u majitask.service -f
```

#### Service Configuration
The service is configured with the following features:
- **Auto-restart**: Automatically restarts if the application crashes
- **Network dependency**: Waits for network to be available before starting
- **Security**: Runs with restricted permissions for security
- **Logging**: All output is logged via systemd journal
- **User context**: Runs as the `majid` user (not root)

#### Startup Behavior
- ✅ **Automatically starts** when VM boots
- ✅ **Runs on port 3001** (fixed port assignment)
- ✅ **External access enabled** at http://10.0.2.15:3001/
- ✅ **Auto-recovery** if the application crashes
- ✅ **Persistent across reboots**

#### Verification After VM Restart
```bash
# Check if service is running
systemctl is-active majitask.service

# Check if service is enabled for auto-start
systemctl is-enabled majitask.service

# Test application accessibility
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/
```

## 🏗️ Project Architecture

### Directory Structure
```
/home/majid/majitask/
├── index.html              # HTML entry point
├── package.json            # Project configuration & dependencies
├── postcss.config.js       # PostCSS configuration (fixed)
├── tailwind.config.js      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite build tool configuration
└── src/
    ├── App.tsx             # Main application component
    ├── index.css           # Global styles & Tailwind imports
    ├── main.tsx            # React application entry point
    ├── components/         # React components
    │   ├── TaskDetail.tsx  # Task editing & comments interface
    │   ├── TaskForm.tsx    # Task creation modal with validation
    │   └── TaskList.tsx    # Task display with sorting & status
    ├── hooks/              # Custom React hooks
    │   └── useTasks.ts     # Task management logic & state
    ├── types/              # TypeScript type definitions
    │   └── index.ts        # Task, Comment, TaskFilters interfaces
    └── utils/              # Utility functions
        └── taskManager.ts  # Data persistence & utility functions
```

### Key Components

#### 1. App.tsx - Main Application
- Central state management
- Component orchestration
- Filter and search integration

#### 2. TaskList.tsx - Task Display
- Task rendering with status indicators
- Sorting and filtering
- Responsive grid layout

#### 3. TaskForm.tsx - Task Creation
- Modal-based task creation
- Form validation
- Category and priority selection

#### 4. TaskDetail.tsx - Task Management
- Task editing interface
- Progress comments system
- Status updates

#### 5. useTasks.ts - State Management Hook
- CRUD operations for tasks
- Local storage persistence
- Search and filter logic

### Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | ^18.2.0 | UI Framework |
| TypeScript | ^5.0.2 | Type Safety |
| Vite | ^4.4.5 | Build Tool |
| Tailwind CSS | ^3.3.0 | Styling |
| Lucide React | ^0.263.1 | Icons |
| Vite PWA Plugin | ^0.16.4 | PWA Features |

## 🔍 Troubleshooting

### Common Issues

1. **Port Already in Use**
   - Vite automatically finds next available port
   - Check running processes: `netstat -tlnp | grep :3000`

2. **PostCSS Configuration Error**
   - Ensure `postcss.config.js` uses ES module syntax
   - Use `export default` instead of `module.exports`

3. **Network Access Issues**
   - Verify VM IP: `ip addr show`
   - Check VirtualBox network settings
   - Ensure host firewall allows VM traffic

4. **Dependencies Installation Issues**
   - Clear npm cache: `npm cache clean --force`
   - Delete node_modules and reinstall: `rm -rf node_modules && npm install`

### Verification Commands

```bash
# Check if server is running
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/

# Check network connectivity
ping 10.0.2.15

# Check open ports
netstat -tlnp | grep vite
```

## 📊 Performance & Security

### Security Considerations
- Development server only - not for production use
- No authentication implemented
- Local storage used for data persistence
- Consider security implications for production deployment

### Performance Notes
- Vite provides fast hot module replacement (HMR)
- Build optimizations available with `npm run build`
- PWA features enable offline functionality
- Responsive design optimized for various screen sizes

## 🎯 Next Steps

### For Development
1. **Add Authentication**: Implement user authentication system
2. **Database Integration**: Replace localStorage with proper database
3. **API Development**: Create backend API for data management
4. **Testing**: Add unit and integration tests
5. **CI/CD**: Set up continuous integration/deployment

### For Production
1. **Build Application**: `npm run build`
2. **Deploy to Server**: Use nginx or similar web server
3. **SSL Certificate**: Implement HTTPS
4. **Database Setup**: Configure production database
5. **Monitoring**: Add application monitoring and logging

## 📞 Support Information

### Logs Location
- Development server logs: Terminal output
- Application errors: Browser Developer Tools Console
- Build logs: `npm run build` output

### Useful Commands
```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Check dependencies
npm list

# Update dependencies
npm update
```

## 📝 Version Information

- **MajiTask Version**: 1.0.0
- **Node.js**: v18.19.1
- **npm**: v9.2.0
- **Deployment Date**: June 17, 2025
- **VM Environment**: Ubuntu Linux VirtualBox

---

## ✅ Deployment Status: SUCCESSFUL

The MajiTask application has been successfully deployed and is accessible at:
- **VM Local**: http://localhost:3001/
- **External Access**: http://10.0.2.15:3001/

The application is fully functional with all features working as expected.

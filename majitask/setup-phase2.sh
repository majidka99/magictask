#!/bin/bash

# 🚀 MajiTask Phase 2 Setup Script
# This script sets up the complete Phase 2 environment

echo "🔧 Setting up MajiTask Phase 2: API Layer Development"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the majitask/ directory"
    exit 1
fi

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check for MySQL/MariaDB
if ! command -v mysql &> /dev/null; then
    echo "❌ Error: MySQL/MariaDB client is not installed."
    echo "   Please install MySQL client to run migrations."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Setup environment file
echo ""
echo "⚙️  Setting up environment configuration..."

if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "✅ Created .env file from template"
    echo "⚠️  Please edit .env file with your database credentials and JWT secrets"
    echo "   Required variables:"
    echo "   - DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME"
    echo "   - JWT_SECRET, JWT_REFRESH_SECRET (32+ characters each)"
else
    echo "✅ .env file already exists"
fi

# Check if database is accessible
echo ""
echo "🗄️  Checking database connection..."

# Source environment variables
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Test database connection
mysql -h${DB_HOST:-localhost} -P${DB_PORT:-3306} -u${DB_USER:-majitask_user} -p${DB_PASSWORD} -e "SELECT 1;" ${DB_NAME:-majitask} 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Database connection successful"
    
    # Run migrations
    echo ""
    echo "🔄 Running database migrations..."
    
    echo "   Running Phase 1 migration (auth tables)..."
    npm run migrate:auth
    
    if [ $? -eq 0 ]; then
        echo "   ✅ Phase 1 migration completed"
    else
        echo "   ⚠️  Phase 1 migration had issues (may already exist)"
    fi
    
    echo "   Running Phase 2 migration (task tables)..."
    npm run migrate:tasks
    
    if [ $? -eq 0 ]; then
        echo "   ✅ Phase 2 migration completed"
    else
        echo "   ⚠️  Phase 2 migration had issues (may already exist)"
    fi
    
    echo "✅ All migrations completed"
    
else
    echo "❌ Database connection failed"
    echo "   Please check your database configuration in .env file"
    echo "   Make sure MariaDB/MySQL is running and credentials are correct"
fi

# Create startup instructions
echo ""
echo "🎉 Phase 2 Setup Complete!"
echo "========================="
echo ""
echo "📋 Next Steps:"
echo "1. Edit .env file with your configuration"
echo "2. Start the development servers:"
echo ""
echo "   # Terminal 1 - Backend API Server"
echo "   npm run dev:server"
echo ""
echo "   # Terminal 2 - Frontend Development Server"
echo "   npm run dev"
echo ""
echo "3. Test the API endpoints:"
echo "   Health check: http://localhost:3863/api/health"
echo "   Auth API:     http://localhost:3863/api/auth/*"
echo "   Tasks API:    http://localhost:3863/api/tasks/*"
echo "   Migration:    http://localhost:3863/api/migration/*"
echo ""
echo "4. Access the frontend:"
echo "   Development:  http://localhost:5173"
echo ""
echo "📖 Documentation:"
echo "   See PHASE_2_README.md for detailed API documentation"
echo "   See PHASE_1_README.md for authentication setup"
echo ""
echo "🔧 Available Scripts:"
echo "   npm run dev:server    # Start backend in development mode"
echo "   npm run dev           # Start frontend in development mode"
echo "   npm run build         # Build for production"
echo "   npm run start         # Start production server"
echo "   npm run migrate:all   # Run all database migrations"
echo ""
echo "Happy coding! 🚀"

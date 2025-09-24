#!/bin/bash

echo "🚀 Setting up Sunoo Backend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v18 or higher."
    exit 1
fi

# Check if Docker is installed (optional)
if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker is not installed. You'll need to set up PostgreSQL manually."
else
    echo "🐳 Starting PostgreSQL with Docker..."
    docker-compose up -d postgres
    echo "✅ PostgreSQL is running on localhost:5432"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building the project..."
npm run build

echo "✅ Setup complete!"
echo ""
echo "🚀 To start the development server:"
echo "   npm run start:dev"
echo ""
echo "📚 API Documentation will be available at:"
echo "   http://localhost:3005/api"
echo ""
echo "🔍 Health check:"
echo "   http://localhost:3005/health"
echo ""
echo "🐘 Database Management (if using Docker):"
echo "   pgAdmin: http://localhost:5050 (admin@sunoo.com / admin)"

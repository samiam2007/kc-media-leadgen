#!/bin/bash

echo "🚀 Starting KC Media Lead Gen Platform Locally"
echo "=============================================="

# Check for PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL not found. Installing with Postgres.app..."
    echo "Download from: https://postgresapp.com"
    echo "Or use: brew install postgresql@15"
    exit 1
fi

# Check for Redis
if ! command -v redis-cli &> /dev/null; then
    echo "⚠️  Redis not found. Installing..."
    brew install redis
    brew services start redis
fi

# Start PostgreSQL if not running
if ! pg_isready &> /dev/null; then
    echo "Starting PostgreSQL..."
    brew services start postgresql@15
fi

# Create database if doesn't exist
echo "Setting up database..."
createdb kcmedia_leadgen 2>/dev/null || echo "Database already exists"

# Install backend dependencies
echo "Installing backend..."
cd backend
npm install
cp .env.example .env 2>/dev/null || true

# Run migrations
echo "Setting up database tables..."
npx prisma generate
npx prisma migrate dev --name init

# Install frontend dependencies  
echo "Installing frontend..."
cd ../frontend
npm install

echo ""
echo "✅ Setup Complete!"
echo ""
echo "To start the application:"
echo "  Terminal 1: cd backend && npm run dev"
echo "  Terminal 2: cd frontend && npm run dev"
echo ""
echo "Access at: http://localhost:3000"
echo ""
echo "Default login: demo@example.com / demo123"
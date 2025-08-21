#!/bin/bash

echo "🚀 Setting up Drone Lead Gen Platform..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

cd backend
npm install
cd ..

cd frontend
npm install
cd ..

echo "✅ Dependencies installed!"

# Create .env files if they don't exist
if [ ! -f backend/.env ]; then
  echo "📝 Creating backend .env file..."
  cp backend/.env.example backend/.env
  echo "⚠️  Please update backend/.env with your API keys"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To run the application:"
echo "1. Frontend only (with mock data):"
echo "   cd frontend && npm run dev"
echo ""
echo "2. Full stack (requires database and API keys):"
echo "   Terminal 1: cd backend && npm run dev"
echo "   Terminal 2: cd frontend && npm run dev"
echo ""
echo "📱 Access the app at http://localhost:3000"
echo ""
echo "Default login (mock mode):"
echo "Email: demo@example.com"
echo "Password: demo123"
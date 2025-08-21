#!/bin/bash

# Bluehost Deployment Script for KC Media Team Lead Gen
# Run this on your Bluehost VPS/Dedicated server

echo "🚀 KC Media Team Lead Gen - Bluehost Deployment"
echo "================================================"

# Step 1: Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
    sudo yum install -y nodejs
fi

# Step 2: Install PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "🐘 Installing PostgreSQL..."
    sudo yum install -y postgresql postgresql-server postgresql-contrib
    sudo postgresql-setup initdb
    sudo systemctl enable postgresql
    sudo systemctl start postgresql
fi

# Step 3: Install Redis
if ! command -v redis-server &> /dev/null; then
    echo "🔴 Installing Redis..."
    sudo yum install -y epel-release
    sudo yum install -y redis
    sudo systemctl enable redis
    sudo systemctl start redis
fi

# Step 4: Install PM2 (Process Manager)
if ! command -v pm2 &> /dev/null; then
    echo "📊 Installing PM2..."
    sudo npm install -g pm2
fi

# Step 5: Install Nginx (for reverse proxy)
if ! command -v nginx &> /dev/null; then
    echo "🌐 Installing Nginx..."
    sudo yum install -y nginx
    sudo systemctl enable nginx
fi

# Step 6: Create application directory
echo "📁 Setting up application directory..."
sudo mkdir -p /var/www/kcmedia-leadgen
sudo chown -R $USER:$USER /var/www/kcmedia-leadgen

# Step 7: Database setup
echo "🗄️ Setting up PostgreSQL database..."
sudo -u postgres psql << EOF
CREATE USER kcmedia WITH PASSWORD 'KCMedia2024Secure!';
CREATE DATABASE kcmedia_leadgen OWNER kcmedia;
GRANT ALL PRIVILEGES ON DATABASE kcmedia_leadgen TO kcmedia;
EOF

echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "1. Upload the application files to /var/www/kcmedia-leadgen"
echo "2. Run: cd /var/www/kcmedia-leadgen && npm install"
echo "3. Update .env with production values"
echo "4. Run: npm run build"
echo "5. Start with PM2: pm2 start npm --name 'kcmedia-backend' -- start"
#!/bin/bash

echo "🚂 Deploying KC Media Lead Gen to Railway"
echo "=========================================="
echo ""
echo "Step 1: Login to Railway"
railway login

echo ""
echo "Step 2: Link to your GitHub repo"
railway init

echo ""
echo "Step 3: Deploy the application"
railway up

echo ""
echo "Step 4: Add PostgreSQL database"
railway add

echo ""
echo "Step 5: Get your app URL"
railway open

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "Next steps in Railway Dashboard:"
echo "1. Go to Variables tab"
echo "2. Add all environment variables from .env"
echo "3. Update Twilio webhook with your Railway URL"
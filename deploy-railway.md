# 🚀 Deploy KC Media Lead Gen to Railway (Under $20/month)

## Step 1: Create Railway Account
1. Go to https://railway.app
2. Sign up with GitHub (free)
3. You get $5 free credits monthly

## Step 2: Install Railway CLI
```bash
npm install -g @railway/cli
```

## Step 3: Deploy Your App
```bash
# In your project directory
cd /Users/smccoy/Desktop/drone-lead-gen

# Login to Railway
railway login

# Create new project
railway init

# Deploy
railway up
```

## Step 4: Add PostgreSQL & Redis
In Railway Dashboard:
1. Click "New" → "Database" → "PostgreSQL"
2. Click "New" → "Database" → "Redis"
3. They auto-connect to your app!

## Step 5: Set Environment Variables
In Railway Dashboard → Variables, add:

```
TWILIO_ACCOUNT_SID=AC955b0339142e0b6da1dfd1bad3abd67a
TWILIO_AUTH_TOKEN=2ae5f24a23a4696bc59016431ac1c267
TWILIO_PHONE_NUMBER=+18668790547
ANTHROPIC_API_KEY=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
ELEVENLABS_API_KEY=sk_7ab713c0d85765a6ecf7eab58a6b28143e9278c38c26eac6
```

## Step 6: Update Twilio Webhook
1. Get your Railway URL: `your-app.up.railway.app`
2. In Twilio Console, update webhook to: `https://your-app.up.railway.app/api/twilio/voice`

## Step 7: Access Your App
- Frontend: `https://your-app.up.railway.app`
- Backend: `https://your-app.up.railway.app/api`

## Costs Breakdown
- PostgreSQL: ~$5/month
- Redis: ~$5/month  
- App hosting: ~$5-10/month
- **Total: $15-20/month**

## Custom Domain (Optional)
1. In Railway → Settings → Domains
2. Add your domain (kcmediateam.me)
3. Update DNS records in your domain provider
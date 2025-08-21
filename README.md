# Drone Lead Gen - AI Calling Platform

AI-powered outbound calling platform for generating and qualifying leads for commercial real estate drone photography/videography services.

## Features

- **AI-Powered Calling**: Natural conversation flow with LLM-driven dialogue
- **Voice Synthesis**: ElevenLabs/PlayHT integration for realistic voice
- **Lead Qualification**: Automated scoring and qualification system
- **CRM Integration**: HubSpot/Pipedrive sync for lead management
- **Real-time Dashboard**: Live call monitoring and analytics
- **Campaign Management**: Create and manage multiple calling campaigns
- **Compliance**: DNC list management and opt-out handling

## Tech Stack

- **Backend**: Node.js, Express, TypeScript, Prisma
- **Frontend**: Next.js 14, React, TypeScript, TailwindCSS
- **Database**: PostgreSQL
- **Queue**: Redis + Bull
- **AI/ML**: Anthropic Claude, OpenAI
- **Voice**: Twilio, ElevenLabs, PlayHT
- **Real-time**: Socket.io

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Twilio Account
- ElevenLabs/PlayHT API Key
- Anthropic/OpenAI API Key
- HubSpot/Pipedrive Account (optional)

## Setup Instructions

### 1. Clone and Install

```bash
cd drone-lead-gen
npm install
```

### 2. Environment Configuration

Copy the example env file and configure:

```bash
cp backend/.env.example backend/.env
```

Key environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `TWILIO_ACCOUNT_SID`: Your Twilio account SID
- `TWILIO_AUTH_TOKEN`: Your Twilio auth token
- `TWILIO_PHONE_NUMBER`: Your Twilio phone number
- `ANTHROPIC_API_KEY`: Claude API key
- `ELEVENLABS_API_KEY`: ElevenLabs API key
- `TWILIO_WEBHOOK_URL`: Your public webhook URL (use ngrok for local dev)

### 3. Database Setup

```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

### 4. Twilio Configuration

1. Get a Twilio phone number with voice capabilities
2. Set up ngrok for local development: `ngrok http 3001`
3. Configure webhook URLs in Twilio console:
   - Voice URL: `https://your-ngrok-url.ngrok.io/api/twilio/voice`
   - Status Callback: `https://your-ngrok-url.ngrok.io/api/twilio/status`

### 5. Start Development Servers

```bash
# Terminal 1 - Start Redis
redis-server

# Terminal 2 - Start Backend
cd backend
npm run dev

# Terminal 3 - Start Frontend
cd frontend
npm run dev
```

Access the application at `http://localhost:3000`

## Usage Guide

### 1. Create Account
- Navigate to `http://localhost:3000`
- Register with email and password

### 2. Create Script
- Go to Scripts section
- Use template or create custom script
- Define conversation states and responses

### 3. Configure Voice
- Upload voice samples for cloning (optional)
- Or select from available voices

### 4. Create Campaign
- Upload contact list (CSV format)
- Select script and voice
- Set calling parameters (daily cap, timezone, retry policy)

### 5. Launch Campaign
- Review settings
- Click "Start Campaign"
- Monitor real-time progress in dashboard

## CSV Format for Contacts

```csv
fullName,company,phone,email,title,market
John Doe,ABC Realty,+14155551234,john@abc.com,Broker,San Francisco
Jane Smith,XYZ Properties,+14155555678,jane@xyz.com,Senior Broker,Oakland
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Campaigns
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create campaign
- `POST /api/campaigns/:id/start` - Start campaign
- `POST /api/campaigns/:id/pause` - Pause campaign
- `GET /api/campaigns/:id/metrics` - Get campaign metrics

### Scripts
- `GET /api/scripts` - List scripts
- `POST /api/scripts` - Create script
- `PUT /api/scripts/:id` - Update script

## Production Deployment

### Railway/Render Deployment

1. Create PostgreSQL and Redis instances
2. Set environment variables
3. Deploy backend:
```bash
cd backend
npm run build
npm start
```

4. Deploy frontend:
```bash
cd frontend
npm run build
npm start
```

### Docker Deployment

```bash
docker-compose up -d
```

### Environment Variables for Production

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/dbname
REDIS_URL=redis://host:6379
TWILIO_WEBHOOK_URL=https://yourdomain.com/api/twilio
JWT_SECRET=strong-random-secret
```

## Cost Tracking

The platform tracks costs across:
- Twilio: $0.0085/minute for calls
- ElevenLabs: $0.18/1000 characters
- Anthropic: $3/1M input tokens, $15/1M output tokens
- SMS: $0.0079/message

View cost metrics in the Analytics dashboard.

## Compliance & Legal

- TCPA Compliance: Ensure proper consent before calling
- DNC Management: Automatic opt-out handling
- Call Recording: Proper disclosure required
- Time Restrictions: Calls only between 9 AM - 5 PM local time

## Troubleshooting

### Common Issues

1. **Twilio webhooks not working**
   - Ensure ngrok is running
   - Update TWILIO_WEBHOOK_URL in .env
   - Check Twilio console for webhook errors

2. **Database connection errors**
   - Verify PostgreSQL is running
   - Check DATABASE_URL format
   - Run `npx prisma migrate dev`

3. **Voice synthesis failing**
   - Verify API keys are correct
   - Check account credits/limits
   - Try fallback to Twilio Polly

## Support

For issues or questions:
- Create an issue on GitHub
- Check logs in `backend/combined.log`
- Monitor real-time events in Socket.io debug

## License

MIT
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID!,
    authToken: process.env.TWILIO_AUTH_TOKEN!,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER!,
    webhookUrl: process.env.WEBHOOK_URL || 'https://kc-media-leadgen-production.up.railway.app'
  },
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY!,
    voiceId: process.env.ELEVENLABS_VOICE_ID || 'cjVigY5qzO86Huf0OWal' // Eric - smooth professional voice
  },
  playht: {
    apiKey: process.env.PLAYHT_API_KEY,
    userId: process.env.PLAYHT_USER_ID
  },
  voice: {
    provider: process.env.VOICE_PROVIDER || 'elevenlabs'
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY!
  },
  database: {
    url: process.env.DATABASE_URL!
  },
  redis: {
    url: process.env.REDIS_URL
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production'
  },
  aws: {
    bucketName: process.env.AWS_S3_BUCKET || 'kc-media-audio'
  },
  company: {
    name: process.env.COMPANY_NAME || 'KC Media Team',
    phone: process.env.COMPANY_PHONE || '913.238.7094',
    email: process.env.COMPANY_EMAIL || 'info@kcmediateam.me',
    website: process.env.COMPANY_WEBSITE || 'https://kcmediateam.me'
  }
};
export const config = {
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
    webhookUrl: process.env.TWILIO_WEBHOOK_URL || 'https://your-domain.com/api/twilio'
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || ''
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || ''
  },
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY || '',
    voiceId: process.env.ELEVENLABS_VOICE_ID || ''
  },
  playht: {
    apiKey: process.env.PLAYHT_API_KEY || '',
    userId: process.env.PLAYHT_USER_ID || ''
  },
  voice: {
    provider: (process.env.VOICE_PROVIDER || 'elevenlabs') as 'elevenlabs' | 'playht' | 'twilio'
  },
  hubspot: {
    accessToken: process.env.HUBSPOT_ACCESS_TOKEN || ''
  },
  pipedrive: {
    apiToken: process.env.PIPEDRIVE_API_TOKEN || ''
  },
  crm: {
    provider: (process.env.CRM_PROVIDER || 'internal') as 'hubspot' | 'pipedrive' | 'internal'
  },
  calendly: {
    apiKey: process.env.CALENDLY_API_KEY || '',
    user: process.env.CALENDLY_USER || ''
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'us-east-1',
    bucketName: process.env.S3_BUCKET_NAME || 'drone-lead-gen-recordings'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-this'
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/drone_lead_gen'
  }
};
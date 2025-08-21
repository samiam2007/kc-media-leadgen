import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import { createServer } from 'http';
import Bull from 'bull';
import dotenv from 'dotenv';

import { TwilioService } from './services/twilio.service';
import { DialogueEngine } from './services/dialogue.engine';
import { VoiceService } from './services/voice.service';
import { LeadService } from './services/lead.service';
import { CRMService } from './services/crm.service';

import { createTwilioRoutes } from './routes/twilio.routes';
import { createCampaignRoutes } from './routes/campaign.routes';
import { createAuthRoutes } from './routes/auth.routes';
import { createScriptRoutes } from './routes/script.routes';
import { createContactsRoutes } from './routes/contacts.routes';
import { createCallingRoutes } from './routes/calling.routes';

import { logger } from './utils/logger';
import { config } from './config';
import { setupCallProcessor } from './jobs/call.processor';
import { authenticateToken } from './middleware/auth';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }
});

const prisma = new PrismaClient();

const twilioService = new TwilioService(prisma);
const dialogueEngine = new DialogueEngine(prisma);
const voiceService = new VoiceService();
const crmService = new CRMService();
const leadService = new LeadService(prisma, dialogueEngine, crmService, twilioService);

// Only set up Redis/Bull if REDIS_URL is available
let callQueue: Bull.Queue | null = null;
if (process.env.REDIS_URL) {
  callQueue = new Bull('call-queue', process.env.REDIS_URL);
  setupCallProcessor(callQueue, twilioService, prisma);
}

app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (no auth)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'KC Media Lead Gen API',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint (no auth)
app.get('/', (req, res) => {
  res.json({ 
    message: 'KC Media Lead Gen Platform is running!',
    endpoints: {
      health: '/health',
      twilio_incoming: '/api/twilio/incoming',
      twilio_voice: '/api/twilio/voice/:callId',
      twilio_status: '/api/twilio/status/:callId'
    }
  });
});

// Twilio webhooks (no auth required)
app.use('/api/twilio', createTwilioRoutes(
  prisma, 
  twilioService, 
  dialogueEngine, 
  voiceService, 
  leadService
));

// Auth routes (no auth required)
app.use('/api/auth', createAuthRoutes(prisma));

// Protected routes - everything under /api requires auth except the routes above
app.use('/api', authenticateToken);
if (callQueue) {
  app.use('/api', createCampaignRoutes(prisma, twilioService, callQueue));
  app.use('/api', createCallingRoutes(prisma, twilioService, callQueue));
}
app.use('/api', createScriptRoutes(prisma));
app.use('/api', createContactsRoutes(prisma));

// Dashboard endpoint
app.get('/api/dashboard', async (req, res) => {
  try {
    const [
      totalCampaigns,
      activeCampaigns,
      totalCalls,
      qualifiedLeads,
      recentCalls
    ] = await Promise.all([
      prisma.campaign.count(),
      prisma.campaign.count({ where: { status: 'active' } }),
      prisma.call.count(),
      prisma.contact.count({ where: { status: 'qualified' } }),
      prisma.call.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          contact: true,
          campaign: true
        }
      })
    ]);

    res.json({
      totalCampaigns,
      activeCampaigns,
      totalCalls,
      qualifiedLeads,
      recentCalls
    });
  } catch (error) {
    logger.error('Dashboard data fetch error', { error });
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info('Client connected', { socketId: socket.id });

  socket.on('join-campaign', (campaignId: string) => {
    socket.join(`campaign-${campaignId}`);
    logger.info('Client joined campaign room', { socketId: socket.id, campaignId });
  });

  socket.on('disconnect', () => {
    logger.info('Client disconnected', { socketId: socket.id });
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err });
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Twilio webhook URL should be: ${config.twilio.webhookUrl}`);
  console.log(`
    🚀 KC Media Lead Gen Platform is running!
    📞 Port: ${PORT}
    🌐 Health: http://localhost:${PORT}/health
    📱 Twilio Voice: http://localhost:${PORT}/api/twilio/voice/:callId
    📱 Twilio Status: http://localhost:${PORT}/api/twilio/status/:callId
  `);
});
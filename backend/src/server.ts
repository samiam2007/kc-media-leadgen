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

const callQueue = new Bull('call-queue', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
  }
});

setupCallProcessor(callQueue, twilioService, prisma);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/twilio', createTwilioRoutes(
  prisma, 
  twilioService, 
  dialogueEngine, 
  voiceService, 
  leadService
));

app.use('/api/auth', createAuthRoutes(prisma));

app.use('/api', authenticateToken);

app.use('/api', createCampaignRoutes(prisma, twilioService, callQueue));
app.use('/api', createScriptRoutes(prisma));

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

callQueue.on('completed', async (job, result) => {
  io.to(`campaign-${job.data.campaignId}`).emit('call-completed', {
    contactId: job.data.contactId,
    result
  });
});

callQueue.on('failed', async (job, err) => {
  logger.error('Call job failed', { 
    error: err, 
    jobId: job.id,
    data: job.data 
  });
  
  io.to(`campaign-${job.data.campaignId}`).emit('call-failed', {
    contactId: job.data.contactId,
    error: err.message
  });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err });
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Twilio webhook URL should be: ${config.twilio.webhookUrl}`);
});
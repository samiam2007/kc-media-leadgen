import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Bull from 'bull';
import { TwilioService } from '../services/twilio.service';
import { logger } from '../utils/logger';

export function createCallingRoutes(
  prisma: PrismaClient,
  twilioService: TwilioService,
  callQueue: Bull.Queue | null
): Router {
  const router = Router();

  // Start outbound campaign
  router.post('/campaigns/:campaignId/start', async (req: Request, res: Response) => {
    try {
      const { campaignId } = req.params;
      const { contactIds, callsPerMinute = 2 } = req.body;

      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: { script: true }
      });

      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      // Update campaign status
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { 
          status: 'active',
          startDate: new Date()
        }
      });

      // Get contacts to call
      const contacts = contactIds ? 
        await prisma.contact.findMany({
          where: { 
            id: { in: contactIds },
            dnc: false,
            status: { not: 'qualified' }
          }
        }) :
        await prisma.contact.findMany({
          where: { 
            dnc: false,
            status: 'new'
          },
          take: 100 // Limit to 100 contacts per campaign start
        });

      logger.info(`Starting campaign ${campaignId} with ${contacts.length} contacts`);

      // Queue calls with rate limiting
      let delay = 0;
      const delayIncrement = 60000 / callsPerMinute; // milliseconds between calls

      for (const contact of contacts) {
        if (callQueue) {
          await callQueue.add('outbound-call', {
            campaignId,
            contactId: contact.id,
            scriptId: campaign.scriptId
          }, {
            delay,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 60000 // 1 minute backoff
            }
          });
        } else {
          // Direct call if no queue
          await initiateOutboundCall(
            twilioService,
            prisma,
            campaign,
            contact
          );
        }
        
        delay += delayIncrement;
      }

      res.json({
        success: true,
        campaignId,
        contactsQueued: contacts.length,
        estimatedDuration: `${Math.ceil(delay / 60000)} minutes`
      });
    } catch (error) {
      logger.error('Error starting campaign', { error });
      res.status(500).json({ error: 'Failed to start campaign' });
    }
  });

  // Stop campaign
  router.post('/campaigns/:campaignId/stop', async (req: Request, res: Response) => {
    try {
      const { campaignId } = req.params;

      await prisma.campaign.update({
        where: { id: campaignId },
        data: { 
          status: 'paused',
          pausedAt: new Date()
        }
      });

      // Remove pending calls from queue
      if (callQueue) {
        const jobs = await callQueue.getJobs(['waiting', 'delayed']);
        for (const job of jobs) {
          if (job.data.campaignId === campaignId) {
            await job.remove();
          }
        }
      }

      res.json({ success: true });
    } catch (error) {
      logger.error('Error stopping campaign', { error });
      res.status(500).json({ error: 'Failed to stop campaign' });
    }
  });

  // Make single call
  router.post('/call/outbound', async (req: Request, res: Response) => {
    try {
      const { contactId, scriptId } = req.body;

      const contact = await prisma.contact.findUnique({
        where: { id: contactId }
      });

      if (!contact) {
        return res.status(404).json({ error: 'Contact not found' });
      }

      if (contact.dnc) {
        return res.status(400).json({ error: 'Contact is on DNC list' });
      }

      const script = scriptId ? 
        await prisma.script.findUnique({ where: { id: scriptId } }) :
        await prisma.script.findFirst({ where: { isDefault: true } });

      if (!script) {
        return res.status(400).json({ error: 'No script found' });
      }

      // Create call record
      const call = await prisma.call.create({
        data: {
          contactId,
          direction: 'outbound',
          status: 'initiated',
          phoneNumber: contact.phone,
          startAt: new Date()
        }
      });

      // Initiate call via Twilio
      const twilioCall = await twilioService.initiateCall(
        contact.phone,
        call.id
      );

      // Update call with Twilio SID
      await prisma.call.update({
        where: { id: call.id },
        data: { twilioCallSid: twilioCall.sid }
      });

      res.json({
        success: true,
        callId: call.id,
        twilioSid: twilioCall.sid
      });
    } catch (error) {
      logger.error('Error making outbound call', { error });
      res.status(500).json({ error: 'Failed to initiate call' });
    }
  });

  // Get active calls for monitoring
  router.get('/calls/active', async (req: Request, res: Response) => {
    try {
      const activeCalls = await prisma.call.findMany({
        where: {
          status: { in: ['initiated', 'in_progress', 'ringing'] }
        },
        include: {
          contact: true,
          campaign: true,
          turns: {
            orderBy: { turnNumber: 'asc' }
          }
        }
      });

      const formattedCalls = activeCalls.map(call => ({
        id: call.id,
        contactName: call.contact?.fullName || 'Unknown',
        company: call.contact?.company || '',
        phone: call.phoneNumber,
        status: call.status,
        duration: call.durationSeconds || 0,
        state: call.turns[call.turns.length - 1]?.state || 'greeting',
        transcript: call.turns.map(turn => ({
          speaker: 'agent' as const,
          text: turn.botResponse,
          timestamp: turn.createdAt
        })),
        qualificationData: {}
      }));

      res.json(formattedCalls);
    } catch (error) {
      logger.error('Error fetching active calls', { error });
      res.status(500).json({ error: 'Failed to fetch active calls' });
    }
  });

  // Get call statistics
  router.get('/campaigns/:campaignId/stats', async (req: Request, res: Response) => {
    try {
      const { campaignId } = req.params;

      const [
        totalCalls,
        completedCalls,
        qualifiedLeads,
        avgDuration,
        callsByHour
      ] = await Promise.all([
        prisma.call.count({
          where: { campaignId }
        }),
        prisma.call.count({
          where: { campaignId, status: 'completed' }
        }),
        prisma.call.count({
          where: { 
            campaignId,
            contact: { status: 'qualified' }
          }
        }),
        prisma.call.aggregate({
          where: { campaignId },
          _avg: { durationSeconds: true }
        }),
        getCallsByHour(prisma, campaignId)
      ]);

      res.json({
        totalCalls,
        completedCalls,
        qualifiedLeads,
        conversionRate: totalCalls > 0 ? (qualifiedLeads / totalCalls * 100).toFixed(2) : 0,
        avgDuration: Math.round(avgDuration._avg.durationSeconds || 0),
        callsByHour
      });
    } catch (error) {
      logger.error('Error fetching campaign stats', { error });
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  });

  return router;
}

async function initiateOutboundCall(
  twilioService: TwilioService,
  prisma: PrismaClient,
  campaign: any,
  contact: any
) {
  try {
    // Create call record
    const call = await prisma.call.create({
      data: {
        campaignId: campaign.id,
        contactId: contact.id,
        direction: 'outbound',
        status: 'initiated',
        phoneNumber: contact.phone,
        startAt: new Date()
      }
    });

    // Initiate call via Twilio
    const twilioCall = await twilioService.initiateCall(
      contact.phone,
      call.id
    );

    // Update call with Twilio SID
    await prisma.call.update({
      where: { id: call.id },
      data: { twilioCallSid: twilioCall.sid }
    });

    logger.info(`Initiated call ${call.id} to ${contact.phone}`);
    return call;
  } catch (error) {
    logger.error('Error initiating outbound call', { error, contact });
    throw error;
  }
}

async function getCallsByHour(prisma: PrismaClient, campaignId: string) {
  const calls = await prisma.call.findMany({
    where: { campaignId },
    select: { createdAt: true }
  });

  const hourCounts: Record<number, number> = {};
  for (let i = 0; i < 24; i++) {
    hourCounts[i] = 0;
  }

  calls.forEach(call => {
    const hour = new Date(call.createdAt).getHours();
    hourCounts[hour]++;
  });

  return Object.entries(hourCounts).map(([hour, count]) => ({
    hour: parseInt(hour),
    count
  }));
}
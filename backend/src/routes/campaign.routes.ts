import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { TwilioService } from '../services/twilio.service';
import { z } from 'zod';
import { logger } from '../utils/logger';
import Bull from 'bull';

const CreateCampaignSchema = z.object({
  name: z.string(),
  scriptId: z.string(),
  voiceId: z.string(),
  dialingWindowTz: z.string().optional(),
  dailyCallCap: z.number().optional(),
  retryPolicy: z.object({
    maxAttempts: z.number(),
    delayMinutes: z.number()
  }).optional()
});

const AddContactsSchema = z.object({
  contacts: z.array(z.object({
    fullName: z.string(),
    company: z.string(),
    phone: z.string(),
    email: z.string().optional(),
    title: z.string().optional(),
    market: z.string().optional()
  }))
});

export function createCampaignRoutes(
  prisma: PrismaClient,
  twilioService: TwilioService,
  callQueue: Bull.Queue
): Router {
  const router = Router();

  router.post('/campaigns', async (req: Request, res: Response) => {
    try {
      const data = CreateCampaignSchema.parse(req.body);
      
      const campaign = await prisma.campaign.create({
        data: {
          ...data,
          retryPolicy: data.retryPolicy || {
            maxAttempts: 3,
            delayMinutes: 60
          }
        }
      });

      res.json(campaign);
    } catch (error) {
      logger.error('Campaign creation error', { error });
      res.status(400).json({ error: 'Invalid campaign data' });
    }
  });

  router.get('/campaigns', async (req: Request, res: Response) => {
    try {
      const campaigns = await prisma.campaign.findMany({
        include: {
          _count: {
            select: {
              contacts: true,
              calls: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json(campaigns);
    } catch (error) {
      logger.error('Campaign fetch error', { error });
      res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
  });

  router.get('/campaigns/:id', async (req: Request, res: Response) => {
    try {
      const campaign = await prisma.campaign.findUnique({
        where: { id: req.params.id },
        include: {
          script: true,
          contacts: {
            include: {
              leadIntake: true,
              calls: {
                orderBy: { createdAt: 'desc' },
                take: 1
              }
            }
          }
        }
      });

      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      res.json(campaign);
    } catch (error) {
      logger.error('Campaign fetch error', { error });
      res.status(500).json({ error: 'Failed to fetch campaign' });
    }
  });

  router.post('/campaigns/:id/contacts', async (req: Request, res: Response) => {
    try {
      const campaignId = req.params.id;
      const data = AddContactsSchema.parse(req.body);

      const contacts = await prisma.contact.createMany({
        data: data.contacts.map(contact => ({
          ...contact,
          campaignId
        })),
        skipDuplicates: true
      });

      res.json({ added: contacts.count });
    } catch (error) {
      logger.error('Contact addition error', { error });
      res.status(400).json({ error: 'Failed to add contacts' });
    }
  });

  router.post('/campaigns/:id/start', async (req: Request, res: Response) => {
    try {
      const campaignId = req.params.id;
      
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          contacts: {
            where: {
              status: 'new',
              dnc: false
            }
          }
        }
      });

      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'active' }
      });

      for (const contact of campaign.contacts) {
        await callQueue.add('initiate-call', {
          contactId: contact.id,
          campaignId
        }, {
          delay: Math.random() * 10000,
          attempts: campaign.retryPolicy?.maxAttempts || 3,
          backoff: {
            type: 'fixed',
            delay: (campaign.retryPolicy?.delayMinutes || 60) * 60 * 1000
          }
        });
      }

      res.json({ 
        message: 'Campaign started',
        contactsQueued: campaign.contacts.length 
      });
    } catch (error) {
      logger.error('Campaign start error', { error });
      res.status(500).json({ error: 'Failed to start campaign' });
    }
  });

  router.post('/campaigns/:id/pause', async (req: Request, res: Response) => {
    try {
      const campaignId = req.params.id;
      
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'paused' }
      });

      const jobs = await callQueue.getJobs(['waiting', 'delayed']);
      for (const job of jobs) {
        if (job.data.campaignId === campaignId) {
          await job.remove();
        }
      }

      res.json({ message: 'Campaign paused' });
    } catch (error) {
      logger.error('Campaign pause error', { error });
      res.status(500).json({ error: 'Failed to pause campaign' });
    }
  });

  router.get('/campaigns/:id/metrics', async (req: Request, res: Response) => {
    try {
      const campaignId = req.params.id;
      
      const [
        totalContacts,
        callsPlaced,
        callsAnswered,
        qualifiedLeads,
        appointments,
        totalCost
      ] = await Promise.all([
        prisma.contact.count({ where: { campaignId } }),
        prisma.call.count({ where: { campaignId } }),
        prisma.call.count({ 
          where: { 
            campaignId,
            status: 'completed'
          } 
        }),
        prisma.contact.count({ 
          where: { 
            campaignId,
            status: 'qualified'
          } 
        }),
        prisma.appointment.count({
          where: {
            contact: { campaignId }
          }
        }),
        prisma.call.aggregate({
          where: { campaignId },
          _sum: {
            costTwilio: true,
            costTts: true,
            costAsr: true,
            costLlm: true
          }
        })
      ]);

      const totalCostValue = 
        (totalCost._sum.costTwilio || 0) +
        (totalCost._sum.costTts || 0) +
        (totalCost._sum.costAsr || 0) +
        (totalCost._sum.costLlm || 0);

      const costPerLead = qualifiedLeads > 0 
        ? totalCostValue / qualifiedLeads 
        : 0;

      res.json({
        totalContacts,
        callsPlaced,
        callsAnswered,
        answerRate: callsPlaced > 0 
          ? ((callsAnswered / callsPlaced) * 100).toFixed(2) 
          : 0,
        qualifiedLeads,
        conversionRate: callsAnswered > 0 
          ? ((qualifiedLeads / callsAnswered) * 100).toFixed(2)
          : 0,
        appointments,
        totalCost: totalCostValue.toFixed(2),
        costPerLead: costPerLead.toFixed(2)
      });
    } catch (error) {
      logger.error('Metrics fetch error', { error });
      res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  });

  return router;
}
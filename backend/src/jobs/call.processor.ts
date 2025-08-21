import Bull from 'bull';
import { PrismaClient } from '@prisma/client';
import { TwilioService } from '../services/twilio.service';
import { logger } from '../utils/logger';

export function setupCallProcessor(
  callQueue: Bull.Queue,
  twilioService: TwilioService,
  prisma: PrismaClient
) {
  callQueue.process('initiate-call', async (job) => {
    const { contactId, campaignId } = job.data;

    try {
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId }
      });

      if (campaign?.status !== 'active') {
        logger.info('Campaign not active, skipping call', { campaignId });
        return { skipped: true, reason: 'Campaign not active' };
      }

      const contact = await prisma.contact.findUnique({
        where: { id: contactId }
      });

      if (!contact || contact.dnc) {
        logger.info('Contact on DNC or not found', { contactId });
        return { skipped: true, reason: 'Contact on DNC list' };
      }

      const isDncListed = await prisma.dncList.findUnique({
        where: { phone: contact.phone }
      });

      if (isDncListed) {
        await prisma.contact.update({
          where: { id: contactId },
          data: { dnc: true }
        });
        return { skipped: true, reason: 'Phone on DNC list' };
      }

      const now = new Date();
      const hour = now.getHours();
      
      if (hour < 9 || hour >= 17) {
        await job.moveToDelayed(Date.now() + (60 * 60 * 1000));
        return { delayed: true, reason: 'Outside calling hours' };
      }

      const recentCall = await prisma.call.findFirst({
        where: {
          contactId,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      });

      if (recentCall) {
        logger.info('Recent call exists, skipping', { contactId });
        return { skipped: true, reason: 'Called recently' };
      }

      const call = await twilioService.initiateCall(contactId, campaignId);

      return {
        success: true,
        callId: call.id
      };
    } catch (error) {
      logger.error('Call processor error', { error, contactId, campaignId });
      throw error;
    }
  });

  callQueue.on('stalled', (job) => {
    logger.warn('Job stalled', { jobId: job.id });
  });

  callQueue.on('error', (error) => {
    logger.error('Queue error', { error });
  });

  callQueue.on('waiting', (jobId) => {
    logger.debug('Job waiting', { jobId });
  });

  callQueue.on('active', (job) => {
    logger.info('Job active', { jobId: job.id, data: job.data });
  });

  callQueue.on('completed', (job, result) => {
    logger.info('Job completed', { jobId: job.id, result });
  });

  callQueue.on('failed', (job, err) => {
    logger.error('Job failed', { jobId: job.id, error: err });
  });
}
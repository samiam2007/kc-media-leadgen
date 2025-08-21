import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { TwilioService } from '../services/twilio.service';
import { DialogueEngine } from '../services/dialogue.engine';
import { VoiceService } from '../services/voice.service';
import { LeadService } from '../services/lead.service';
import { logger } from '../utils/logger';

export function createTwilioRoutes(
  prisma: PrismaClient,
  twilioService: TwilioService,
  dialogueEngine: DialogueEngine,
  voiceService: VoiceService,
  leadService: LeadService
): Router {
  const router = Router();

  // Initial webhook for incoming calls (no callId yet)
  router.post('/incoming', async (req: Request, res: Response) => {
    try {
      logger.info('Incoming call received', { body: req.body });
      const { CallSid, From, To } = req.body;
      
      // Generate TwiML response for incoming call
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="Polly.Joanna">Hello! This is KC Media Team. We specialize in drone photography and videography for commercial real estate. How can I help you today?</Say>
          <Pause length="1"/>
          <Say>If you'd like to learn more about our services, please stay on the line.</Say>
          <Hangup/>
        </Response>`;
      
      res.type('text/xml').send(twiml);
    } catch (error) {
      logger.error('Incoming call webhook error', { error });
      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say>We're sorry, but we're unable to take your call at this time. Please try again later.</Say>
          <Hangup/>
        </Response>`;
      res.type('text/xml').send(errorTwiml);
    }
  });

  router.post('/voice/:callId', async (req: Request, res: Response) => {
    try {
      const { callId } = req.params;
      
      const call = await prisma.call.findUnique({
        where: { id: callId },
        include: {
          campaign: {
            include: { script: true }
          }
        }
      });

      if (!call) {
        return res.status(404).send('Call not found');
      }

      const twiml = twilioService.generateInitialTwiML(callId, call.campaign.script);
      
      await prisma.call.update({
        where: { id: callId },
        data: {
          status: 'in_progress',
          startAt: new Date()
        }
      });

      res.type('text/xml').send(twiml);
    } catch (error) {
      logger.error('Voice webhook error', { error });
      res.status(500).send('Internal error');
    }
  });

  router.post('/handle-input/:callId', async (req: Request, res: Response) => {
    try {
      const { callId } = req.params;
      const { SpeechResult, CallSid } = req.body;

      const lastTurn = await prisma.turn.findFirst({
        where: { callId },
        orderBy: { turnNumber: 'desc' }
      });

      const currentState = {
        currentState: lastTurn?.state || 'greeting',
        context: {},
        turnCount: lastTurn?.turnNumber || 0,
        qualificationData: {}
      };

      const result = await dialogueEngine.processInput(
        callId,
        SpeechResult || '',
        currentState
      );

      if (result.qualificationUpdate) {
        const contact = await prisma.call.findUnique({
          where: { id: callId },
          select: { contactId: true }
        });

        if (contact) {
          await leadService.qualifyLead(contact.contactId, result.qualificationUpdate);
        }
      }

      let twiml: string;
      
      if (result.action === 'end_call') {
        twiml = twilioService.generateEndTwiML(result.response);
        
        await prisma.call.update({
          where: { id: callId },
          data: {
            status: 'completed',
            endAt: new Date(),
            outcome: result.nextState
          }
        });
      } else {
        const audioUrl = await voiceService.synthesizeSpeech(result.response);
        twiml = twilioService.generateResponseTwiML(result.response, callId, audioUrl);
      }

      res.type('text/xml').send(twiml);
    } catch (error) {
      logger.error('Input handling error', { error });
      
      const twiml = twilioService.generateEndTwiML(
        'I apologize, but I need to end this call. Thank you for your time.'
      );
      res.type('text/xml').send(twiml);
    }
  });

  router.post('/status/:callId', async (req: Request, res: Response) => {
    try {
      const { callId } = req.params;
      const { CallStatus, CallDuration, CallSid } = req.body;

      await prisma.call.update({
        where: { id: callId },
        data: {
          status: CallStatus.toLowerCase(),
          durationSeconds: parseInt(CallDuration) || 0
        }
      });

      if (CallStatus === 'completed') {
        const callDetails = await twilioService.getCallDetails(CallSid);
        
        await prisma.call.update({
          where: { id: callId },
          data: {
            costTwilio: parseFloat(callDetails.price || '0'),
            endAt: new Date()
          }
        });

        await prisma.event.create({
          data: {
            callId,
            type: 'call_completed',
            payload: callDetails
          }
        });
      }

      res.status(200).send('OK');
    } catch (error) {
      logger.error('Status callback error', { error });
      res.status(500).send('Error');
    }
  });

  router.post('/recording/:callId', async (req: Request, res: Response) => {
    try {
      const { callId } = req.params;
      const { RecordingSid, RecordingUrl } = req.body;

      const recordingUrl = await twilioService.getRecordingUrl(RecordingSid);
      
      await prisma.call.update({
        where: { id: callId },
        data: { recordingUrl }
      });

      await prisma.event.create({
        data: {
          callId,
          type: 'recording_completed',
          payload: { RecordingSid, RecordingUrl }
        }
      });

      res.status(200).send('OK');
    } catch (error) {
      logger.error('Recording callback error', { error });
      res.status(500).send('Error');
    }
  });

  router.post('/sms/opt-out', async (req: Request, res: Response) => {
    try {
      const { From, Body } = req.body;

      if (Body?.toLowerCase().includes('stop')) {
        await prisma.contact.updateMany({
          where: { phone: From },
          data: { dnc: true }
        });

        await prisma.dncList.create({
          data: {
            phone: From,
            reason: 'SMS opt-out',
            source: 'sms'
          }
        });

        await twilioService.sendSMS(
          From,
          'You have been removed from our list. Reply START to resubscribe.'
        );
      }

      res.status(200).send('OK');
    } catch (error) {
      logger.error('SMS opt-out error', { error });
      res.status(500).send('Error');
    }
  });

  return router;
}
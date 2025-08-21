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
      
      // Create a new call record in the database
      const call = await prisma.call.create({
        data: {
          twilioCallSid: CallSid,
          phoneNumber: From,
          direction: 'inbound',
          status: 'initiated',
          startAt: new Date(),
          // Create a temporary contact if it doesn't exist
          contact: {
            connectOrCreate: {
              where: { phone: From },
              create: {
                phone: From,
                status: 'new',
                source: 'inbound_call'
              }
            }
          },
          // Use a default campaign for inbound calls
          campaignId: null
        }
      });
      
      logger.info('Call record created', { callId: call.id });
      
      // Use dialogue engine to generate initial greeting
      const initialState = {
        currentState: 'greeting',
        context: { isInbound: true },
        turnCount: 0,
        qualificationData: {}
      };
      
      const dialogueResult = await dialogueEngine.processInput(
        call.id,
        '', // No user input yet for initial greeting
        initialState
      );
      
      try {
        // Try to use ElevenLabs for natural voice
        const audioUrl = await voiceService.synthesizeSpeech(dialogueResult.response);
        
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Play>${audioUrl}</Play>
            <Gather input="speech" timeout="3" speechTimeout="auto" action="/api/twilio/handle-input/${call.id}" method="POST">
              <Pause length="5"/>
            </Gather>
            <Redirect>/api/twilio/handle-input/${call.id}</Redirect>
          </Response>`;
        
        res.type('text/xml').send(twiml);
      } catch (voiceError) {
        // Fallback to Twilio's Polly voice if ElevenLabs fails
        logger.error('ElevenLabs failed, using Polly fallback', { error: voiceError });
        
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Gather input="speech" timeout="3" speechTimeout="auto" action="/api/twilio/handle-input/${call.id}" method="POST">
              <Say voice="Polly.Joanna">${dialogueResult.response}</Say>
              <Pause length="5"/>
            </Gather>
            <Redirect>/api/twilio/handle-input/${call.id}</Redirect>
          </Response>`;
        
        res.type('text/xml').send(twiml);
      }
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

  // Outbound call webhook
  router.post('/outbound/:callId', async (req: Request, res: Response) => {
    try {
      const { callId } = req.params;
      const { AnsweredBy } = req.body;
      
      logger.info('Outbound call answered', { callId, answeredBy: AnsweredBy });
      
      // If answered by machine, leave a message
      if (AnsweredBy === 'machine_end_beep' || AnsweredBy === 'machine_end_silence') {
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Say voice="Polly.Joanna">Hello, this is KC Media Team. We specialize in drone photography for commercial real estate. Please call us back at 913-238-7094 to learn how we can help your properties lease faster. Thank you!</Say>
            <Hangup/>
          </Response>`;
        
        await prisma.call.update({
          where: { id: callId },
          data: { 
            status: 'voicemail',
            outcome: 'machine_detected'
          }
        });
        
        return res.type('text/xml').send(twiml);
      }
      
      // Human answered - start conversation
      const call = await prisma.call.findUnique({
        where: { id: callId },
        include: {
          contact: true,
          campaign: {
            include: { script: true }
          }
        }
      });

      if (!call) {
        return res.status(404).send('Call not found');
      }
      
      // Use dialogue engine for initial greeting
      const initialState = {
        currentState: 'greeting',
        context: { 
          isOutbound: true,
          contactName: call.contact?.fullName,
          company: call.contact?.company
        },
        turnCount: 0,
        qualificationData: {}
      };
      
      const dialogueResult = await dialogueEngine.processInput(
        callId,
        '',
        initialState
      );
      
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Gather input="speech" timeout="3" speechTimeout="auto" action="/api/twilio/handle-input/${callId}" method="POST">
            <Say voice="Polly.Joanna">${dialogueResult.response}</Say>
            <Pause length="3"/>
          </Gather>
          <Redirect>/api/twilio/handle-input/${callId}</Redirect>
        </Response>`;
      
      await prisma.call.update({
        where: { id: callId },
        data: {
          status: 'in_progress',
          startAt: new Date()
        }
      });
      
      res.type('text/xml').send(twiml);
    } catch (error) {
      logger.error('Outbound call error', { error });
      res.status(500).send('Internal error');
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
      
      logger.info('Processing user input', { callId, input: SpeechResult });

      // Get the last turn to understand current state
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

      // Use dialogue engine with Claude to process the conversation
      const result = await dialogueEngine.processInput(
        callId,
        SpeechResult || '',
        currentState
      );
      
      logger.info('Dialogue result', { 
        callId, 
        nextState: result.nextState, 
        action: result.action 
      });

      // Update contact qualification if needed
      if (result.qualificationUpdate) {
        const call = await prisma.call.findUnique({
          where: { id: callId },
          select: { contactId: true }
        });

        if (call?.contactId) {
          await leadService.qualifyLead(call.contactId, result.qualificationUpdate);
        }
      }

      let twiml: string;
      
      if (result.action === 'end_call') {
        // End the call gracefully
        twiml = `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Say voice="Polly.Joanna">${result.response}</Say>
            <Pause length="1"/>
            <Say voice="Polly.Joanna">Have a great day!</Say>
            <Hangup/>
          </Response>`;
        
        await prisma.call.update({
          where: { id: callId },
          data: {
            status: 'completed',
            endAt: new Date(),
            outcome: result.nextState
          }
        });
      } else {
        // Continue the conversation
        try {
          const audioUrl = await voiceService.synthesizeSpeech(result.response);
          if (audioUrl) {
            twiml = `<?xml version="1.0" encoding="UTF-8"?>
              <Response>
                <Play>${audioUrl}</Play>
                <Gather input="speech" timeout="3" speechTimeout="auto" action="/api/twilio/handle-input/${callId}" method="POST">
                  <Pause length="5"/>
                </Gather>
                <Redirect>/api/twilio/handle-input/${callId}</Redirect>
              </Response>`;
          } else {
            throw new Error('No audio URL generated');
          }
        } catch (voiceError) {
          // Fallback to Twilio Polly
          logger.warn('Using Polly fallback', { error: voiceError });
          twiml = `<?xml version="1.0" encoding="UTF-8"?>
            <Response>
              <Gather input="speech" timeout="3" speechTimeout="auto" action="/api/twilio/handle-input/${callId}" method="POST">
                <Say voice="Polly.Joanna">${result.response}</Say>
                <Pause length="5"/>
              </Gather>
              <Redirect>/api/twilio/handle-input/${callId}</Redirect>
            </Response>`;
        }
      }

      res.type('text/xml').send(twiml);
    } catch (error) {
      logger.error('Input handling error', { error });
      
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="Polly.Joanna">I apologize, but I'm having technical difficulties. Please call us directly at 913-238-7094. Thank you!</Say>
          <Hangup/>
        </Response>`;
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
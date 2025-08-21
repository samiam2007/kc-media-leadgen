import twilio from 'twilio';
import { VoiceResponse } from 'twilio/lib/twiml/VoiceResponse';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { config } from '../config';

export class TwilioService {
  private client: twilio.Twilio;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
    this.prisma = prisma;
  }

  async initiateCall(contactId: string, campaignId: string) {
    try {
      const contact = await this.prisma.contact.findUnique({
        where: { id: contactId },
        include: { campaign: true }
      });

      if (!contact || contact.dnc) {
        throw new Error('Contact not found or on DNC list');
      }

      const call = await this.prisma.call.create({
        data: {
          campaignId,
          contactId,
          status: 'initiating'
        }
      });

      const twilioCall = await this.client.calls.create({
        to: contact.phone,
        from: config.twilio.phoneNumber,
        url: `${config.twilio.webhookUrl}/voice/${call.id}`,
        statusCallback: `${config.twilio.webhookUrl}/status/${call.id}`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        record: true,
        recordingStatusCallback: `${config.twilio.webhookUrl}/recording/${call.id}`,
        machineDetection: 'DetectMessageEnd',
        machineDetectionTimeout: 3000
      });

      await this.prisma.call.update({
        where: { id: call.id },
        data: {
          twilioCallSid: twilioCall.sid,
          status: 'queued'
        }
      });

      logger.info(`Call initiated for contact ${contactId}`, {
        callId: call.id,
        twilioSid: twilioCall.sid
      });

      return call;
    } catch (error) {
      logger.error('Failed to initiate call', { error, contactId, campaignId });
      throw error;
    }
  }

  generateInitialTwiML(callId: string, script: any): string {
    const twiml = new VoiceResponse();
    
    twiml.say({
      voice: 'Polly.Joanna'
    }, script.states.greeting.initialMessage || 'Hello, this is a call from Drone Marketing Services.');
    
    twiml.gather({
      input: 'speech',
      action: `/api/twilio/handle-input/${callId}`,
      timeout: 3,
      speechTimeout: 'auto',
      language: 'en-US',
      hints: 'yes, no, interested, not interested, callback, schedule'
    });

    return twiml.toString();
  }

  generateResponseTwiML(message: string, callId: string, audioUrl?: string): string {
    const twiml = new VoiceResponse();
    
    if (audioUrl) {
      twiml.play(audioUrl);
    } else {
      twiml.say({ voice: 'Polly.Joanna' }, message);
    }
    
    twiml.gather({
      input: 'speech',
      action: `/api/twilio/handle-input/${callId}`,
      timeout: 3,
      speechTimeout: 'auto',
      language: 'en-US'
    });

    return twiml.toString();
  }

  generateEndTwiML(message: string, followUpAction?: string): string {
    const twiml = new VoiceResponse();
    
    twiml.say({ voice: 'Polly.Joanna' }, message);
    
    if (followUpAction === 'sms') {
      twiml.sms('Thank you for your time. We\'ll send you more information shortly.');
    }
    
    twiml.hangup();
    
    return twiml.toString();
  }

  async sendSMS(to: string, body: string) {
    try {
      const message = await this.client.messages.create({
        to,
        from: config.twilio.phoneNumber,
        body
      });
      
      logger.info('SMS sent', { to, messageId: message.sid });
      return message;
    } catch (error) {
      logger.error('Failed to send SMS', { error, to });
      throw error;
    }
  }

  async getCallDetails(twilioCallSid: string) {
    try {
      const call = await this.client.calls(twilioCallSid).fetch();
      return {
        duration: call.duration,
        status: call.status,
        price: call.price,
        priceUnit: call.priceUnit,
        direction: call.direction,
        answeredBy: call.answeredBy
      };
    } catch (error) {
      logger.error('Failed to fetch call details', { error, twilioCallSid });
      throw error;
    }
  }

  async getRecordingUrl(recordingSid: string) {
    try {
      const recording = await this.client.recordings(recordingSid).fetch();
      return `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}`;
    } catch (error) {
      logger.error('Failed to fetch recording', { error, recordingSid });
      throw error;
    }
  }

  calculateCallCost(duration: number, pricePerMinute: number = 0.0085): number {
    const minutes = Math.ceil(duration / 60);
    return minutes * pricePerMinute;
  }
}
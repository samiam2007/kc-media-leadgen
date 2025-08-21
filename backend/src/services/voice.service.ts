import axios from 'axios';
import { logger } from '../utils/logger';
import { config } from '../config';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import WebSocket from 'ws';

interface VoiceOptions {
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

interface PlayHTOptions {
  voice?: string;
  quality?: 'draft' | 'low' | 'medium' | 'high' | 'premium';
  speed?: number;
  seed?: number;
}

export class VoiceService {
  private elevenLabsApiKey: string;
  private playHTApiKey?: string;
  private defaultVoiceId: string;
  private provider: 'elevenlabs' | 'playht' | 'twilio';

  constructor() {
    this.elevenLabsApiKey = config.elevenlabs.apiKey;
    this.playHTApiKey = config.playht?.apiKey;
    this.defaultVoiceId = config.elevenlabs.voiceId;
    this.provider = config.voice.provider || 'elevenlabs';
  }

  async synthesizeSpeech(
    text: string,
    options: VoiceOptions = {}
  ): Promise<string> {
    switch (this.provider) {
      case 'elevenlabs':
        return this.synthesizeElevenLabs(text, options);
      case 'playht':
        return this.synthesizePlayHT(text, options as PlayHTOptions);
      default:
        return this.synthesizeTwilioPolly(text);
    }
  }

  private async synthesizeElevenLabs(
    text: string,
    options: VoiceOptions
  ): Promise<string> {
    try {
      const voiceId = options.voiceId || this.defaultVoiceId || 'pNInz6obpgDQGcFmaJgB'; // Adam voice as default
      const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

      const response = await axios.post(
        url,
        {
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: options.stability || 0.5,
            similarity_boost: options.similarityBoost || 0.75
          }
        },
        {
          headers: {
            'xi-api-key': this.elevenLabsApiKey,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg'
          },
          responseType: 'arraybuffer'
        }
      );

      // Convert audio to base64 data URL that Twilio can play
      const audioBase64 = Buffer.from(response.data).toString('base64');
      const dataUrl = `data:audio/mpeg;base64,${audioBase64}`;
      
      // For now, return a placeholder URL since we need proper file hosting
      // In production, this should upload to S3 or similar
      logger.info('ElevenLabs audio generated', { textLength: text.length });
      
      // Return empty string to fall back to Twilio Polly for now
      // Once we set up file hosting, we can return the actual URL
      return '';
    } catch (error) {
      logger.error('ElevenLabs synthesis failed', { error, text });
      throw error;
    }
  }

  private async synthesizePlayHT(
    text: string,
    options: PlayHTOptions
  ): Promise<string> {
    if (!this.playHTApiKey) {
      throw new Error('PlayHT API key not configured');
    }

    try {
      const response = await axios.post(
        'https://api.play.ht/api/v2/tts/stream',
        {
          text,
          voice: options.voice || 's3://voice-cloning-zero-shot/d9ff78ba-d016-47f6-b0ef-dd630f59414e',
          output_format: 'mp3',
          quality: options.quality || 'medium',
          speed: options.speed || 1,
          seed: options.seed,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${this.playHTApiKey}`,
            'X-User-ID': config.playht?.userId,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.url;
    } catch (error) {
      logger.error('PlayHT synthesis failed', { error, text });
      throw error;
    }
  }

  private async synthesizeTwilioPolly(text: string): Promise<string> {
    return '';
  }

  async cloneVoice(
    name: string,
    audioFiles: string[],
    description?: string
  ): Promise<string> {
    if (this.provider !== 'elevenlabs') {
      throw new Error('Voice cloning only supported with ElevenLabs');
    }

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description || 'Custom voice for drone sales');
      
      audioFiles.forEach((file, index) => {
        formData.append(`files[${index}]`, fs.createReadStream(file));
      });

      const response = await axios.post(
        'https://api.elevenlabs.io/v1/voices/add',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'xi-api-key': this.elevenLabsApiKey
          }
        }
      );

      logger.info('Voice cloned successfully', { voiceId: response.data.voice_id });
      return response.data.voice_id;
    } catch (error) {
      logger.error('Voice cloning failed', { error });
      throw error;
    }
  }

  async getVoices(): Promise<any[]> {
    if (this.provider !== 'elevenlabs') {
      return [];
    }

    try {
      const response = await axios.get(
        'https://api.elevenlabs.io/v1/voices',
        {
          headers: {
            'xi-api-key': this.elevenLabsApiKey
          }
        }
      );

      return response.data.voices;
    } catch (error) {
      logger.error('Failed to fetch voices', { error });
      throw error;
    }
  }

  async deleteVoice(voiceId: string): Promise<void> {
    if (this.provider !== 'elevenlabs') {
      return;
    }

    try {
      await axios.delete(
        `https://api.elevenlabs.io/v1/voices/${voiceId}`,
        {
          headers: {
            'xi-api-key': this.elevenLabsApiKey
          }
        }
      );

      logger.info('Voice deleted', { voiceId });
    } catch (error) {
      logger.error('Failed to delete voice', { error, voiceId });
      throw error;
    }
  }

  private async uploadToS3(filepath: string, filename: string): Promise<string> {
    return `https://${config.aws.bucketName}.s3.amazonaws.com/audio/${filename}`;
  }

  async streamRealtimeTTS(text: string, websocket: any): Promise<void> {
    if (this.provider !== 'elevenlabs') {
      throw new Error('Realtime TTS only supported with ElevenLabs');
    }

    try {
      const ws = new WebSocket(
        `wss://api.elevenlabs.io/v1/text-to-speech/${this.defaultVoiceId}/stream-input?model_id=eleven_turbo_v2`
      );

      ws.on('open', () => {
        ws.send(JSON.stringify({
          text: ' ',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8
          },
          xi_api_key: this.elevenLabsApiKey
        }));

        ws.send(JSON.stringify({
          text,
          try_trigger_generation: true
        }));
      });

      ws.on('message', (data: any) => {
        const message = JSON.parse(data.toString());
        if (message.audio) {
          websocket.send(Buffer.from(message.audio, 'base64'));
        }
      });

      ws.on('error', (error) => {
        logger.error('Realtime TTS error', { error });
      });
    } catch (error) {
      logger.error('Failed to stream TTS', { error });
      throw error;
    }
  }

  calculateTTSCost(text: string, provider: string = this.provider): number {
    const charCount = text.length;
    
    const costPerChar = {
      elevenlabs: 0.00018,
      playht: 0.00015,
      twilio: 0.00008
    };

    return charCount * (costPerChar[provider as keyof typeof costPerChar] || 0.0001);
  }
}
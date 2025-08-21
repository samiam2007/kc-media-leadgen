import { Anthropic } from '@anthropic-ai/sdk';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { config } from '../config';

interface DialogueState {
  currentState: string;
  context: Record<string, any>;
  turnCount: number;
  qualificationData: Record<string, any>;
}

interface DialogueTransition {
  from: string;
  to: string;
  condition?: (input: string, context: any) => boolean;
}

export class DialogueEngine {
  private anthropic: Anthropic;
  private prisma: PrismaClient;
  private states: Map<string, any>;
  private transitions: DialogueTransition[];

  constructor(prisma: PrismaClient) {
    this.anthropic = new Anthropic({
      apiKey: config.anthropic.apiKey
    });
    this.prisma = prisma;
    this.states = new Map();
    this.transitions = [];
    this.initializeStateMachine();
  }

  private initializeStateMachine() {
    this.states.set('greeting', {
      maxTurns: 2,
      objective: 'Confirm speaking with right person and introduce value prop'
    });
    
    this.states.set('value_pitch', {
      maxTurns: 3,
      objective: 'Explain drone photography ROI and benefits'
    });
    
    this.states.set('qualify', {
      maxTurns: 5,
      objective: 'Gather timeline, budget, property count, decision authority'
    });
    
    this.states.set('objection_handling', {
      maxTurns: 3,
      objective: 'Address concerns about price, timing, or value'
    });
    
    this.states.set('close', {
      maxTurns: 2,
      objective: 'Book meeting or schedule follow-up'
    });
    
    this.states.set('end', {
      maxTurns: 1,
      objective: 'Polite close with opt-out instructions'
    });

    this.transitions = [
      { from: 'greeting', to: 'value_pitch' },
      { from: 'greeting', to: 'objection_handling' },
      { from: 'greeting', to: 'end' },
      { from: 'value_pitch', to: 'qualify' },
      { from: 'value_pitch', to: 'objection_handling' },
      { from: 'qualify', to: 'close' },
      { from: 'qualify', to: 'objection_handling' },
      { from: 'objection_handling', to: 'qualify' },
      { from: 'objection_handling', to: 'close' },
      { from: 'objection_handling', to: 'end' },
      { from: 'close', to: 'end' }
    ];
  }

  async processInput(
    callId: string,
    userInput: string,
    currentState: DialogueState
  ): Promise<{
    response: string;
    nextState: string;
    qualificationUpdate?: Record<string, any>;
    action?: string;
  }> {
    try {
      const call = await this.prisma.call.findUnique({
        where: { id: callId },
        include: {
          contact: true,
          campaign: {
            include: { script: true }
          }
        }
      });

      if (!call) {
        throw new Error('Call not found');
      }

      const intent = await this.extractIntent(userInput, currentState);
      const nextState = this.determineNextState(currentState.currentState, intent);
      const response = await this.generateResponse(
        nextState,
        userInput,
        call.contact,
        call.campaign.script,
        currentState
      );

      await this.prisma.turn.create({
        data: {
          callId,
          turnNumber: currentState.turnCount + 1,
          state: nextState,
          userInput,
          botResponse: response.text,
          confidence: response.confidence
        }
      });

      const qualificationUpdate = this.extractQualificationData(
        userInput,
        nextState,
        currentState
      );

      return {
        response: response.text,
        nextState,
        qualificationUpdate,
        action: this.determineAction(nextState, response.intent)
      };
    } catch (error) {
      logger.error('Dialogue processing error', { error, callId });
      throw error;
    }
  }

  private async extractIntent(input: string, state: DialogueState): Promise<string> {
    const prompt = `Analyze this response in a sales call context.
Current state: ${state.currentState}
User said: "${input}"

Classify the intent as one of:
- interested
- not_interested
- objection
- question
- schedule
- callback
- not_decision_maker
- wrong_person
- request_info

Return only the intent label.`;

    const response = await this.anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 50,
      messages: [{ role: 'user', content: prompt }]
    });

    return response.content[0].type === 'text' 
      ? response.content[0].text.trim().toLowerCase()
      : 'unknown';
  }

  private determineNextState(currentState: string, intent: string): string {
    const stateMap: Record<string, Record<string, string>> = {
      greeting: {
        interested: 'value_pitch',
        not_interested: 'objection_handling',
        wrong_person: 'end',
        default: 'value_pitch'
      },
      value_pitch: {
        interested: 'qualify',
        question: 'value_pitch',
        objection: 'objection_handling',
        not_interested: 'objection_handling',
        default: 'qualify'
      },
      qualify: {
        schedule: 'close',
        objection: 'objection_handling',
        not_decision_maker: 'close',
        default: 'qualify'
      },
      objection_handling: {
        interested: 'qualify',
        schedule: 'close',
        not_interested: 'end',
        default: 'qualify'
      },
      close: {
        schedule: 'end',
        callback: 'end',
        default: 'end'
      }
    };

    const transitions = stateMap[currentState];
    return transitions?.[intent] || transitions?.default || 'end';
  }

  private async generateResponse(
    state: string,
    userInput: string,
    contact: any,
    script: any,
    dialogueState: DialogueState
  ): Promise<{ text: string; confidence: number; intent?: string }> {
    const systemPrompt = `You are a professional sales development representative for a drone photography/videography service targeting commercial real estate brokers.

Current call state: ${state}
Contact: ${contact.fullName} at ${contact.company}
Previous context: ${JSON.stringify(dialogueState.context)}

Guidelines:
- Keep responses under 2 sentences
- Sound natural and conversational
- Focus on value and ROI
- Ask one question at a time
- Be respectful of their time`;

    const statePrompts: Record<string, string> = {
      greeting: 'Introduce yourself and confirm you\'re speaking with the right person. Mention a brief value prop.',
      value_pitch: 'Explain how drone media helps properties lease 30% faster with aerial views and traffic overlays.',
      qualify: 'Ask about their current listings, timeline for media needs, and typical marketing budget.',
      objection_handling: 'Address their concern empathetically and pivot to value or alternative solution.',
      close: 'Offer two specific meeting times or send a booking link.',
      end: 'Thank them and provide opt-out instructions.'
    };

    const userPrompt = `User said: "${userInput}"
    
Generate a response for the ${state} state.
Objective: ${statePrompts[state]}`;

    const response = await this.anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 150,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });

    const text = response.content[0].type === 'text' 
      ? response.content[0].text.trim()
      : 'I understand. Let me help you with that.';

    return {
      text,
      confidence: 0.85
    };
  }

  private extractQualificationData(
    input: string,
    state: string,
    dialogueState: DialogueState
  ): Record<string, any> {
    const updates: Record<string, any> = {};

    if (state === 'qualify') {
      if (input.match(/\d+\s*(properties?|buildings?|listings?)/i)) {
        const match = input.match(/(\d+)/);
        if (match) {
          updates.propertiesCount = parseInt(match[1]);
        }
      }

      if (input.match(/\$[\d,]+|[\d,]+\s*dollars?/i)) {
        const match = input.match(/\$?([\d,]+)/);
        if (match) {
          const amount = parseInt(match[1].replace(/,/g, ''));
          if (amount < 2000) {
            updates.budgetRange = '$500-$2,000';
          } else if (amount < 5000) {
            updates.budgetRange = '$2,000-$5,000';
          } else {
            updates.budgetRange = '$5,000+';
          }
        }
      }

      if (input.match(/next\s+(week|month)|asap|immediately|urgent/i)) {
        updates.timeline = '0-30 days';
      } else if (input.match(/quarter|3\s*months?/i)) {
        updates.timeline = '30-90 days';
      }

      if (input.match(/video|footage|aerial/i)) {
        updates.needsVideo = true;
      }
      
      if (input.match(/photo|picture|image/i)) {
        updates.needsPhotos = true;
      }

      if (input.match(/decision|authorize|approve|budget/i)) {
        updates.decisionMaker = true;
      }
    }

    return updates;
  }

  private determineAction(state: string, intent?: string): string {
    if (state === 'close' && intent === 'schedule') {
      return 'book_meeting';
    }
    if (state === 'end') {
      return 'end_call';
    }
    if (state === 'qualify') {
      return 'continue_qualification';
    }
    return 'continue';
  }

  async calculateLeadScore(qualificationData: Record<string, any>): number {
    let score = 0;

    if (qualificationData.timeline === '0-30 days') score += 10;
    else if (qualificationData.timeline === '30-90 days') score += 5;

    if (qualificationData.propertiesCount) {
      if (qualificationData.propertiesCount >= 5) score += 8;
      else if (qualificationData.propertiesCount >= 2) score += 5;
    }

    if (qualificationData.needsVideo) score += 5;
    if (qualificationData.needsPhotos) score += 3;

    if (qualificationData.budgetRange) {
      if (qualificationData.budgetRange.includes('5,000+')) score += 10;
      else if (qualificationData.budgetRange.includes('2,000')) score += 7;
      else score += 3;
    }

    if (qualificationData.decisionMaker) score += 5;

    return score;
  }
}
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { DialogueEngine } from './dialogue.engine';
import { CRMService } from './crm.service';
import { TwilioService } from './twilio.service';

interface LeadQualificationCriteria {
  minScore: number;
  requiredFields: string[];
  disqualifiers: string[];
}

export class LeadService {
  private prisma: PrismaClient;
  private dialogueEngine: DialogueEngine;
  private crmService: CRMService;
  private twilioService: TwilioService;

  constructor(
    prisma: PrismaClient,
    dialogueEngine: DialogueEngine,
    crmService: CRMService,
    twilioService: TwilioService
  ) {
    this.prisma = prisma;
    this.dialogueEngine = dialogueEngine;
    this.crmService = crmService;
    this.twilioService = twilioService;
  }

  async qualifyLead(
    contactId: string,
    qualificationData: Record<string, any>
  ): Promise<{
    qualified: boolean;
    score: number;
    nextAction: string;
    reason?: string;
  }> {
    try {
      const score = await this.dialogueEngine.calculateLeadScore(qualificationData);
      
      const leadIntake = await this.prisma.leadIntake.upsert({
        where: { contactId },
        update: {
          ...qualificationData,
          score,
          updatedAt: new Date()
        },
        create: {
          contactId,
          ...qualificationData,
          score
        }
      });

      const qualified = this.evaluateQualification(leadIntake, score);
      const nextAction = this.determineNextAction(score, qualified);

      await this.prisma.contact.update({
        where: { id: contactId },
        data: {
          status: qualified ? 'qualified' : score > 8 ? 'nurture' : 'disqualified'
        }
      });

      if (qualified) {
        await this.handleQualifiedLead(contactId, leadIntake);
      } else if (score > 8) {
        await this.handleNurtureLead(contactId, leadIntake);
      }

      return {
        qualified,
        score,
        nextAction,
        reason: !qualified ? this.getDisqualificationReason(leadIntake) : undefined
      };
    } catch (error) {
      logger.error('Lead qualification error', { error, contactId });
      throw error;
    }
  }

  private evaluateQualification(leadIntake: any, score: number): boolean {
    const criteria: LeadQualificationCriteria = {
      minScore: 15,
      requiredFields: ['timeline', 'budgetRange'],
      disqualifiers: ['not_decision_maker', 'no_budget', 'competitor']
    };

    if (score < criteria.minScore) {
      return false;
    }

    for (const field of criteria.requiredFields) {
      if (!leadIntake[field]) {
        return false;
      }
    }

    if (leadIntake.timeline === 'over_6_months') {
      return false;
    }

    return true;
  }

  private determineNextAction(score: number, qualified: boolean): string {
    if (qualified) {
      return 'book_meeting';
    } else if (score >= 12) {
      return 'schedule_callback';
    } else if (score >= 8) {
      return 'email_nurture';
    } else {
      return 'archive';
    }
  }

  private async handleQualifiedLead(contactId: string, leadIntake: any): Promise<void> {
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId }
    });

    if (!contact) return;

    await this.crmService.createOrUpdateContact({
      email: contact.email || `${contact.phone}@placeholder.com`,
      firstname: contact.fullName.split(' ')[0],
      lastname: contact.fullName.split(' ').slice(1).join(' '),
      phone: contact.phone,
      company: contact.company,
      properties: {
        lead_score: leadIntake.score,
        timeline: leadIntake.timeline,
        budget_range: leadIntake.budgetRange,
        needs_video: leadIntake.needsVideo,
        needs_photos: leadIntake.needsPhotos,
        properties_count: leadIntake.propertiesCount,
        lead_source: 'ai_outbound_call'
      }
    });

    await this.crmService.createDeal({
      dealname: `${contact.company} - Drone Media Services`,
      pipeline: 'default',
      dealstage: 'appointmentscheduled',
      amount: this.estimateDealValue(leadIntake),
      associatedContactIds: [contact.email || contact.phone]
    });

    await this.sendBookingLink(contact);
  }

  private async handleNurtureLead(contactId: string, leadIntake: any): Promise<void> {
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId }
    });

    if (!contact) return;

    await this.crmService.addToNurtureSequence(
      contact.email || `${contact.phone}@placeholder.com`,
      'drone_services_nurture'
    );

    await this.twilioService.sendSMS(
      contact.phone,
      `Hi ${contact.fullName}, thanks for your time today! I'm sending you our portfolio showcasing recent drone projects. Would love to reconnect when you're ready: bit.ly/drone-portfolio`
    );
  }

  private getDisqualificationReason(leadIntake: any): string {
    if (!leadIntake.timeline || leadIntake.timeline === 'over_6_months') {
      return 'Timeline too far out';
    }
    if (!leadIntake.budgetRange || leadIntake.budgetRange === 'under_500') {
      return 'Budget not aligned';
    }
    if (!leadIntake.decisionMaker) {
      return 'Not decision maker';
    }
    if (leadIntake.score < 8) {
      return 'Low engagement score';
    }
    return 'Does not meet qualification criteria';
  }

  private estimateDealValue(leadIntake: any): number {
    let value = 0;
    
    if (leadIntake.budgetRange) {
      const ranges: Record<string, number> = {
        '$500-$2,000': 1250,
        '$2,000-$5,000': 3500,
        '$5,000+': 7500
      };
      value = ranges[leadIntake.budgetRange] || 1000;
    }

    if (leadIntake.propertiesCount) {
      value *= Math.min(leadIntake.propertiesCount, 5);
    }

    return value;
  }

  private async sendBookingLink(contact: any): Promise<void> {
    const message = `Hi ${contact.fullName}! Great talking with you about drone media for ${contact.company}. 

Here's my calendar to book a 15-minute strategy call: calendly.com/drone-media/intro

We'll review:
✓ Sample drone footage for your property type
✓ Turnaround times and pricing
✓ ROI metrics from similar brokers

Looking forward to it!`;

    await this.twilioService.sendSMS(contact.phone, message);
  }

  async getLeadMetrics(campaignId?: string): Promise<any> {
    const where = campaignId ? { campaignId } : {};
    
    const [totalContacts, qualifiedLeads, callsCompleted, avgScore] = await Promise.all([
      this.prisma.contact.count({ where }),
      this.prisma.contact.count({ where: { ...where, status: 'qualified' } }),
      this.prisma.call.count({ where: { ...where, status: 'completed' } }),
      this.prisma.leadIntake.aggregate({
        where: campaignId ? { contact: { campaignId } } : {},
        _avg: { score: true }
      })
    ]);

    const conversionRate = totalContacts > 0 
      ? (qualifiedLeads / totalContacts) * 100 
      : 0;

    return {
      totalContacts,
      qualifiedLeads,
      callsCompleted,
      averageScore: avgScore._avg.score || 0,
      conversionRate: conversionRate.toFixed(2)
    };
  }

  async exportLeads(
    campaignId: string,
    format: 'csv' | 'json' = 'csv'
  ): Promise<string> {
    const leads = await this.prisma.contact.findMany({
      where: { campaignId },
      include: {
        leadIntake: true,
        calls: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (format === 'json') {
      return JSON.stringify(leads, null, 2);
    }

    const headers = [
      'Name',
      'Company',
      'Phone',
      'Email',
      'Status',
      'Score',
      'Timeline',
      'Budget',
      'Properties',
      'Last Call',
      'Outcome'
    ];

    const rows = leads.map(lead => [
      lead.fullName,
      lead.company,
      lead.phone,
      lead.email || '',
      lead.status,
      lead.leadIntake?.score || 0,
      lead.leadIntake?.timeline || '',
      lead.leadIntake?.budgetRange || '',
      lead.leadIntake?.propertiesCount || 0,
      lead.calls[0]?.startAt?.toISOString() || '',
      lead.calls[0]?.outcome || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csv;
  }
}
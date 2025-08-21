import { Client as HubspotClient } from '@hubspot/api-client';
import axios from 'axios';
import { logger } from '../utils/logger';
import { config } from '../config';

interface ContactData {
  email: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  company?: string;
  properties?: Record<string, any>;
}

interface DealData {
  dealname: string;
  pipeline: string;
  dealstage: string;
  amount?: number;
  closedate?: string;
  associatedContactIds?: string[];
}

export class CRMService {
  private hubspotClient?: HubspotClient;
  private provider: 'hubspot' | 'pipedrive' | 'internal';

  constructor() {
    this.provider = config.crm.provider || 'internal';
    
    if (this.provider === 'hubspot' && config.hubspot?.accessToken) {
      this.hubspotClient = new HubspotClient({
        accessToken: config.hubspot.accessToken
      });
    }
  }

  async createOrUpdateContact(contactData: ContactData): Promise<any> {
    switch (this.provider) {
      case 'hubspot':
        return this.createHubspotContact(contactData);
      case 'pipedrive':
        return this.createPipedriveContact(contactData);
      default:
        return this.createInternalContact(contactData);
    }
  }

  private async createHubspotContact(contactData: ContactData): Promise<any> {
    if (!this.hubspotClient) {
      throw new Error('HubSpot client not initialized');
    }

    try {
      const properties = {
        email: contactData.email,
        firstname: contactData.firstname,
        lastname: contactData.lastname,
        phone: contactData.phone,
        company: contactData.company,
        ...contactData.properties
      };

      const existingContact = await this.findHubspotContact(contactData.email);
      
      if (existingContact) {
        const response = await this.hubspotClient.crm.contacts.basicApi.update(
          existingContact.id,
          { properties }
        );
        logger.info('HubSpot contact updated', { contactId: response.id });
        return response;
      } else {
        const response = await this.hubspotClient.crm.contacts.basicApi.create({
          properties
        });
        logger.info('HubSpot contact created', { contactId: response.id });
        return response;
      }
    } catch (error) {
      logger.error('HubSpot contact operation failed', { error, contactData });
      throw error;
    }
  }

  private async findHubspotContact(email: string): Promise<any> {
    if (!this.hubspotClient) return null;

    try {
      const response = await this.hubspotClient.crm.contacts.searchApi.doSearch({
        filterGroups: [{
          filters: [{
            propertyName: 'email',
            operator: 'EQ',
            value: email
          }]
        }],
        limit: 1
      });

      return response.results[0] || null;
    } catch (error) {
      logger.error('HubSpot contact search failed', { error, email });
      return null;
    }
  }

  async createDeal(dealData: DealData): Promise<any> {
    switch (this.provider) {
      case 'hubspot':
        return this.createHubspotDeal(dealData);
      case 'pipedrive':
        return this.createPipedriveDeal(dealData);
      default:
        return this.createInternalDeal(dealData);
    }
  }

  private async createHubspotDeal(dealData: DealData): Promise<any> {
    if (!this.hubspotClient) {
      throw new Error('HubSpot client not initialized');
    }

    try {
      const properties = {
        dealname: dealData.dealname,
        pipeline: dealData.pipeline,
        dealstage: dealData.dealstage,
        amount: dealData.amount?.toString(),
        closedate: dealData.closedate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };

      const response = await this.hubspotClient.crm.deals.basicApi.create({
        properties
      });

      if (dealData.associatedContactIds?.length) {
        for (const contactId of dealData.associatedContactIds) {
          await this.associateDealWithContact(response.id, contactId);
        }
      }

      logger.info('HubSpot deal created', { dealId: response.id });
      return response;
    } catch (error) {
      logger.error('HubSpot deal creation failed', { error, dealData });
      throw error;
    }
  }

  private async associateDealWithContact(dealId: string, contactEmail: string): Promise<void> {
    if (!this.hubspotClient) return;

    try {
      const contact = await this.findHubspotContact(contactEmail);
      if (!contact) return;

      await this.hubspotClient.crm.deals.associationsApi.create(
        dealId,
        'contacts',
        contact.id,
        'deal_to_contact'
      );
    } catch (error) {
      logger.error('Deal association failed', { error, dealId, contactEmail });
    }
  }

  async addToNurtureSequence(email: string, sequenceName: string): Promise<void> {
    switch (this.provider) {
      case 'hubspot':
        return this.addToHubspotWorkflow(email, sequenceName);
      default:
        logger.info('Adding to nurture sequence', { email, sequenceName });
    }
  }

  private async addToHubspotWorkflow(email: string, workflowId: string): Promise<void> {
    if (!this.hubspotClient) return;

    try {
      const contact = await this.findHubspotContact(email);
      if (!contact) return;

      await axios.post(
        `https://api.hubapi.com/automation/v2/workflows/${workflowId}/enrollments/contacts/${contact.id}`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${config.hubspot.accessToken}`
          }
        }
      );

      logger.info('Contact enrolled in workflow', { email, workflowId });
    } catch (error) {
      logger.error('Workflow enrollment failed', { error, email, workflowId });
    }
  }

  private async createPipedriveContact(contactData: ContactData): Promise<any> {
    try {
      const response = await axios.post(
        'https://api.pipedrive.com/v1/persons',
        {
          name: `${contactData.firstname} ${contactData.lastname}`,
          email: contactData.email,
          phone: contactData.phone,
          org_name: contactData.company
        },
        {
          params: { api_token: config.pipedrive?.apiToken }
        }
      );

      logger.info('Pipedrive contact created', { contactId: response.data.data.id });
      return response.data.data;
    } catch (error) {
      logger.error('Pipedrive contact creation failed', { error, contactData });
      throw error;
    }
  }

  private async createPipedriveDeal(dealData: DealData): Promise<any> {
    try {
      const response = await axios.post(
        'https://api.pipedrive.com/v1/deals',
        {
          title: dealData.dealname,
          value: dealData.amount,
          currency: 'USD',
          stage_id: 1,
          status: 'open'
        },
        {
          params: { api_token: config.pipedrive?.apiToken }
        }
      );

      logger.info('Pipedrive deal created', { dealId: response.data.data.id });
      return response.data.data;
    } catch (error) {
      logger.error('Pipedrive deal creation failed', { error, dealData });
      throw error;
    }
  }

  private async createInternalContact(contactData: ContactData): Promise<any> {
    logger.info('Internal contact created', { contactData });
    return { id: 'internal_' + Date.now(), ...contactData };
  }

  private async createInternalDeal(dealData: DealData): Promise<any> {
    logger.info('Internal deal created', { dealData });
    return { id: 'internal_deal_' + Date.now(), ...dealData };
  }

  async syncContactsFromCRM(limit: number = 100): Promise<any[]> {
    switch (this.provider) {
      case 'hubspot':
        return this.syncHubspotContacts(limit);
      default:
        return [];
    }
  }

  private async syncHubspotContacts(limit: number): Promise<any[]> {
    if (!this.hubspotClient) return [];

    try {
      const response = await this.hubspotClient.crm.contacts.basicApi.getPage(
        limit,
        undefined,
        ['email', 'firstname', 'lastname', 'phone', 'company']
      );

      return response.results.map(contact => ({
        email: contact.properties.email,
        firstname: contact.properties.firstname,
        lastname: contact.properties.lastname,
        phone: contact.properties.phone,
        company: contact.properties.company
      }));
    } catch (error) {
      logger.error('HubSpot sync failed', { error });
      return [];
    }
  }

  async getContactActivity(email: string): Promise<any> {
    switch (this.provider) {
      case 'hubspot':
        return this.getHubspotActivity(email);
      default:
        return null;
    }
  }

  private async getHubspotActivity(email: string): Promise<any> {
    if (!this.hubspotClient) return null;

    try {
      const contact = await this.findHubspotContact(email);
      if (!contact) return null;

      const engagements = await this.hubspotClient.crm.timeline.eventsApi.getPage(
        undefined,
        undefined,
        undefined,
        undefined,
        [`contact:${contact.id}`]
      );

      return engagements.results;
    } catch (error) {
      logger.error('Failed to get contact activity', { error, email });
      return null;
    }
  }
}
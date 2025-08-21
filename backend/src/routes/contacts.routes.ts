import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import { logger } from '../utils/logger';

const upload = multer({ dest: '/tmp/uploads/' });

export function createContactsRoutes(prisma: PrismaClient): Router {
  const router = Router();

  // Get all contacts
  router.get('/contacts', async (req: Request, res: Response) => {
    try {
      const contacts = await prisma.contact.findMany({
        include: {
          calls: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      res.json(contacts);
    } catch (error) {
      logger.error('Error fetching contacts', { error });
      res.status(500).json({ error: 'Failed to fetch contacts' });
    }
  });

  // Upload CSV contacts
  router.post('/contacts/upload', upload.single('file'), async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const results: any[] = [];
    const errors: any[] = [];
    
    try {
      // Parse CSV file
      await new Promise((resolve, reject) => {
        fs.createReadStream(req.file!.path)
          .pipe(csv())
          .on('data', (data) => {
            // Validate and clean data
            const contact = {
              fullName: data.name || data.fullName || data.full_name || '',
              company: data.company || data.organization || '',
              phone: cleanPhoneNumber(data.phone || data.phoneNumber || data.phone_number || ''),
              email: data.email || '',
              title: data.title || data.position || '',
              source: data.source || 'csv_import',
              notes: data.notes || '',
              status: 'new' as const,
              dnc: false
            };

            if (contact.phone && contact.phone.length >= 10) {
              results.push(contact);
            } else {
              errors.push({ data, reason: 'Invalid phone number' });
            }
          })
          .on('end', resolve)
          .on('error', reject);
      });

      // Check for DNC list
      const dncNumbers = await prisma.dncList.findMany({
        select: { phone: true }
      });
      const dncSet = new Set(dncNumbers.map(d => d.phone));

      // Filter out DNC numbers
      const validContacts = results.filter(contact => {
        if (dncSet.has(contact.phone)) {
          errors.push({ data: contact, reason: 'Number on DNC list' });
          return false;
        }
        return true;
      });

      // Bulk insert contacts
      const inserted = await prisma.contact.createMany({
        data: validContacts,
        skipDuplicates: true
      });

      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      res.json({
        success: true,
        imported: inserted.count,
        errors: errors.length,
        errorDetails: errors.slice(0, 10) // Return first 10 errors
      });
    } catch (error) {
      logger.error('Error uploading contacts', { error });
      
      // Clean up file on error
      if (req.file?.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch {}
      }
      
      res.status(500).json({ error: 'Failed to import contacts' });
    }
  });

  // Create single contact
  router.post('/contacts', async (req: Request, res: Response) => {
    try {
      const { fullName, company, phone, email, title, notes } = req.body;
      
      const cleanedPhone = cleanPhoneNumber(phone);
      
      // Check DNC
      const isOnDNC = await prisma.dncList.findFirst({
        where: { phone: cleanedPhone }
      });

      if (isOnDNC) {
        return res.status(400).json({ error: 'Phone number is on DNC list' });
      }

      const contact = await prisma.contact.create({
        data: {
          fullName,
          company,
          phone: cleanedPhone,
          email,
          title,
          notes,
          source: 'manual',
          status: 'new',
          dnc: false
        }
      });

      res.json(contact);
    } catch (error) {
      logger.error('Error creating contact', { error });
      res.status(500).json({ error: 'Failed to create contact' });
    }
  });

  // Update contact
  router.put('/contacts/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      if (updates.phone) {
        updates.phone = cleanPhoneNumber(updates.phone);
      }

      const contact = await prisma.contact.update({
        where: { id },
        data: updates
      });

      res.json(contact);
    } catch (error) {
      logger.error('Error updating contact', { error });
      res.status(500).json({ error: 'Failed to update contact' });
    }
  });

  // Delete contact
  router.delete('/contacts/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      await prisma.contact.delete({
        where: { id }
      });

      res.json({ success: true });
    } catch (error) {
      logger.error('Error deleting contact', { error });
      res.status(500).json({ error: 'Failed to delete contact' });
    }
  });

  // Add to DNC list
  router.post('/contacts/:id/dnc', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      const contact = await prisma.contact.update({
        where: { id },
        data: { dnc: true }
      });

      await prisma.dncList.create({
        data: {
          phone: contact.phone,
          reason: reason || 'User requested',
          source: 'manual'
        }
      });

      res.json({ success: true });
    } catch (error) {
      logger.error('Error adding to DNC', { error });
      res.status(500).json({ error: 'Failed to add to DNC list' });
    }
  });

  return router;
}

function cleanPhoneNumber(phone: string): string {
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, '');
  
  // Add US country code if needed
  if (cleaned.length === 10) {
    cleaned = '1' + cleaned;
  }
  
  // Add + prefix
  if (cleaned.length === 11 && !cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
}
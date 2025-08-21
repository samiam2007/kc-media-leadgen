import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { logger } from '../utils/logger';

const CreateScriptSchema = z.object({
  name: z.string(),
  persona: z.string(),
  states: z.object({
    greeting: z.object({
      initialMessage: z.string(),
      fallbackMessage: z.string().optional()
    }),
    value_pitch: z.object({
      mainPitch: z.string(),
      benefits: z.array(z.string())
    }),
    qualify: z.object({
      questions: z.array(z.string())
    }),
    objection_handling: z.object({
      responses: z.record(z.string())
    }),
    close: z.object({
      bookingOffer: z.string(),
      alternativeOffer: z.string()
    }),
    end: z.object({
      thankYou: z.string(),
      optOut: z.string()
    })
  }),
  variables: z.record(z.any()).optional()
});

export function createScriptRoutes(prisma: PrismaClient): Router {
  const router = Router();

  router.post('/scripts', async (req: Request, res: Response) => {
    try {
      const data = CreateScriptSchema.parse(req.body);
      
      const script = await prisma.script.create({
        data: {
          name: data.name,
          persona: data.persona,
          states: data.states,
          variables: data.variables || {}
        }
      });

      res.json(script);
    } catch (error) {
      logger.error('Script creation error', { error });
      res.status(400).json({ error: 'Invalid script data' });
    }
  });

  router.get('/scripts', async (req: Request, res: Response) => {
    try {
      const scripts = await prisma.script.findMany({
        orderBy: { createdAt: 'desc' }
      });

      res.json(scripts);
    } catch (error) {
      logger.error('Script fetch error', { error });
      res.status(500).json({ error: 'Failed to fetch scripts' });
    }
  });

  router.get('/scripts/:id', async (req: Request, res: Response) => {
    try {
      const script = await prisma.script.findUnique({
        where: { id: req.params.id }
      });

      if (!script) {
        return res.status(404).json({ error: 'Script not found' });
      }

      res.json(script);
    } catch (error) {
      logger.error('Script fetch error', { error });
      res.status(500).json({ error: 'Failed to fetch script' });
    }
  });

  router.put('/scripts/:id', async (req: Request, res: Response) => {
    try {
      const data = CreateScriptSchema.parse(req.body);
      
      const script = await prisma.script.update({
        where: { id: req.params.id },
        data: {
          name: data.name,
          persona: data.persona,
          states: data.states,
          variables: data.variables || {}
        }
      });

      res.json(script);
    } catch (error) {
      logger.error('Script update error', { error });
      res.status(400).json({ error: 'Invalid script data' });
    }
  });

  router.delete('/scripts/:id', async (req: Request, res: Response) => {
    try {
      const campaignsUsingScript = await prisma.campaign.count({
        where: { scriptId: req.params.id }
      });

      if (campaignsUsingScript > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete script in use by campaigns' 
        });
      }

      await prisma.script.delete({
        where: { id: req.params.id }
      });

      res.json({ message: 'Script deleted' });
    } catch (error) {
      logger.error('Script deletion error', { error });
      res.status(500).json({ error: 'Failed to delete script' });
    }
  });

  router.post('/scripts/templates', async (req: Request, res: Response) => {
    const templates = [
      {
        name: 'Drone Photography Pitch',
        description: 'Standard pitch for drone photography services',
        states: {
          greeting: {
            initialMessage: "Hi, is this the broker handling commercial listings for your firm? I'm calling from Aerial Marketing Solutions with a quick question about your property marketing."
          },
          value_pitch: {
            mainPitch: "We help commercial brokers lease properties 30% faster using professional drone photography with traffic-path overlays and aerial callouts. Properties with aerial media get 4x more inquiries.",
            benefits: [
              "48-hour turnaround",
              "FAA-certified pilots",
              "Traffic and accessibility overlays",
              "Twilight aerials included"
            ]
          },
          qualify: {
            questions: [
              "How many active listings do you currently have?",
              "When do you typically need marketing materials for new listings?",
              "What's your usual budget range for property photography?"
            ]
          },
          objection_handling: {
            responses: {
              too_expensive: "I understand budget is important. Our packages start at just $599, and brokers typically see ROI within the first showing from increased foot traffic.",
              not_interested: "No problem at all. Would you be open to seeing a 30-second sample reel of properties similar to yours?",
              already_have_photographer: "That's great you have someone you trust. We actually complement traditional photography - our aerial views show what ground shots can't capture."
            }
          },
          close: {
            bookingOffer: "I have two slots available this week for a quick 10-minute portfolio review. Would Tuesday at 2 PM or Thursday at 10 AM work better for you?",
            alternativeOffer: "I'll send you our portfolio link right now. Can I follow up next week to see if any upcoming listings could benefit?"
          },
          end: {
            thankYou: "Thank you for your time today. I'll send that information right over.",
            optOut: "If you'd prefer not to receive calls, just reply STOP to the text I'm sending now."
          }
        }
      }
    ];

    res.json(templates);
  });

  return router;
}
import { Request, Response, Router } from 'express';
import crypto from 'crypto';
import { ComplaintService } from '../complaints/complaint.service';
import { config } from '../config';

export const webhooksRouter = Router();

// 1. Meta WhatsApp Business Webhook Verification (GET)
webhooksRouter.get('/whatsapp', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === (process.env.WHATSAPP_VERIFY_TOKEN || 'crp_whatsapp_verify_secret')) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// 2. Meta WhatsApp Inbound Message Handler (POST)
webhooksRouter.post('/whatsapp', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-hub-signature-256'] as string;
    // In production, verify crypto signature against process.env.WHATSAPP_APP_SECRET

    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0]?.value;
    const message = changes?.messages?.[0];

    if (!message) {
      return res.status(400).json({
        error: 'INVALID_WHATSAPP_PAYLOAD',
        message: 'Could not parse message from WhatsApp webhook payload',
        requiredFields: ['entry[0].changes[0].value.messages[0]'],
      });
    }

    const fromPhone = message.from;
    const msgType = message.type;
    let description = '';

    if (msgType === 'text') {
      description = message.text?.body || '';
    } else if (msgType === 'image') {
      description = message.image?.caption || 'WhatsApp Image Submission';
    } else if (msgType === 'audio' || msgType === 'voice') {
      description = 'WhatsApp Audio Voice Note Submission';
    } else {
      description = `WhatsApp ${msgType} media submission`;
    }

    if (!description || description.trim().length === 0) {
      return res.status(400).json({
        error: 'EMPTY_DESCRIPTION',
        message: 'WhatsApp complaint message must contain text or a media caption.',
      });
    }

    // Create complaint via service
    const complaint = await ComplaintService.createComplaint({
      citizenId: '00000000-0000-0000-0000-000000000000', // Webhook citizen fallback
      channel: 'WHATSAPP',
      description: `[WhatsApp From: +${fromPhone}] ${description}`,
      consentGranted: true,
    });

    return res.json({
      status: 'SUCCESS',
      referenceId: complaint.reference_id,
      from: fromPhone,
    });
  } catch (err: any) {
    return res.status(400).json({
      error: 'PARSING_FAILED',
      message: 'Failed to process WhatsApp webhook payload: ' + err.message,
    });
  }
});

// 3. MSG91 Inbound SMS Webhook Handler (POST)
webhooksRouter.post('/sms', async (req: Request, res: Response) => {
  try {
    const { sender, content, timestamp } = req.body;

    if (!sender || !content) {
      return res.status(400).json({
        error: 'INVALID_SMS_PAYLOAD',
        message: 'SMS webhook requires sender phone number and message content.',
        requiredFields: ['sender', 'content'],
      });
    }

    const complaint = await ComplaintService.createComplaint({
      citizenId: '00000000-0000-0000-0000-000000000000',
      channel: 'SMS',
      description: `[SMS From: ${sender}] ${content}`,
      consentGranted: true,
    });

    return res.json({
      status: 'SUCCESS',
      referenceId: complaint.reference_id,
      sender,
    });
  } catch (err: any) {
    return res.status(400).json({
      error: 'PARSING_FAILED',
      message: 'Failed to process SMS webhook payload: ' + err.message,
    });
  }
});

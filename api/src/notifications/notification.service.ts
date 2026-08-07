import nodemailer from 'nodemailer';
import axios from 'axios';
import { query } from '../db';
import { config } from '../config';

export type NotificationChannel = 'SMS' | 'EMAIL' | 'WHATSAPP' | 'WEB_PUSH';

export interface DispatchNotificationDTO {
  recipientId: string;
  channel: NotificationChannel;
  eventType: string;
  payload: {
    toEmail?: string;
    toPhone?: string;
    subject?: string;
    bodyText?: string;
    bodyHtml?: string;
    whatsappMessage?: string;
  };
}

// ---------------------------------------------------------------------------
// Real Nodemailer SMTP transporter (Resend-compatible or any SMTP provider)
// ---------------------------------------------------------------------------
const smtpTransporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: Number(config.SMTP_PORT),
  secure: false,
  auth: {
    user: config.SMTP_USER,
    pass: config.RESEND_API_KEY || config.SMTP_PASS,
  },
});

// ---------------------------------------------------------------------------
// Real MSG91 SMS sender (POST https://api.msg91.com/api/v5/flow/)
// ---------------------------------------------------------------------------
async function sendMsg91Sms(to: string, message: string): Promise<void> {
  if (!config.MSG91_AUTH_KEY || config.MSG91_AUTH_KEY === 'mock_msg91_key') {
    throw new Error(
      'MSG91_AUTH_KEY not configured. Set it in .env to enable real SMS dispatch. ' +
      `[OTP message that would have been sent to ${to}: ${message}]`
    );
  }
  const response = await axios.post(
    'https://api.msg91.com/api/v5/flow/',
    {
      flow_id: process.env.MSG91_FLOW_ID || 'default_flow',
      sender: config.MSG91_SENDER_ID,
      mobiles: to.replace('+', ''),
      VAR1: message,
    },
    {
      headers: {
        authkey: config.MSG91_AUTH_KEY,
        'Content-Type': 'application/json',
      },
    }
  );
  if (response.data?.type !== 'success') {
    throw new Error(`MSG91 API returned non-success: ${JSON.stringify(response.data)}`);
  }
}

// ---------------------------------------------------------------------------
// Real WhatsApp Cloud API sender
// ---------------------------------------------------------------------------
async function sendWhatsAppMessage(to: string, message: string): Promise<void> {
  if (!config.WHATSAPP_TOKEN || config.WHATSAPP_TOKEN === 'mock_whatsapp_token') {
    throw new Error('WHATSAPP_TOKEN not configured. Set it in .env to enable real WhatsApp dispatch.');
  }
  const response = await axios.post(
    `https://graph.facebook.com/v18.0/${config.WHATSAPP_PHONE_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to: to.replace('+', ''),
      type: 'text',
      text: { body: message },
    },
    {
      headers: {
        Authorization: `Bearer ${config.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );
  if (!response.data?.messages?.[0]?.id) {
    throw new Error(`WhatsApp API error: ${JSON.stringify(response.data)}`);
  }
}

// ---------------------------------------------------------------------------
// Main Dispatch Service
// ---------------------------------------------------------------------------
export class NotificationService {
  static async dispatch(dto: DispatchNotificationDTO): Promise<void> {
    // Check user opt-out preference
    const userRes = await query(
      `SELECT notification_opt_outs FROM users WHERE id = $1`,
      [dto.recipientId]
    );
    const optOuts: string[] = userRes.rows[0]?.notification_opt_outs || [];

    if (optOuts.includes(dto.channel)) {
      console.log(
        `[Notification] Suppressed ${dto.channel} for user ${dto.recipientId} (opted out)`
      );
      return;
    }

    // Insert notification record
    const notifRes = await query(
      `INSERT INTO notifications (recipient_id, channel, event_type, payload, status, attempt_count)
       VALUES ($1, $2, $3, $4, 'PENDING', 1) RETURNING id`,
      [dto.recipientId, dto.channel, dto.eventType, JSON.stringify(dto.payload)]
    );
    const notifId = notifRes.rows[0].id;

    try {
      await this.sendChannelMessage(dto.channel, dto.payload);
      await query(`UPDATE notifications SET status = 'DELIVERED', delivered_at = NOW() WHERE id = $1`, [notifId]);
    } catch (err: any) {
      // Log the failure with the real error reason — never silently swallow
      console.error(`[Notification] ${dto.channel} delivery FAILED: ${err.message}`);
      await query(
        `UPDATE notifications SET status = 'FAILED', failure_reason = $1 WHERE id = $2`,
        [err.message, notifId]
      );
      // Re-throw so caller knows delivery failed
      throw err;
    }
  }

  private static async sendChannelMessage(
    channel: NotificationChannel,
    payload: DispatchNotificationDTO['payload']
  ): Promise<void> {
    switch (channel) {
      case 'EMAIL': {
        if (!config.RESEND_API_KEY && config.SMTP_PASS === 'mock_smtp_password') {
          throw new Error(
            'RESEND_API_KEY (or SMTP_PASS) not configured. ' +
            'Add your Resend API key to .env as RESEND_API_KEY=re_xxxxxxxx'
          );
        }
        await smtpTransporter.sendMail({
          from: `"Community Redressal Planner" <${config.SMTP_FROM}>`,
          to: payload.toEmail,
          subject: payload.subject || 'Notification from Community Redressal Planner',
          text: payload.bodyText,
          html: payload.bodyHtml || payload.bodyText,
        });
        break;
      }

      case 'SMS': {
        if (!payload.toPhone || !payload.bodyText) {
          throw new Error('SMS dispatch requires toPhone and bodyText in payload');
        }
        await sendMsg91Sms(payload.toPhone, payload.bodyText);
        break;
      }

      case 'WHATSAPP': {
        if (!payload.toPhone || !payload.whatsappMessage) {
          throw new Error('WhatsApp dispatch requires toPhone and whatsappMessage in payload');
        }
        await sendWhatsAppMessage(payload.toPhone, payload.whatsappMessage);
        break;
      }

      case 'WEB_PUSH': {
        // Web Push (VAPID) — requires frontend service worker registration
        // Placeholder until service worker push subscription is wired from frontend
        console.log('[Web Push] Payload would be dispatched via VAPID:', payload);
        break;
      }
    }
  }
}

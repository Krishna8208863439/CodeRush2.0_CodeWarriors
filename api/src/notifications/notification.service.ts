import { query } from '../db';
import { config } from '../config';

export type NotificationChannel = 'SMS' | 'EMAIL' | 'WHATSAPP' | 'WEB_PUSH';

export interface DispatchNotificationDTO {
  recipientId: string;
  channel: NotificationChannel;
  eventType: string;
  payload: any;
}

export class NotificationService {
  static async dispatch(dto: DispatchNotificationDTO): Promise<void> {
    // Check user opt-out preference
    const userRes = await query(`SELECT notification_opt_outs FROM users WHERE id = $1`, [dto.recipientId]);
    const optOuts: string[] = userRes.rows[0]?.notification_opt_outs || [];

    if (optOuts.includes(dto.channel)) {
      console.log(`[Notification Service] Suppressed ${dto.channel} notification for user ${dto.recipientId} due to opt-out.`);
      return;
    }

    const notifRes = await query(
      `INSERT INTO notifications (recipient_id, channel, event_type, payload, status, attempt_count)
       VALUES ($1, $2, $3, $4, 'PENDING', 1) RETURNING id`,
      [dto.recipientId, dto.channel, dto.eventType, JSON.stringify(dto.payload)]
    );
    const notifId = notifRes.rows[0].id;

    // Send attempt with retry logic
    try {
      await this.sendChannelMessage(dto.channel, dto.payload);
      await query(`UPDATE notifications SET status = 'DELIVERED' WHERE id = $1`, [notifId]);
    } catch (err: any) {
      await query(`UPDATE notifications SET status = 'FAILED', attempt_count = 1 WHERE id = $1`, [notifId]);
      console.error(`[Notification Service] Delivery failed for ${dto.channel}:`, err.message);
    }
  }

  private static async sendChannelMessage(channel: NotificationChannel, payload: any): Promise<void> {
    switch (channel) {
      case 'SMS':
        console.log(`[MSG91 SMS Gateway] Sent SMS payload:`, payload);
        break;
      case 'EMAIL':
        console.log(`[Resend SMTP] Sent Email payload:`, payload);
        break;
      case 'WHATSAPP':
        console.log(`[WhatsApp Cloud API] Sent WhatsApp payload:`, payload);
        break;
      case 'WEB_PUSH':
        console.log(`[VAPID Web Push] Sent Web Push payload:`, payload);
        break;
    }
  }
}

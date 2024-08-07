import { injectable } from 'inversify';
import { isArray } from 'lodash';
import { logger } from '../../loader/logger';
import { TWILIO_PHONE_NUMBER, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_STATUS } from '../../config/twilio';
import {
  WHATSAPP_BUSINESS_API_ACCOUNT_ID,
  WHATSAPP_BUSINESS_API_PHONE_ID,
  WHATSAPP_BUSINESS_API_TOKEN,
  WHATSAPP_BUSINESS_API_STATUS,
  WHATSAPP_BUSINESS_API_VERSION,
} from '../../config/whatsapp';

import { Twilio } from 'twilio';
import axios from 'axios';
import { DefaultResponse, Message, SendMessageResponse, TemplateMessage } from '../../types/whatsapp';

const whatsappBusinessApi = axios.create({
  baseURL: `https://graph.facebook.com/${WHATSAPP_BUSINESS_API_VERSION}/${WHATSAPP_BUSINESS_API_PHONE_ID}/`,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${WHATSAPP_BUSINESS_API_TOKEN}`,
  },
});

const twilioClient = TWILIO_STATUS === 'enabled' ? new Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) : undefined;

@injectable()
export class WhatsappService {
  async send(params: { to: string | string[]; message: string; template?: TemplateMessage }): Promise<void> {
    const { to, message, template } = params;

    let phoneNumbers: string[] = [];

    if (!isArray(to)) phoneNumbers.push(to as string);
    else phoneNumbers = to as string[];

    phoneNumbers = phoneNumbers.map((phoneNumber) => {
      if (phoneNumber.startsWith('0')) return `+254${phoneNumber.substring(1)}`;

      if (!phoneNumber.startsWith('+')) return `+${phoneNumber}`;

      return phoneNumber;
    });

    for (const phoneNumber of phoneNumbers) {
      if (TWILIO_STATUS === 'enabled') {
        try {
          logger.info('whatsapp-sending %o', {
            ...params,
            ...{
              to: phoneNumber,
              from: TWILIO_PHONE_NUMBER,
            },
          });

          await twilioClient.messages.create({
            body: message,
            to: `whatsapp:${phoneNumber}`,
            from: `whatsapp:${TWILIO_PHONE_NUMBER}`,
          });
        } catch (error) {}
      }

      if (WHATSAPP_BUSINESS_API_STATUS === 'enabled') {
        try {
          logger.warn('whatsapp-sending %o', {
            ...params,
            ...{
              to: phoneNumber,
              from: `whatsapp-business-api:${WHATSAPP_BUSINESS_API_ACCOUNT_ID}`,
            },
          });

          await this.sendWhatsappMessage({ to: `${phoneNumber.substring(1)}`, template: template, type: 'template' });
        } catch (error) {
          console.log(error);
        }
      }
    }
  }
  async sendWhatsappMessage({ to, type, template }: Omit<Message, 'messaging_product'>): Promise<SendMessageResponse> {
    const { data } = await whatsappBusinessApi.post('messages', {
      messaging_product: 'whatsapp',
      to,
      type,
      template: template,
    });

    return data;
  }

  async markWhatsappMessageAsRead(messageId: string): Promise<DefaultResponse> {
    const { data } = await whatsappBusinessApi.post('messages', {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    });

    return data;
  }
}

import { injectable } from 'inversify';
import { isArray } from 'lodash';
import { logger } from '../../loader/logger';
import { TWILIO_PHONE_NUMBER, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_STATUS } from '../../config/twilio';
import { WHATSAPP_WEB_CLIENT_PHONE_NUMBER, WHATSAPP_WEB_CLIENT_STATUS } from '../../config/whatsapp';
import { Twilio } from 'twilio';
import { sendWhatsappMessage } from '../../app';

const client = TWILIO_STATUS === 'enabled' ? new Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) : undefined;

@injectable()
export class WhatsappService {
  async send(params: { to: string | string[]; message: string }): Promise<void> {
    const { to, message } = params;

    let phoneNumbers: string[] = [];

    if (!isArray(to)) phoneNumbers.push(to);
    else phoneNumbers = to;

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

          await client.messages.create({
            body: message,
            to: `whatsapp:${phoneNumber}`,
            from: `whatsapp:${TWILIO_PHONE_NUMBER}`,
          });
        } catch (error) {}
      }

      if (WHATSAPP_WEB_CLIENT_STATUS === 'enabled') {
        try {
          logger.info('whatsapp-sending %o', {
            ...params,
            ...{
              to: phoneNumber,
              from: `whatsapp-web-client:${WHATSAPP_WEB_CLIENT_PHONE_NUMBER}`,
            },
          });

          //Example ChatId: 254701234567@c.us
          await sendWhatsappMessage(`${phoneNumber.substring(1)}@c.us`, message);
        } catch (error) {}
      }
    }
  }
}

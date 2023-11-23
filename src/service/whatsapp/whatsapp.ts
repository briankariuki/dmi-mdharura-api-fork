import { injectable } from 'inversify';
import { isArray } from 'lodash';
import { logger } from '../../loader/logger';
import { TWILIO_PHONE_NUMBER, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } from '../../config/twilio';
import { Twilio } from 'twilio';

const client = new Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

@injectable()
export class WhatsappService {
  async send(params: { to: string | string[]; message: string }): Promise<void> {
    const { to, message } = params;

    let phoneNumbers: string[] = [];

    if (!isArray(to)) phoneNumbers.push(to);
    else phoneNumbers = to;

    phoneNumbers = phoneNumbers.map((phoneNumber) => {
      if (phoneNumber.startsWith('0')) return `+254${phoneNumber.substring(0)}`;

      if (!phoneNumber.startsWith('+')) return `+${phoneNumber}`;

      return phoneNumber;
    });

    for (const phoneNumber of phoneNumbers) {
      logger.warn('whatsapp-sending %o', {
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
    }
  }
}

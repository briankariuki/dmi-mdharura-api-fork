import { injectable } from 'inversify';
import AfricasTalking from 'africastalking';
import { AFRICASTALKING_API_KEY, AFRICASTALKING_USERNAME, AFRICASTALKING_FROM } from '../../config/africastalking';
import { isArray } from 'lodash';
import { logger } from '../../loader/logger';

const sms = AfricasTalking({
  apiKey: AFRICASTALKING_API_KEY,
  username: AFRICASTALKING_USERNAME,
}).SMS;

@injectable()
export class SmsService {
  async send(params: { to: string | string[]; message: string; enqueue?: boolean }): Promise<void> {
    const { to } = params;

    let phoneNumbers: string[] = [];

    if (!isArray(to)) phoneNumbers.push(to);
    else phoneNumbers = to;

    phoneNumbers = phoneNumbers.map((phoneNumber) => {
      if (phoneNumber.startsWith('0')) return `+254${phoneNumber.substring(0)}`;

      if (!phoneNumber.startsWith('+')) return `+${phoneNumber}`;

      return phoneNumber;
    });

    logger.warn('sms-sending %o', {
      ...params,
      ...{
        to: phoneNumbers,
        from: AFRICASTALKING_FROM,
      },
    });

    await sms.send({
      ...params,
      ...{
        to: phoneNumbers,
        from: AFRICASTALKING_FROM,
      },
    });
  }
}

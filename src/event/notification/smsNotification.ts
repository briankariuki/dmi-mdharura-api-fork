import { EventEmitter } from 'events';
import { injectable, inject } from 'inversify';
import { Purpose, SmsNotificationModel } from '../../model/notification/smsNotification';
import { SmsService } from '../../service/sms/sms';
import { logger } from '../../loader/logger';

type SmsNotificationEvent = 'send-sms';

export interface SmsNotificationEventEmitter {
  on(
    event: SmsNotificationEvent,
    listener: (data: { to: string; purpose: Purpose; message: string; meta?: string }) => void,
  ): this;
  emit(
    event: SmsNotificationEvent,
    data: {
      to: string;
      purpose: Purpose;
      message: string;
      meta?: string;
    },
  ): boolean;
}

@injectable()
export class SmsNotificationEventEmitter extends EventEmitter {
  @inject(SmsService)
  private smsService: SmsService;

  constructor() {
    super();

    this.on('send-sms', async (data) => {
      try {
        const { to, message, meta, purpose } = data;

        const smsNotification = await new SmsNotificationModel({ to, message, meta, purpose }).save();

        try {
          logger.info('send-sms %o : %o', smsNotification.to, smsNotification.purpose);

          await this.smsService.send({
            to,
            message,
          });

          smsNotification.status = 'success';
        } catch (error) {
          logger.error('send-sms %o', (error as Error).message);
          smsNotification.status = 'failed';
        }

        await smsNotification.save();
      } catch (error) {
        logger.error('sms-send-event %o', (error as Error).message);
      }
    });
  }
}

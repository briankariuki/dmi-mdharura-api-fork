import { EventEmitter } from 'events';
import { inject, injectable } from 'inversify';
import { logger } from '../../loader/logger';
import { NotificationDocument } from '../../model/notification/notification';
import { UserModel } from '../../model/user/user';
import { AppModel } from '../../model/app/app';
import { FirebaseService } from '../../service/firebase/firebase';

type NotificationEvent =
  | 'notification-created'
  | 'notification-updated'
  | 'notification-fetched'
  | 'notification-deleted';

export interface NotificationEventEmitter {
  on(event: NotificationEvent, listener: (data: NotificationDocument) => void): this;
  emit(event: NotificationEvent, data: NotificationDocument): boolean;
}

@injectable()
export class NotificationEventEmitter extends EventEmitter {
  @inject(FirebaseService)
  private firebaseService: FirebaseService;

  constructor() {
    super();

    this.on('notification-created', async (notification: NotificationDocument) => {
      try {
        logger.info('notification-created %o', notification._id);

        if (notification.user) {
          const user = await UserModel.findById(notification.populated(notification.user) || notification.user);

          await user.addFields();

          const apps = await AppModel.find({ user: user._id, token: { $exists: true } })
            .sort('-createdAt')
            .limit(5);

          for (const app of apps) {
            try {
              await this.firebaseService.sendMessage({ deviceId: app.token, message: notification.message });
            } catch (error) {
              logger.error('notification-created-firebase %o', (error as Error).message);
            }
          }

          /* try {
            if (user.phoneNumber) this.smsService.send({ to: user.phoneNumber, message: notification.message });
          } catch (error) {
            logger.error('notification-created-sms %o', (error as Error).message);
          } */
        }
      } catch (error) {
        logger.error('notification-created %o', (error as Error).message);
      }
    });

    this.on('notification-updated', async (notification: NotificationDocument) => {
      try {
        logger.info('notification-updated %o', notification._id);

        await (await UserModel.findById(notification.populated(notification.user) || notification.user)).addFields();
      } catch (error) {
        logger.error('notification-updated %o', (error as Error).message);
      }
    });

    this.on('notification-fetched', async (notification: NotificationDocument) => {
      try {
        logger.info('notification-fetched %o', notification._id);
      } catch (error) {
        logger.error('notification-fetched %o', (error as Error).message);
      }
    });

    this.on('notification-deleted', async (notification: NotificationDocument) => {
      try {
        logger.info('notification-deleted %o', notification._id);

        await (await UserModel.findById(notification.populated(notification.user) || notification.user)).addFields();
      } catch (error) {
        logger.error('notification-deleted %o', (error as Error).message);
      }
    });
  }
}

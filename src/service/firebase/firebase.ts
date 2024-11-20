import { injectable } from 'inversify';
import { credential, apps } from 'firebase-admin';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';
import { logger } from '../../loader/logger';
import { PROJECT_NAME } from '../../config/project';

@injectable()
export class FirebaseService {
  private admin =
    apps.length == 0
      ? initializeApp({
          credential: credential.applicationDefault(),
        })
      : apps[0];

  async getUid(token: string): Promise<string> {
    const decodedIdToken = await getAuth(this.admin).verifyIdToken(token);

    return decodedIdToken.uid;
  }

  async sendMessage(data: { deviceId: string; message: string }): Promise<void> {
    const { deviceId, message } = data;

    await getMessaging(this.admin).sendToDevice(deviceId, {
      notification: {
        title: PROJECT_NAME,
        body: message,
      },
    });
  }

  async sendTopicMessage(data: { topic: string; message: string; route?: string }): Promise<void> {
    const { topic, message, route } = data;

    await getMessaging(this.admin).send({
      topic: topic,
      notification: {
        title: PROJECT_NAME,
        body: message,
      },
      data: {
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        route: route ?? '/tasks',
      },

      //     "data": {
      //   "click_action": "FLUTTER_NOTIFICATION_CLICK",
      //   "sound": "default",
      //   "status": "done",
      //   "screen": "screenA",
      // },
    });
  }

  async getUser(uid: string): Promise<{ displayName: string; email: string; phoneNumber: string; photoURL: string }> {
    const response = await getAuth(this.admin).getUser(uid);

    logger.info('firebase-getUser-response : %o', response);

    const { displayName, email, photoURL, phoneNumber } = response;

    return { displayName, email, photoURL, phoneNumber };
  }

  async addUser(data: {
    email?: string;
    password?: string;
    displayName: string;
    phoneNumber: string;
  }): Promise<{ displayName: string; email: string; uid: string; phoneNumber: string }> {
    const response = await getAuth(this.admin).createUser(data);
    logger.info('firebase-addUser-response : %o', response);

    const { displayName, email, uid, phoneNumber } = response;

    return { displayName, email, uid, phoneNumber };
  }
}

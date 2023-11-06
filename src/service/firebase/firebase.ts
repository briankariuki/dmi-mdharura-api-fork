import { injectable } from 'inversify';
import { credential, initializeApp, apps } from 'firebase-admin';
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
    const decodedIdToken = await this.admin.auth().verifyIdToken(token);

    return decodedIdToken.uid;
  }

  async sendMessage(data: { deviceId: string; message: string }): Promise<void> {
    const { deviceId, message } = data;

    await this.admin.messaging().sendToDevice(deviceId, {
      notification: {
        title: PROJECT_NAME,
        body: message,
      },
    });
  }

  async getUser(uid: string): Promise<{ displayName: string; email: string; phoneNumber: string; photoURL: string }> {
    const response = await this.admin.auth().getUser(uid);

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
    const response = await this.admin.auth().createUser(data);
    logger.info('firebase-addUser-response : %o', response);

    const { displayName, email, uid, phoneNumber } = response;

    return { displayName, email, uid, phoneNumber };
  }
}

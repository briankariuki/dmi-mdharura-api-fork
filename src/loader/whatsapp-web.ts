import { Client, LocalAuth } from 'whatsapp-web.js';
import { PROJECT_NAME } from '../config/project';

export default function initWhatsappWebClient() {
  // const store = new MongoStore({ mongoose: mongoose });

  const client = new Client({
    puppeteer: {
      args: ['--no-sandbox'],
    },

    // authStrategy: new RemoteAuth({
    //   store: store,
    //   clientId: PROJECT_NAME,
    //   backupSyncIntervalMs: 300000,
    // }),

    authStrategy: new LocalAuth({ clientId: PROJECT_NAME }),
  });

  return client;
}

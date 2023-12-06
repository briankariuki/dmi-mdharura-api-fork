import { Client, LocalAuth } from 'whatsapp-web.js';
import { PROJECT_NAME } from '../config/project';

export default function initWhatsappWebClient() {
  const client = new Client({
    puppeteer: {
      args: ['--no-sandbox'],
    },

    authStrategy: new LocalAuth({ clientId: PROJECT_NAME }),
  });

  return client;
}

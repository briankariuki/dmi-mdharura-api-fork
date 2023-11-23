import { Client, RemoteAuth } from 'whatsapp-web.js';
import mongoose from 'mongoose';
import { MongoStore } from 'wwebjs-mongo';

export default async function initWhatsappWebClient() {
  const store = new MongoStore({ mongoose: mongoose });

  const client = new Client({
    puppeteer: {
      args: ['--no-sandbox'],
    },

    authStrategy: new RemoteAuth({
      store: store,
      backupSyncIntervalMs: 300000,
    }),
  });

  return client;
}

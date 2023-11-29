import 'reflect-metadata';
import './config';
import './api/controller';
import http from 'http';
import { SERVER_PORT } from './config/server';
import { InversifyExpressServer, getRouteInfo } from 'inversify-express-utils';
import { configExpressError, configExpress, configExpressNotFoundError } from './loader/express';
import { initDb } from './loader/mongoose';
import { getContainer } from './loader/inversify';
import { logger } from './loader/logger';
import { render } from 'prettyjson';
import { AuthProvider } from './api/provider/auth';
import { AddressInfo } from 'net';
import { SystemService } from './service/system/system';
import stc from 'string-to-color';
import initWhatsappWebClient from './loader/whatsapp-web';
import qrcode from 'qrcode-terminal';
import { IncomingWhatsappService } from './service/whatsapp/incomingWhatsapp';
import { Client } from 'whatsapp-web.js';

String.prototype.toHex = function () {
  return stc(this);
};

process.on('uncaughtException', (error: Error) => {
  logger.error('UNCAUGHT_EXCEPTION: %o', error);

  process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('UNHANDLED_REJECTION: Reason: %o', reason);
  logger.error('UNHANDLED_REJECTION: Promise: %o', promise);
});

let whatsappClient: Client;

async function serve(): Promise<void> {
  await initDb();

  logger.info('DB_CONNECTED');

  const container = getContainer();

  logger.info('DI_LOADED');

  const app = new InversifyExpressServer(container, null, null, null, AuthProvider).setConfig(configExpress).build();

  configExpressNotFoundError(app);

  configExpressError(app);

  logger.debug(render(getRouteInfo(container)));

  logger.info('APP_LOADED');

  whatsappClient = initWhatsappWebClient();

  whatsappClient.on('qr', (qr) => {
    logger.info('WHATSAPP_WEB_CLIENT_QR_CODE_RECEIVED');

    qrcode.generate(qr, { small: true });
  });

  whatsappClient.on('ready', () => {
    logger.info('WHATSAPP_WEB_CLIENT_READY');
  });

  whatsappClient.on('message', async (message) => {
    if (message.isStatus == false && message.hasMedia == false) {
      logger.info('WHATSAPP_WEB_CLIENT_MESSAGE_RECEIVED');

      await container.get(IncomingWhatsappService).create({
        smsMessageSid: message.id.id,
        numMedia: '0',
        profileName: message.author ?? message.from,
        smsSid: message.id.id,
        waId: (message.author ?? message.from).split('@')[0],
        smsStatus: 'received',
        body: message.body,
        to: message.to,
        numSegments: '1',
        referralNumMedia: '0',
        messageSid: message.id.id,
        accountSid: '',
        from: message.from,
        apiVersion: 'whatsapp-web-client',
      });
    }
  });

  whatsappClient.initialize();

  const server = http.createServer(app);

  server.on('error', (error) => {
    logger.error('SERVER_ERROR: %o', error);

    throw error;
  });

  server.listen(SERVER_PORT, async () => {
    logger.info('SERVER_STARTED: port: %o', (server.address() as AddressInfo).port);

    logger.info('SYSTEM_INIT_STARTED');

    await container.get(SystemService).init();

    logger.info('SYSTEM_INIT_COMPLETED');
  });
}

serve();

export async function sendWhatsappMessage(chatId: string, message: string) {
  const sent = await whatsappClient.sendMessage(chatId, message);

  return sent;
}

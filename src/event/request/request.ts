import { EventEmitter } from 'events';
import { inject, injectable } from 'inversify';
import { logger } from '../../loader/logger';
import { UserDocument } from '../../model/user/user';
import { Request } from 'express';
import { App } from '../../model/app/app';
import { AppService } from '../../service/app/app';

type RequestEvent = 'request-created';

export interface RequestEventEmitter {
  on(event: RequestEvent, listener: (data: { user?: UserDocument; request: Request }) => void): this;
  emit(event: RequestEvent, data: { user?: UserDocument; request: Request }): boolean;
}

@injectable()
export class RequestEventEmitter extends EventEmitter {
  @inject(AppService)
  appService: AppService;

  constructor() {
    super();

    this.on('request-created', async (data) => {
      try {
        logger.info('request-created');

        const { user, request } = data;

        const app: App = {
          user: user ? user._id : undefined,
          id: request.get('app-id'),
          name: request.get('app-name'),
          packageName: request.get('app-package-name'),
          version: request.get('app-version'),
          buildNumber: request.get('app-build-number'),
          token: request.get('app-token'),
          url: request.url,
          method: request.method,
        };

        await this.appService.create(app);
      } catch (error) {
        logger.error('request-created %o', (error as Error).message);
      }
    });
  }
}

import { json, urlencoded, Application, Request, Response, NextFunction } from 'express';
import morganBody from 'morgan-body';
import { serializeError, ErrorObject } from 'serialize-error';
import { NODE_ENV } from '../config/server';
import cors from 'cors';
import { isCelebrateError } from 'celebrate';
import { BODY_SIZE } from '../config/express';
import { MORGAN_BODY_MAX_BODY_LENGTH } from '../config/morganBody';

export function configExpress(app: Application): void {
  app.enable('trust proxy');

  app.use(
    cors({
      allowedHeaders: [
        'Authorization',
        'Content-Type',
        'app-id',
        'app-name',
        'app-package-name',
        'app-version',
        'app-build-number',
        'app-token',
      ],
      exposedHeaders: ['Authorization'],
    }),
  );

  app.use(json({ limit: BODY_SIZE }));

  app.use(urlencoded({ extended: false }));

  morganBody(app, { maxBodyLength: MORGAN_BODY_MAX_BODY_LENGTH });
}

export function configExpressNotFoundError(app: Application): void {
  app.use((req, res, next) => {
    const error: DefaultError = new Error('URL not found');

    error.code = '404';
    error.status = 404;

    next(error);
  });
}

export function configExpressError(app: Application): void {
  app.use((error: DefaultError, req: Request, res: Response, next: NextFunction) => {
    const { name, stack, status, code, message } = error;

    const serializedError: ErrorObject & {
      status?: number;
    } = serializeError({ name, stack, status, code, message });

    serializedError.code = serializedError.code || '500';

    delete serializedError.status;

    if (isCelebrateError(error)) serializedError.message = error.details.entries().next().value[1].details[0].message;

    if (NODE_ENV !== 'development') delete serializedError.stack;

    res.status(error.status || 500).json({ error: serializedError });

    next();
  });
}

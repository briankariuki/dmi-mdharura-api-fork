import { Response, Request } from 'express';
import { injectable } from 'inversify';
import { BaseMiddleware } from 'inversify-express-utils';
import { NextFunction } from 'connect';
import { JWT_EXPIRY, JWT_SECRET } from '../../config/jwt';
import { sign } from 'jsonwebtoken';

@injectable()
export class Auth0Middleware extends BaseMiddleware {
  async handler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const isAuthenticated = await this.httpContext.user.isAuthenticated();

      if (!isAuthenticated) throw new Error('Session expired. Please login');

      const token_ = sign({ _id: this.httpContext.user.details }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

      res.setHeader('authorization', `Bearer ${token_}`);

      next();
    } catch (error) {
      (error as DefaultError).message = 'Session expired. Please login';
      (error as DefaultError).code = '401';
      (error as DefaultError).status = 401;

      next(error);
    }
  }
}

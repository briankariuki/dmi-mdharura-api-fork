import { Request } from 'express';
import { injectable, inject } from 'inversify';
import { interfaces } from 'inversify-express-utils';
import { logger } from '../../loader/logger';
import { UserDocument } from '../../model/user/user';
import { UserService } from '../../service/user/user';
import { RequestService } from '../../service/request/request';
import { verify } from 'jsonwebtoken';
import { JWT_SECRET } from '../../config/jwt';

@injectable()
export class AuthProvider implements interfaces.AuthProvider {
  @inject(UserService)
  private userService: UserService;

  @inject(RequestService)
  private requestService: RequestService;

  async getUser(request: Request): Promise<interfaces.Principal> {
    let _id: string;

    try {
      const authorization = request.get('authorization');

      if (authorization) {
        const token = authorization.split(' ')[1];

        if (token) _id = (verify(token, JWT_SECRET) as { _id: string })._id;
      }
    } catch (error) {
      logger.error('auth %o', (error as Error).message);
    }

    logger.debug('auth-_id %o', _id);

    let user: UserDocument;

    if (_id)
      try {
        user = await this.userService.findById(_id);
      } catch (error) {}

    await this.requestService.create({ user, request });

    return {
      details: user ? user._id : undefined,
      isAuthenticated: async function (): Promise<boolean> {
        return user && user._status === 'active';
      },
      isResourceOwner: async function (resourceId: any): Promise<boolean> {
        return user && user._status === 'active' && !resourceId;
      },
      isInRole: async function (role: string): Promise<boolean> {
        return user && user._status === 'active' && !!role;
      },
    };
  }
}

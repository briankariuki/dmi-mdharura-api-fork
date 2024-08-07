import { BaseHttpController, controller, httpGet } from 'inversify-express-utils';
import { inject } from 'inversify';
import { celebrate, Joi } from 'celebrate';
import { UserService } from '../../../service/user/user';
import { sign, verify } from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRY } from '../../../config/jwt';

@controller('/v1/auth')
export class AuthController extends BaseHttpController {
  @inject(UserService)
  private userService: UserService;

  @httpGet(
    '/:token',
    celebrate({
      query: Joi.object({
        smsCode: Joi.string(),
      }),
    }),
  )
  async check(): Promise<void> {
    const {
      response,
      request: {
        query: { smsCode },
        params: { token },
      },
    } = this.httpContext;

    let phoneNumber = '';

    try {
      phoneNumber = `+254${(verify(token, smsCode as string) as { phoneNumber: string }).phoneNumber.substring(1)}`;
    } catch (error) {
      throw new Error('Problem verifying phone number. Try again');
    }

    const user = await this.userService.findOne({ phoneNumber });

    const token_ = sign({ _id: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

    response.json({ user, token: token_ });
  }
}

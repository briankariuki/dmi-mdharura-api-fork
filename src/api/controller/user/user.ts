import { PROJECT_NAME } from './../../../config/project';
import { UserService } from '../../../service/user/user';
import { inject } from 'inversify';
import { celebrate, Joi } from 'celebrate';
import { httpPut, controller, BaseHttpController, httpGet, httpDelete, httpPost } from 'inversify-express-utils';
import { Query } from '../../../plugin/types';
import { verify, sign } from 'jsonwebtoken';
import { SmsService } from '../../../service/sms/sms';
import { generate } from 'randomstring';
import {
  PROJECT_OTP_LENGTH,
  PROJECT_OTP_CHARACTER_SET,
  PROJECT_OTP_EXPIRY,
  PROJECT_OTP_TEST_PHONE_NUMBER,
  PROJECT_OTP_TEST_CODE,
} from '../../../config/project';
import { UserDocument } from '../../../model/user/user';
import { Auth0Middleware } from '../../middleware/auth';
import { WhatsappService } from '../../../service/whatsapp/whatsapp';
import { TEST_USER_PHONE_NUMBER } from '../../../config/system';

@controller('/v1/user')
export class UserController extends BaseHttpController {
  @inject(UserService)
  private userService: UserService;

  @inject(SmsService)
  private smsService: SmsService;

  @inject(WhatsappService)
  private whatsappService: WhatsappService;

  @httpGet(
    '/verify/:phoneNumber',
    celebrate({
      query: Joi.object({
        isRegistered: Joi.boolean(),
      }),
      body: Joi.object().empty(),
    }),
  )
  async verify(): Promise<void> {
    const {
      request: {
        params: { phoneNumber },
        query: { isRegistered },
      },
      response,
    } = this.httpContext;

    let user: UserDocument;

    try {
      user = await this.userService.findOne({ phoneNumber: `+254${phoneNumber.substring(1)}` });
    } catch (error) {
      if (isRegistered) throw error;
    }

    const smsCode =
      phoneNumber === PROJECT_OTP_TEST_PHONE_NUMBER || phoneNumber === TEST_USER_PHONE_NUMBER
        ? PROJECT_OTP_TEST_CODE
        : generate({ length: PROJECT_OTP_LENGTH, charset: PROJECT_OTP_CHARACTER_SET });

    const token = sign({ phoneNumber }, smsCode, { expiresIn: PROJECT_OTP_EXPIRY });

    try {
      await this.smsService.send({ to: phoneNumber, message: `${smsCode} is your ${PROJECT_NAME} verification code` });
    } catch (error) {
      throw new Error('Problem sending sms with the verification. Try again');
    }

    //TODO: Refactor this once template is approved on whatsapp api
    // try {
    //   await this.whatsappService.send({
    //     to: phoneNumber,
    //     message: `${smsCode} is your ${PROJECT_NAME} verification code`,
    //   });
    // } catch (error) {}

    response.json({ token, user });
  }

  @httpPost(
    '/:token/:unitId',
    Auth0Middleware,
    celebrate({
      body: Joi.object({
        displayName: Joi.string(),
        spot: Joi.string().required(),
        smsCode: Joi.string(),
      }),
    }),
  )
  async create(): Promise<void> {
    const {
      request: {
        body: { displayName, smsCode, spot },
        params: { token, unitId: unit },
      },
      response,
      user: { details: _userId },
    } = this.httpContext;

    await (await this.userService.findById(_userId)).can({ access: 'manage-unit', resource: unit });

    let phoneNumber = '';

    try {
      phoneNumber = `+254${(verify(token, smsCode) as { phoneNumber: string }).phoneNumber.substring(1)}`;
    } catch (error) {
      throw new Error('Problem verifying phone number. Try again');
    }

    const user = await this.userService.create({ displayName, phoneNumber, spot, unit });

    response.json({ user });
  }

  @httpPut(
    '/:userId/:token',
    Auth0Middleware,
    celebrate({
      body: Joi.object({
        displayName: Joi.string(),
        spot: Joi.string(),
        unit: Joi.string(),
        smsCode: Joi.string().required(),
      }),
    }),
  )
  async update(): Promise<void> {
    const {
      request: {
        body: { displayName, smsCode, spot, unit },
        params: { userId, token },
      },
      response,
    } = this.httpContext;

    let phoneNumber = '';

    try {
      phoneNumber = `+254${(verify(token, smsCode) as { phoneNumber: string }).phoneNumber.substring(1)}`;
    } catch (error) {
      throw new Error('Problem verifying phone number. Try again');
    }

    const user = await this.userService.update(userId, { displayName, phoneNumber, spot, unit });

    response.json({ user });
  }

  @httpPut(
    '/status/:userId',
    Auth0Middleware,
    celebrate({
      body: Joi.object({
        _status: Joi.string(),
      }),
    }),
  )
  async status(): Promise<void> {
    const {
      request: {
        body: { _status },
        params: { userId },
      },
      response,
    } = this.httpContext;

    const user = await this.userService.update(userId, { _status });

    response.json({ user });
  }

  @httpGet(
    '/',
    Auth0Middleware,
    celebrate({
      query: Joi.object({
        userId: Joi.string(),
        q: Joi.string(),
        unitId: Joi.string(),
        sort: Joi.string(),
        spot: Joi.string(),
        _status: Joi.string(),
        page: Joi.number(),
        limit: Joi.number(),
      }),
    }),
  )
  async retrieve(): Promise<void> {
    const { userId, sort, page, limit, q, spot, _status, unitId: unit } = this.httpContext.request.query as any;

    if (userId) {
      const user = await this.userService.findById(userId);

      this.httpContext.response.json({ user });

      return;
    }

    let query: Query = {};

    if (spot) query = { ...query, ...{ spot } };

    if (unit) query = { ...query, ...{ unit } };

    if (_status) query = { ...query, ...{ _status } };

    const userPage = await this.userService.page(query, { sort, page, limit, q });

    this.httpContext.response.json({ userPage });
  }

  @httpDelete(
    '/',
    Auth0Middleware,
    celebrate({
      query: Joi.object({
        userId: Joi.string().required(),
      }),
    }),
  )
  async remove(): Promise<void> {
    const { userId } = this.httpContext.request.query as any;

    const user = await this.userService.delete(userId);

    this.httpContext.response.json({ user });
  }
}

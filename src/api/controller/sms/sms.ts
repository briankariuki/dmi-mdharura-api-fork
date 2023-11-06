import { controller, BaseHttpController, httpPost } from 'inversify-express-utils';
import { celebrate, Joi } from 'celebrate';
import { inject } from 'inversify';
import { IncomingSmsService } from '../../../service/sms/incomingSms';

@controller('/v1/sms')
export class SmsController extends BaseHttpController {
  @inject(IncomingSmsService)
  incomingSmsService: IncomingSmsService;

  @httpPost(
    '/incoming',
    celebrate({
      body: Joi.object({
        linkId: Joi.string().required(),
        text: Joi.string()
          .trim()
          .allow('')
          .replace("'' ", '')
          .replace("{'", '{"')
          .replace("':'", '":"')
          .replace("','", '","')
          .replace("'}", '"}'),
        to: Joi.string().required(),
        id: Joi.string().required(),
        cost: Joi.string(),
        networkCode: Joi.string(),
        date: Joi.date().iso().required(),
        from: Joi.string().required(),
      }),
    }),
  )
  async incoming(): Promise<void> {
    const {
      response,
      request: {
        body: { linkId, text, to, id, date, from, cost, networkCode },
      },
    } = this.httpContext;

    await this.incomingSmsService.create({ linkId, text, to, id, date, from, cost, networkCode });

    response.json({});
  }
}

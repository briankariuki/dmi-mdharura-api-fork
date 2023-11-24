import { controller, BaseHttpController, httpPost } from 'inversify-express-utils';
import { celebrate, Joi } from 'celebrate';
import { inject } from 'inversify';
import { IncomingWhatsappService } from '../../../service/whatsapp/incomingWhatsapp';

@controller('/v1/whatsapp')
export class WhatsappController extends BaseHttpController {
  @inject(IncomingWhatsappService)
  incomingWhatsappService: IncomingWhatsappService;

  @httpPost(
    '/incoming',
    celebrate({
      body: Joi.object({
        SmsMessageSid: Joi.string().required(),
        NumMedia: Joi.string(),
        ProfileName: Joi.string(),
        SmsSid: Joi.string(),
        WaId: Joi.string(),
        SmsStatus: Joi.string(),
        Body: Joi.string(),
        To: Joi.string().required(),
        NumSegments: Joi.string(),
        ReferralNumMedia: Joi.string(),
        MessageSid: Joi.string(),
        AccountSid: Joi.string(),
        From: Joi.string().required(),
        ApiVersion: Joi.string(),
      }),
    }),
  )
  async incoming(): Promise<void> {
    const {
      response,
      request: {
        body: {
          SmsMessageSid,
          NumMedia,
          ProfileName,
          SmsSid,
          WaId,
          SmsStatus,
          Body,
          To,
          NumSegments,
          ReferralNumMedia,
          MessageSid,
          AccountSid,
          From,
          ApiVersion,
        },
      },
    } = this.httpContext;

    await this.incomingWhatsappService.create({
      smsMessageSid: SmsMessageSid,
      numMedia: NumMedia,
      profileName: ProfileName,
      smsSid: SmsSid,
      waId: WaId,
      smsStatus: SmsStatus,
      body: Body,
      to: To,
      numSegments: NumSegments,
      referralNumMedia: ReferralNumMedia,
      messageSid: MessageSid,
      accountSid: AccountSid,
      from: From,
      apiVersion: ApiVersion,
    });

    response.json({});
  }
}

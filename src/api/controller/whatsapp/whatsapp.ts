import { controller, BaseHttpController, httpPost, httpGet } from 'inversify-express-utils';
import { celebrate, Joi } from 'celebrate';
import { inject } from 'inversify';
import { IncomingWhatsappService } from '../../../service/whatsapp/incomingWhatsapp';
import { WhatsappService } from '../../../service/whatsapp/whatsapp';
import {
  WHATSAPP_BUSINESS_API_PHONE_ID,
  WHATSAPP_BUSINESS_API_WEBHOOK_VALIDATION_TOKEN,
} from '../../../config/whatsapp';

@controller('/v1/whatsapp')
export class WhatsappController extends BaseHttpController {
  @inject(IncomingWhatsappService)
  incomingWhatsappService: IncomingWhatsappService;

  @inject(WhatsappService)
  whatsappService: WhatsappService;

  @httpPost(
    '/webhook',
    celebrate({
      body: Joi.object({
        object: Joi.string().required(),
        entry: Joi.array().required(),
      }),
    }),
  )
  async webhook(): Promise<void> {
    const {
      response,
      request: {
        body: { object, entry },
      },
    } = this.httpContext;

    entry.forEach((entryMessage: { changes: any[] }) => {
      entryMessage?.changes?.forEach((change) => {
        change?.value?.messages?.forEach(
          async (message: { type: string; text: { body: string }; id: string; from: string }) => {
            const contact = change?.value?.contacts[0];

            if (message.type === 'text' && message.text) {
              await this.incomingWhatsappService.create({
                smsMessageSid: message.id.toString(),
                numMedia: '0',
                profileName: contact.profile.name,
                smsSid: message.id.toString(),
                waId: contact.wa_id,
                smsStatus: 'received',
                body: message.text.body,
                to: WHATSAPP_BUSINESS_API_PHONE_ID,
                numSegments: '1',
                referralNumMedia: '0',
                messageSid: message.id.toString(),
                accountSid: '',
                from: message.from,
                apiVersion: 'whatsapp-business-api',
              });

              try {
                await this.whatsappService.markWhatsappMessageAsRead(message.id.toString());
              } catch (error) {}
            }
          },
        );
      });
    });

    response.json({});
  }

  @httpGet('/webhook')
  async webhookVerify(): Promise<void> {
    const {
      response,
      request: {
        query: { 'hub.mode': hub_mode, 'hub.challenge': hub_challenge, 'hub.verify_token': hub_verify_token },
      },
    } = this.httpContext;

    if (hub_mode == 'subscribe' && hub_verify_token == WHATSAPP_BUSINESS_API_WEBHOOK_VALIDATION_TOKEN) {
      response.send(hub_challenge);
    } else {
      response.status(400).send();
    }
  }

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

import { BaseHttpController, controller, httpGet, httpDelete, httpPut } from 'inversify-express-utils';
import { inject } from 'inversify';
import { celebrate, Joi } from 'celebrate';
import { Query, QueryParams } from '../../../plugin/types';
import { NotificationService } from '../../../service/notification/notification';
import { Auth0Middleware } from '../../middleware/auth';

@controller('/v1/notification', Auth0Middleware)
export class NotificationController extends BaseHttpController {
  @inject(NotificationService)
  private notificationService: NotificationService;

  @httpPut(
    '/:notificationId',
    celebrate({
      body: Joi.object({
        status: Joi.string().required().allow('read'),
      }),
    }),
  )
  async update(): Promise<void> {
    const {
      response,
      request: {
        body: { status },
        params: { notificationId },
      },
    } = this.httpContext;

    await this.notificationService.update(notificationId, { status });

    response.json({});
  }

  @httpGet(
    '/',
    celebrate({
      query: Joi.object({
        notificationId: Joi.string(),
        q: Joi.string(),
        unitId: Joi.string(),
        userId: Joi.string(),
        sort: Joi.string(),
        page: Joi.number(),
        limit: Joi.number(),
        key: Joi.string(),
        _status: Joi.string(),
      }),
    }),
  )
  async retrieve(): Promise<void> {
    const { notificationId } = this.httpContext.request.query as {
      notificationId: string;
    };

    if (notificationId) {
      const notification = await this.notificationService.findById(notificationId);

      this.httpContext.response.json({ notification });

      return;
    }

    const { sort, page, limit, q, _status, key, userId: user, unitId: unit } = (this.httpContext.request
      .query as unknown) as QueryParams & { userId: string; unitId: string };

    let query: Query = {};

    if (q)
      query = {
        ...query,
        ...{
          $text: { $search: q },
        },
      };

    if (_status) query = { ...query, ...{ _status } };

    if (user) query = { ...query, ...{ user } };

    if (unit) query = { ...query, ...{ unit } };

    const notificationPage = await this.notificationService.page(query, {
      populate: [{ path: 'unit' }, { path: 'user' }],
      sort,
      key,
      page,
      limit,
    });

    this.httpContext.response.json({ notificationPage });
  }

  @httpDelete('/:notificationId')
  async remove(): Promise<void> {
    const { notificationId } = this.httpContext.request.params as {
      notificationId: string;
    };

    const notification = await this.notificationService.delete(notificationId);

    this.httpContext.response.json({ notification });
  }
}

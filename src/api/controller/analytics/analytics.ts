import { controller, BaseHttpController, httpGet } from 'inversify-express-utils';
import { celebrate, Joi } from 'celebrate';
import { Auth0Middleware } from '../../middleware/auth';
import { inject } from 'inversify';
import { AnalyticsService } from '../../../service/analytics/analytics';
import { UserService } from '../../../service/user/user';

@controller('/v1/analytics', Auth0Middleware)
export class AnalyticsController extends BaseHttpController {
  @inject(AnalyticsService)
  analyticsService: AnalyticsService;

  @inject(UserService)
  private userService: UserService;

  @httpGet(
    '/',
    celebrate({
      query: Joi.object({
        unitId: Joi.string().required(),
        dateStart: Joi.date().iso(),
        dateEnd: Joi.date().iso(),
        state: Joi.string(),
      }),
    }),
  )
  async dashboards(): Promise<void> {
    const {
      request: { query },
      response,
      user: { details: _userId },
    } = this.httpContext;

    const { unitId: unit, dateStart, dateEnd, state } = query as any;

    await (await this.userService.findById(_userId)).can({ access: 'manage-unit', resource: unit });

    const dashboards = await this.analyticsService.getDashboards({ unit, dateStart, dateEnd, state });

    response.json({ dashboards });
  }

  @httpGet(
    '/task',
    celebrate({
      query: Joi.object({ unitId: Joi.string().required(), dateStart: Joi.date().iso(), dateEnd: Joi.date().iso() }),
    }),
  )
  async taskAnalytics(): Promise<void> {
    const {
      request: { query },
      response,
      user: { details: _userId },
    } = this.httpContext;

    const { unitId: unit, dateStart, dateEnd } = query as any;

    await (await this.userService.findById(_userId)).can({ access: 'manage-unit', resource: unit });

    const taskAnalyticsPage = await this.analyticsService.taskAnalyticsPage({ unit, dateStart, dateEnd });

    response.json({ taskAnalyticsPage });
  }
}

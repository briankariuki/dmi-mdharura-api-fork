import { controller, BaseHttpController, httpGet } from 'inversify-express-utils';
import { celebrate, Joi } from 'celebrate';
import { inject } from 'inversify';
import { TaskAnalyticsService } from '../../../service/analytics/taskAnalytics';
import { UnitService } from '../../../service/unit/unit';
import { logger } from '../../../loader/logger';
import { SIGNALS } from '../../../config/signal';
import { RoleAnalyticsService } from '../../../service/analytics/roleAnalytics';

@controller('/v1/shield/analytics')
export class ShieldAnalyticsController extends BaseHttpController {
  @inject(TaskAnalyticsService)
  taskAnalyticsService: TaskAnalyticsService;

  @inject(UnitService)
  private unitService: UnitService;

  @inject(RoleAnalyticsService)
  roleAnalyticsService: RoleAnalyticsService;

  @httpGet(
    '/',
    celebrate({
      query: Joi.object({
        unitId: Joi.string().required(),
        dateStart: Joi.date().iso(),
        dateEnd: Joi.date().iso(),
        state: Joi.string().default('live'),
      }),
    }),
  )
  async retrieve(): Promise<void> {
    const {
      request: { query },
      response,
    } = this.httpContext;

    const { unitId, dateStart, dateEnd, state } = query as {
      unitId: string;
      dateStart: string;
      dateEnd: string;
      state: string;
    };

    const unit = await this.unitService.findById(unitId);

    let match: { units: string | string[]; state?: string; createdAt?: any } = {
      units: unit._id,
    };

    if (state) match = { ...match, ...{ state } };

    if (dateStart && dateEnd)
      match = {
        ...match,
        ...{
          createdAt: {
            $gt: dateStart,
            $lte: dateEnd,
          },
        },
      };
    else if (dateStart)
      match = {
        ...match,
        ...{
          createdAt: {
            $gt: dateStart,
          },
        },
      };
    else if (dateEnd)
      match = {
        ...match,
        ...{
          createdAt: {
            $lte: dateEnd,
          },
        },
      };

    const indicators: ShieldIndicator[] = [];

    try {
      indicators.push(
        ...(await this.taskAnalyticsService.indicators({ ...match, ...{ signal: { $in: SIGNALS.CEBS } } }, 'CEBS')),
      );
    } catch (error) {
      logger.error(error);
    }

    try {
      indicators.push(
        ...(await this.taskAnalyticsService.indicators({ ...match, ...{ signal: { $in: SIGNALS.HEBS } } }, 'HEBS')),
      );
    } catch (error) {
      logger.error(error);
    }

    try {
      const options: {
        primary: Record<string, unknown>;
        secondary: Record<string, unknown>;
        name: string;
        code: string;
        unique: string;
        type: 'registered' | 'active';
      }[] = [];

      const secondary = { ...match };

      delete secondary.units;

      options.push({
        name: 'CHVs Registered',
        code: 'SURV.IND.EBS01',
        unique: 'user',
        type: 'registered',
        primary: { units: unit._id, spot: { $in: ['CHV'] } },
        secondary,
      });

      options.push({
        name: 'CHVs Reporting',
        code: 'SURV.IND.EBS02',
        unique: 'user',
        type: 'active',
        primary: { units: unit._id, spot: { $in: ['CHV'] } },
        secondary,
      });

      options.push({
        name: 'HCWs Registered',
        code: 'SURV.IND.EBS15',
        unique: 'user',
        type: 'registered',
        primary: { units: unit._id, spot: { $in: ['HCW'] } },
        secondary,
      });

      options.push({
        name: 'HCWs Reporting',
        code: 'SURV.IND.EBS16',
        unique: 'user',
        type: 'active',
        primary: { units: unit._id, spot: { $in: ['HCW'] } },
        secondary,
      });

      indicators.push(...(await this.roleAnalyticsService.indicators(options)));
    } catch (error) {
      logger.error(error);
    }

    response.json({ unit, indicators: indicators });
  }
}

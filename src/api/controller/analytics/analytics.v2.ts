import { controller, BaseHttpController, httpGet } from 'inversify-express-utils';
import { celebrate, Joi } from 'celebrate';
import { Auth0Middleware } from '../../middleware/auth';
import { inject } from 'inversify';
import { AnalyticsService } from '../../../service/analytics/analytics';
import { UserService } from '../../../service/user/user';
import { UnitService } from '../../../service/unit/unit';
import { SIGNALS } from '../../../config/signal';
import { RoleAnalyticsService } from '../../../service/analytics/roleAnalytics';
import { TaskAnalyticsService } from '../../../service/analytics/taskAnalytics';
import { logger } from '../../../loader/logger';
import { UnitAnalyticsService } from '../../../service/analytics/unitAnalytics';

@controller('/v2/analytics', Auth0Middleware)
export class AnalyticsControllerV2 extends BaseHttpController {
  @inject(AnalyticsService)
  analyticsService: AnalyticsService;

  @inject(RoleAnalyticsService)
  roleAnalyticsService: RoleAnalyticsService;

  @inject(TaskAnalyticsService)
  taskAnalyticsService: TaskAnalyticsService;

  @inject(UnitAnalyticsService)
  unitAnalyticsService: UnitAnalyticsService;

  @inject(UserService)
  private userService: UserService;

  @inject(UnitService)
  private unitService: UnitService;

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

    const { unitId, dateStart, dateEnd, state } = query as any;

    const unit = await this.unitService.findById(unitId);

    await (await this.userService.findById(_userId)).can({ access: 'manage-unit', resource: unit._id });

    let match: { units: any; state?: string; createdAt?: any } = {
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

    const dashboards: Dashboard[] = [];

    try {
      const _match = { ...match };

      delete _match.state;

      dashboards.push(await this.roleAnalyticsService.roles(_match));
    } catch (error) {}

    try {
      dashboards.push({
        ...(await this.taskAnalyticsService.processes({ ...match, ...{ signal: { $in: SIGNALS.CEBS } } })),
        ...{ title: 'Comparison of CEBS signal codes' },
      });
    } catch (error) {
      logger.error(error);
    }

    try {
      dashboards.push({
        ...(await this.taskAnalyticsService.processes({ ...match, ...{ signal: { $in: SIGNALS.HEBS } } })),
        ...{ title: 'Comparison of HEBS signal codes' },
      });
    } catch (error) {}

    try {
      dashboards.push({
        ...(await this.taskAnalyticsService.processes({ ...match, ...{ signal: { $in: SIGNALS.VEBS } } })),
        ...{ title: 'Comparison of VEBS signal codes' },
      });
    } catch (error) {}

    try {
      dashboards.push({
        ...(await this.taskAnalyticsService.processes({ ...match, ...{ signal: { $in: SIGNALS.LEBS } } })),
        ...{ title: 'Comparison of LEBS signal codes' },
      });
    } catch (error) {}

    try {
      dashboards.push({
        ...(await this.taskAnalyticsService.processes({ ...match, ...{ pmebs: { $exists: true } } })),
        ...{ title: 'Comparison of signal codes reported PEBS & MEBS' },
      });
    } catch (error) {}

    // try {
    //   const match = { units: unit._id, type: { $in: ['Community unit'] } };

    //   dashboards.push({
    //     ...(await this.unitAnalyticsService.status(match)),
    //     ...{ title: 'Community units state (test/live)' },
    //   });
    // } catch (error) {
    //   logger.error(error);
    // }

    try {
      const primary = { units: unit._id, type: { $in: ['Community unit'] } };

      const secondary = { ...match };

      delete secondary.units;

      dashboards.push({
        ...(await this.unitAnalyticsService.activities({
          primary,
          secondary,
          title: 'Reporting',
          label: 'Community unit',
        })),
        ...{ title: 'Community units reporting CEBS signals' },
      });
    } catch (error) {
      logger.error(error);
    }

    try {
      const options: {
        primary: Record<string, any>;
        secondary: Record<string, any>;
        title: string;
        label: string;
        unique: string;
      }[] = [];

      const secondary = { ...match };

      delete secondary.units;

      options.push({
        label: 'CHV',
        title: 'Reporting',
        unique: 'user',
        primary: { units: unit._id, spot: { $in: ['CHV'] } },
        secondary,
      });

      options.push({
        label: 'CDR',
        title: 'Reporting',
        unique: 'user',
        primary: { units: unit._id, spot: { $in: ['CDR'] } },
        secondary,
      });

      options.push({
        label: 'CHA',
        title: 'Reporting',
        unique: 'user',
        primary: { units: unit._id, spot: { $in: ['CHA'] } },
        secondary,
      });

      options.push({
        label: 'AHA',
        title: 'Reporting',
        unique: 'user',
        primary: { units: unit._id, spot: { $in: ['AHA'] } },
        secondary,
      });

      dashboards.push({
        ...(await this.roleAnalyticsService.activities(options)),
        ...{ title: 'Users reporting CEBS signals' },
      });
    } catch (error) {
      logger.error(error);
    }

    try {
      const options: {
        primary: Record<string, any>;
        secondary: Record<string, any>;
        title: string;
        label: string;
        unique: string;
      }[] = [];

      const secondary = { ...match };

      delete secondary.units;

      options.push({
        label: 'CHA',
        title: 'Verifying',
        unique: 'cebs.verificationForm.user',
        primary: { units: unit._id, spot: { $in: ['CHA'] } },
        secondary,
      });

      options.push({
        label: 'AHA',
        title: 'Verifying',
        unique: 'cebs.verificationForm.user',
        primary: { units: unit._id, spot: { $in: ['AHA'] } },
        secondary,
      });

      dashboards.push({
        ...(await this.roleAnalyticsService.activities(options)),
        ...{ title: 'Users verifying CEBS signals' },
      });
    } catch (error) {
      logger.error(error);
    }

    // try {
    //   const match = { units: unit._id, type: { $in: ['Health facility'] } };

    //   dashboards.push({
    //     ...(await this.unitAnalyticsService.status(match)),
    //     ...{ title: 'Health facilities state (test/live)' },
    //   });
    // } catch (error) {
    //   logger.error(error);
    // }

    try {
      const primary = { units: unit._id, type: { $in: ['Health facility'] } };

      const secondary = { ...match };

      delete secondary.units;

      dashboards.push({
        ...(await this.unitAnalyticsService.activities({
          primary,
          secondary,
          title: 'Reporting',
          label: 'Health facility',
        })),
        ...{ title: 'Health facilities reporting HEBS signals' },
      });
    } catch (error) {
      logger.error(error);
    }

    try {
      const options: {
        primary: Record<string, any>;
        secondary: Record<string, any>;
        title: string;
        label: string;
        unique: string;
      }[] = [];

      const secondary = { ...match };

      delete secondary.units;

      options.push({
        label: 'HCW',
        title: 'Reporting',
        unique: 'user',
        primary: { units: unit._id, spot: { $in: ['HCW'] } },
        secondary,
      });

      options.push({
        label: 'SFP',
        title: 'Reporting',
        unique: 'user',
        primary: { units: unit._id, spot: { $in: ['SFP'] } },
        secondary,
      });

      dashboards.push({
        ...(await this.roleAnalyticsService.activities(options)),
        ...{ title: 'Users reporting HEBS signals' },
      });
    } catch (error) {
      logger.error(error);
    }

    try {
      const options: {
        primary: Record<string, any>;
        secondary: Record<string, any>;
        title: string;
        label: string;
        unique: string;
      }[] = [];

      const secondary = { ...match };

      delete secondary.units;

      options.push({
        label: 'SFP',
        title: 'Verifying',
        unique: 'hebs.verificationForm.user',
        primary: { units: unit._id, spot: { $in: ['SFP'] } },
        secondary,
      });

      dashboards.push({
        ...(await this.roleAnalyticsService.activities(options)),
        ...{ title: 'Users verifying HEBS signals' },
      });
    } catch (error) {
      logger.error(error);
    }

    // try {
    //   const match = { units: unit._id, type: { $in: ['Veterinary facility'] } };

    //   dashboards.push({
    //     ...(await this.unitAnalyticsService.status(match)),
    //     ...{ title: 'Veterinary facilities state (test/live)' },
    //   });
    // } catch (error) {
    //   logger.error(error);
    // }

    try {
      const primary = { units: unit._id, type: { $in: ['Veterinary facility'] } };

      const secondary = { ...match };

      delete secondary.units;

      dashboards.push({
        ...(await this.unitAnalyticsService.activities({
          primary,
          secondary,
          title: 'Reporting',
          label: 'Veterinary facility',
        })),
        ...{ title: 'Veterinary facilities reporting VEBS signals' },
      });
    } catch (error) {
      logger.error(error);
    }

    try {
      const options: {
        primary: Record<string, any>;
        secondary: Record<string, any>;
        title: string;
        label: string;
        unique: string;
      }[] = [];

      const secondary = { ...match };

      delete secondary.units;

      options.push({
        label: 'VET',
        title: 'Reporting',
        unique: 'user',
        primary: { units: unit._id, spot: { $in: ['VET'] } },
        secondary,
      });

      dashboards.push({
        ...(await this.roleAnalyticsService.activities(options)),
        ...{ title: 'Users reporting VEBS signals' },
      });
    } catch (error) {
      logger.error(error);
    }

    try {
      const options: {
        primary: Record<string, any>;
        secondary: Record<string, any>;
        title: string;
        label: string;
        unique: string;
      }[] = [];

      const secondary = { ...match };

      delete secondary.units;

      options.push({
        label: 'PHEOC',
        title: 'Reporting',
        unique: 'user',
        primary: { units: unit._id, spot: { $in: ['PEBS/MEBS', 'PMEBS'] } },
        secondary,
      });

      dashboards.push({
        ...(await this.roleAnalyticsService.activities(options)),
        ...{ title: 'PHEOC staffs reporting signals' },
      });
    } catch (error) {
      logger.error(error);
    }

    try {
      const match = { units: unit._id };

      dashboards.push({
        ...(await this.unitAnalyticsService.status(match)),
        ...{ title: 'All units/levels' },
      });
    } catch (error) {
      logger.error(error);
    }

    try {
      const _match = { ...match };

      delete _match.state;

      dashboards.push(await this.roleAnalyticsService.dashboardAccess(_match));
    } catch (error) {}

    response.json({ dashboards });
  }
}

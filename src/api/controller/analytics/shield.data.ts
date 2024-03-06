import { controller, BaseHttpController, httpGet } from 'inversify-express-utils';
import { celebrate, Joi } from 'celebrate';
import { inject } from 'inversify';
import { TaskAnalyticsService } from '../../../service/analytics/taskAnalytics';
import { UnitService } from '../../../service/unit/unit';
import { logger } from '../../../loader/logger';
import { SIGNALS } from '../../../config/signal';
import { RoleAnalyticsService } from '../../../service/analytics/roleAnalytics';
import { joi } from '../../../util/joi';
import { TaskService } from '../../../service/task/task';
import { Query } from '../../../plugin/types';
import { UserService } from '../../../service/user/user';

@controller('/v1/shield/data')
export class ShieldDataController extends BaseHttpController {
  @inject(TaskService)
  private taskService: TaskService;
  @inject(UserService)
  private userService: UserService;
  @inject(UnitService)
  private unitService: UnitService;

  @httpGet(
    '/',
    celebrate({
      query: joi.object({
        taskId: joi.string(),
        q: joi.string(),
        userId: joi.string(),
        unitId: joi.string(),
        sort: joi.string(),
        page: joi.number(),
        key: joi.string(),
        type: joi.string().allow('todo', 'history'),
        status: joi.string(),
        limit: joi.number(),
        _status: joi.string(),
        state: joi.string(),
        dateStart: joi.date().iso(),
        dateEnd: joi.date().iso(),
      }),
    }),
  )
  async retrieve(): Promise<void> {
    const { taskId } = this.httpContext.request.query as {
      taskId: string;
    };

    if (taskId) {
      const task = await this.taskService.findById(taskId);

      this.httpContext.response.json({ task });

      return;
    }

    const { sort, page, limit, q, _status, userId, key, unitId, type, status, state, dateStart, dateEnd } = (this
      .httpContext.request.query as unknown) as Record<string, any>;

    let query: Query = {};

    if (_status) query = { ...query, ...{ _status } };

    if (status) query = { ...query, ...{ status } };

    if (state) query = { ...query, ...{ state } };

    if (dateStart && dateEnd)
      query = {
        ...query,
        ...{
          createdAt: {
            $gt: dateStart,
            $lte: dateEnd,
          },
        },
      };
    else if (dateStart)
      query = {
        ...query,
        ...{
          createdAt: {
            $gt: dateStart,
          },
        },
      };
    else if (dateEnd)
      query = {
        ...query,
        ...{
          createdAt: {
            $lte: dateEnd,
          },
        },
      };

    if (userId) {
      const _user = await this.userService.findById(userId);

      if (type === 'todo') {
        const roles = await _user.roles('active');

        if (!roles.length) throw new Error('You do not have any roles');

        const _unit = await this.unitService.findById(roles[0].unit);

        switch (_unit.type) {
          case 'Community unit':
            switch (roles[0].spot) {
              case 'AHA':
              case 'CHA':
                query = {
                  ...query,
                  ...{
                    unit: { $in: roles.map((child) => child.unit) },
                    signal: { $in: SIGNALS.CEBS },
                    $or: [{ cebs: { $exists: false } }, { 'cebs.verificationForm': { $exists: false } }],
                  },
                };
                break;
              default:
                throw new Error('You do not have any tasks');
            }
            break;
          case 'Health facility':
            switch (roles[0].spot) {
              case 'SFP':
                query = {
                  ...query,
                  ...{
                    unit: { $in: roles.map((child) => child.unit) },
                    signal: { $in: SIGNALS.HEBS },
                    $or: [{ hebs: { $exists: false } }, { 'hebs.verificationForm': { $exists: false } }],
                  },
                };
                break;
              default:
                throw new Error('You do not have any tasks');
            }
            break;
          case 'Subcounty':
            let signals: string[] = [];
            const or: any[] = [{ unit: roles[0].unit }];

            for (const role of roles) {
              switch (role.spot) {
                case 'CEBS':
                  signals = [...signals, ...SIGNALS.CEBS];
                  or.push({ 'cebs.verificationForm': { $exists: true } });

                  break;
                case 'HEBS':
                  signals = [...signals, ...SIGNALS.HEBS];
                  or.push({ 'hebs.verificationForm': { $exists: true } });

                  break;
                case 'LEBS':
                  signals = [...signals, ...SIGNALS.LEBS];
                  or.push({ 'lebs.verificationForm': { $exists: true } });

                  break;
                case 'VEBS':
                  signals = [...signals, ...SIGNALS.VEBS];
                  or.push({ 'vebs.verificationForm': { $exists: true } });

                  break;
                case 'EBS':
                  signals = [...signals, ...SIGNALS.CEBS, ...SIGNALS.HEBS, ...SIGNALS.LEBS, ...SIGNALS.VEBS];
                  or.push({ 'cebs.verificationForm': { $exists: true } });
                  or.push({ 'hebs.verificationForm': { $exists: true } });
                  or.push({ 'lebs.verificationForm': { $exists: true } });
                  or.push({ 'vebs.verificationForm': { $exists: true } });

                  break;
              }
            }

            if (or.length === 1) throw new Error('You do not have any roles');

            query = {
              ...query,
              ...{
                units: roles[0].unit,
                signal: { $in: signals },
                $or: or,
              },
            };

            break;
          default:
            throw new Error('You do not have any tasks');
        }

        query = {
          ...query,
          ...{
            status: 'pending',
          },
        };
      } else if (type === 'history') {
        const { _id: user } = _user;

        query = {
          ...query,
          ...{
            $or: [
              { user },
              { 'pmebs.reportForm.user': user },
              { 'pmebs.requestForm.user': user },
              { 'cebs.verificationForm.user': user },
              { 'cebs.investigationForm.user': user },
              { 'cebs.responseForm.user': user },
              { 'cebs.escalationForm.user': user },
              { 'cebs.summaryForm.user': user },
              { 'cebs.labForm.user': user },
              { 'vebs.verificationForm.user': user },
              { 'vebs.investigationForm.user': user },
              { 'vebs.responseForm.user': user },
              { 'vebs.escalationForm.user': user },
              { 'vebs.summaryForm.user': user },
              { 'vebs.labForm.user': user },
              { 'hebs.verificationForm.user': user },
              { 'hebs.investigationForm.user': user },
              { 'hebs.responseForm.user': user },
              { 'hebs.escalationForm.user': user },
              { 'hebs.summaryForm.user': user },
              { 'hebs.labForm.user': user },
              { 'lebs.verificationForm.user': user },
              { 'lebs.investigationForm.user': user },
              { 'lebs.responseForm.user': user },
              { 'lebs.escalationForm.user': user },
              { 'lebs.summaryForm.user': user },
              { 'lebs.labForm.user': user },
            ],
          },
        };
      }
    }

    if (unitId) {
      const {
        user: { details: _userId },
      } = this.httpContext;
      await (await this.userService.findById(_userId)).can({ access: 'manage-unit', resource: unitId });

      query = { ...query, ...{ units: unitId } };

      if (type === 'todo')
        query = {
          ...query,
          ...{
            status: 'pending',
          },
        };
      else if (type === 'history')
        query = {
          ...query,
          ...{
            status: 'completed',
          },
        };
    }

    const taskPage = await this.taskService.page(query, {
      q,
      sort,
      page,
      limit,
      key,
      populate: [
        { path: 'user' },
        { path: 'unit' },
        { path: 'pmebs.reportForm.user' },
        { path: 'pmebs.requestForm.user' },
        { path: 'cebs.verificationForm.user' },
        { path: 'cebs.investigationForm.user' },
        { path: 'cebs.responseForm.user' },
        { path: 'cebs.escalationForm.user' },
        { path: 'cebs.summaryForm.user' },
        { path: 'cebs.labForm.user' },
        { path: 'vebs.verificationForm.user' },
        { path: 'vebs.investigationForm.user' },
        { path: 'vebs.responseForm.user' },
        { path: 'vebs.escalationForm.user' },
        { path: 'vebs.summaryForm.user' },
        { path: 'vebs.labForm.user' },
        { path: 'hebs.verificationForm.user' },
        { path: 'hebs.investigationForm.user' },
        { path: 'hebs.responseForm.user' },
        { path: 'hebs.escalationForm.user' },
        { path: 'hebs.summaryForm.user' },
        { path: 'hebs.labForm.user' },
        { path: 'lebs.verificationForm.user' },
        { path: 'lebs.investigationForm.user' },
        { path: 'lebs.responseForm.user' },
        { path: 'lebs.escalationForm.user' },
        { path: 'lebs.summaryForm.user' },
        { path: 'lebs.labForm.user' },
      ],
    });

    this.httpContext.response.json({ taskPage });
  }
}

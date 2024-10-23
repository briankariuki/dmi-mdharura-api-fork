import { BaseHttpController, controller, httpPost, httpPut, httpGet, httpDelete } from 'inversify-express-utils';
import { inject } from 'inversify';
import { celebrate } from 'celebrate';
import { TaskService } from '../../../service/task/task';
import { Query } from '../../../plugin/types';
import { Auth0Middleware } from '../../middleware/auth';
import { UserService } from '../../../service/user/user';
import { UnitService } from '../../../service/unit/unit';
import { SIGNALS } from '../../../config/signal';
import { joi } from '../../../util/joi';
import jsonexport from 'jsonexport';
import { promises as fs } from 'fs';
import { resolve } from 'path';
import { FILE_PATH } from '../../../config/multer';
import { sync } from 'mkdirp';
import { Types } from 'mongoose';
import { TEST_USER_PHONE_NUMBER } from '../../../config/system';

@controller('/v1/task', Auth0Middleware)
export class TaskController extends BaseHttpController {
  @inject(TaskService)
  private taskService: TaskService;

  @inject(UserService)
  private userService: UserService;

  @inject(UnitService)
  private unitService: UnitService;

  @httpPost(
    '/',
    celebrate({
      body: joi.object({
        signal: joi.string().trim().lowercase().required(),
      }),
    }),
  )
  async create(): Promise<void> {
    const {
      request: {
        body: { signal },
      },
      user: { details: userId },
    } = this.httpContext;

    const user = await this.userService.findById(userId);

    const unit = await user.findReportingUnit(signal);

    const task = await this.taskService.create({
      unit: unit._id,
      user: userId,
      signal,
      via: 'internet',
      state: unit.state,
      version: '2',
    });

    this.httpContext.response.json({ task });
  }

  @httpPost(
    '/pmebs/:unitId',
    celebrate({
      body: joi.object({
        signal: joi.string().trim().lowercase().required(),
        dateDetected: joi.date().iso(),
        description: joi.string(),
        source: joi.string(),
        locality: joi.string(),
        dateReported: joi.date().iso(),
      }),
    }),
  )
  async report(): Promise<void> {
    const {
      user: { details: user },
      request: {
        body: { signal, dateDetected, description, source, locality, dateReported },
        params: { unitId: unit },
      },
    } = this.httpContext;

    const unit_ = await this.unitService.findById(unit);

    if (unit_.type !== 'Subcounty') throw new Error('The unit passed is not a subcounty');

    const task = await this.taskService.create({
      signal,
      user,
      unit,
      'pmebs.reportForm': {
        user,
        dateDetected,
        description,
        source,
        unit,
        locality,
        dateReported,
        via: 'internet',
      },
      via: 'internet',
      state: unit_.state,
      version: '2',
    });

    this.httpContext.response.json({ task });
  }

  @httpPut(
    '/:taskId',
    celebrate({
      body: joi.object({
        _status: joi.string(),
      }),
    }),
  )
  async update(): Promise<void> {
    const {
      request: {
        body: { _status },
        params: { taskId },
      },
    } = this.httpContext;

    const task = await this.taskService.update(taskId, {
      _status,
    });

    this.httpContext.response.json({ task });
  }

  @httpGet(
    '/download',
    celebrate({
      query: joi.object({ unitId: joi.string().required(), dateStart: joi.date().iso(), dateEnd: joi.date().iso() }),
    }),
  )
  async taskDownload(): Promise<void> {
    const {
      response,
      user: { details: _userId },
    } = this.httpContext;

    const { unitId: unit, dateStart, dateEnd } = this.httpContext.request.query as unknown as Record<string, any>;

    await (await this.userService.findById(_userId)).can({ access: 'manage-unit', resource: unit });

    let query: Query = {};

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

    query = { ...query, ...{ units: Types.ObjectId(unit) } };

    const results = await this.taskService.download(query);

    const docs = [];

    for (let i = 0; i < results.length; i++) {
      docs.push(JSON.parse(JSON.stringify(results[i])));
    }

    const data = await jsonexport(docs, { mapHeaders: (header: string) => header.replace(/\./g, '_').toUpperCase() });

    const filename = `mdharura_tasks_${Math.floor(Date.now() / 1000)}.csv`;

    //Ensure files path exists
    sync(resolve(FILE_PATH));

    try {
      await fs.writeFile(`${resolve(FILE_PATH)}/${filename}`, data);

      response.json({
        file: {
          filename,
        },
      });
    } catch (error) {
      throw Error('Something went wrong. Try again');
    }
  }

  @httpGet(
    '/unit',
    celebrate({
      query: joi.object({
        userId: joi.string(),
        type: joi.string().allow('todo', 'history'),
        status: joi.string(),
        _status: joi.string(),
        state: joi.string(),
        dateStart: joi.date().iso(),
        dateEnd: joi.date().iso(),
      }),
    }),
  )
  async units(): Promise<void> {
    const { _status, userId, type, status, state, dateStart, dateEnd } = this.httpContext.request
      .query as unknown as Record<string, any>;

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

        if (_user.phoneNumber == TEST_USER_PHONE_NUMBER) {
          let signals: string[] = [];
          const or: any[] = [{ unit: roles.map((child) => child.unit) }];

          for (const role of roles) {
            switch (role.spot) {
              case 'CHA':
                signals = [...signals, ...SIGNALS.CEBS];
                or.push({ cebs: { $exists: false } }, { 'cebs.verificationForm': { $exists: false } });

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
        } else {
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

    const _units = await this.taskService.units(query);

    const unitPage = await this.unitService.page(
      {
        _id: { $in: _units.map((child) => child.unit) },
      },
      {
        limit: _units.length,
      },
    );

    this.httpContext.response.json({ unitPage: unitPage });
  }

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

    const { sort, page, limit, q, _status, userId, key, unitId, type, status, state, dateStart, dateEnd } = this
      .httpContext.request.query as unknown as Record<string, any>;

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

        if (_user.phoneNumber == TEST_USER_PHONE_NUMBER) {
          let signals: string[] = [];
          const or: any[] = [{ unit: roles.map((child) => child.unit) }];

          for (const role of roles) {
            switch (role.spot) {
              case 'CHA':
                signals = [...signals, ...SIGNALS.CEBS];
                or.push({ cebs: { $exists: false } }, { 'cebs.verificationForm': { $exists: false } });

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
        } else {
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

  @httpDelete(
    '/',
    Auth0Middleware,
    celebrate({
      query: joi.object({
        taskId: joi.string(),
      }),
    }),
  )
  async remove(): Promise<void> {
    const { taskId } = this.httpContext.request.query as {
      taskId: string;
    };

    const task = await this.taskService.delete(taskId);

    this.httpContext.response.json({ task });
  }
}

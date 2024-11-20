import { BaseHttpController, controller, httpPost, httpPut, httpGet, httpDelete } from 'inversify-express-utils';
import { inject } from 'inversify';
import { celebrate, Joi } from 'celebrate';
import { UnitService } from '../../../service/unit/unit';
import { Query, QueryParams } from '../../../plugin/types';
import { UserService } from '../../../service/user/user';
import { Auth0Middleware } from '../../middleware/auth';
import { TaskService } from '../../../service/task/task';
import { SIGNALS } from '../../../config/signal';
import { UnitDocument } from '../../../model/unit/unit';

@controller('/v1/unit', Auth0Middleware)
export class UnitController extends BaseHttpController {
  @inject(UnitService)
  private unitService: UnitService;

  @inject(UserService)
  private userService: UserService;

  @inject(TaskService)
  private taskService: TaskService;

  @httpPost(
    '/:unitId',
    celebrate({
      body: Joi.object({
        name: Joi.string().required(),
        type: Joi.string().required(),
      }),
    }),
  )
  async create(): Promise<void> {
    const {
      request: {
        body: { name, type },
        params: { unitId: parent },
      },
      response,
      user: { details: _userId },
    } = this.httpContext;

    await (await this.userService.findById(_userId)).can({ access: 'manage-unit', resource: parent });

    if (type === 'Country' || type === 'County' || type === 'Subcounty' || type === 'Ward')
      throw new Error(`You do not have permission to add a ${type}. Contact your supervisor`);

    const unit = await this.unitService.create({
      name,
      parent,
      type,
    });

    response.json({ unit });
  }

  @httpPut(
    '/:unitId',
    celebrate({
      body: Joi.object({
        name: Joi.string(),
        state: Joi.string(),
        type: Joi.string(),
        _status: Joi.string(),
      }),
    }),
  )
  async update(): Promise<void> {
    const {
      request: {
        body: { name, type, _status, state },
        params: { unitId },
      },
      response,
      user: { details: _userId },
    } = this.httpContext;

    await (await this.userService.findById(_userId)).can({ access: 'manage-unit', resource: unitId });

    const unit = await this.unitService.update(unitId, {
      name,
      type,
      state,
      _status,
    });

    response.json({ unit });
  }

  @httpGet(
    '/',
    celebrate({
      query: Joi.object({
        unitId: Joi.string(),
        q: Joi.string(),
        parent: Joi.string(),
        signalId: Joi.string(),
        type: Joi.string(),
        sort: Joi.string(),
        page: Joi.number(),
        limit: Joi.number(),
        _status: Joi.string(),
        state: Joi.string(),
      }),
    }),
  )
  async retrieve(): Promise<void> {
    const { unitId } = this.httpContext.request.query as {
      unitId: string;
    };

    if (unitId) {
      const unit = await this.unitService.findById(unitId);

      this.httpContext.response.json({ unit });

      return;
    }

    const { sort, page, limit, q, _status, parent, type, signalId, state } = this.httpContext.request
      .query as unknown as QueryParams & {
      parent: string;
      type: string;
      signalId: string;
      state: string;
    };

    let query: Query = {};

    if (_status) query = { ...query, ...{ _status } };

    query = {
      ...query,
      ...{
        type: {
          $ne: 'Ward',
        },
      },
    };

    if (type) query = { ...query, ...{ type } };

    if (state) query = { ...query, ...{ state } };

    if (parent) query = { ...query, ...{ parent } };
    else if (signalId) {
      const task = await this.taskService.findOne({ signalId });

      query = { ...query, ...{ parent: task.populated('unit') || task.unit } };

      if ((task.unit as unknown as UnitDocument).type === 'County') query = { ...query, ...{ type: 'Subcounty' } };
      else if (SIGNALS.CEBS.includes(task.signal)) query = { ...query, ...{ type: 'Community unit' } };
      else if (SIGNALS.HEBS.includes(task.signal)) query = { ...query, ...{ type: 'Health facility' } };
      else if (SIGNALS.LEBS.includes(task.signal)) query = { ...query, ...{ type: 'Learning institution' } };
      else if (SIGNALS.VEBS.includes(task.signal)) query = { ...query, ...{ type: 'Veterinary facility' } };
    }

    const unitPage = await this.unitService.page(query, {
      q,
      sort: sort || 'state name',
      page,
      limit,
    });

    this.httpContext.response.json({ unitPage });
  }

  @httpDelete(
    '/:unitId',
    celebrate({
      query: Joi.object({}).empty(),
      body: Joi.object({}).empty(),
    }),
  )
  async remove(): Promise<void> {
    const {
      user: { details: _userId },
      request: {
        params: { unitId },
      },
    } = this.httpContext;

    await (await this.userService.findById(_userId)).can({ access: 'manage-unit', resource: unitId });

    const unit = await this.unitService.findById(unitId);

    // unit = await this.unitService.delete(unitId);

    this.httpContext.response.json({ unit });
  }
}

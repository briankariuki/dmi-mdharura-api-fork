import { BaseHttpController, controller, httpPost, httpPut, httpGet, httpDelete } from 'inversify-express-utils';
import { inject } from 'inversify';
import { celebrate, Joi } from 'celebrate';
import { UnitService } from '../../../service/unit/unit';
import { Query, QueryParams } from '../../../plugin/types';
import { UserService } from '../../../service/user/user';
import { TaskService } from '../../../service/task/task';

@controller('/v1/shield/unit')
export class ShieldUnitController extends BaseHttpController {
  @inject(UnitService)
  private unitService: UnitService;

  @inject(UserService)
  private userService: UserService;

  @inject(TaskService)
  private taskService: TaskService;

  @httpGet(
    '/',
    celebrate({
      query: Joi.object({
        unitId: Joi.string(),
        q: Joi.string(),
        parent: Joi.string(),
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

    const { sort, page, limit, q, _status, parent, type, state } = (this.httpContext.request
      .query as unknown) as QueryParams & {
      parent: string;
      type: string;
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

    const unitPage = await this.unitService.page(query, {
      q,
      sort: sort || 'state name',
      page,
      limit,
    });

    this.httpContext.response.json({ unitPage });
  }
}

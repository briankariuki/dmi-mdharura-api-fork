import { controller, BaseHttpController, httpGet } from 'inversify-express-utils';
import { celebrate, Joi } from 'celebrate';
import { inject } from 'inversify';
import { logger } from '../../../loader/logger';
import { joi } from '../../../util/joi';
import { TaskService } from '../../../service/task/task';
import { Query } from '../../../plugin/types';

@controller('/v1/shield/data')
export class ShieldDataController extends BaseHttpController {
  @inject(TaskService)
  private taskService: TaskService;

  @httpGet(
    '/',
    celebrate({
      query: joi.object({
        q: joi.string(),
        unitId: joi.string(),
        sort: joi.string(),
        page: joi.number(),
        key: joi.string(),
        status: joi.string(),
        limit: joi.number(),
        _status: joi.string(),
        state: joi.string().default('live'),
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

    const { sort, page, limit, q, _status, key, status, state, dateStart, dateEnd } = (this.httpContext.request
      .query as unknown) as Record<string, any>;

    let query: Query = {};

    if (_status) query = { ...query, ...{ _status } };

    if (status) query = { ...query, ...{ status } };

    if (state) query = { ...query, ...{ state } };

    if (dateStart && dateEnd)
      query = {
        ...query,
        ...{
          $or: [
            {
              createdAt: {
                $lte: dateEnd,
                $gte: dateStart,
              },
            },

            {
              updatedAt: {
                $lte: dateEnd,
                $gte: dateStart,
              },
            },
          ],
        },
      };
    else if (dateStart)
      query = {
        ...query,
        ...{
          $or: [
            {
              createdAt: {
                $gte: dateStart,
              },
            },

            {
              updatedAt: {
                $gte: dateStart,
              },
            },
          ],
        },
      };
    else if (dateEnd)
      query = {
        ...query,
        ...{
          $or: [
            {
              createdAt: {
                $lte: dateEnd,
              },
            },

            {
              updatedAt: {
                $lte: dateEnd,
              },
            },
          ],
        },
      };

    const taskPage = await this.taskService.page(query, {
      q,
      sort,
      page,
      limit,
      key,
      populate: [{ path: 'unit', populate: [{ path: 'parent', populate: [{ path: 'parent' }] }] }],
    });

    this.httpContext.response.json({ taskPage });
  }
}

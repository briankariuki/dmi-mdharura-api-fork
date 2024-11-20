import { celebrate } from 'celebrate';
import { inject } from 'inversify';
import { controller, BaseHttpController, httpPost } from 'inversify-express-utils';
import { TaskService } from '../../../service/task/task';
import { UnitService } from '../../../service/unit/unit';
import { joi } from '../../../util/joi';
import { Auth0Middleware } from '../../middleware/auth';

@controller('/v2/task', Auth0Middleware)
export class TaskV2Controller extends BaseHttpController {
  @inject(TaskService)
  private taskService: TaskService;

  @inject(UnitService)
  private unitService: UnitService;

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

    if (unit_.type !== 'County') throw new Error('The unit passed is not a county');

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
}

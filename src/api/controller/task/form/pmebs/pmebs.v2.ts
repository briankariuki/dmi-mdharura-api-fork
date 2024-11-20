import { BaseHttpController, controller, httpPut } from 'inversify-express-utils';
import { inject } from 'inversify';
import { celebrate } from 'celebrate';
import { TaskService } from '../../../../../service/task/task';
import { Auth0Middleware } from '../../../../middleware/auth';
import { joi } from '../../../../../util/joi';
import { UnitService } from '../../../../../service/unit/unit';

@controller('/v2/task/:signalId/pmebs', Auth0Middleware)
export class PMebsFormV2Controller extends BaseHttpController {
  @inject(TaskService)
  private taskService: TaskService;

  @inject(UnitService)
  private unitService: UnitService;

  @httpPut(
    '/notify/:unitId',
    celebrate({
      body: joi.object({
        description: joi.string(),
        locality: joi.string(),
        dateReported: joi.date().iso(),
        dateRequested: joi.date().iso(),
      }),
    }),
  )
  async notify(): Promise<void> {
    const {
      user: { details: user },
      request: {
        body,
        params: { signalId, unitId: unit },
      },
    } = this.httpContext;

    let task = await this.taskService.findOne({ signalId });

    if (!task.pmebs || !task.pmebs.reportForm)
      throw new Error('Please submit report form before submitting verification request form');

    const unit_ = await this.unitService.findById(unit);

    if (unit_.type !== 'Subcounty') throw new Error('The unit passed is not a subcounty');

    task = await this.taskService.update(task._id, {
      'pmebs.notifyForm': {
        ...{
          user,
          unit,
          via: 'internet',
        },
        ...body,
      },
      unit,
    });

    this.httpContext.response.json({ task });
  }

  @httpPut(
    '/request/:unitId',
    celebrate({
      body: joi.object({
        description: joi.string(),
        locality: joi.string(),
        dateReported: joi.date().iso(),
        dateRequested: joi.date().iso(),
      }),
    }),
  )
  async request(): Promise<void> {
    const {
      user: { details: user },
      request: {
        body,
        params: { signalId, unitId: unit },
      },
    } = this.httpContext;

    let task = await this.taskService.findOne({ signalId });

    if (!task.pmebs || !task.pmebs.reportForm)
      throw new Error('Please submit report form before submitting verification request form');

    // const unit_ = await this.unitService.findById(unit);

    // if (unit_.type !== 'Subcounty') throw new Error('The unit passed is not a subcounty');

    task = await this.taskService.update(task._id, {
      'pmebs.requestForm': {
        ...{
          user,
          unit,
          via: 'internet',
        },
        ...body,
      },
      unit,
    });

    this.httpContext.response.json({ task });
  }
}

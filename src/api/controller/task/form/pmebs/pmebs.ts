import { BaseHttpController, controller, httpPut } from 'inversify-express-utils';
import { inject } from 'inversify';
import { celebrate } from 'celebrate';
import { TaskService } from '../../../../../service/task/task';
import { Auth0Middleware } from '../../../../middleware/auth';
import { joi } from '../../../../../util/joi';

@controller('/v1/task/:signalId/pmebs', Auth0Middleware)
export class PMebsFormController extends BaseHttpController {
  @inject(TaskService)
  private taskService: TaskService;

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

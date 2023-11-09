import { BaseHttpController, controller, httpPut } from 'inversify-express-utils';
import { inject } from 'inversify';
import { celebrate } from 'celebrate';
import { TaskService } from '../../../../../service/task/task';
import { Auth0Middleware } from '../../../../middleware/auth';
import { SIGNALS } from '../../../../../config/signal';
import {
  escalationFormJoi,
  investigationFormJoiV2,
  responseFormJoi,
  verificationFormJoi,
} from '../../../../../util/form.joi';

@controller('/v2/task/:signalId/hebs', Auth0Middleware)
export class HebsFormControllerV2 extends BaseHttpController {
  @inject(TaskService)
  private taskService: TaskService;

  @httpPut(
    '/verification',
    celebrate({
      body: verificationFormJoi,
    }),
  )
  async verification(): Promise<void> {
    const {
      user: { details: user },
      request: {
        body,
        params: { signalId },
      },
    } = this.httpContext;

    let task = await this.taskService.findOne({ signalId });

    if (!SIGNALS.HEBS.includes(task.signal))
      throw new Error(
        `Please submit ${task.getType()} verification form (Signal ID: ${task.signalId}, Signal Code: ${
          task.signal
        } is for ${task.getType()})`,
      );

    task = await this.taskService.update(task._id, {
      'hebs.verificationForm': {
        ...{
          user,
          via: 'internet',
        },
        ...body,
      },
    });

    this.httpContext.response.json({ task });
  }

  @httpPut(
    '/investigation',
    celebrate({
      body: investigationFormJoiV2,
    }),
  )
  async investigation(): Promise<void> {
    const {
      user: { details: user },
      request: {
        body,
        params: { signalId },
      },
    } = this.httpContext;

    let task = await this.taskService.findOne({ signalId });

    if (!SIGNALS.HEBS.includes(task.signal))
      throw new Error(
        `Please submit ${task.getType()} risk assessment form (Signal ID: ${task.signalId}, Signal Code: ${
          task.signal
        } is for ${task.getType()})`,
      );

    if (!task.hebs || !task.hebs.verificationForm)
      throw new Error('Please submit verification form before submitting risk assessment form');

    task = await this.taskService.update(task._id, {
      'hebs.investigationForm': {
        ...{
          user,
          via: 'internet',
        },
        ...body,
      },
    });

    this.httpContext.response.json({ task });
  }

  @httpPut(
    '/response',
    celebrate({
      body: responseFormJoi,
    }),
  )
  async response(): Promise<void> {
    const {
      user: { details: user },
      request: {
        body,
        params: { signalId },
      },
    } = this.httpContext;

    let task = await this.taskService.findOne({ signalId });

    if (!SIGNALS.HEBS.includes(task.signal))
      throw new Error(
        `Please submit ${task.getType()} response form (Signal ID: ${task.signalId}, Signal Code: ${
          task.signal
        } is for ${task.getType()})`,
      );

    if (!task.hebs || !task.hebs.investigationForm)
      throw new Error('Please submit risk assessment form before submitting response form');

    task = await this.taskService.update(task._id, {
      'hebs.responseForm': {
        ...{
          user,
          via: 'internet',
        },
        ...body,
      },
    });

    this.httpContext.response.json({ task });
  }

  @httpPut(
    '/escalation',
    celebrate({
      body: escalationFormJoi,
    }),
  )
  async escalation(): Promise<void> {
    const {
      user: { details: user },
      request: {
        body,
        params: { signalId },
      },
    } = this.httpContext;

    let task = await this.taskService.findOne({ signalId });

    if (!SIGNALS.HEBS.includes(task.signal))
      throw new Error(
        `Please submit ${task.getType()} escalation form (Signal ID: ${task.signalId}, Signal Code: ${
          task.signal
        } is for ${task.getType()})`,
      );

    if (!task.hebs || !task.hebs.responseForm)
      throw new Error('Please submit response form before submitting escalation form');

    task = await this.taskService.update(task._id, {
      'hebs.escalationForm': {
        ...{
          user,
          via: 'internet',
        },
        ...body,
      },
    });

    this.httpContext.response.json({ task });
  }
}

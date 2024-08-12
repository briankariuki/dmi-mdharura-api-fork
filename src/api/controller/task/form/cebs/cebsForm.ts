import { BaseHttpController, controller, httpPut } from 'inversify-express-utils';
import { inject } from 'inversify';
import { celebrate } from 'celebrate';
import { TaskService } from '../../../../../service/task/task';
import { Auth0Middleware } from '../../../../middleware/auth';
import { SIGNALS } from '../../../../../config/signal';
import {
  escalationFormJoi,
  investigationFormJoi,
  responseFormJoi,
  verificationFormJoi,
} from '../../../../../util/form.joi';
import { logger } from '../../../../../loader/logger';

@controller('/v1/task/:signalId/cebs', Auth0Middleware)
export class CebsFormController extends BaseHttpController {
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

    if (!SIGNALS.CEBS.includes(task.signal))
      throw new Error(
        `Please submit ${task.getType()} verification form (Signal ID: ${task.signalId}, Signal Code: ${
          task.signal
        } is for ${task.getType()})`,
      );

    task = await this.taskService.update(task._id, {
      'cebs.verificationForm': {
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
      body: investigationFormJoi,
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

    if (!SIGNALS.CEBS.includes(task.signal))
      throw new Error(
        `Please submit ${task.getType()} risk assessment form (Signal ID: ${task.signalId}, Signal Code: ${
          task.signal
        } is for ${task.getType()})`,
      );

    if (!task.cebs || !task.cebs.verificationForm)
      throw new Error('Please submit verification form before submitting risk assessment form');

    task = await this.taskService.update(task._id, {
      'cebs.investigationForm': {
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

    if (!SIGNALS.CEBS.includes(task.signal))
      throw new Error(
        `Please submit ${task.getType()} response form (Signal ID: ${task.signalId}, Signal Code: ${
          task.signal
        } is for ${task.getType()})`,
      );

    if (!task.cebs || !task.cebs.investigationForm)
      throw new Error('Please submit risk assessment form before submitting response form');

    task = await this.taskService.update(task._id, {
      'cebs.responseForm': {
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

    if (!SIGNALS.CEBS.includes(task.signal))
      throw new Error(
        `Please submit ${task.getType()} escalation form (Signal ID: ${task.signalId}, Signal Code: ${
          task.signal
        } is for ${task.getType()})`,
      );

    if (!task.cebs || !task.cebs.responseForm)
      throw new Error('Please submit response form before submitting escalation form');

    if (task.cebs.responseForm && !task.cebs.responseForm.recommendations.includes('Escalate to higher level'))
      throw new Error(
        'Escalation form is only available for events that require escalating to higher level as one of the recommendations in the response form',
      );

    task = await this.taskService.update(task._id, {
      'cebs.escalationForm': {
        ...{
          user,
          via: 'internet',
        },
        ...body,
      },
    });

    try {
      await this.taskService.escalateNotify(task);
    } catch (error) {
      logger.error(error);
    }

    this.httpContext.response.json({ task });
  }
}

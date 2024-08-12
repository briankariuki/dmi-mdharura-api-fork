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

@controller('/v1/task/:signalId/hebs', Auth0Middleware)
export class HebsFormController extends BaseHttpController {
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

    if (task.hebs.responseForm && !task.hebs.responseForm.recommendations.includes('Escalate to higher level'))
      throw new Error(
        'Escalation form is only available for events that require escalating to higher level as one of the recommendations in the response form',
      );

    task = await this.taskService.update(task._id, {
      'hebs.escalationForm': {
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

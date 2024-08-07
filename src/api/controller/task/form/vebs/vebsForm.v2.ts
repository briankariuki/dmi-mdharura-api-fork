import { BaseHttpController, controller, httpPut } from 'inversify-express-utils';
import { inject } from 'inversify';
import { celebrate } from 'celebrate';
import { TaskService } from '../../../../../service/task/task';
import { Auth0Middleware } from '../../../../middleware/auth';
import { SIGNALS } from '../../../../../config/signal';
import {
  escalationFormJoi,
  investigationFormJoiV2,
  labFormJoi,
  responseFormJoi,
  summaryFormJoi,
  verificationFormJoi,
} from '../../../../../util/form.joi';

@controller('/v2/task/:signalId/vebs', Auth0Middleware)
export class VebsFormControllerV2 extends BaseHttpController {
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

    if (!SIGNALS.VEBS.includes(task.signal))
      throw new Error(
        `Please submit ${task.getType()} verification form (Signal ID: ${task.signalId}, Signal Code: ${
          task.signal
        } is for ${task.getType()})`,
      );

    task = await this.taskService.update(task._id, {
      'vebs.verificationForm': {
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

    if (!SIGNALS.VEBS.includes(task.signal))
      throw new Error(
        `Please submit ${task.getType()} risk assessment form (Signal ID: ${task.signalId}, Signal Code: ${
          task.signal
        } is for ${task.getType()})`,
      );

    if (!task.vebs || !task.vebs.verificationForm)
      throw new Error('Please submit verification form before submitting risk assessment form');

    task = await this.taskService.update(task._id, {
      'vebs.investigationForm': {
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
    '/lab',
    celebrate({
      body: labFormJoi,
    }),
  )
  async lab(): Promise<void> {
    const {
      user: { details: user },
      request: {
        body,
        params: { signalId },
      },
    } = this.httpContext;

    let task = await this.taskService.findOne({ signalId });

    if (!SIGNALS.VEBS.includes(task.signal))
      throw new Error(
        `Please submit ${task.getType()} lab form (Signal ID: ${task.signalId}, Signal Code: ${
          task.signal
        } is for ${task.getType()})`,
      );

    if (!task.vebs || !task.vebs.investigationForm)
      throw new Error('Please submit risk assessment form before submitting lab form');

    task = await this.taskService.update(task._id, {
      'vebs.labForm': {
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
    '/summary',
    celebrate({
      body: summaryFormJoi,
    }),
  )
  async summary(): Promise<void> {
    const {
      user: { details: user },
      request: {
        body,
        params: { signalId },
      },
    } = this.httpContext;

    let task = await this.taskService.findOne({ signalId });

    if (!SIGNALS.VEBS.includes(task.signal))
      throw new Error(
        `Please submit ${task.getType()} summary form (Signal ID: ${task.signalId}, Signal Code: ${
          task.signal
        } is for ${task.getType()})`,
      );

    if (!task.vebs || !task.vebs.investigationForm)
      throw new Error('Please submit risk assessment form before submitting summary form');

    if (!task.vebs || !task.vebs.responseForm)
      throw new Error('Please submit response form before submitting summary form');

    if (task.vebs.responseForm?.recommendations.includes('Escalate to higher level') && !task.vebs.escalationForm)
      throw new Error('Please submit escalation form before submitting summary form');

    task = await this.taskService.update(task._id, {
      'vebs.summaryForm': {
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

    if (!SIGNALS.VEBS.includes(task.signal))
      throw new Error(
        `Please submit ${task.getType()} response form (Signal ID: ${task.signalId}, Signal Code: ${
          task.signal
        } is for ${task.getType()})`,
      );

    if (!task.vebs || !task.vebs.investigationForm)
      throw new Error('Please submit risk assessment form before submitting response form');

    task = await this.taskService.update(task._id, {
      'vebs.responseForm': {
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

    if (!SIGNALS.VEBS.includes(task.signal))
      throw new Error(
        `Please submit ${task.getType()} escalation form (Signal ID: ${task.signalId}, Signal Code: ${
          task.signal
        } is for ${task.getType()})`,
      );

    if (!task.vebs || !task.vebs.responseForm)
      throw new Error('Please submit response form before submitting escalation form');

    if (task.vebs.responseForm && !task.vebs.responseForm.recommendations.includes('Escalate to higher level'))
      throw new Error(
        'Escalation form is only available for events that require escalating to higher level as one of the recommendations in the response form',
      );

    task = await this.taskService.update(task._id, {
      'vebs.escalationForm': {
        ...{
          user,
          via: 'internet',
        },
        ...body,
      },
    });

    try {
      await this.taskService.escalateNotify(task);
    } catch (error) {}

    this.httpContext.response.json({ task });
  }
}

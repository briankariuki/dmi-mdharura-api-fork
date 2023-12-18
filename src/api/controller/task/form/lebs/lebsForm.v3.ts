import { BaseHttpController, controller, httpPut } from 'inversify-express-utils';
import { inject } from 'inversify';
import { celebrate } from 'celebrate';
import { TaskService } from '../../../../../service/task/task';
import { Auth0Middleware } from '../../../../middleware/auth';
import { UserService } from '../../../../../service/user/user';
import { escalationFormJoi, labFormJoi, summaryFormJoi } from '../../../../../util/form.joi';
import { joi } from '../../../../../util/joi';
import { SIGNALS } from '../../../../../config/signal';

@controller('/v3/task/:signalId/lebs', Auth0Middleware)
export class LebsFormControllerV3 extends BaseHttpController {
  @inject(TaskService)
  private taskService: TaskService;

  @inject(UserService)
  private userService: UserService;

  @httpPut(
    '/verification',
    celebrate({
      body: joi.object({
        description: joi.string(),
        isMatchingSignal: joi.string(),
        updatedSignal: joi.string(),
        dateHealthThreatStarted: joi.date().iso(),
        informant: joi.string(),
        otherInformant: joi.string(),
        additionalInformation: joi.string(),
        isStillHappening: joi.string(),
        dateVerified: joi.date().iso(),
      }),
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

    await (await this.userService.findById(user)).can({ access: 'task-verification', resource: task._id });

    if (!SIGNALS.LEBS.includes(task.signal))
      throw new Error(
        `Please submit ${task.getType()} verification form (Signal ID: ${task.signalId}, Signal Code: ${
          task.signal
        } is for ${task.getType()})`,
      );

    task = await this.taskService.update(task._id, {
      'lebs.verificationForm': {
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
      body: joi.object({
        dateInvestigationStarted: joi.date().iso(),
        symptoms: joi.array().items(joi.string()),
        symptomsOther: joi.string(),
        isCovid19WorkingCaseDefinitionMet: joi.string(),
        isSamplesCollected: joi.string(),
        labResults: joi.string(),
        isEventSettingPromotingSpread: joi.string(),
        measureHandHygiene: joi.string(),
        measureTempScreening: joi.string(),
        measurePhysicalDistancing: joi.string(),
        measureSocialDistancing: joi.string(),
        measureUseOfMasks: joi.string(),
        measureVentilation: joi.string(),
        additionalInformation: joi.string(),
        isEventInfectious: joi.string(),
        eventCategories: joi.array().items(joi.string()),
        systemsAffectedByEvent: joi.array().items(joi.string()),
        riskClassification: joi.string(),
        responseActivities: joi.array().items(joi.string()),
      }),
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

    await (await this.userService.findById(user)).can({ access: 'task-investigation', resource: task._id });

    if (!SIGNALS.LEBS.includes(task.signal))
      throw new Error(
        `Please submit ${task.getType()} risk assessment form (Signal ID: ${task.signalId}, Signal Code: ${
          task.signal
        } is for ${task.getType()})`,
      );

    if (!task.lebs || !task.lebs.verificationForm)
      throw new Error('Please submit verification form before submitting risk assessment form');

    task = await this.taskService.update(task._id, {
      'lebs.investigationForm': {
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

    // await (await this.userService.findById(user)).can({ access: 'task-response', resource: task._id });

    if (!SIGNALS.LEBS.includes(task.signal))
      throw new Error(
        `Please submit ${task.getType()} lab form (Signal ID: ${task.signalId}, Signal Code: ${
          task.signal
        } is for ${task.getType()})`,
      );

    if (!task.lebs || !task.lebs.investigationForm)
      throw new Error('Please submit risk assessment form before submitting lab form');

    task = await this.taskService.update(task._id, {
      'lebs.labForm': {
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

    // await (await this.userService.findById(user)).can({ access: 'task-response', resource: task._id });

    if (!SIGNALS.LEBS.includes(task.signal))
      throw new Error(
        `Please submit ${task.getType()} summary form (Signal ID: ${task.signalId}, Signal Code: ${
          task.signal
        } is for ${task.getType()})`,
      );

    if (!task.lebs || !task.lebs.investigationForm)
      throw new Error('Please submit risk assessment form before submitting summary form');

    task = await this.taskService.update(task._id, {
      'lebs.summaryForm': {
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
      body: joi.object({
        dateSCMOHInformed: joi.date().iso(),
        dateResponseStarted: joi.date().iso(),
        humansCases: joi.number(),
        responseActivities: joi.array().items(joi.string()),
        humansQuarantined: joi.number(),
        quarantineTypes: joi.array().items(joi.string()),
        isHumansQuarantinedFollowedUp: joi.string(),
        isHumansIsolated: joi.string(),
        isolationTypes: joi.array().items(joi.string()),
        humansDead: joi.number(),
        eventStatuses: joi.array().items(joi.string()),
        additionalInformation: joi.string(),
      }),
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

    await (await this.userService.findById(user)).can({ access: 'task-response', resource: task._id });

    if (!SIGNALS.LEBS.includes(task.signal))
      throw new Error(
        `Please submit ${task.getType()} response form (Signal ID: ${task.signalId}, Signal Code: ${
          task.signal
        } is for ${task.getType()})`,
      );

    if (!task.lebs || !task.lebs.investigationForm)
      throw new Error('Please submit risk assessment form before submitting response form');

    task = await this.taskService.update(task._id, {
      'lebs.responseForm': {
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

    if (!SIGNALS.LEBS.includes(task.signal)) throw new Error('Please submit LEBS escalation form');

    if (!task.lebs || !task.lebs.responseForm)
      throw new Error('Please submit response form before submitting escalation form');

    task = await this.taskService.update(task._id, {
      'lebs.escalationForm': {
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

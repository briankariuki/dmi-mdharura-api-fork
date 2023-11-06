import { BaseHttpController, controller, httpPut } from 'inversify-express-utils';
import { inject } from 'inversify';
import { celebrate } from 'celebrate';
import { TaskService } from '../../../../../service/task/task';
import { Auth0Middleware } from '../../../../middleware/auth';
import { UserService } from '../../../../../service/user/user';
import { escalationFormJoi } from '../../../../../util/form.joi';
import { joi } from '../../../../../util/joi';
import { SIGNALS } from '../../../../../config/signal';

@controller('/v1/task/:signalId/lebs', Auth0Middleware)
export class LebsFormController extends BaseHttpController {
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
        dateVerified: joi.date().iso(),
        isReportedBefore: joi.string(),
        isStillHappening: joi.string(),
        dateSCDSCInformed: joi.date().iso(),
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
        dateSCDSCInformed: joi.date().iso(),
        dateInvestigationStarted: joi.date().iso(),
        dateEventStarted: joi.date().iso(),
        dateRRTNotified: joi.date().iso(),
        isCovid19WorkingCaseDefinitionMet: joi.string(),
        isEventSettingPromotingSpread: joi.string(),
        measureHandHygiene: joi.string(),
        measureTempScreening: joi.string(),
        measurePhysicalDistancing: joi.string(),
        measureUseOfMasks: joi.string(),
        measureVentilation: joi.string(),
        additionalInformation: joi.string(),
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
    '/response',
    celebrate({
      body: joi.object({
        dateSCMOHInformed: joi.date().iso(),
        dateResponseStarted: joi.date().iso(),
        dateSamplesCollected: joi.date().iso(),
        dateOfTestResults: joi.date().iso(),
        isCovid19WorkingCaseDefinitionMet: joi.string(),
        isCIFFilledAndSamplesCollected: joi.string(),
        reasonsNoSampleCollectedOther: joi.string(),
        responseActivitiesOther: joi.string(),
        isHumansQuarantinedFollowedUp: joi.string(),
        eventStatus: joi.string(),
        responseActivities: joi.array().items(joi.string()),
        additionalResponseActivities: joi.array().items(joi.string()),
        reasonsNoSampleCollected: joi.array().items(joi.string()),
        humansQuarantinedSelf: joi.number(),
        humansQuarantinedSchool: joi.number(),
        humansQuarantinedInstitutional: joi.number(),
        humansIsolationSchool: joi.number(),
        humansIsolationHealthFacility: joi.number(),
        humansIsolationHome: joi.number(),
        humansIsolationInstitutional: joi.number(),
        humansDead: joi.number(),
        humansPositive: joi.number(),
        humansTested: joi.number(),
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

    if (!SIGNALS.LEBS.includes(task.signal))
      throw new Error(
        `Please submit ${task.getType()} escalation form (Signal ID: ${task.signalId}, Signal Code: ${
          task.signal
        } is for ${task.getType()})`,
      );

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

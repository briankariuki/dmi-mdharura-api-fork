import { Agenda } from 'agenda';
import { inject, injectable } from 'inversify';
import { connection } from 'mongoose';
import { logger } from '../../loader/logger';
import { TaskModel } from '../../model/task/task';
import moment from 'moment-timezone';
import { SmsService } from '../../service/sms/sms';
import { UserDocument } from '../../model/user/user';
import { UnitDocument } from '../../model/unit/unit';
import { TASK_REMINDER_INTERVAL, TASK_REMINDER_UNITS, TASK_REMINDER_STOP_AFTER } from '../../config/task';
import { WhatsappService } from '../../service/whatsapp/whatsapp';

type TaskAgenda = 'task-agenda';

const TASK_AGENDA_JOB = 'task-agenda-job';

export interface TaskAgendaEmitter {
  on(event: TaskAgenda, listener: (taskId: string) => void): this;
  emit(event: TaskAgenda, taskId: string): boolean;
}

@injectable()
export class TaskAgendaEmitter extends Agenda {
  @inject(SmsService)
  smsService: SmsService;

  @inject(WhatsappService)
  whatsappService: WhatsappService;

  constructor() {
    super({
      mongo: connection.db,
      processEvery: '1 minute',
    });

    this.define(TASK_AGENDA_JOB, async (job) => {
      const { taskId } = job.attrs.data;

      logger.info('task-agenda-job %o', taskId);

      this.emit('task-agenda', taskId);
    });

    this.on('task-agenda', async (taskId) => {
      try {
        const task = await TaskModel.findById(taskId).populate([
          { path: 'user' },
          { path: 'unit' },
          { path: 'pmebs.reportForm.user' },
          { path: 'pmebs.requestForm.user' },
          { path: 'cebs.verificationForm.user' },
          { path: 'cebs.investigationForm.user' },
          { path: 'cebs.responseForm.user' },
          { path: 'cebs.escalationForm.user' },
          { path: 'cebs.summaryForm.user' },
          { path: 'vebs.verificationForm.user' },
          { path: 'vebs.investigationForm.user' },
          { path: 'vebs.responseForm.user' },
          { path: 'vebs.escalationForm.user' },
          { path: 'vebs.summaryForm.user' },
          { path: 'hebs.verificationForm.user' },
          { path: 'hebs.investigationForm.user' },
          { path: 'hebs.responseForm.user' },
          { path: 'hebs.escalationForm.user' },
          { path: 'hebs.summaryForm.user' },
          { path: 'lebs.verificationForm.user' },
          { path: 'lebs.investigationForm.user' },
          { path: 'lebs.responseForm.user' },
          { path: 'lebs.escalationForm.user' },
          { path: 'lebs.summaryForm.user' },
        ]);

        logger.info('task-agenda %o', task._id);

        if (moment().isBefore(moment(task.createdAt).add(TASK_REMINDER_STOP_AFTER, TASK_REMINDER_UNITS))) {
          const { type, stage, users } = await task.toInform();

          if (users.length > 0) {
            const { signalId, signal, user: _user, unit: _unit, createdAt, cebs, hebs, lebs, vebs } = task;

            const user = (_user as unknown) as UserDocument;

            const unit = (_unit as unknown) as UnitDocument;

            const date = moment.tz(createdAt, moment.tz.zonesForCountry('KE')[0]).format('llll');

            let message: string;

            switch (stage) {
              case 'vebs-verification':
                switch (type) {
                  case 'reminder':
                    message = `Please verify Signal ID ${signalId}.\nSignal: ${signal.toUpperCase()}\nFrom: ${
                      unit.name
                    }\nReported by: ${user.displayName} ${user.phoneNumber}\nDated: ${date}`;
                    break;
                  case 'follow-up':
                    message = `Please follow up the verification of Signal ID ${signalId}.\nSignal: ${signal.toUpperCase()}\nFrom: ${
                      unit.name
                    }\nReported by: ${user.displayName} ${user.phoneNumber}\nDated: ${date}`;
                    break;
                }
                break;
              case 'vebs-investigation':
                const {
                  verificationForm: { user: _vebVerifier },
                } = vebs;

                const vebVerifier = (_vebVerifier as unknown) as UserDocument;

                message = `Please investigate Signal ID ${signalId}.\nSignal: ${signal.toUpperCase()}\nFrom: ${
                  unit.name
                }\nVerified by: ${vebVerifier.displayName} ${vebVerifier.phoneNumber}\nDated: ${date}`;
                break;
              case 'vebs-response':
                const {
                  investigationForm: { user: _vebInvestigator },
                } = vebs;

                const vebInvestigator = (_vebInvestigator as unknown) as UserDocument;

                message = `Please respond to Signal ID ${signalId}.\nSignal: ${signal.toUpperCase()}\nFrom: ${
                  unit.name
                }\nInvestigated by: ${vebInvestigator.displayName} ${vebInvestigator.phoneNumber}\nDated: ${date}`;

                break;

              case 'vebs-summary':
                const {
                  investigationForm: { user: _vebSummarizer },
                } = vebs;

                const vebSummarizer = (_vebSummarizer as unknown) as UserDocument;

                message = `Please provide a summary to Signal ID ${signalId}.\nSignal: ${signal.toUpperCase()}\nFrom: ${
                  unit.name
                }\nInvestigated by: ${vebSummarizer.displayName} ${vebSummarizer.phoneNumber}\nDated: ${date}`;
                break;

              case 'vebs-lab':
                const {
                  investigationForm: { user: _vebLabInvestigator },
                } = vebs;

                const vebLabInvestigator = (_vebLabInvestigator as unknown) as UserDocument;

                message = `Please provide the lab results to Signal ID ${signalId}.\nSignal: ${signal.toUpperCase()}\nFrom: ${
                  unit.name
                }\nInvestigated by: ${vebLabInvestigator.displayName} ${
                  vebLabInvestigator.phoneNumber
                }\nDated: ${date}`;
                break;

              case 'vebs-escalation':
                const {
                  responseForm: { user: _vebResponder },
                } = vebs;

                const vebResponder = (_vebResponder as unknown) as UserDocument;

                message = `Please escalate Signal ID ${signalId}.\nSignal: ${signal.toUpperCase()}\nFrom: ${
                  unit.name
                }\nResponded by: ${vebResponder.displayName} ${vebResponder.phoneNumber}\nDated: ${date}`;
                break;
              case 'cebs-verification':
                switch (type) {
                  case 'reminder':
                    message = `Please verify Signal ID ${signalId}.\nSignal: ${signal.toUpperCase()}\nFrom: ${
                      unit.name
                    }\nReported by: ${user.displayName} ${user.phoneNumber}\nDated: ${date}`;
                    break;
                  case 'follow-up':
                    message = `Please follow up the verification of Signal ID ${signalId}.\nSignal: ${signal.toUpperCase()}\nFrom: ${
                      unit.name
                    }\nReported by: ${user.displayName} ${user.phoneNumber}\nDated: ${date}`;
                    break;
                }
                break;
              case 'cebs-investigation':
                const {
                  verificationForm: { user: _cebVerifier },
                } = cebs;

                const cebVerifier = (_cebVerifier as unknown) as UserDocument;

                message = `Please investigate Signal ID ${signalId}.\nSignal: ${signal.toUpperCase()}\nFrom: ${
                  unit.name
                }\nVerified by: ${cebVerifier.displayName} ${cebVerifier.phoneNumber}\nDated: ${date}`;
                break;
              case 'cebs-response':
                const {
                  investigationForm: { user: _cebInvestigator },
                } = cebs;

                const cebInvestigator = (_cebInvestigator as unknown) as UserDocument;

                message = `Please respond to Signal ID ${signalId}.\nSignal: ${signal.toUpperCase()}\nFrom: ${
                  unit.name
                }\nInvestigated by: ${cebInvestigator.displayName} ${cebInvestigator.phoneNumber}\nDated: ${date}`;

                break;
              case 'cebs-summary':
                const {
                  investigationForm: { user: _cebSummarizer },
                } = cebs;

                const cebSummarizer = (_cebSummarizer as unknown) as UserDocument;

                message = `Please provide a summary to Signal ID ${signalId}.\nSignal: ${signal.toUpperCase()}\nFrom: ${
                  unit.name
                }\nInvestigated by: ${cebSummarizer.displayName} ${cebSummarizer.phoneNumber}\nDated: ${date}`;
                break;

              case 'cebs-lab':
                const {
                  investigationForm: { user: _cebLabInvestigator },
                } = cebs;

                const cebLabInvestigator = (_cebLabInvestigator as unknown) as UserDocument;

                message = `Please provide the lab results to Signal ID ${signalId}.\nSignal: ${signal.toUpperCase()}\nFrom: ${
                  unit.name
                }\nInvestigated by: ${cebLabInvestigator.displayName} ${
                  cebLabInvestigator.phoneNumber
                }\nDated: ${date}`;
                break;
              case 'cebs-escalation':
                const {
                  responseForm: { user: _cebResponder },
                } = cebs;

                const cebResponder = (_cebResponder as unknown) as UserDocument;

                message = `Please escalate Signal ID ${signalId}.\nSignal: ${signal.toUpperCase()}\nFrom: ${
                  unit.name
                }\nResponded by: ${cebResponder.displayName} ${cebResponder.phoneNumber}\nDated: ${date}`;
                break;

              case 'hebs-verification':
                switch (type) {
                  case 'reminder':
                    message = `Please verify Signal ID ${signalId}.\nSignal: ${signal.toUpperCase()}\nFrom: ${
                      unit.name
                    }\nReported by: ${user.displayName} ${user.phoneNumber}\nDated: ${date}`;
                    break;
                  case 'follow-up':
                    message = `Please follow up the verification of Signal ID ${signalId}.\nSignal: ${signal.toUpperCase()}\nFrom: ${
                      unit.name
                    }\nReported by: ${user.displayName} ${user.phoneNumber}\nDated: ${date}`;
                    break;
                }
                break;
              case 'hebs-investigation':
                const {
                  verificationForm: { user: _hebsVerifier },
                } = hebs;

                const hebsVerifier = (_hebsVerifier as unknown) as UserDocument;

                message = `Please investigate Signal ID ${signalId}.\nSignal: ${signal.toUpperCase()}\nFrom: ${
                  unit.name
                }\nVerified by: ${hebsVerifier.displayName} ${hebsVerifier.phoneNumber}\nDated: ${date}`;
                break;
              case 'hebs-response':
                const {
                  investigationForm: { user: _hebInvestigator },
                } = hebs;

                const hebInvestigator = (_hebInvestigator as unknown) as UserDocument;

                message = `Please respond to Signal ID ${signalId}.\nSignal: ${signal.toUpperCase()}\nFrom: ${
                  unit.name
                }\nInvestigated by: ${hebInvestigator.displayName} ${hebInvestigator.phoneNumber}\nDated: ${date}`;

                break;

              case 'hebs-summary':
                const {
                  investigationForm: { user: _hebSummarizer },
                } = hebs;

                const hebSummarizer = (_hebSummarizer as unknown) as UserDocument;

                message = `Please provide a summary to Signal ID ${signalId}.\nSignal: ${signal.toUpperCase()}\nFrom: ${
                  unit.name
                }\nInvestigated by: ${hebSummarizer.displayName} ${hebSummarizer.phoneNumber}\nDated: ${date}`;
                break;

              case 'hebs-lab':
                const {
                  investigationForm: { user: _hebLabInvestigator },
                } = hebs;

                const hebLabInvestigator = (_hebLabInvestigator as unknown) as UserDocument;

                message = `Please provide the lab results to Signal ID ${signalId}.\nSignal: ${signal.toUpperCase()}\nFrom: ${
                  unit.name
                }\nInvestigated by: ${hebLabInvestigator.displayName} ${
                  hebLabInvestigator.phoneNumber
                }\nDated: ${date}`;
                break;
              case 'hebs-escalation':
                const {
                  responseForm: { user: _hebResponder },
                } = hebs;

                const hebResponder = (_hebResponder as unknown) as UserDocument;

                message = `Please escalate Signal ID ${signalId}.\nSignal: ${signal.toUpperCase()}\nFrom: ${
                  unit.name
                }\nResponded by: ${hebResponder.displayName} ${hebResponder.phoneNumber}\nDated: ${date}`;
                break;
              case 'lebs-verification':
                switch (type) {
                  case 'reminder':
                    message = `Please verify Signal ID ${signalId}.\nSignal: ${signal.toUpperCase()}\nFrom: ${
                      unit.name
                    }\nReported by: ${user.displayName} ${user.phoneNumber}\nDated: ${date}`;
                    break;
                  case 'follow-up':
                    message = `Please follow up the verification of Signal ID ${signalId}.\nSignal: ${signal.toUpperCase()}\nFrom: ${
                      unit.name
                    }\nReported by: ${user.displayName} ${user.phoneNumber}\nDated: ${date}`;
                    break;
                }
                break;
              case 'lebs-investigation':
                const {
                  verificationForm: { user: _lebsVerifier },
                } = lebs;

                const lebsVerifier = (_lebsVerifier as unknown) as UserDocument;

                message = `Please investigate Signal ID ${signalId}.\nSignal: ${signal.toUpperCase()}\nFrom: ${
                  unit.name
                }\nVerified by: ${lebsVerifier.displayName} ${lebsVerifier.phoneNumber}\nDated: ${date}`;
                break;
              case 'lebs-response':
                const {
                  investigationForm: { user: _lebsInvestigator },
                } = lebs;

                const lebsInvestigator = (_lebsInvestigator as unknown) as UserDocument;

                message = `Please respond to Signal ID ${signalId}.\nSignal: ${signal.toUpperCase()}\nFrom: ${
                  unit.name
                }\nInvestigated by: ${lebsInvestigator.displayName} ${lebsInvestigator.phoneNumber}\nDated: ${date}`;

                break;

              case 'lebs-summary':
                const {
                  investigationForm: { user: _lebSummarizer },
                } = lebs;

                const lebSummarizer = (_lebSummarizer as unknown) as UserDocument;

                message = `Please provide a summary to Signal ID ${signalId}.\nSignal: ${signal.toUpperCase()}\nFrom: ${
                  unit.name
                }\nInvestigated by: ${lebSummarizer.displayName} ${lebSummarizer.phoneNumber}\nDated: ${date}`;
                break;
            }

            if (message) {
              try {
                await this.smsService.send({ to: users.map((user) => user.phoneNumber), message });
              } catch (error) {}

              try {
                await this.whatsappService.send({ to: users.map((user) => user.phoneNumber), message });
              } catch (error) {}
            }
          }

          const job = this.create(TASK_AGENDA_JOB, { taskId });

          job.schedule(moment().add(TASK_REMINDER_INTERVAL, TASK_REMINDER_UNITS).toDate()).unique({ taskId });

          await job.save();

          await this.start();
        }
      } catch (error) {
        logger.error('task-agenda %o', error);
      }
    });
  }
}

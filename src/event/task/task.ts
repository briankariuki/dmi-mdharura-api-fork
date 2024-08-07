import { EventEmitter } from 'events';
import { inject, injectable } from 'inversify';
import { logger } from '../../loader/logger';
import { TaskDocument, TaskModel } from '../../model/task/task';
import { TaskAgendaEmitter } from '../../agenda/task/task';
import { SmsService } from '../../service/sms/sms';
import { UserModel } from '../../model/user/user';
import moment from 'moment-timezone';
import { WhatsappService } from '../../service/whatsapp/whatsapp';

type TaskEvent = 'task-created' | 'task-updated' | 'task-fetched' | 'task-deleted';

export interface TaskEventEmitter {
  on(event: TaskEvent, listener: (task: TaskDocument) => void): this;
  emit(event: TaskEvent, task: TaskDocument): boolean;
}

@injectable()
export class TaskEventEmitter extends EventEmitter {
  @inject(TaskAgendaEmitter)
  taskAgendaEmitter: TaskAgendaEmitter;

  @inject(SmsService)
  smsService: SmsService;

  @inject(WhatsappService)
  whatsappService: WhatsappService;

  constructor() {
    super();

    this.on('task-created', async (task) => {
      try {
        logger.info('task-created %o', task._id);

        const _task = await TaskModel.findById(task._id);

        await _task.addFields();

        const { signal, signalId, createdAt, user } = _task;

        const { phoneNumber, displayName } = await UserModel.findById(user);

        this.taskAgendaEmitter.emit('task-agenda', task._id);

        await this.smsService.send({
          to: phoneNumber,
          message: `Thank you ${displayName} for reporting signal ${signal.toUpperCase()}.\nSignal ID ${signalId}\nDated: ${moment
            .tz(createdAt, moment.tz.zonesForCountry('KE')[0])
            .format('llll')}`,
        });

        //TODO: Refactor this once template is approved on whatsapp api
        // await this.whatsappService.send({
        //   to: phoneNumber,
        //   message: `Thank you ${displayName} for reporting signal ${signal.toUpperCase()}.\nSignal ID ${signalId}\nDated: ${moment
        //     .tz(createdAt, moment.tz.zonesForCountry('KE')[0])
        //     .format('llll')}`,
        // });
      } catch (error) {
        logger.error('task-created %o', (error as Error).message);
      }
    });

    this.on('task-updated', async (task) => {
      try {
        logger.info('task-updated %o', task._id);

        await task.addFields();

        this.taskAgendaEmitter.emit('task-agenda', task._id);
      } catch (error) {
        logger.error('task-updated %o', (error as Error).message);
      }
    });

    this.on('task-fetched', async (task) => {
      try {
        logger.info('task-fetched %o', task._id);

        await task.addFields();
      } catch (error) {
        logger.error('task-fetched %o', (error as Error).message);
      }
    });

    this.on('task-deleted', async (task) => {
      try {
        logger.info('task-deleted %o', task._id);
      } catch (error) {
        logger.error('task-deleted %o', (error as Error).message);
      }
    });
  }
}

import { EventEmitter } from 'events';
import { inject, injectable } from 'inversify';
import { logger } from '../../loader/logger';
import { UserModel } from '../../model/user/user';
import { EbsConnectDocument } from '../../types/ebsconnect';
import { UserService } from '../../service/user/user';
import { Unit, UnitModel } from '../../model/unit/unit';
import { SIGNALS_UPDATED } from '../../config/signal';
import { EBS_CONNECT_SUPABASE_TABLE } from '../../config/ebsconnect';
import { supabaseClient } from '../../app';
import { TaskEventEmitter } from '../task/task';
import { TaskModel } from '../../model/task/task';
import { TEST_USER_UNIT_CODE } from '../../config/system';

type EbsConnectEvent = 'ebsconnect-created' | 'ebsconnect-updated' | 'ebsconnect-sync';

export interface EbsConnectEventEmitter {
  on(event: EbsConnectEvent, listener: (doc: EbsConnectDocument) => void): this;
  emit(event: EbsConnectEvent, doc: EbsConnectDocument): boolean;
}

@injectable()
export class EbsConnectEventEmitter extends EventEmitter {
  @inject(TaskEventEmitter)
  taskEventEmitter: TaskEventEmitter;

  @inject(UserService)
  userService: UserService;

  constructor() {
    super();

    this.on('ebsconnect-created', async (doc) => {
      try {
        logger.info('ebsconnect-created %o', doc.ID);

        let signal: string = doc.SIGNAL.toString().toLowerCase().trim();

        let type: Unit['type'] = this.signalType(signal);

        // Find reporting unit
        const unit = await UnitModel.findOne({
          $or: [
            {
              // uid: { $eq: doc.UNIT_CODE },
              code: { $eq: doc.UNIT_CODE },
            },
            {
              code: { $eq: TEST_USER_UNIT_CODE },
            },
          ],
          type,
        });

        if (!unit) throw new Error('We are unable to identify the unit from which you are reporting.');

        // Find reporting user
        let user = await UserModel.findOne({
          phoneNumber: { $eq: doc.REPORTED_BY_PHONE },
        });

        if (!user) {
          user = await this.userService.create({
            displayName: doc.REPORTED_BY,
            phoneNumber: doc.REPORTED_BY_PHONE,
            spot: 'CHV',
            unit: unit.id,
          });
        }

        // Find verifying User
        // let verifyingUSer = await UserModel.findOne({
        //   phoneNumber: { $eq: doc.CHA_PHONE },
        // });

        // if (!verifyingUSer) {
        //   verifyingUSer = await this.userService.create({
        //     displayName: doc.CHA_NAME || "",
        //     phoneNumber: doc.CHA_PHONE,
        //     spot: 'CHA',
        //     unit: unit.id,
        //   });
        // }

        const ebsTask = await new TaskModel({
          unit: unit._id,
          user: user.id,
          signal: signal,
          via: doc.SOURCE,
          // via: 'internet',
          state: unit.state,
          version: '2',
        }).save();

        this.taskEventEmitter.emit('task-created', ebsTask);
      } catch (error) {
        logger.error('ebsconnect-created %o', (error as Error).message);
      }
    });

    this.on('ebsconnect-updated', async (doc) => {
      try {
        logger.info('ebsconnect-updated %o', doc.ID);
      } catch (error) {
        logger.error('task-updated %o', (error as Error).message);
      }
    });

    this.on('ebsconnect-sync', async (task) => {
      try {
        const { data, error } = await supabaseClient
          .from(EBS_CONNECT_SUPABASE_TABLE)
          .upsert(task, {
            onConflict: 'SIGNAL_ID,SOURCE',
          })
          .select();

        if (error) throw new Error(error.message);

        logger.info('ebsconnect-sync %o', (data[0] as EbsConnectDocument).ID);
      } catch (error) {
        logger.error('ebsconnect-sync %o', (error as Error).message);
      }
    });
  }

  signalType(signal: string): Unit['type'] {
    let type: Unit['type'];

    if (SIGNALS_UPDATED.CEBS.includes(signal)) type = 'Community unit';
    else if (SIGNALS_UPDATED.HEBS.includes(signal)) type = 'Health facility';
    else if (SIGNALS_UPDATED.VEBS.includes(signal)) type = 'Veterinary facility';
    else if (SIGNALS_UPDATED.LEBS.includes(signal)) type = 'Learning institution';
    else
      throw new Error(
        'We are unable to identify the signal you are reporting. Reach out to your supervisor for assistance',
      );

    return type;
  }
}

import { SMS_PREFIX } from './../../config/sms';
import { EventEmitter } from 'events';
import { injectable, inject } from 'inversify';
import { logger } from '../../loader/logger';
import { IncomingSmsDocument } from '../../model/sms/incomingSms';
import { UserModel } from '../../model/user/user';
import { TaskService } from '../../service/task/task';
import { decompressForm } from '../../util/fieldDictionary';
import { TaskDocument } from '../../model/task/task';
import axios from 'axios';
import { CHT_SMS_CALLBACK_URL, CHT_SMS_SYNC } from '../../config/cht';
import { UnitModel } from '../../model/unit/unit';
import { stringify } from 'querystring';
import { SmsService } from '../../service/sms/sms';
import { SIGNALS } from '../../config/signal';

type IncomingSmsEvent = 'incomingSms-created' | 'incomingSms-updated' | 'incomingSms-fetched' | 'incomingSms-deleted';

const chtApi = axios.create({
  baseURL: CHT_SMS_CALLBACK_URL,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
});

export interface IncomingSmsEventEmitter {
  on(event: IncomingSmsEvent, listener: (incomingSms: IncomingSmsDocument) => void): this;
  emit(event: IncomingSmsEvent, incomingSms: IncomingSmsDocument): boolean;
}

@injectable()
export class IncomingSmsEventEmitter extends EventEmitter {
  @inject(TaskService)
  taskService: TaskService;

  @inject(SmsService)
  smsService: SmsService;

  constructor() {
    super();

    this.on('incomingSms-created', async (incomingSms) => {
      try {
        logger.info('incomingSms-created %o', incomingSms._id);

        const { from, linkId, text, to, id, cost, networkCode, date } = incomingSms;

        const phoneNumber = from;

        const user = await UserModel.findOne({ phoneNumber });

        if (user && text) {
          const { _id: userId, displayName } = user;

          if (text.includes(' ')) {
            const splits = text.split(' ');

            let prefix = splits[0];

            if (prefix === SMS_PREFIX.trim()) prefix = `${SMS_PREFIX}${splits[1]}`;

            logger.info('sms-text-splits %o', splits);

            logger.info('sms-text-prefix %o', prefix);

            let signalId: string;
            let form: Record<string, any>;
            let task: TaskDocument;

            switch (prefix) {
              case `${SMS_PREFIX}cv`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('sms-text-signalId %o', signalId);
                logger.info('sms-text-form %o', form);

                task = await this.taskService.findOne({ signalId });

                if (!SIGNALS.CEBS.includes(task.signal))
                  throw new Error(
                    `Please submit ${task.getType()} verification form (Signal ID: ${task.signalId}, Signal Code: ${
                      task.signal
                    } is for ${task.getType()})`,
                  );

                await this.taskService.update(task._id, {
                  'cebs.verificationForm': {
                    ...{
                      user: userId,
                      via: 'sms',
                    },
                    ...(form as any),
                  },
                });

                try {
                  this.smsService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting CEBS verification form`,
                  });
                } catch (e) {}

                return;
              case `${SMS_PREFIX}ci`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('sms-text-signalId %o', signalId);
                logger.info('sms-text-form %o', form);

                task = await this.taskService.findOne({ signalId });

                if (!SIGNALS.CEBS.includes(task.signal))
                  throw new Error(
                    `Please submit ${task.getType()} risk assessment form (Signal ID: ${task.signalId}, Signal Code: ${
                      task.signal
                    } is for ${task.getType()})`,
                  );

                if (!task.cebs || !task.cebs.verificationForm)
                  throw new Error('Please submit verification form before submitting risk assessment form');

                await this.taskService.update(task._id, {
                  'cebs.investigationForm': {
                    ...{
                      user: userId,
                      via: 'sms',
                    },
                    ...(form as any),
                  },
                });

                try {
                  this.smsService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting CEBS risk assessment form`,
                  });
                } catch (e) {}

                return;
              case `${SMS_PREFIX}cr`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('sms-text-signalId %o', signalId);
                logger.info('sms-text-form %o', form);

                task = await this.taskService.findOne({ signalId });

                if (!SIGNALS.CEBS.includes(task.signal))
                  throw new Error(
                    `Please submit ${task.getType()} response form (Signal ID: ${task.signalId}, Signal Code: ${
                      task.signal
                    } is for ${task.getType()})`,
                  );

                if (!task.cebs || !task.cebs.investigationForm)
                  throw new Error('Please submit risk assessment form before submitting response form');

                await this.taskService.update(task._id, {
                  'cebs.responseForm': {
                    ...{
                      user: userId,
                      via: 'sms',
                    },
                    ...(form as any),
                  },
                });

                try {
                  this.smsService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting CEBS response form`,
                  });
                } catch (e) {}

                return;

              case `${SMS_PREFIX}cl`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('sms-text-signalId %o', signalId);
                logger.info('sms-text-form %o', form);

                task = await this.taskService.findOne({ signalId });

                if (!SIGNALS.CEBS.includes(task.signal))
                  throw new Error(
                    `Please submit ${task.getType()} lab form / response form (Signal ID: ${
                      task.signalId
                    }, Signal Code: ${task.signal} is for ${task.getType()})`,
                  );

                if (!task.cebs || !task.cebs.labForm)
                  throw new Error('Please submit risk assessment form before submitting lab form');

                await this.taskService.update(task._id, {
                  'cebs.labForm': {
                    ...{
                      user: userId,
                      via: 'sms',
                    },
                    ...(form as any),
                  },
                });

                try {
                  this.smsService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting CEBS lab form`,
                  });
                } catch (e) {}

                return;

              case `${SMS_PREFIX}cs`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('sms-text-signalId %o', signalId);
                logger.info('sms-text-form %o', form);

                task = await this.taskService.findOne({ signalId });

                if (!SIGNALS.CEBS.includes(task.signal))
                  throw new Error(
                    `Please submit ${task.getType()} investigation form / response form (Signal ID: ${
                      task.signalId
                    }, Signal Code: ${task.signal} is for ${task.getType()})`,
                  );

                if (!task.cebs || !task.cebs.investigationForm)
                  throw new Error('Please submit risk assessment form before submitting summary form');

                if (!task.cebs || !task.cebs.responseForm)
                  throw new Error('Please submit response form before submitting summary form');

                if (
                  task.cebs.responseForm?.recommendations.includes('Escalate to higher level') &&
                  !task.cebs.escalationForm
                )
                  throw new Error('Please submit escalation form before submitting summary form');

                await this.taskService.update(task._id, {
                  'cebs.summaryForm': {
                    ...{
                      user: userId,
                      via: 'sms',
                    },
                    ...(form as any),
                  },
                });

                try {
                  this.smsService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting CEBS summary form`,
                  });
                } catch (e) {}

                return;

              case `${SMS_PREFIX}ce`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('sms-text-signalId %o', signalId);
                logger.info('sms-text-form %o', form);

                task = await this.taskService.findOne({ signalId });

                if (!SIGNALS.CEBS.includes(task.signal))
                  throw new Error(
                    `Please submit ${task.getType()} escalation form (Signal ID: ${task.signalId}, Signal Code: ${
                      task.signal
                    } is for ${task.getType()})`,
                  );

                if (!task.cebs || !task.cebs.responseForm)
                  throw new Error('Please submit response form before submitting escalation form');

                if (
                  task.cebs.responseForm &&
                  !task.cebs.responseForm.recommendations.includes('Escalate to higher level')
                )
                  throw new Error(
                    'Escalation form is only available for events that require escalating to higher level as one of the recommendations in the response form',
                  );

                await this.taskService.update(task._id, {
                  'cebs.escalationForm': {
                    ...{
                      user: userId,
                      via: 'sms',
                    },
                    ...(form as any),
                  },
                });

                try {
                  this.smsService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting CEBS escalation form`,
                  });
                } catch (e) {}

                return;
              case `${SMS_PREFIX}hv`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('sms-text-signalId %o', signalId);
                logger.info('sms-text-form %o', form);

                task = await this.taskService.findOne({ signalId });

                if (!SIGNALS.HEBS.includes(task.signal))
                  throw new Error(
                    `Please submit ${task.getType()} verification form (Signal ID: ${task.signalId}, Signal Code: ${
                      task.signal
                    } is for ${task.getType()})`,
                  );

                await this.taskService.update(task._id, {
                  'hebs.verificationForm': {
                    ...{
                      user: userId,
                      via: 'sms',
                    },
                    ...(form as any),
                  },
                });

                try {
                  this.smsService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting HEBS verification form`,
                  });
                } catch (e) {}

                return;
              case `${SMS_PREFIX}hi`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('sms-text-signalId %o', signalId);
                logger.info('sms-text-form %o', form);

                task = await this.taskService.findOne({ signalId });

                if (!SIGNALS.HEBS.includes(task.signal))
                  throw new Error(
                    `Please submit ${task.getType()} risk assessment form (Signal ID: ${task.signalId}, Signal Code: ${
                      task.signal
                    } is for ${task.getType()})`,
                  );

                if (!task.hebs || !task.hebs.verificationForm)
                  throw new Error('Please submit verification form before submitting risk assessment form');

                await this.taskService.update(task._id, {
                  'hebs.investigationForm': {
                    ...{
                      user: userId,
                      via: 'sms',
                    },
                    ...(form as any),
                  },
                });

                try {
                  this.smsService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting HEBS risk assessment form`,
                  });
                } catch (e) {}

                return;
              case `${SMS_PREFIX}hr`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('sms-text-signalId %o', signalId);
                logger.info('sms-text-form %o', form);

                task = await this.taskService.findOne({ signalId });

                if (!SIGNALS.HEBS.includes(task.signal))
                  throw new Error(
                    `Please submit ${task.getType()} response form (Signal ID: ${task.signalId}, Signal Code: ${
                      task.signal
                    } is for ${task.getType()})`,
                  );

                if (!task.hebs || !task.hebs.investigationForm)
                  throw new Error('Please submit risk assessment form before submitting response form');

                await this.taskService.update(task._id, {
                  'hebs.responseForm': {
                    ...{
                      user: userId,
                      via: 'sms',
                    },
                    ...(form as any),
                  },
                });

                try {
                  this.smsService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting HEBS response form`,
                  });
                } catch (e) {}

                return;

              case `${SMS_PREFIX}hl`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('sms-text-signalId %o', signalId);
                logger.info('sms-text-form %o', form);

                task = await this.taskService.findOne({ signalId });

                if (!SIGNALS.HEBS.includes(task.signal))
                  throw new Error(
                    `Please submit ${task.getType()} investigation form / response form (Signal ID: ${
                      task.signalId
                    }, Signal Code: ${task.signal} is for ${task.getType()})`,
                  );

                if (!task.hebs || !task.hebs.investigationForm)
                  throw new Error('Please submit risk assessment form before submitting lab form');

                await this.taskService.update(task._id, {
                  'hebs.labForm': {
                    ...{
                      user: userId,
                      via: 'sms',
                    },
                    ...(form as any),
                  },
                });

                try {
                  this.smsService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting HEBS lab form`,
                  });
                } catch (e) {}

                return;

              case `${SMS_PREFIX}hs`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('sms-text-signalId %o', signalId);
                logger.info('sms-text-form %o', form);

                task = await this.taskService.findOne({ signalId });

                if (!SIGNALS.HEBS.includes(task.signal))
                  throw new Error(
                    `Please submit ${task.getType()} investigation form / response form (Signal ID: ${
                      task.signalId
                    }, Signal Code: ${task.signal} is for ${task.getType()})`,
                  );

                if (!task.hebs || !task.hebs.investigationForm)
                  throw new Error('Please submit risk assessment form before submitting summary form');

                if (!task.hebs || !task.hebs.responseForm)
                  throw new Error('Please submit response form before submitting summary form');

                if (
                  task.hebs.responseForm?.recommendations.includes('Escalate to higher level') &&
                  !task.hebs.escalationForm
                )
                  throw new Error('Please submit escalation form before submitting summary form');

                await this.taskService.update(task._id, {
                  'hebs.summaryForm': {
                    ...{
                      user: userId,
                      via: 'sms',
                    },
                    ...(form as any),
                  },
                });

                try {
                  this.smsService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting HEBS summary form`,
                  });
                } catch (e) {}

                return;
              case `${SMS_PREFIX}he`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('sms-text-signalId %o', signalId);
                logger.info('sms-text-form %o', form);

                task = await this.taskService.findOne({ signalId });

                if (!SIGNALS.HEBS.includes(task.signal))
                  throw new Error(
                    `Please submit ${task.getType()} escalation form (Signal ID: ${task.signalId}, Signal Code: ${
                      task.signal
                    } is for ${task.getType()})`,
                  );

                if (!task.hebs || !task.hebs.responseForm)
                  throw new Error('Please submit response form before submitting escalation form');

                if (
                  task.hebs.responseForm &&
                  !task.hebs.responseForm.recommendations.includes('Escalate to higher level')
                )
                  throw new Error(
                    'Escalation form is only available for events that require escalating to higher level as one of the recommendations in the response form',
                  );

                await this.taskService.update(task._id, {
                  'hebs.escalationForm': {
                    ...{
                      user: userId,
                      via: 'sms',
                    },
                    ...(form as any),
                  },
                });

                try {
                  this.smsService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting HEBS escalation form`,
                  });
                } catch (e) {}

                return;
              case `${SMS_PREFIX}vv`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('sms-text-signalId %o', signalId);
                logger.info('sms-text-form %o', form);

                task = await this.taskService.findOne({ signalId });

                if (!SIGNALS.VEBS.includes(task.signal))
                  throw new Error(
                    `Please submit ${task.getType()} verification form (Signal ID: ${task.signalId}, Signal Code: ${
                      task.signal
                    } is for ${task.getType()})`,
                  );

                await this.taskService.update(task._id, {
                  'vebs.verificationForm': {
                    ...{
                      user: userId,
                      via: 'sms',
                    },
                    ...(form as any),
                  },
                });

                try {
                  this.smsService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting VEBS verification form`,
                  });
                } catch (e) {}

                return;
              case `${SMS_PREFIX}vi`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('sms-text-signalId %o', signalId);
                logger.info('sms-text-form %o', form);

                task = await this.taskService.findOne({ signalId });

                if (!SIGNALS.VEBS.includes(task.signal))
                  throw new Error(
                    `Please submit ${task.getType()} risk assessment form (Signal ID: ${task.signalId}, Signal Code: ${
                      task.signal
                    } is for ${task.getType()})`,
                  );

                if (!task.vebs || !task.vebs.verificationForm)
                  throw new Error('Please submit verification form before submitting risk assessment form');

                await this.taskService.update(task._id, {
                  'vebs.investigationForm': {
                    ...{
                      user: userId,
                      via: 'sms',
                    },
                    ...(form as any),
                  },
                });

                try {
                  this.smsService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting VEBS risk assessment form`,
                  });
                } catch (e) {}
                return;
              case `${SMS_PREFIX}vr`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('sms-text-signalId %o', signalId);
                logger.info('sms-text-form %o', form);

                task = await this.taskService.findOne({ signalId });

                if (!SIGNALS.VEBS.includes(task.signal))
                  throw new Error(
                    `Please submit ${task.getType()} response form (Signal ID: ${task.signalId}, Signal Code: ${
                      task.signal
                    } is for ${task.getType()})`,
                  );

                if (!task.vebs || !task.vebs.investigationForm)
                  throw new Error('Please submit risk assessment form before submitting response form');

                await this.taskService.update(task._id, {
                  'vebs.responseForm': {
                    ...{
                      user: userId,
                      via: 'sms',
                    },
                    ...(form as any),
                  },
                });

                try {
                  this.smsService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting VEBS response form`,
                  });
                } catch (e) {}

                return;

              case `${SMS_PREFIX}vl`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('sms-text-signalId %o', signalId);
                logger.info('sms-text-form %o', form);

                task = await this.taskService.findOne({ signalId });

                if (!SIGNALS.VEBS.includes(task.signal))
                  throw new Error(
                    `Please submit ${task.getType()} investigation form (Signal ID: ${task.signalId}, Signal Code: ${
                      task.signal
                    } is for ${task.getType()})`,
                  );

                if (!task.vebs || !task.vebs.investigationForm)
                  throw new Error('Please submit risk assessment form before submitting lab form');

                await this.taskService.update(task._id, {
                  'vebs.labForm': {
                    ...{
                      user: userId,
                      via: 'sms',
                    },
                    ...(form as any),
                  },
                });

                try {
                  this.smsService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting VEBS lab form`,
                  });
                } catch (e) {}

                return;

              case `${SMS_PREFIX}vs`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('sms-text-signalId %o', signalId);
                logger.info('sms-text-form %o', form);

                task = await this.taskService.findOne({ signalId });

                if (!SIGNALS.VEBS.includes(task.signal))
                  throw new Error(
                    `Please submit ${task.getType()} investigation form / response form (Signal ID: ${
                      task.signalId
                    }, Signal Code: ${task.signal} is for ${task.getType()})`,
                  );

                if (!task.vebs || !task.vebs.investigationForm)
                  throw new Error('Please submit risk assessment form before submitting summary form');

                if (!task.vebs || !task.vebs.responseForm)
                  throw new Error('Please submit response form before submitting summary form');

                if (
                  task.vebs.responseForm?.recommendations.includes('Escalate to higher level') &&
                  !task.vebs.escalationForm
                )
                  throw new Error('Please submit escalation form before submitting summary form');

                await this.taskService.update(task._id, {
                  'vebs.summaryForm': {
                    ...{
                      user: userId,
                      via: 'sms',
                    },
                    ...(form as any),
                  },
                });

                try {
                  this.smsService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting VEBS summary form`,
                  });
                } catch (e) {}

                return;
              case `${SMS_PREFIX}ve`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('sms-text-signalId %o', signalId);
                logger.info('sms-text-form %o', form);

                task = await this.taskService.findOne({ signalId });

                if (!SIGNALS.VEBS.includes(task.signal))
                  throw new Error(
                    `Please submit ${task.getType()} escalation form (Signal ID: ${task.signalId}, Signal Code: ${
                      task.signal
                    } is for ${task.getType()})`,
                  );

                if (!task.vebs || !task.vebs.responseForm)
                  throw new Error('Please submit response form before submitting escalation form');

                if (
                  task.vebs.responseForm &&
                  !task.vebs.responseForm.recommendations.includes('Escalate to higher level')
                )
                  throw new Error(
                    'Escalation form is only available for events that require escalating to higher level as one of the recommendations in the response form',
                  );

                await this.taskService.update(task._id, {
                  'vebs.escalationForm': {
                    ...{
                      user: userId,
                      via: 'sms',
                    },
                    ...(form as any),
                  },
                });

                try {
                  this.smsService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting VEBS escalation form`,
                  });
                } catch (e) {}

                return;
              case `${SMS_PREFIX}lv`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('sms-text-signalId %o', signalId);
                logger.info('sms-text-form %o', form);

                task = await this.taskService.findOne({ signalId });

                if (!SIGNALS.LEBS.includes(task.signal))
                  throw new Error(
                    `Please submit ${task.getType()} verification form (Signal ID: ${task.signalId}, Signal Code: ${
                      task.signal
                    } is for ${task.getType()})`,
                  );

                await this.taskService.update(task._id, {
                  'lebs.verificationForm': {
                    ...{
                      user: userId,
                      via: 'sms',
                    },
                    ...(form as any),
                  },
                });

                try {
                  this.smsService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting LEBS verification form`,
                  });
                } catch (e) {}

                return;
              case `${SMS_PREFIX}li`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('sms-text-signalId %o', signalId);
                logger.info('sms-text-form %o', form);

                task = await this.taskService.findOne({ signalId });

                if (!SIGNALS.LEBS.includes(task.signal))
                  throw new Error(
                    `Please submit ${task.getType()} risk assessment form (Signal ID: ${task.signalId}, Signal Code: ${
                      task.signal
                    } is for ${task.getType()})`,
                  );

                if (!task.lebs || !task.lebs.verificationForm)
                  throw new Error('Please submit verification form before submitting risk assessment form');

                await this.taskService.update(task._id, {
                  'lebs.investigationForm': {
                    ...{
                      user: userId,
                      via: 'sms',
                    },
                    ...(form as any),
                  },
                });

                try {
                  this.smsService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting LEBS risk assessment form`,
                  });
                } catch (e) {}

                return;
              case `${SMS_PREFIX}lr`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('sms-text-signalId %o', signalId);
                logger.info('sms-text-form %o', form);

                task = await this.taskService.findOne({ signalId });

                if (!SIGNALS.LEBS.includes(task.signal))
                  throw new Error(
                    `Please submit ${task.getType()} response form (Signal ID: ${task.signalId}, Signal Code: ${
                      task.signal
                    } is for ${task.getType()})`,
                  );

                if (!task.lebs || !task.lebs.investigationForm)
                  throw new Error('Please submit risk assessment form before submitting response form');

                await this.taskService.update(task._id, {
                  'lebs.responseForm': {
                    ...{
                      user: userId,
                      via: 'sms',
                    },
                    ...(form as any),
                  },
                });

                try {
                  this.smsService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting LEBS response form`,
                  });
                } catch (e) {}

                return;

              case `${SMS_PREFIX}ll`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('sms-text-signalId %o', signalId);
                logger.info('sms-text-form %o', form);

                task = await this.taskService.findOne({ signalId });

                if (!SIGNALS.LEBS.includes(task.signal))
                  throw new Error(
                    `Please submit ${task.getType()} investigation form (Signal ID: ${task.signalId}, Signal Code: ${
                      task.signal
                    } is for ${task.getType()})`,
                  );

                if (!task.lebs || !task.lebs.investigationForm)
                  throw new Error('Please submit risk assessment form before submitting lab form');

                await this.taskService.update(task._id, {
                  'lebs.labForm': {
                    ...{
                      user: userId,
                      via: 'sms',
                    },
                    ...(form as any),
                  },
                });

                try {
                  this.smsService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting LEBS lab form`,
                  });
                } catch (e) {}

                return;

              case `${SMS_PREFIX}ls`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('sms-text-signalId %o', signalId);
                logger.info('sms-text-form %o', form);

                task = await this.taskService.findOne({ signalId });

                if (!SIGNALS.LEBS.includes(task.signal))
                  throw new Error(
                    `Please submit ${task.getType()} investigation form / response form (Signal ID: ${
                      task.signalId
                    }, Signal Code: ${task.signal} is for ${task.getType()})`,
                  );

                if (!task.lebs || !task.lebs.investigationForm)
                  throw new Error('Please submit risk assessment form before submitting summary form');

                if (!task.lebs || !task.lebs.responseForm)
                  throw new Error('Please submit response form before submitting summary form');

                await this.taskService.update(task._id, {
                  'lebs.summaryForm': {
                    ...{
                      user: userId,
                      via: 'sms',
                    },
                    ...(form as any),
                  },
                });

                try {
                  this.smsService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting LEBS summary form`,
                  });
                } catch (e) {}

                return;
              case `${SMS_PREFIX}le`:
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('sms-text-signalId %o', signalId);
                logger.info('sms-text-form %o', form);

                task = await this.taskService.findOne({ signalId });

                if (!SIGNALS.LEBS.includes(task.signal))
                  throw new Error(`Please submit ${task.getType()} escalation form`);

                if (!task.lebs || !task.lebs.responseForm)
                  throw new Error('Please submit response form before submitting escalation form');

                await this.taskService.update(task._id, {
                  'lebs.escalationForm': {
                    ...{
                      user: userId,
                      via: 'sms',
                    },
                    ...(form as any),
                  },
                });

                try {
                  this.smsService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting LEBS escalation form`,
                  });
                } catch (e) {}

                return;
              case `${SMS_PREFIX}pmr`:
                const subCountyId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('sms-text-subCountyId %o', subCountyId);
                logger.info('sms-text-form %o', form);

                const { signal, dateDetected, description, source, locality, dateReported } = form;

                const subCounty = await UnitModel.findById(subCountyId);

                await this.taskService.create({
                  signal,
                  user: userId,
                  unit: subCountyId,
                  'pmebs.reportForm': {
                    user: userId,
                    dateDetected,
                    description,
                    source,
                    unit: subCountyId,
                    locality,
                    dateReported,
                    via: 'sms',
                  },
                  via: 'sms',
                  state: subCounty.state,
                  version: '2',
                });

                try {
                  this.smsService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting PEBS/MEBS report form`,
                  });
                } catch (e) {}

                return;
              case `${SMS_PREFIX}pmv`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                const unitId = splits[SMS_PREFIX ? 3 : 2];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 4 : 3).join(' ')));

                logger.info('sms-text-signalId %o', signalId);
                logger.info('sms-text-form %o', form);
                logger.info('sms-text-unitId %o', unitId);

                task = await this.taskService.findOne({ signalId });

                if (!task.pmebs || !task.pmebs.reportForm)
                  throw new Error('Please submit report form before submitting verification request form');

                task = await this.taskService.update(task._id, {
                  'pmebs.requestForm': {
                    ...{
                      user: userId,
                      unit: unitId,
                      via: 'sms',
                    },
                    ...(form as any),
                  },
                  unit: unitId,
                });

                try {
                  this.smsService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting PEBS/MEBS verification request form`,
                  });
                } catch (e) {}

                return;
            }
          }

          let signal: string = text.toLocaleLowerCase().trim();

          if (signal.startsWith('ebs')) signal = text.substring(3).trim().toLocaleLowerCase();

          const unit = await user.findReportingUnit(signal);

          await this.taskService.create({
            unit: unit._id,
            user: userId,
            signal: signal,
            via: 'sms',
            state: unit.state,
            version: '2',
          });
        } else if (!user && CHT_SMS_SYNC === 'enabled') {
          const { data } = await chtApi.post(
            '',
            stringify({
              from,
              linkId,
              text,
              to,
              id,
              cost,
              networkCode,
              date: date.toISOString(),
            }),
          );

          logger.info('incomingSms-created-forwarded-to-cht %o', data);
        }
      } catch (error) {
        try {
          await this.smsService.send({ to: incomingSms.from, message: (error as Error).message });
        } catch (e) {}

        logger.error('incomingSms-created %o', (error as Error).message);
      }
    });

    this.on('incomingSms-updated', async (incomingSms) => {
      try {
        logger.info('incomingSms-updated %o', incomingSms._id);
      } catch (error) {
        logger.error('incomingSms-updated %o', (error as Error).message);
      }
    });

    this.on('incomingSms-fetched', async (incomingSms) => {
      try {
        logger.info('incomingSms-fetched %o', incomingSms._id);
      } catch (error) {
        logger.error('incomingSms-fetched %o', (error as Error).message);
      }
    });

    this.on('incomingSms-deleted', async (incomingSms) => {
      try {
        logger.info('incomingSms-deleted %o', incomingSms._id);
      } catch (error) {
        logger.error('incomingSms-deleted %o', (error as Error).message);
      }
    });
  }
}

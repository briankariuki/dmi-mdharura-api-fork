import { SMS_PREFIX } from './../../config/sms';
import { EventEmitter } from 'events';
import { injectable, inject } from 'inversify';
import { logger } from '../../loader/logger';
import { UserModel } from '../../model/user/user';
import { TaskService } from '../../service/task/task';
import { decompressForm } from '../../util/fieldDictionary';
import { TaskDocument } from '../../model/task/task';
import { UnitModel } from '../../model/unit/unit';

import { SIGNALS } from '../../config/signal';
import { WhatsappService } from '../../service/whatsapp/whatsapp';
import { IncomingWhatsappDocument } from '../../model/whatsapp/incomingWhatsapp';

type IncomingWhatsappEvent =
  | 'incomingWhatsapp-created'
  | 'incomingWhatsapp-updated'
  | 'incomingWhatsapp-fetched'
  | 'incomingWhatsapp-deleted';

export interface IncomingWhatsappEventEmitter {
  on(event: IncomingWhatsappEvent, listener: (incomingWhatsapp: IncomingWhatsappDocument) => void): this;
  emit(event: IncomingWhatsappEvent, incomingWhatsapp: IncomingWhatsappDocument): boolean;
}

@injectable()
export class IncomingWhatsappEventEmitter extends EventEmitter {
  @inject(TaskService)
  taskService: TaskService;

  @inject(WhatsappService)
  whatsappService: WhatsappService;

  constructor() {
    super();

    this.on('incomingWhatsapp-created', async (incomingWhatsapp) => {
      try {
        logger.info('incomingWhatsapp-created %o', incomingWhatsapp._id);

        const { waId, body: text, from } = incomingWhatsapp;

        const phoneNumber = `+${waId}`;

        const user = await UserModel.findOne({ phoneNumber });

        if (user && text) {
          const { _id: userId, displayName } = user;

          if (text.includes(' ')) {
            const splits = text.split(' ');

            let prefix = splits[0];

            if (prefix === SMS_PREFIX.trim()) prefix = `${SMS_PREFIX}${splits[1]}`;

            logger.info('whatsapp-text-splits %o', splits);

            logger.info('whatsapp-text-prefix %o', prefix);

            let signalId: string;
            let form: Record<string, any>;
            let task: TaskDocument;

            switch (prefix) {
              case `${SMS_PREFIX}cv`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('whatsapp-text-signalId %o', signalId);
                logger.info('whatsapp-text-form %o', form);

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
                  this.whatsappService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting CEBS verification form`,
                  });
                } catch (e) {}

                return;
              case `${SMS_PREFIX}ci`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('whatsapp-text-signalId %o', signalId);
                logger.info('whatsapp-text-form %o', form);

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
                  this.whatsappService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting CEBS risk assessment form`,
                  });
                } catch (e) {}
                return;
              case `${SMS_PREFIX}cr`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('whatsapp-text-signalId %o', signalId);
                logger.info('whatsapp-text-form %o', form);

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
                  this.whatsappService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting CEBS response form`,
                  });
                } catch (e) {}

                return;

              case `${SMS_PREFIX}cl`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('whatsapp-text-signalId %o', signalId);
                logger.info('whatsapp-text-form %o', form);

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
                  this.whatsappService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting CEBS lab form`,
                  });
                } catch (e) {}

                return;

              case `${SMS_PREFIX}cs`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('whatsapp-text-signalId %o', signalId);
                logger.info('whatsapp-text-form %o', form);

                task = await this.taskService.findOne({ signalId });

                if (!SIGNALS.CEBS.includes(task.signal))
                  throw new Error(
                    `Please submit ${task.getType()} investigation form / response form (Signal ID: ${
                      task.signalId
                    }, Signal Code: ${task.signal} is for ${task.getType()})`,
                  );

                if (!task.cebs || !task.cebs.investigationForm)
                  throw new Error('Please submit risk assessment form before submitting summary form');

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
                  this.whatsappService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting CEBS summary form`,
                  });
                } catch (e) {}
                return;

              case `${SMS_PREFIX}ce`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('whatsapp-text-signalId %o', signalId);
                logger.info('whatsapp-text-form %o', form);

                task = await this.taskService.findOne({ signalId });

                if (!SIGNALS.CEBS.includes(task.signal))
                  throw new Error(
                    `Please submit ${task.getType()} escalation form (Signal ID: ${task.signalId}, Signal Code: ${
                      task.signal
                    } is for ${task.getType()})`,
                  );

                if (!task.cebs || !task.cebs.responseForm)
                  throw new Error('Please submit response form before submitting escalation form');

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
                  this.whatsappService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting CEBS escalation form`,
                  });
                } catch (e) {}
                return;
              case `${SMS_PREFIX}hv`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('whatsapp-text-signalId %o', signalId);
                logger.info('whatsapp-text-form %o', form);

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
                  this.whatsappService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting HEBS verification form`,
                  });
                } catch (e) {}
                return;
              case `${SMS_PREFIX}hi`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('whatsapp-text-signalId %o', signalId);
                logger.info('whatsapp-text-form %o', form);

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
                  this.whatsappService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting HEBS risk assessment form`,
                  });
                } catch (e) {}
                return;
              case `${SMS_PREFIX}hr`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('whatsapp-text-signalId %o', signalId);
                logger.info('whatsapp-text-form %o', form);

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
                  this.whatsappService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting HEBS response form`,
                  });
                } catch (e) {}
                return;

              case `${SMS_PREFIX}hl`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('whatsapp-text-signalId %o', signalId);
                logger.info('whatsapp-text-form %o', form);

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
                  this.whatsappService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting HEBS lab form`,
                  });
                } catch (e) {}
                return;

              case `${SMS_PREFIX}hs`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('whatsapp-text-signalId %o', signalId);
                logger.info('whatsapp-text-form %o', form);

                task = await this.taskService.findOne({ signalId });

                if (!SIGNALS.HEBS.includes(task.signal))
                  throw new Error(
                    `Please submit ${task.getType()} investigation form / response form (Signal ID: ${
                      task.signalId
                    }, Signal Code: ${task.signal} is for ${task.getType()})`,
                  );

                if (!task.hebs || !task.hebs.investigationForm)
                  throw new Error('Please submit risk assessment form before submitting summary form');

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
                  this.whatsappService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting HEBS summary form`,
                  });
                } catch (e) {}
                return;
              case `${SMS_PREFIX}he`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('whatsapp-text-signalId %o', signalId);
                logger.info('whatsapp-text-form %o', form);

                task = await this.taskService.findOne({ signalId });

                if (!SIGNALS.HEBS.includes(task.signal))
                  throw new Error(
                    `Please submit ${task.getType()} escalation form (Signal ID: ${task.signalId}, Signal Code: ${
                      task.signal
                    } is for ${task.getType()})`,
                  );

                if (!task.hebs || !task.hebs.responseForm)
                  throw new Error('Please submit response form before submitting escalation form');

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
                  this.whatsappService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting HEBS escalation form`,
                  });
                } catch (e) {}
                return;
              case `${SMS_PREFIX}vv`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('whatsapp-text-signalId %o', signalId);
                logger.info('whatsapp-text-form %o', form);

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
                  this.whatsappService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting VEBS verification form`,
                  });
                } catch (e) {}
                return;
              case `${SMS_PREFIX}vi`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('whatsapp-text-signalId %o', signalId);
                logger.info('whatsapp-text-form %o', form);

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

                return;
              case `${SMS_PREFIX}vr`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('whatsapp-text-signalId %o', signalId);
                logger.info('whatsapp-text-form %o', form);

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
                  this.whatsappService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting VEBS response form`,
                  });
                } catch (e) {}
                return;

              case `${SMS_PREFIX}vl`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('whatsapp-text-signalId %o', signalId);
                logger.info('whatsapp-text-form %o', form);

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
                  this.whatsappService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting VEBS lab form`,
                  });
                } catch (e) {}
                return;

              case `${SMS_PREFIX}vs`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('whatsapp-text-signalId %o', signalId);
                logger.info('whatsapp-text-form %o', form);

                task = await this.taskService.findOne({ signalId });

                if (!SIGNALS.VEBS.includes(task.signal))
                  throw new Error(
                    `Please submit ${task.getType()} investigation form / response form (Signal ID: ${
                      task.signalId
                    }, Signal Code: ${task.signal} is for ${task.getType()})`,
                  );

                if (!task.vebs || !task.vebs.investigationForm)
                  throw new Error('Please submit risk assessment form before submitting summary form');

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
                  this.whatsappService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting VEBS summary form`,
                  });
                } catch (e) {}
                return;
              case `${SMS_PREFIX}ve`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('whatsapp-text-signalId %o', signalId);
                logger.info('whatsapp-text-form %o', form);

                task = await this.taskService.findOne({ signalId });

                if (!SIGNALS.VEBS.includes(task.signal))
                  throw new Error(
                    `Please submit ${task.getType()} escalation form (Signal ID: ${task.signalId}, Signal Code: ${
                      task.signal
                    } is for ${task.getType()})`,
                  );

                if (!task.vebs || !task.vebs.responseForm)
                  throw new Error('Please submit response form before submitting escalation form');

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
                  this.whatsappService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting VEBS escalation form`,
                  });
                } catch (e) {}
                return;
              case `${SMS_PREFIX}lv`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('whatsapp-text-signalId %o', signalId);
                logger.info('whatsapp-text-form %o', form);

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
                  this.whatsappService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting LEBS verification form`,
                  });
                } catch (e) {}
                return;
              case `${SMS_PREFIX}li`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('whatsapp-text-signalId %o', signalId);
                logger.info('whatsapp-text-form %o', form);

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
                  this.whatsappService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting LEBS risk assessment form`,
                  });
                } catch (e) {}
                return;
              case `${SMS_PREFIX}lr`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('whatsapp-text-signalId %o', signalId);
                logger.info('whatsapp-text-form %o', form);

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
                  this.whatsappService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting LEBS response form`,
                  });
                } catch (e) {}
                return;

              case `${SMS_PREFIX}ll`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('whatsapp-text-signalId %o', signalId);
                logger.info('whatsapp-text-form %o', form);

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
                  this.whatsappService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting LEBS lab form`,
                  });
                } catch (e) {}
                return;

              case `${SMS_PREFIX}ls`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('whatsapp-text-signalId %o', signalId);
                logger.info('whatsapp-text-form %o', form);

                task = await this.taskService.findOne({ signalId });

                if (!SIGNALS.LEBS.includes(task.signal))
                  throw new Error(
                    `Please submit ${task.getType()} investigation form / response form (Signal ID: ${
                      task.signalId
                    }, Signal Code: ${task.signal} is for ${task.getType()})`,
                  );

                if (!task.lebs || !task.lebs.investigationForm)
                  throw new Error('Please submit risk assessment form before submitting summary form');

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
                  this.whatsappService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting LEBS summary form`,
                  });
                } catch (e) {}
                return;
              case `${SMS_PREFIX}le`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('whatsapp-text-signalId %o', signalId);
                logger.info('whatsapp-text-form %o', form);

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
                  this.whatsappService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting LEBS escalation form`,
                  });
                } catch (e) {}
                return;
              case `${SMS_PREFIX}pmr`:
                const subCountyId = splits[SMS_PREFIX ? 2 : 1];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 3 : 2).join(' ')));

                logger.info('whatsapp-text-subCountyId %o', subCountyId);
                logger.info('whatsapp-text-form %o', form);

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
                  state: subCounty._id,
                  version: '2',
                });

                try {
                  this.whatsappService.send({
                    to: phoneNumber,
                    message: `Hi ${displayName}. Thank you for submitting PEBS/MEBS report form`,
                  });
                } catch (e) {}
                return;
              case `${SMS_PREFIX}pmv`:
                signalId = splits[SMS_PREFIX ? 2 : 1];
                const unitId = splits[SMS_PREFIX ? 3 : 2];
                form = decompressForm(JSON.parse(splits.slice(SMS_PREFIX ? 4 : 3).join(' ')));

                logger.info('whatsapp-text-signalId %o', signalId);
                logger.info('whatsapp-text-form %o', form);
                logger.info('whatsapp-text-unitId %o', unitId);

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
                  this.whatsappService.send({
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
        }
      } catch (error) {
        const { waId } = incomingWhatsapp;

        const phoneNumber = `+${waId}`;
        try {
          await this.whatsappService.send({
            to: phoneNumber,
            message: (error as Error).message,
          });
        } catch (e) {}

        logger.error('incomingWhatsapp-created %o', (error as Error).message);
      }
    });

    this.on('incomingWhatsapp-updated', async (incomingWhatsapp) => {
      try {
        logger.info('incomingWhatsapp-updated %o', incomingWhatsapp._id);
      } catch (error) {
        logger.error('incomingWhatsapp-updated %o', (error as Error).message);
      }
    });

    this.on('incomingWhatsapp-fetched', async (incomingWhatsapp) => {
      try {
        logger.info('incomingWhatsapp-fetched %o', incomingWhatsapp._id);
      } catch (error) {
        logger.error('incomingWhatsapp-fetched %o', (error as Error).message);
      }
    });

    this.on('incomingWhatsapp-deleted', async (incomingWhatsapp) => {
      try {
        logger.info('incomingWhatsapp-deleted %o', incomingWhatsapp._id);
      } catch (error) {
        logger.error('incomingWhatsapp-deleted %o', (error as Error).message);
      }
    });
  }
}

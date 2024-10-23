import { inject, injectable } from 'inversify';
import {
  EBS_CONNECT_SUPABASE_CHANNEL,
  EBS_CONNECT_SUPABASE_SCHEMA,
  EBS_CONNECT_SUPABASE_TABLE,
} from '../../config/ebsconnect';

import { logger } from '../../loader/logger';
import { EbsConnectMessage } from '../../types/ebsconnect';
import { EbsConnectEventEmitter } from '../../event/ebsconnect/ebsconnect';
import { supabaseClient } from '../../app';
import { TaskDocument } from '../../model/task/task';
import { TEST_USER_UNIT_CODE } from '../../config/system';

@injectable()
export class EbsConnectService {
  @inject(EbsConnectEventEmitter)
  ebsConnectEmitter: EbsConnectEventEmitter;

  async init(): Promise<void> {
    const channel = supabaseClient
      .channel(EBS_CONNECT_SUPABASE_CHANNEL)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: EBS_CONNECT_SUPABASE_SCHEMA,
          table: EBS_CONNECT_SUPABASE_TABLE,
          filter: 'SOURCE=neq.mdharura',
        },
        (message) => {
          if (message.eventType === 'INSERT') {
            this.create(message as EbsConnectMessage);
          }

          if (message.eventType === 'UPDATE') {
            this.update(message as EbsConnectMessage);
          }
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.info('EBS_CONNECT_CHANNEL connected');
        } else {
          logger.error('EBS_CONNECT_CHANNEL disconnected. Reason: %o', status);
        }
      });
  }

  async create(message: EbsConnectMessage): Promise<void> {
    const { new: payload } = message;

    this.ebsConnectEmitter.emit('ebsconnect-created', payload);
  }

  async update(message: EbsConnectMessage): Promise<void> {
    const { new: payload } = message;

    this.ebsConnectEmitter.emit('ebsconnect-updated', payload);
  }

  async sync(task: TaskDocument): Promise<void> {
    if (task.getType() !== 'CEBS') return;

    let doc = await task.toEbsConnect();

    if (doc.UNIT_CODE !== TEST_USER_UNIT_CODE) return;

    this.ebsConnectEmitter.emit('ebsconnect-sync', doc);
  }
}

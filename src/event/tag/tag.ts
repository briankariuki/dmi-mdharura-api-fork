import { EventEmitter } from 'events';
import { injectable } from 'inversify';
import { logger } from '../../loader/logger';
import { TagDocument } from '../../model/tag/tag';

type TagEvent = 'tag-created' | 'tag-updated' | 'tag-fetched' | 'tag-deleted';

export interface TagEventEmitter {
  on(event: TagEvent, listener: (tag: TagDocument) => void): this;
  emit(event: TagEvent, tag: TagDocument): boolean;
}

@injectable()
export class TagEventEmitter extends EventEmitter {
  constructor() {
    super();

    this.on('tag-created', async (tag) => {
      try {
        logger.info('tag-created %o', tag._id);

        await tag.addFields();
      } catch (error) {
        logger.error('tag-created %o', (error as Error).message);
      }
    });

    this.on('tag-updated', async (tag) => {
      try {
        logger.info('tag-updated %o', tag._id);

        await tag.addFields();
      } catch (error) {
        logger.error('tag-updated %o', (error as Error).message);
      }
    });

    this.on('tag-fetched', async (tag) => {
      try {
        logger.info('tag-fetched %o', tag._id);

        await tag.addFields();
      } catch (error) {
        logger.error('tag-fetched %o', (error as Error).message);
      }
    });

    this.on('tag-deleted', async (tag) => {
      try {
        logger.info('tag-deleted %o', tag._id);
      } catch (error) {
        logger.error('tag-deleted %o', (error as Error).message);
      }
    });
  }
}

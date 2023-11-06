import { EventEmitter } from 'events';
import { injectable } from 'inversify';
import { logger } from '../../loader/logger';
import { UnitDocument } from '../../model/unit/unit';

type UnitEvent = 'unit-created' | 'unit-updated' | 'unit-fetched' | 'unit-deleted';

export interface UnitEventEmitter {
  on(event: UnitEvent, listener: (unit: UnitDocument) => void): this;
  emit(event: UnitEvent, unit: UnitDocument): boolean;
}

@injectable()
export class UnitEventEmitter extends EventEmitter {
  constructor() {
    super();

    this.on('unit-created', async (unit) => {
      try {
        logger.info('unit-created %o', unit._id);

        await unit.addFields();
      } catch (error) {
        logger.error('unit-created %o', (error as Error).message);
      }
    });

    this.on('unit-updated', async (unit) => {
      try {
        logger.info('unit-updated %o', unit._id);

        await unit.addFields();
      } catch (error) {
        logger.error('unit-updated %o', (error as Error).message);
      }
    });

    this.on('unit-fetched', async (unit) => {
      try {
        logger.info('unit-fetched %o', unit._id);

        await unit.addFields();
      } catch (error) {
        logger.error('unit-fetched %o', (error as Error).message);
      }
    });

    this.on('unit-deleted', async (unit) => {
      try {
        logger.info('unit-deleted %o', unit._id);
      } catch (error) {
        logger.error('unit-deleted %o', (error as Error).message);
      }
    });
  }
}

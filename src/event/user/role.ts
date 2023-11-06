import { EventEmitter } from 'events';
import { injectable } from 'inversify';
import { logger } from '../../loader/logger';
import { RoleDocument, RoleModel } from '../../model/user/role';
import { UnitModel } from '../../model/unit/unit';

type RoleEvent = 'role-created' | 'role-updated' | 'role-fetched' | 'role-deleted';

export interface RoleEventEmitter {
  on(event: RoleEvent, listener: (role: RoleDocument) => void): this;
  emit(event: RoleEvent, role: RoleDocument): boolean;
}

@injectable()
export class RoleEventEmitter extends EventEmitter {
  constructor() {
    super();

    this.on('role-created', async (role) => {
      try {
        logger.info('role-created %o', role._id);

        await role.addFields();

        const unit = await UnitModel.findById(role.populated('unit') || role.unit);

        const { spot } = role;

        if (spot === 'CHA' || spot === 'AHA' || spot === 'VET') {
          const parentUnit = await UnitModel.findById(unit.parent);

          const children = await parentUnit.children();

          await RoleModel.deleteMany({
            _id: { $nin: [role._id] },
            user: role.populated('user') || role.user,
            $or: [{ unit: { $nin: children.map((child) => child._id) } }, { spot: { $nin: ['CHA', 'AHA', 'VET'] } }],
          });
        } else
          await RoleModel.deleteMany({
            _id: { $nin: [role._id] },
            user: role.populated('user') || role.user,
            unit: { $nin: [unit._id] },
          });
      } catch (error) {
        logger.error('role-created %o', (error as Error).message);
      }
    });

    this.on('role-updated', async (role) => {
      try {
        logger.info('role-updated %o', role._id);

        await role.addFields();

        const unit = await UnitModel.findById(role.populated('unit') || role.unit);

        const { spot } = role;

        if (spot === 'CHA' || spot === 'AHA' || spot === 'VET') {
          const parentUnit = await UnitModel.findById(unit.parent);

          const children = await parentUnit.children();

          await RoleModel.deleteMany({
            _id: { $nin: [role._id] },
            user: role.populated('user') || role.user,
            $or: [{ unit: { $nin: children.map((child) => child._id) } }, { spot: { $nin: ['CHA', 'AHA', 'VET'] } }],
          });
        } else
          await RoleModel.deleteMany({
            _id: { $nin: [role._id] },
            user: role.populated('user') || role.user,
            unit: { $nin: [unit._id] },
          });
      } catch (error) {
        logger.error('role-updated %o', (error as Error).message);
      }
    });

    this.on('role-fetched', async (role) => {
      try {
        logger.info('role-fetched %o', role._id);

        await role.addFields();
      } catch (error) {
        logger.error('role-fetched %o', (error as Error).message);
      }
    });

    this.on('role-deleted', async (role) => {
      try {
        logger.info('role-deleted %o', role._id);
      } catch (error) {
        logger.error('role-deleted %o', (error as Error).message);
      }
    });
  }
}

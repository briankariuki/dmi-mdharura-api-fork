import { injectable, inject } from 'inversify';
import { pickBy } from 'lodash';
import { PageOptions, PageResult, Query, DefaultDocument } from '../../plugin/types';
import { Role, RoleModel, RoleDocument } from '../../model/user/role';
import { RoleEventEmitter } from '../../event/user/role';
import { UnitModel } from '../../model/unit/unit';

@injectable()
export class RoleService {
  @inject(RoleEventEmitter)
  private roleEventEmitter: RoleEventEmitter;

  async create(data: { unit: Role['unit']; user: Role['user']; spot: Role['spot'] }): Promise<Role> {
    const { user, spot, unit } = data;

    let role: RoleDocument;

    try {
      const _unit = await UnitModel.findById(unit);

      if (_unit.type === 'Subcounty') role = await this.findOne({ user, unit, spot });
      else role = await this.findOne({ user, unit });

      role = await this.update(role._id, { spot });
    } catch (error) {
      role = await new RoleModel(pickBy({ user, spot, unit })).save();

      this.roleEventEmitter.emit('role-created', role);
    }

    await role.populate([{ path: 'user' }, { path: 'unit' }]).execPopulate();

    return role;
  }

  async findOne(query: Query): Promise<RoleDocument> {
    const role = await RoleModel.findOne(query);

    if (!role) throw new Error('Role not found');

    this.roleEventEmitter.emit('role-fetched', role);

    return role;
  }

  async update(
    roleId: string,
    data: {
      spot?: Role['spot'];
      status?: Role['status'];
      _status?: DefaultDocument['_status'];
    },
  ): Promise<RoleDocument> {
    const role = await RoleModel.findByIdAndUpdate(roleId, { $set: pickBy(data) }, { new: true, runValidators: true });

    if (!role) throw new Error('Role not found');

    this.roleEventEmitter.emit('role-updated', role);

    await role.populate([{ path: 'user' }, { path: 'unit' }]).execPopulate();

    return role;
  }

  async findById(roleId: string): Promise<RoleDocument> {
    const role = await RoleModel.findById(roleId);

    if (!role) throw new Error('Role not found');

    this.roleEventEmitter.emit('role-fetched', role);

    await role.populate([{ path: 'user' }, { path: 'unit' }]).execPopulate();

    return role;
  }

  async delete(roleId: string): Promise<RoleDocument> {
    const role = await RoleModel.findById(roleId);

    if (!role) throw new Error('Role not found');

    await role.remove();

    this.roleEventEmitter.emit('role-deleted', role);

    await role.populate([{ path: 'user' }, { path: 'unit' }]).execPopulate();

    return role;
  }

  async page(query: Query, pageOptions: PageOptions): Promise<PageResult<RoleDocument>> {
    let pageResult: PageResult<RoleDocument>;

    const { q, page, limit, populate } = pageOptions;

    if (q) {
      const docs = await RoleModel.look(q, { query, populate, page, limit });

      pageResult = { docs, limit: docs.length, total: docs.length, sort: q, page: 1, pages: 1 };
    } else {
      pageResult = await RoleModel.page(pickBy(query), pageOptions);
    }

    return pageResult;
  }
}

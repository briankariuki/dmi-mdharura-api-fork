import { inject, injectable } from 'inversify';
import { pickBy } from 'lodash';
import { User, UserModel, UserDocument } from '../../model/user/user';
import { PageOptions, PageResult, Query, DefaultDocument } from '../../plugin/types';
import { UserEventEmitter } from '../../event/user/user';
import { Role } from '../../model/user/role';
import { RoleService } from './role';

@injectable()
export class UserService {
  @inject(UserEventEmitter)
  private userEventEmitter: UserEventEmitter;

  @inject(RoleService)
  private roleService: RoleService;

  async create(data: {
    displayName: User['displayName'];
    phoneNumber: User['phoneNumber'];
    spot: Role['spot'];
    unit: Role['unit'];
  }): Promise<UserDocument> {
    const { phoneNumber, displayName, spot, unit } = data;

    let user: UserDocument;

    try {
      user = await this.findOne({ phoneNumber });

      user = await this.update(user._id, { displayName, spot, unit });
    } catch (error) {
      user = await new UserModel(pickBy({ displayName, phoneNumber })).save();

      this.userEventEmitter.emit('user-created', user);
    }

    const { _id } = user;

    await this.roleService.create({ user: _id, spot, unit });

    return user;
  }

  async update(
    userId: string,
    update: {
      displayName?: User['displayName'];
      phoneNumber?: User['phoneNumber'];
      status?: User['status'];
      spot?: Role['spot'];
      unit?: Role['unit'];
      _status?: DefaultDocument['_status'];
    },
  ): Promise<UserDocument> {
    const { displayName, phoneNumber, status, _status, unit, spot } = update;

    const user = await UserModel.findByIdAndUpdate(
      userId,
      { $set: pickBy({ displayName, phoneNumber, _status, status }) },
      { new: true, runValidators: true },
    );

    if (!user) throw new Error('User not found');

    this.userEventEmitter.emit('user-updated', user);

    const { _id } = user;

    if (unit && spot) await this.roleService.create({ user: _id, spot, unit });

    return user;
  }

  async findById(userId: string): Promise<UserDocument> {
    const user = await UserModel.findById(userId);

    if (!user) throw new Error('User not found');

    this.userEventEmitter.emit('user-fetched', user);

    return user;
  }

  async findOne(query: Query): Promise<UserDocument> {
    const user = await UserModel.findOne(query);

    if (!user) throw new Error('User not found');

    this.userEventEmitter.emit('user-fetched', user);

    return user;
  }

  async delete(userId: string): Promise<User> {
    const user = await UserModel.findByIdAndUpdate(
      userId,
      { $set: pickBy({ _status: 'deleted' }) },
      { new: true, runValidators: true },
    );

    if (!user) throw new Error('User not found');

    this.userEventEmitter.emit('user-deleted', user);

    return user;
  }

  async page(query: Query, pageOptions: PageOptions): Promise<PageResult<UserDocument>> {
    let pageResult: PageResult<UserDocument>;

    const { q, page, limit, populate } = pageOptions;

    if (q) {
      const docs = await UserModel.look(q, { query, populate, page, limit });

      pageResult = { docs, limit: docs.length, total: docs.length, sort: q, page: 1, pages: 1 };
    } else {
      pageResult = await UserModel.page(pickBy(query), pageOptions);
    }

    return pageResult;
  }
}

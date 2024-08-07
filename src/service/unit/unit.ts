import { injectable, inject } from 'inversify';
import { pickBy } from 'lodash';
import { PageOptions, PageResult, Query, DefaultDocument } from '../../plugin/types';
import { Unit, UnitModel, UnitDocument } from '../../model/unit/unit';
import { UnitEventEmitter } from '../../event/unit/unit';

@injectable()
export class UnitService {
  @inject(UnitEventEmitter)
  private unitEventEmitter: UnitEventEmitter;

  async create(data: {
    name: Unit['name'];
    uid?: Unit['uid'];
    code?: Unit['code'];
    parent?: Unit['parent'];
    type: Unit['type'];
  }): Promise<UnitDocument> {
    const unit = await new UnitModel(pickBy(data)).save();

    this.unitEventEmitter.emit('unit-created', unit);

    return unit;
  }

  async update(
    unitId: string,
    data: {
      name?: Unit['name'];
      uid?: Unit['uid'];
      code?: Unit['code'];
      parent?: Unit['parent'];
      type?: Unit['type'];
      state?: Unit['state'];
      _status?: DefaultDocument['_status'];
    },
  ): Promise<UnitDocument> {
    const unit = await UnitModel.findByIdAndUpdate(unitId, { $set: pickBy(data) }, { new: true, runValidators: true });

    if (!unit) throw new Error('Unit not found');

    this.unitEventEmitter.emit('unit-updated', unit);

    return unit;
  }

  async findById(unitId: string): Promise<UnitDocument> {
    const unit = await UnitModel.findById(unitId);

    if (!unit) throw new Error('Unit not found');

    this.unitEventEmitter.emit('unit-fetched', unit);

    return unit;
  }

  async findOne(query: Query): Promise<UnitDocument> {
    const unit = await UnitModel.findOne(query);

    if (!unit) throw new Error('Unit not found');

    this.unitEventEmitter.emit('unit-fetched', unit);

    return unit;
  }

  async delete(unitId: string): Promise<Unit> {
    const unit = await UnitModel.findByIdAndUpdate(
      unitId,
      { $set: { _status: 'deleted' } },
      { new: true, runValidators: true },
    );

    if (!unit) throw new Error('Unit not found');

    this.unitEventEmitter.emit('unit-deleted', unit);

    return unit;
  }

  async page(query: Query, pageOptions: PageOptions): Promise<PageResult<UnitDocument>> {
    let pageResult: PageResult<UnitDocument>;

    const { q, page, limit, populate } = pageOptions;

    if (q) {
      const docs = await UnitModel.look(q, { query, populate, page, limit });

      pageResult = { docs, limit: docs.length, total: docs.length, sort: q, page: 1, pages: 1 };
    } else {
      pageResult = await UnitModel.page(pickBy(query), pageOptions);
    }

    return pageResult;
  }
}

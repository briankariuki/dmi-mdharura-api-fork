import { injectable, inject } from 'inversify';
import { pickBy } from 'lodash';
import { PageOptions, PageResult, Query, DefaultDocument } from '../../plugin/types';
import { IncomingSms, IncomingSmsModel, IncomingSmsDocument } from '../../model/sms/incomingSms';
import { IncomingSmsEventEmitter } from '../../event/sms/incomingSms';

@injectable()
export class IncomingSmsService {
  @inject(IncomingSmsEventEmitter)
  private incomingSmsEventEmitter: IncomingSmsEventEmitter;

  async create(data: {
    linkId: IncomingSms['linkId'];
    text: IncomingSms['text'];
    to: IncomingSms['to'];
    id: IncomingSms['id'];
    date: IncomingSms['date'];
    from: IncomingSms['from'];
    cost: IncomingSms['cost'];
    networkCode: IncomingSms['networkCode'];
  }): Promise<IncomingSms> {
    const incomingSms = await new IncomingSmsModel(pickBy(data)).save();

    this.incomingSmsEventEmitter.emit('incomingSms-created', incomingSms);

    return incomingSms;
  }

  async update(
    incomingSmsId: string,
    data: {
      _status?: DefaultDocument['_status'];
    },
  ): Promise<IncomingSms> {
    const incomingSms = await IncomingSmsModel.findByIdAndUpdate(
      incomingSmsId,
      { $set: pickBy(data) },
      { new: true, runValidators: true },
    );

    if (!incomingSms) throw new Error('IncomingSms not found');

    this.incomingSmsEventEmitter.emit('incomingSms-updated', incomingSms);

    return incomingSms;
  }

  async findById(incomingSmsId: string): Promise<IncomingSmsDocument> {
    const incomingSms = await IncomingSmsModel.findById(incomingSmsId);

    if (!incomingSms) throw new Error('IncomingSms not found');

    this.incomingSmsEventEmitter.emit('incomingSms-fetched', incomingSms);

    return incomingSms;
  }

  async delete(incomingSmsId: string): Promise<IncomingSms> {
    const incomingSms = await IncomingSmsModel.findByIdAndUpdate(
      incomingSmsId,
      { $set: { _status: 'deleted' } },
      { new: true, runValidators: true },
    );

    if (!incomingSms) throw new Error('IncomingSms not found');

    this.incomingSmsEventEmitter.emit('incomingSms-deleted', incomingSms);

    return incomingSms;
  }

  async page(query: Query, pageOptions: PageOptions): Promise<PageResult<IncomingSmsDocument>> {
    let pageResult: PageResult<IncomingSmsDocument>;

    const { q, page, limit, populate } = pageOptions;

    if (q) {
      const docs = await IncomingSmsModel.look(q, { query, populate, page, limit });

      pageResult = { docs, limit: docs.length, total: docs.length, sort: q, page: 1, pages: 1 };
    } else {
      pageResult = await IncomingSmsModel.page(pickBy(query), pageOptions);
    }

    return pageResult;
  }
}

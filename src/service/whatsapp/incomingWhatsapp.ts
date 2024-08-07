import { injectable, inject } from 'inversify';
import { pickBy } from 'lodash';
import { PageOptions, PageResult, Query, DefaultDocument } from '../../plugin/types';
import {
  IncomingWhatsapp,
  IncomingWhatsappModel,
  IncomingWhatsappDocument,
} from '../../model/whatsapp/incomingWhatsapp';
import { IncomingWhatsappEventEmitter } from '../../event/whatsapp/incomingWhatsapp';

@injectable()
export class IncomingWhatsappService {
  @inject(IncomingWhatsappEventEmitter)
  private incomingWhatsappEventEmitter: IncomingWhatsappEventEmitter;

  async create(data: {
    smsMessageSid: IncomingWhatsapp['smsMessageSid'];
    numMedia: IncomingWhatsapp['numMedia'];
    profileName: IncomingWhatsapp['profileName'];
    smsSid: IncomingWhatsapp['smsSid'];
    waId: IncomingWhatsapp['waId'];
    smsStatus: IncomingWhatsapp['smsStatus'];
    body: IncomingWhatsapp['body'];
    to: IncomingWhatsapp['to'];
    numSegments: IncomingWhatsapp['numSegments'];
    referralNumMedia: IncomingWhatsapp['referralNumMedia'];
    messageSid: IncomingWhatsapp['messageSid'];
    accountSid: IncomingWhatsapp['accountSid'];
    from: IncomingWhatsapp['from'];
    apiVersion: IncomingWhatsapp['apiVersion'];
  }): Promise<IncomingWhatsapp> {
    const incomingWhatsapp = await new IncomingWhatsappModel(pickBy(data)).save();

    this.incomingWhatsappEventEmitter.emit('incomingWhatsapp-created', incomingWhatsapp);

    return incomingWhatsapp;
  }

  async update(
    incomingWhatsappId: string,
    data: {
      _status?: DefaultDocument['_status'];
    },
  ): Promise<IncomingWhatsapp> {
    const incomingWhatsapp = await IncomingWhatsappModel.findByIdAndUpdate(
      incomingWhatsappId,
      { $set: pickBy(data) },
      { new: true, runValidators: true },
    );

    if (!incomingWhatsapp) throw new Error('IncomingWhatsapp not found');

    this.incomingWhatsappEventEmitter.emit('incomingWhatsapp-updated', incomingWhatsapp);

    return incomingWhatsapp;
  }

  async findById(incomingWhatsappId: string): Promise<IncomingWhatsappDocument> {
    const incomingWhatsapp = await IncomingWhatsappModel.findById(incomingWhatsappId);

    if (!incomingWhatsapp) throw new Error('IncomingWhatsapp not found');

    this.incomingWhatsappEventEmitter.emit('incomingWhatsapp-fetched', incomingWhatsapp);

    return incomingWhatsapp;
  }

  async delete(incomingWhatsappId: string): Promise<IncomingWhatsapp> {
    const incomingWhatsapp = await IncomingWhatsappModel.findByIdAndUpdate(
      incomingWhatsappId,
      { $set: { _status: 'deleted' } },
      { new: true, runValidators: true },
    );

    if (!incomingWhatsapp) throw new Error('IncomingWhatsapp not found');

    this.incomingWhatsappEventEmitter.emit('incomingWhatsapp-deleted', incomingWhatsapp);

    return incomingWhatsapp;
  }

  async page(query: Query, pageOptions: PageOptions): Promise<PageResult<IncomingWhatsappDocument>> {
    let pageResult: PageResult<IncomingWhatsappDocument>;

    const { q, page, limit, populate } = pageOptions;

    if (q) {
      const docs = await IncomingWhatsappModel.look(q, { query, populate, page, limit });

      pageResult = { docs, limit: docs.length, total: docs.length, sort: q, page: 1, pages: 1 };
    } else {
      pageResult = await IncomingWhatsappModel.page(pickBy(query), pageOptions);
    }

    return pageResult;
  }
}

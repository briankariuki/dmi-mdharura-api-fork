import { Document, Schema, model } from 'mongoose';
import { PagedModel, SearchableModel } from '../../plugin/types';
import { defaultPlugin } from '../../plugin/default';

export interface IncomingSms {
  linkId: string;
  text: string;
  to: string;
  id: string;
  date: Date;
  from: string;
  cost: string;
  networkCode: string;
}

export type IncomingSmsDocument = Document & IncomingSms;

type IncomingSmsModel = PagedModel<IncomingSmsDocument> & SearchableModel<IncomingSmsDocument>;

const incomingSmsSchema = new Schema(
  {
    linkId: { type: String, required: true },
    text: { type: String },
    to: { type: String, required: true },
    id: { type: String, required: true },
    date: { type: Date, required: true },
    from: { type: String, required: true },
    cost: { type: String },
    networkCode: { type: String },
  },
  { timestamps: true },
);

incomingSmsSchema.plugin(defaultPlugin);

export const IncomingSmsModel = model<IncomingSmsDocument, IncomingSmsModel>('IncomingSms', incomingSmsSchema);

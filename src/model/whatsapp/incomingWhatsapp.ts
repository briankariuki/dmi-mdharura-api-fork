import { Document, Schema, model } from 'mongoose';
import { PagedModel, SearchableModel } from '../../plugin/types';
import { defaultPlugin } from '../../plugin/default';

export interface IncomingWhatsapp {
  smsMessageSid: string;
  numMedia: string;
  profileName: string;
  smsSid: string;
  waId: string;
  smsStatus: string;
  body: string;
  to: string;
  numSegments: string;
  referralNumMedia: string;
  messageSid: string;
  accountSid: string;
  from: string;
  apiVersion: string;
}

export type IncomingWhatsappDocument = Document & IncomingWhatsapp;

type IncomingWhatsappModel = PagedModel<IncomingWhatsappDocument> & SearchableModel<IncomingWhatsappDocument>;

const incomingWhatsappSchema = new Schema(
  {
    smsMessageSid: { type: String, required: true },
    numMedia: { type: String },
    profileName: { type: String },
    smsSId: { type: String },
    waId: { type: String },
    smsStatus: { type: String },
    body: { type: String },
    to: { type: String, required: true },
    numSegments: { type: String },
    referralNumMedia: { type: String },
    from: { type: String, required: true },
    messageSid: { type: String },
    accountSid: { type: String },
    apiVersion: { type: String },
  },
  { timestamps: true },
);

incomingWhatsappSchema.plugin(defaultPlugin);

export const IncomingWhatsappModel = model<IncomingWhatsappDocument, IncomingWhatsappModel>(
  'IncomingWhatsapp',
  incomingWhatsappSchema,
);

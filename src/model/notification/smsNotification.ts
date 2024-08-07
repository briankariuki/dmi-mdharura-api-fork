import { Document, Schema, model } from 'mongoose';
import { PagedModel, SearchableModel } from '../../plugin/types';
import { defaultPlugin } from '../../plugin/default';

export type Purpose = 'login' | 'register' | 'password-change';

export interface SmsNotification {
  to: string;
  purpose: Purpose;
  message: string;
  meta?: string;
  status: 'sending' | 'success' | 'failed';
}

export type SmsNotificationDocument = Document & SmsNotification;

type SmsNotificationModel = PagedModel<SmsNotificationDocument> & SearchableModel<SmsNotificationDocument>;

const smsNotificationSchema = new Schema(
  {
    to: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      required: true,
      enum: ['login', 'register', 'password-change'],
    },
    message: {
      type: String,
      required: true,
    },
    meta: {
      type: String,
    },
    status: {
      type: String,
      default: 'sending',
      enum: ['sending', 'success', 'failed'],
    },
  },
  { timestamps: true },
);

smsNotificationSchema.plugin(defaultPlugin);

export const SmsNotificationModel = model<SmsNotificationDocument, SmsNotificationModel>(
  'SmsNotification',
  smsNotificationSchema,
);

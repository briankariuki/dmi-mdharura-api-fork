import { Document, Schema, model } from 'mongoose';
import { PagedModel, SearchableModel } from '../../plugin/types';
import { defaultPlugin } from '../../plugin/default';

export interface Notification {
  unit: string;
  user: string;
  refId: string;
  type: 'task';
  message: string;
  status: 'pending' | 'sent' | 'read';
}

export type NotificationDocument = Document & Notification;

type NotificationModel = PagedModel<NotificationDocument> & SearchableModel<NotificationDocument>;

const notificationSchema = new Schema(
  {
    unit: {
      type: Schema.Types.ObjectId,
      ref: 'Unit',
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    refId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    type: {
      type: String,
      default: 'task',
      enum: ['task'],
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      default: 'pending',
      enum: ['pending', 'sent', 'read'],
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

notificationSchema.plugin(defaultPlugin);

export const NotificationModel = model<NotificationDocument, NotificationModel>('Notification', notificationSchema);

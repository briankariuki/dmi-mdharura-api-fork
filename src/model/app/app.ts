import { Schema, model } from 'mongoose';
import { PagedModel, SearchableModel, DefaultDocument } from '../../plugin/types';
import { defaultPlugin, initSearch } from '../../plugin/default';
import { UserModel } from '../user/user';
import { APP_SYNC } from '../../config/app';

export type App = {
  user?: string;
  id: string;
  name: string;
  packageName: string;
  version: string;
  buildNumber: string;
  token?: string;
  url?: string;
  method?: string;
  type?: 'other' | 'analytics';
  units?: string[];
  suggestions?: string[];
};

export type AppDocument = DefaultDocument & App & { addFields(): Promise<void> };

const appSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      es_indexed: false,
    },
    id: {
      type: String,
      es_indexed: false,
    },
    name: {
      type: String,
      es_indexed: false,
    },
    packageName: {
      type: String,
      es_indexed: false,
    },
    version: {
      type: String,
      es_indexed: false,
    },
    buildNumber: {
      type: String,
      es_indexed: false,
    },
    token: {
      type: String,
      es_indexed: false,
    },
    url: {
      type: String,
      es_indexed: false,
      lowercase: true,
    },
    method: {
      type: String,
      es_indexed: false,
      uppercase: true,
    },
    type: {
      type: String,
      default: 'other',
      enum: ['other', 'analytics'],
    },
    units: {
      type: [Schema.Types.ObjectId],
    },
    suggestions: {
      type: [String],
      es_indexed: true,
      es_type: 'completion',
    },
  },
  { timestamps: true },
);

appSchema.plugin(defaultPlugin, { searchable: true });

async function addFields(): Promise<void> {
  const doc = this as AppDocument;

  if (doc.url && doc.url.match('/analytics?')) doc.type = 'analytics';
  else doc.type = 'other';

  if (APP_SYNC === 'enabled' && doc.user)
    doc.units = (await (await UserModel.findById(doc.user)).roles('active')).map((role) => role.unit);

  await doc.save();
}

appSchema.methods = { ...appSchema.methods, ...{ addFields } };

export const AppModel = model<AppDocument, PagedModel<AppDocument> & SearchableModel<AppDocument>>('App', appSchema);

initSearch(AppModel);

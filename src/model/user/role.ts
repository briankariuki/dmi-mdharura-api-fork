import { Schema, model } from 'mongoose';
import { PagedModel, SearchableModel, DefaultDocument } from '../../plugin/types';
import { defaultPlugin, initSearch } from '../../plugin/default';
import { UnitModel } from '../unit/unit';

export type Role = {
  user: string;
  unit: string;
  units?: string[];
  dateLastReported?: { test: Date; live: Date };
  dateLastVerified?: { test: Date; live: Date };
  spot:
    | 'HEBS'
    | 'LEBS'
    | 'CEBS'
    | 'EBS'
    | 'AHA'
    | 'CHA'
    | 'CHV'
    | 'VEBS'
    | 'VET'
    | 'SFP'
    | 'HCW'
    | 'PMEBS'
    | 'PEBS/MEBS'
    | 'CDR'
    | 'VIEWER';
  status: 'active' | 'blocked';
};

export type RoleDocument = DefaultDocument &
  Role & {
    addFields(): Promise<void>;
  };

const roleSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    unit: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Unit',
    },
    units: {
      type: [Schema.Types.ObjectId],
    },
    spot: {
      type: String,
      required: true,
      enum: [
        'HEBS',
        'LEBS',
        'CEBS',
        'EBS',
        'AHA',
        'CHA',
        'CHV',
        'VEBS',
        'VET',
        'SFP',
        'HCW',
        'PMEBS',
        'PEBS/MEBS',
        'CDR',
        'VIEWER',
      ],
    },
    dateLastReported: new Schema({ test: Date, live: Date }, { timestamps: true }),
    dateLastVerified: new Schema({ test: Date, live: Date }, { timestamps: true }),
    status: {
      type: String,
      default: 'active',
      enum: ['active', 'blocked'],
    },
    suggestions: {
      type: [String],
      es_indexed: true,
      es_type: 'completion',
    },
  },
  { timestamps: true },
);

roleSchema.plugin(defaultPlugin, { searchable: true });

roleSchema.index({ user: 1, unit: 1, spot: 1 }, { unique: true });

async function addFields(): Promise<void> {
  const doc = this as RoleDocument;

  const unit = await UnitModel.findById(doc.unit);

  const units = await unit.parents();

  doc.units = [unit._id, ...units.map((_unit) => _unit._id)];

  if (doc.spot === 'PMEBS') doc.spot = 'PEBS/MEBS';

  await doc.save();
}

roleSchema.methods = { ...roleSchema.methods, ...{ addFields } };

export const RoleModel = model<RoleDocument, PagedModel<RoleDocument> & SearchableModel<RoleDocument>>(
  'Role',
  roleSchema,
);

initSearch(RoleModel);

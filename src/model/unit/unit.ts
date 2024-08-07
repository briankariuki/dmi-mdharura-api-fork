import { Schema, model } from 'mongoose';
import { PagedModel, SearchableModel, DefaultDocument } from '../../plugin/types';
import { defaultPlugin, initSearch } from '../../plugin/default';

export type Unit = {
  name: string;
  uid?: string;
  code?: string;
  parent?: string;
  dateLastReported?: { test: Date; live: Date };
  state?: 'test' | 'live';
  units?: string[];
  type:
    | 'Country'
    | 'County'
    | 'Subcounty'
    | 'Ward'
    | 'Health facility'
    | 'Learning institution'
    | 'Community unit'
    | 'Veterinary facility';
  suggestions?: string[];
};

export type UnitDocument = DefaultDocument &
  Unit & {
    addFields(): Promise<void>;
    children(): Promise<UnitDocument[]>;
    parents(): Promise<UnitDocument[]>;
    removable(): Promise<UnitDocument[]>;
  };

const unitSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      es_indexed: true,
    },
    parent: {
      type: Schema.Types.ObjectId,
      ref: 'Unit',
    },
    units: {
      type: [Schema.Types.ObjectId],
    },
    type: {
      type: String,
      required: true,
      enum: [
        'Country',
        'County',
        'Subcounty',
        'Ward',
        'Health facility',
        'Learning institution',
        'Community unit',
        'Veterinary facility',
      ],
    },
    uid: {
      type: String,
      sparse: true,
      unique: true,
    },
    code: {
      type: String,
      sparse: true,
      unique: true,
    },
    state: {
      type: String,
      default: 'test',
      enum: ['test', 'live'],
    },
    dateLastReported: new Schema({ test: Date, live: Date }, { timestamps: true }),
    suggestions: {
      type: [String],
      es_indexed: true,
      es_type: 'completion',
    },
  },
  { timestamps: true },
);

unitSchema.plugin(defaultPlugin, { searchable: true });

unitSchema.index({ parent: 1 });
unitSchema.index({ state: 1 });
unitSchema.index({ type: 1 });
unitSchema.index({ units: 1 });

async function addFields(): Promise<void> {
  const doc = this as UnitDocument;

  doc.suggestions = doc.name.split(' ');

  const units = await doc.parents();

  doc.units = [doc._id, ...units.map((_unit) => _unit._id)];

  await doc.save();
}

async function children(): Promise<UnitDocument[]> {
  const { _id: parent } = this as UnitDocument;

  let children: UnitDocument[] = [];

  const _children: UnitDocument[] = await UnitModel.find({ parent });

  children = [...children, ..._children];

  for (const _child of _children) {
    const _childChildren = await _child.children();

    children = [...children, ..._childChildren];
  }

  return children;
}

async function parents(): Promise<UnitDocument[]> {
  let { parent: unitId } = this as UnitDocument;

  const parents: UnitDocument[] = [];

  while (unitId) {
    const unit = await UnitModel.findById(unitId);

    if (unit) {
      parents.push(unit);
      unitId = unit.parent;
    } else break;
  }

  return parents;
}

unitSchema.methods = { ...unitSchema.methods, ...{ addFields, children, parents } };

export const UnitModel = model<UnitDocument, PagedModel<UnitDocument> & SearchableModel<UnitDocument>>(
  'Unit',
  unitSchema,
);

initSearch(UnitModel);

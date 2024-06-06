import { Schema, model } from 'mongoose';
import { PagedModel, SearchableModel, DefaultDocument } from '../../plugin/types';
import { defaultPlugin, initSearch } from '../../plugin/default';

// db.units.updateOne({_id: ObjectId("65f71e457bd3168576951e4e")}, {$set: {"_id": ObjectId("611a3f0e2313d40efdedbf0d"),  "units": ["65f71dab216ede855d3f4323", "65f71b7c4028a945336a913d", "60ac8ca65ff3fb154fbab932", "60ac8ca55ff3fb154fbab8cf"], "parent": ObjectId("65f71b7c4028a945336a913d"), "state": "live"}})

// db.units.updateOne({_id: ObjectId("611a3f0e2313d40efdedbf5d")}, {$set: {"units": [ObjectId("611a3f0e2313d40efdedbf5d"), ObjectId("60ac8cac5ff3fb154fbabe65"), ObjectId("60ac8ca65ff3fb154fbab932"), ObjectId("60ac8ca55ff3fb154fbab8cf")], "parent": ObjectId("60ac8cac5ff3fb154fbabe65"), "state": "live"}})

// db.units.updateOne({_id: ObjectId("611a3f0e2313d40efdedbf62")}, {$set: {"units": [ObjectId("611a3f0e2313d40efdedbf62"), ObjectId("65f71b7c4028a945336a913d"), ObjectId("60ac8ca65ff3fb154fbab932"), ObjectId("60ac8ca55ff3fb154fbab8cf")], "parent": ObjectId("65f71b7c4028a945336a913d"), "state": "live"}})

// "units": [
//   "60ac8caa5ff3fb154fbabc53",
//   "60ac8ca65ff3fb154fbab932",
//   "60ac8ca55ff3fb154fbab8cf"
// ],
// "state": "live",
// "suggestions": [
//   "Bunyala",
//   "Sub",
//   "County"
// ],
// "_status": "active",
// "_id": "60ac8caa5ff3fb154fbabc53",
// "name": "Bunyala Sub County",
// "type": "Subcounty",
// "code": "KE_SubCounty_2973",
// "parent": "60ac8ca65ff3fb154fbab932",
// "createdAt": "2021-05-25T05:35:38.064Z",
// "updatedAt": "2022-04-30T08:29:47.509Z",
// "__v": 10,
// "uid": "zI6vnsXresW"

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

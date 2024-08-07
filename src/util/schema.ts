import { Schema } from 'mongoose';

export const pointSchema = new Schema(
  {
    type: {
      type: String,
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      index: '2dsphere',
      validate: {
        validator: function (array: number[]): boolean {
          return array && array.length === 2;
        },
        message: '{VALUE} must contain only 2 values',
        isAsync: false,
      },
    },
    accuracy: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
  },
  { _id: false, timestamps: false },
);

const _fileSchema = new Schema(
  {
    ext: { type: String },
    mime: { type: String },
    type: { type: String, enum: ['image', 'video'] },
    thumbnail: { type: String },
    filename: { type: String },
    size: { type: Number },
    dimensions: {
      type: new Schema(
        {
          height: { type: Number, required: true },
          width: { type: Number, required: true },
          orientation: { type: Number, required: true },
        },
        { _id: false },
      ),
    },
  },
  { timestamps: false, _id: false, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

export const fileSchema = _fileSchema;

import { Schema, model } from 'mongoose';
import { PagedModel, SearchableModel, DefaultDocument } from '../../plugin/types';
import { defaultPlugin, initSearch } from '../../plugin/default';
import { File } from '../../types/file';
import { fileSchema } from '../../util/schema';

export type Post = {
  user: string;
  unit: string;
  title: string;
  message: string;
  file: File;
  suggestions?: string[];
};

export type PostDocument = DefaultDocument &
  Post & {
    addFields(): Promise<void>;
  };

const postSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    unit: { type: Schema.Types.ObjectId, required: true, ref: 'Unit' },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    file: {
      type: fileSchema,
      required: true,
      es_indexed: false,
    },
    suggestions: {
      type: [String],
      es_indexed: true,
      es_type: 'completion',
    },
  },
  { timestamps: true },
);

postSchema.plugin(defaultPlugin, { searchable: true });

async function addFields(): Promise<void> {
  const doc = this as PostDocument;

  doc.suggestions = [...doc.message.split(' ')];

  await doc.save();
}

postSchema.methods = { ...postSchema.methods, ...{ addFields } };

export const PostModel = model<PostDocument, PagedModel<PostDocument> & SearchableModel<PostDocument>>(
  'Post',
  postSchema,
);

initSearch(PostModel);

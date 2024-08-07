import { PostModel } from './../post/post';
import { Schema, model } from 'mongoose';
import { PagedModel, SearchableModel, DefaultDocument } from '../../plugin/types';
import { defaultPlugin, initSearch } from '../../plugin/default';

export type Tag = {
  text?: string;
  posts: number;
  suggestions?: string[];
};

export type TagDocument = DefaultDocument &
  Tag & {
    addFields(): Promise<void>;
  };

const tagSchema = new Schema(
  {
    text: {
      type: String,
      lowercase: true,
      unique: true,
      required: true,
      es_indexed: true,
    },
    posts: {
      type: Number,
      default: 0,
    },
    suggestions: {
      type: [String],
      es_indexed: true,
      es_type: 'completion',
    },
  },
  { timestamps: true },
);

tagSchema.plugin(defaultPlugin, { searchable: true });

async function addFields(): Promise<void> {
  const doc = this as TagDocument;

  const { text } = doc;

  doc.posts = await PostModel.countDocuments({ suggestions: text, type: 'post' });

  doc.suggestions = doc.text.split(' ');

  await doc.save();
}

tagSchema.methods.addFields = addFields;

export const TagModel = model<TagDocument, PagedModel<TagDocument> & SearchableModel<TagDocument>>('Tag', tagSchema);

initSearch(TagModel);

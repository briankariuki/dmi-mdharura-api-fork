import { injectable, inject } from 'inversify';
import { pickBy } from 'lodash';
import { PageOptions, PageResult, Query, DefaultDocument } from '../../plugin/types';
import { Tag, TagModel, TagDocument } from '../../model/tag/tag';
import { TagEventEmitter } from '../../event/tag/tag';

@injectable()
export class TagService {
  @inject(TagEventEmitter)
  private tagEventEmitter: TagEventEmitter;

  async create(data: { text: Tag['text'] }): Promise<Tag> {
    const tag = await new TagModel(pickBy(data)).save();

    this.tagEventEmitter.emit('tag-created', tag);

    return tag;
  }

  async update(
    tagId: string,
    data: {
      text?: Tag['text'];
      _status?: DefaultDocument['_status'];
    },
  ): Promise<Tag> {
    const tag = await TagModel.findByIdAndUpdate(tagId, { $set: pickBy(data) }, { new: true, runValidators: true });

    if (!tag) throw new Error('Tag not found');

    this.tagEventEmitter.emit('tag-updated', tag);

    return tag;
  }

  async findById(tagId: string): Promise<TagDocument> {
    const tag = await TagModel.findById(tagId);

    if (!tag) throw new Error('Tag not found');

    this.tagEventEmitter.emit('tag-fetched', tag);

    return tag;
  }

  async delete(tagId: string): Promise<Tag> {
    const tag = await TagModel.findByIdAndUpdate(
      tagId,
      { $set: { _status: 'deleted' } },
      { new: true, runValidators: true },
    );

    if (!tag) throw new Error('Tag not found');

    this.tagEventEmitter.emit('tag-deleted', tag);

    return tag;
  }

  async page(query: Query, pageOptions: PageOptions): Promise<PageResult<TagDocument>> {
    let pageResult: PageResult<TagDocument>;

    const { q, page, limit, populate } = pageOptions;

    if (q) {
      const docs = await TagModel.look(q, { query, populate, page, limit });

      pageResult = { docs, limit: docs.length, total: docs.length, sort: q, page: 1, pages: 1 };
    } else {
      pageResult = await TagModel.page(pickBy(query), pageOptions);
    }

    return pageResult;
  }
}

import { injectable, inject } from 'inversify';
import { pickBy } from 'lodash';
import { PageOptions, PageResult, Query, DefaultDocument } from '../../plugin/types';
import { Post, PostModel, PostDocument } from '../../model/post/post';
import { PostEventEmitter } from '../../event/post/post';

@injectable()
export class PostService {
  @inject(PostEventEmitter)
  private postEventEmitter: PostEventEmitter;

  async create(data: {
    unit: Post['unit'];
    user: Post['user'];
    title: Post['title'];
    message: Post['message'];
    file: Post['file'];
  }): Promise<Post> {
    const post = await new PostModel(pickBy(data)).save();

    this.postEventEmitter.emit('post-created', post);

    await post.populate([{ path: 'user', populate: [{ path: 'unit' }] }, { path: 'unit' }]).execPopulate();

    return post;
  }

  async update(
    postId: string,
    data: {
      message?: Post['message'];
      title?: Post['title'];
      _status?: DefaultDocument['_status'];
    },
  ): Promise<Post> {
    const post = await PostModel.findByIdAndUpdate(postId, { $set: pickBy(data) }, { new: true, runValidators: true });

    if (!post) throw new Error('Post not found');

    this.postEventEmitter.emit('post-updated', post);

    await post.populate([{ path: 'user', populate: [{ path: 'unit' }] }, { path: 'unit' }]).execPopulate();

    return post;
  }

  async findById(postId: string): Promise<PostDocument> {
    const post = await PostModel.findById(postId);

    if (!post) throw new Error('Post not found');

    this.postEventEmitter.emit('post-fetched', post);

    await post.populate([{ path: 'user', populate: [{ path: 'unit' }] }, { path: 'unit' }]).execPopulate();

    return post;
  }

  async delete(postId: string): Promise<Post> {
    const post = await PostModel.findByIdAndUpdate(
      postId,
      { $set: { _status: 'deleted' } },
      { new: true, runValidators: true },
    );

    if (!post) throw new Error('Post not found');

    this.postEventEmitter.emit('post-deleted', post);

    await post.populate([{ path: 'user', populate: [{ path: 'unit' }] }, { path: 'unit' }]).execPopulate();

    return post;
  }

  async page(query: Query, pageOptions: PageOptions): Promise<PageResult<PostDocument>> {
    let pageResult: PageResult<PostDocument>;

    const { q, page, limit, populate } = pageOptions;

    if (q) {
      const docs = await PostModel.look(q, { query, populate, page, limit });

      pageResult = { docs, limit: docs.length, total: docs.length, sort: q, page: 1, pages: 1 };
    } else {
      pageResult = await PostModel.page(pickBy(query), pageOptions);
    }

    return pageResult;
  }
}

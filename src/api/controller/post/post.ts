import { BaseHttpController, controller, httpPost, httpPut, httpGet, httpDelete } from 'inversify-express-utils';
import { inject } from 'inversify';
import { celebrate, Joi } from 'celebrate';
import { PostService } from '../../../service/post/post';
import { Query } from '../../../plugin/types';
import { FILE_PATH } from '../../../config/multer';
import { upload, UploadMiddleware } from '../../middleware/upload';
import { fileJoi } from '../../../util/joi';
import { Auth0Middleware } from '../../middleware/auth';

@controller('/v1/post', Auth0Middleware)
export class PostController extends BaseHttpController {
  @inject(PostService)
  private postService: PostService;

  @httpPost(
    '/:unitId',
    upload({ filePath: FILE_PATH }),
    UploadMiddleware,
    celebrate({
      body: Joi.object({
        title: Joi.string().required(),
        message: Joi.string().required(),
        file: fileJoi.required(),
      }),
    }),
  )
  async create(): Promise<void> {
    const {
      request: {
        body: { title, message, file },
        params: { unitId: unit },
      },
      user: { details: user },
    } = this.httpContext;

    const post = await this.postService.create({
      unit,
      user,
      title,
      message,
      file,
    });

    this.httpContext.response.json({ post });
  }

  @httpPut(
    '/:postId',
    celebrate({
      body: Joi.object({
        title: Joi.string(),
        message: Joi.string(),
        _status: Joi.string(),
      }),
    }),
  )
  async update(): Promise<void> {
    const {
      request: {
        body: { title, message, _status },
        params: { postId },
      },
    } = this.httpContext;

    const post = await this.postService.update(postId, {
      title,
      message,
      _status,
    });

    this.httpContext.response.json({ post });
  }

  @httpGet(
    '/',
    celebrate({
      query: Joi.object({
        postId: Joi.string(),
        q: Joi.string(),
        userId: Joi.string(),
        unitId: Joi.string(),
        sort: Joi.string(),
        page: Joi.number(),
        key: Joi.string(),
        limit: Joi.number(),
        _status: Joi.string(),
      }),
    }),
  )
  async retrieve(): Promise<void> {
    const { postId } = this.httpContext.request.query as {
      postId: string;
    };

    if (postId) {
      const post = await this.postService.findById(postId);

      this.httpContext.response.json({ post });

      return;
    }

    const { sort, page, limit, q, _status, userId: user, key, unitId: unit } = (this.httpContext.request
      .query as unknown) as Record<string, any>;

    let query: Query = {};

    if (_status) query = { ...query, ...{ _status } };

    if (user) query = { ...query, ...{ user } };

    if (unit) query = { ...query, ...{ unit } };

    const postPage = await this.postService.page(query, {
      q,
      sort,
      page,
      limit,
      key,
      populate: [{ path: 'user', populate: [{ path: 'unit' }] }, { path: 'unit' }],
    });

    this.httpContext.response.json({ postPage });
  }

  @httpDelete(
    '/',
    Auth0Middleware,
    celebrate({
      query: Joi.object({
        postId: Joi.string(),
      }),
    }),
  )
  async remove(): Promise<void> {
    const { postId } = this.httpContext.request.query as {
      postId: string;
    };

    const post = await this.postService.delete(postId);

    this.httpContext.response.json({ post });
  }
}

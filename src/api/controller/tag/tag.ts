import { BaseHttpController, controller, httpPost, httpPut, httpGet, httpDelete } from 'inversify-express-utils';
import { inject } from 'inversify';
import { celebrate, Joi } from 'celebrate';
import { TagService } from '../../../service/tag/tag';
import { Query, QueryParams } from '../../../plugin/types';
import { PermitAdminMiddleware } from '../../middleware/permission';
import { Auth0Middleware } from '../../middleware/auth';

@controller('/v1/tag', Auth0Middleware)
export class TagController extends BaseHttpController {
  @inject(TagService)
  private tagService: TagService;

  @httpPost(
    '/',
    Auth0Middleware,
    PermitAdminMiddleware,
    celebrate({
      body: Joi.object({
        text: Joi.string().required(),
      }),
    }),
  )
  async create(): Promise<void> {
    const {
      request: {
        body: { text },
      },
    } = this.httpContext;

    const tag = await this.tagService.create({
      text,
    });

    this.httpContext.response.json({ tag });
  }

  @httpPut(
    '/',
    Auth0Middleware,
    PermitAdminMiddleware,
    celebrate({
      body: Joi.object({
        tagId: Joi.string().required(),
        text: Joi.string(),
        _status: Joi.string(),
      }),
    }),
  )
  async update(): Promise<void> {
    const { tagId, text, _status } = this.httpContext.request.body;

    const tag = await this.tagService.update(tagId, {
      text,
      _status,
    });

    this.httpContext.response.json({ tag });
  }

  @httpGet(
    '/',
    celebrate({
      query: Joi.object({
        tagId: Joi.string().allow('', null),
        q: Joi.string().allow('', null),
        sort: Joi.string(),
        page: Joi.number(),
        limit: Joi.number(),
        _status: Joi.string().allow('', null),
      }),
    }),
  )
  async retrieve(): Promise<void> {
    const { tagId } = this.httpContext.request.query as {
      tagId: string;
    };

    if (tagId) {
      const tag = await this.tagService.findById(tagId);

      this.httpContext.response.json({ tag });

      return;
    }

    const { sort, page, limit, q, _status } = (this.httpContext.request.query as unknown) as QueryParams;

    let query: Query = {};

    if (_status) query = { ...query, ...{ _status } };

    const tagPage = await this.tagService.page(query, {
      q,
      sort,
      page,
      limit,
    });

    this.httpContext.response.json({ tagPage });
  }

  @httpDelete(
    '/',
    celebrate({
      query: Joi.object({
        tagId: Joi.string(),
      }),
    }),
  )
  async remove(): Promise<void> {
    const { tagId } = this.httpContext.request.query as {
      tagId: string;
    };

    const tag = await this.tagService.delete(tagId);

    this.httpContext.response.json({ tag });
  }
}

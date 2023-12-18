import { RoleService } from '../../../service/user/role';
import { inject } from 'inversify';
import { celebrate, Joi } from 'celebrate';
import { httpPut, controller, BaseHttpController, httpGet, httpDelete } from 'inversify-express-utils';
import { Query } from '../../../plugin/types';
import { PermitAdminMiddleware } from '../../middleware/permission';
import { UserService } from '../../../service/user/user';
import { Auth0Middleware } from '../../middleware/auth';

@controller('/v1/role', Auth0Middleware)
export class RoleController extends BaseHttpController {
  @inject(RoleService)
  private roleService: RoleService;

  @inject(UserService)
  private userService: UserService;

  @httpPut(
    '/:roleId',
    celebrate({
      body: Joi.object({
        spot: Joi.string(),
        status: Joi.string(),
        _status: Joi.string(),
      }),
    }),
  )
  async update(): Promise<void> {
    const {
      request: {
        body: { _status, spot, status },
        params: { roleId },
      },
      response,
      user: { details: _userId },
    } = this.httpContext;

    let role = await this.roleService.findById(roleId);

    await (await this.userService.findById(_userId)).can({ access: 'manage-unit', resource: role.unit });

    if (spot) {
      try {
        role = await this.roleService.findOne({
          _id: { $nin: role._id },
          user: role.populated('user') || role.user,
          unit: role.populated('unit') || role.unit,
          spot,
        });

        role = await this.roleService.delete(role._id);
      } catch (e) {}
    }

    role = await this.roleService.update(roleId, { spot, _status, status });

    response.json({ role });
  }

  @httpGet(
    '/',
    celebrate({
      query: Joi.object({
        roleId: Joi.string(),
        q: Joi.string(),
        userId: Joi.string(),
        unitId: Joi.string(),
        role: Joi.string(),
        spot: Joi.string(),
        _status: Joi.string(),
        status: Joi.string(),
        page: Joi.number(),
        limit: Joi.number(),
        dateStart: Joi.date().iso(),
        dateEnd: Joi.date().iso(),
      }),
    }),
  )
  async retrieve(): Promise<void> {
    const { roleId, sort, page, limit, q, spot, _status, unitId: unit, userId: user, status, dateStart, dateEnd } = this
      .httpContext.request.query as any;

    if (roleId) {
      const role = await this.roleService.findById(roleId);

      this.httpContext.response.json({ role });

      return;
    }

    let query: Query = {};

    if (spot) query = { ...query, ...{ spot } };

    if (unit) {
      const {
        user: { details: _userId },
      } = this.httpContext;

      await (await this.userService.findById(_userId)).can({ access: 'manage-unit', resource: unit });

      query = { ...query, ...{ unit } };
    }

    if (user) query = { ...query, ...{ user } };

    if (_status) query = { ...query, ...{ _status } };

    if (status) query = { ...query, ...{ status } };

    if (dateStart && dateEnd)
      query = {
        ...query,
        ...{
          createdAt: {
            $gt: dateStart,
            $lte: dateEnd,
          },
        },
      };
    else if (dateStart)
      query = {
        ...query,
        ...{
          createdAt: {
            $gt: dateStart,
          },
        },
      };
    else if (dateEnd)
      query = {
        ...query,
        ...{
          createdAt: {
            $lte: dateEnd,
          },
        },
      };

    const rolePage = await this.roleService.page(query, {
      sort,
      page,
      limit,
      q,
      populate: [{ path: 'user' }, { path: 'unit' }],
    });

    this.httpContext.response.json({ rolePage });
  }

  @httpDelete(
    '/:roleId',
    PermitAdminMiddleware,
    celebrate({
      query: Joi.object().empty(),
    }),
  )
  async remove(): Promise<void> {
    const {
      user: { details: _userId },
    } = this.httpContext;

    const { roleId } = this.httpContext.request.params;

    let role = await this.roleService.findById(roleId);

    await (await this.userService.findById(_userId)).can({ access: 'manage-unit', resource: role.unit });

    role = await this.roleService.delete(roleId);

    this.httpContext.response.json({ role });
  }
}

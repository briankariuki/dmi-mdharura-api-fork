import { controller, httpGet, BaseHttpController } from 'inversify-express-utils';
import { resolve } from 'path';
import { FILE_PATH } from '../../../config/multer';
import { celebrate, Joi } from 'celebrate';

@controller('/v1/file')
export class FileController extends BaseHttpController {
  @httpGet(
    '/:filename',
    celebrate({
      query: Joi.object().empty(),
      body: Joi.object().empty(),
    }),
  )
  async get(): Promise<void> {
    const {
      request: {
        params: { filename },
      },
      response,
    } = this.httpContext;

    await new Promise(() => {
      response.sendFile(`${resolve(FILE_PATH)}/${filename}`);
    });
  }
}

import { EventEmitter } from 'events';
import { inject, injectable } from 'inversify';
import { logger } from '../../loader/logger';
import { PostDocument } from '../../model/post/post';
import { UserModel } from '../../model/user/user';
import { NotificationService } from '../../service/notification/notification';

type PostEvent = 'post-created' | 'post-updated' | 'post-fetched' | 'post-deleted';

export interface PostEventEmitter {
  on(event: PostEvent, listener: (post: PostDocument) => void): this;
  emit(event: PostEvent, post: PostDocument): boolean;
}

@injectable()
export class PostEventEmitter extends EventEmitter {
  @inject(NotificationService)
  notificationService: NotificationService;

  constructor() {
    super();

    this.on('post-created', async (post) => {
      try {
        logger.info('post-created %o', post._id);
        await post.addFields();

        await (await UserModel.findById(post.populated('user') || post.user)).addFields();
      } catch (error) {
        logger.error('post-created %o', (error as Error).message);
      }
    });

    this.on('post-updated', async (post) => {
      try {
        logger.info('post-updated %o', post._id);
        await post.addFields();

        await (await UserModel.findById(post.populated('user') || post.user)).addFields();
      } catch (error) {
        logger.error('post-updated %o', (error as Error).message);
      }
    });

    this.on('post-fetched', async (post) => {
      try {
        logger.info('post-fetched %o', post._id);
        await post.addFields();

        await (await UserModel.findById(post.populated('user') || post.user)).addFields();
      } catch (error) {
        logger.error('post-fetched %o', (error as Error).message);
      }
    });

    this.on('post-deleted', async (post) => {
      try {
        logger.info('post-deleted %o', post._id);

        await (await UserModel.findById(post.populated('user') || post.user)).addFields();

        const notifications = await this.notificationService.findMany({
          post: post._id,
        });

        for (const notification of notifications)
          try {
            await this.notificationService.delete(notification._id);
          } catch (error) {}
      } catch (error) {
        logger.error('post-deleted %o', (error as Error).message);
      }
    });
  }
}

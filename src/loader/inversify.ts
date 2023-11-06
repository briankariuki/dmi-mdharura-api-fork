import { AppEventEmitter } from './../event/app/app';
import { Container } from 'inversify';
import { UserService } from '../service/user/user';
import { AccessControlService, AccessInfoService } from '../service/access/access';
import { Auth0Middleware } from '../api/middleware/auth';
import { UserEventEmitter } from '../event/user/user';
import { PermitAdminMiddleware } from '../api/middleware/permission';
import { UploadMiddleware } from '../api/middleware/upload';
import { SmsService } from '../service/sms/sms';
import { SmsNotificationEventEmitter } from '../event/notification/smsNotification';
import { PostService } from '../service/post/post';
import { PostEventEmitter } from '../event/post/post';
import { EmailNotificationEventEmitter } from '../event/notification/emailNotification';
import { EmailService } from '../service/email/email';
import { TagEventEmitter } from '../event/tag/tag';
import { TagService } from '../service/tag/tag';
import { NotificationEventEmitter } from '../event/notification/notification';
import { NotificationService } from '../service/notification/notification';
import { RequestEventEmitter } from '../event/request/request';
import { AppService } from '../service/app/app';
import { RequestService } from '../service/request/request';
import { UnitEventEmitter } from '../event/unit/unit';
import { UnitService } from '../service/unit/unit';
import { TaskEventEmitter } from '../event/task/task';
import { TaskService } from '../service/task/task';
import { IncomingSmsEventEmitter } from '../event/sms/incomingSms';
import { IncomingSmsService } from '../service/sms/incomingSms';
import { RoleEventEmitter } from '../event/user/role';
import { RoleService } from '../service/user/role';
import { SystemService } from '../service/system/system';
import { TaskAgendaEmitter } from '../agenda/task/task';
import { AnalyticsService } from '../service/analytics/analytics';
import { FirebaseService } from '../service/firebase/firebase';
import { RoleAnalyticsService } from '../service/analytics/roleAnalytics';
import { TaskAnalyticsService } from '../service/analytics/taskAnalytics';
import { UnitAnalyticsService } from '../service/analytics/unitAnalytics';

export function getContainer(): Container {
  const container = new Container({ skipBaseClassChecks: true });

  container.bind<UserEventEmitter>(UserEventEmitter).to(UserEventEmitter);
  container.bind<UserService>(UserService).to(UserService);

  container.bind<AccessInfoService>(AccessInfoService).to(AccessInfoService);
  container.bind<AccessControlService>(AccessControlService).to(AccessControlService);

  container.bind<Auth0Middleware>(Auth0Middleware).to(Auth0Middleware);

  container.bind<PermitAdminMiddleware>(PermitAdminMiddleware).to(PermitAdminMiddleware);

  container.bind<UploadMiddleware>(UploadMiddleware).to(UploadMiddleware);

  container.bind<SmsService>(SmsService).to(SmsService);
  container.bind<SmsNotificationEventEmitter>(SmsNotificationEventEmitter).to(SmsNotificationEventEmitter);

  container.bind<PostService>(PostService).to(PostService);
  container.bind<PostEventEmitter>(PostEventEmitter).to(PostEventEmitter);

  container.bind<EmailNotificationEventEmitter>(EmailNotificationEventEmitter).to(EmailNotificationEventEmitter);
  container.bind<EmailService>(EmailService).to(EmailService);

  container.bind<TagEventEmitter>(TagEventEmitter).to(TagEventEmitter);
  container.bind<TagService>(TagService).to(TagService);

  container.bind<NotificationEventEmitter>(NotificationEventEmitter).to(NotificationEventEmitter);
  container.bind<NotificationService>(NotificationService).to(NotificationService);

  container.bind<RequestService>(RequestService).to(RequestService);
  container.bind<RequestEventEmitter>(RequestEventEmitter).to(RequestEventEmitter);

  container.bind<AppEventEmitter>(AppEventEmitter).to(AppEventEmitter);
  container.bind<AppService>(AppService).to(AppService);

  container.bind<UnitEventEmitter>(UnitEventEmitter).to(UnitEventEmitter);
  container.bind<UnitService>(UnitService).to(UnitService);

  container.bind<TaskEventEmitter>(TaskEventEmitter).to(TaskEventEmitter);
  container.bind<TaskService>(TaskService).to(TaskService);

  container.bind<IncomingSmsEventEmitter>(IncomingSmsEventEmitter).to(IncomingSmsEventEmitter);
  container.bind<IncomingSmsService>(IncomingSmsService).to(IncomingSmsService);

  container.bind<RoleEventEmitter>(RoleEventEmitter).to(RoleEventEmitter);
  container.bind<RoleService>(RoleService).to(RoleService);

  container.bind<SystemService>(SystemService).to(SystemService);

  container.bind<TaskAgendaEmitter>(TaskAgendaEmitter).to(TaskAgendaEmitter);

  container.bind<AnalyticsService>(AnalyticsService).to(AnalyticsService);
  container.bind<RoleAnalyticsService>(RoleAnalyticsService).to(RoleAnalyticsService);
  container.bind<TaskAnalyticsService>(TaskAnalyticsService).to(TaskAnalyticsService);
  container.bind<UnitAnalyticsService>(UnitAnalyticsService).to(UnitAnalyticsService);

  container.bind<FirebaseService>(FirebaseService).to(FirebaseService);

  return container;
}

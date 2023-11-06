import { Schema, model } from 'mongoose';
import { defaultPlugin, initSearch } from '../../plugin/default';
import { PagedModel, SearchableModel, DefaultDocument } from '../../plugin/types';
import { Unit, UnitDocument, UnitModel } from '../unit/unit';
import { Role, RoleModel, RoleDocument } from './role';
import { TaskModel } from '../task/task';
import { SIGNALS_UPDATED } from '../../config/signal';

export type User = {
  displayName: string;
  phoneNumber: string;
  status: 'active' | 'blocked';
  suggestions?: string[];
};

export type UserDocument = DefaultDocument &
  User & {
    addFields(): Promise<void>;
    findReportingUnit(signal: string): Promise<UnitDocument>;
    units(): Promise<UnitDocument[]>;
    roles(status: Role['status']): Promise<RoleDocument[]>;
    can(data: {
      access:
        | 'manage-unit'
        | 'task-report'
        | 'task-verification'
        | 'task-investigation'
        | 'task-response'
        | 'task-escalation'
        | 'task-request';
      resource: string;
    }): Promise<boolean>;
  };

const userSchema = new Schema(
  {
    displayName: {
      type: String,
      required: true,
      es_indexed: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      es_indexed: true,
    },
    status: {
      type: String,
      default: 'active',
      enum: ['active', 'blocked'],
    },
    suggestions: {
      type: [String],
      es_indexed: true,
      es_type: 'completion',
    },
  },
  { timestamps: true },
);

userSchema.plugin(defaultPlugin, { searchable: true });

async function addFields(): Promise<void> {
  const doc = this as UserDocument;

  doc.suggestions = `${doc.displayName} ${doc.phoneNumber || ''}`.trim().split(' ');

  await doc.save();
}

async function can(data: {
  access:
    | 'manage-unit'
    | 'task-report'
    | 'task-verification'
    | 'task-investigation'
    | 'task-response'
    | 'task-escalation'
    | 'task-request';
  resource: string;
}): Promise<boolean> {
  const { _id: userId } = this as UserDocument;

  const { access, resource } = data;

  switch (access) {
    case 'manage-unit':
      const unitToManage = await UnitModel.findById(resource);

      if (!unitToManage) throw new Error('Unit not found');

      const parents = await unitToManage.parents();

      const role = await RoleModel.findOne({
        user: userId,
        unit: { $in: [unitToManage, ...parents].map((unit) => unit._id) },
        status: 'active',
        spot: { $nin: ['CHV', 'HCW', 'CDR'] },
      });

      if (!role)
        throw new Error(
          `You do not have permissions to manage ${unitToManage.name} (${unitToManage.type}). Contact your supervisor`,
        );
      break;
    case 'task-report':
      const unitToReport = await UnitModel.findById(resource);

      if (!unitToReport) throw new Error('Unit not found');

      let role_: RoleDocument;

      switch (unitToReport.type) {
        case 'Subcounty':
          role_ = await RoleModel.findOne({
            user: userId,
            unit: unitToReport._id,
            spot: { $in: ['PMEBS'] },
            status: 'active',
          });
          break;
        case 'Community unit':
          role_ = await RoleModel.findOne({
            user: userId,
            unit: unitToReport._id,
            spot: { $in: ['CHA', 'CHV', 'AHA', 'CDR'] },
            status: 'active',
          });
          break;
        case 'Health facility':
          role_ = await RoleModel.findOne({
            user: userId,
            unit: unitToReport._id,
            spot: { $in: ['SFP', 'HCW'] },
            status: 'active',
          });
          break;
        case 'Veterinary facility':
          role_ = await RoleModel.findOne({
            user: userId,
            unit: unitToReport._id,
            spot: { $in: ['VET'] },
            status: 'active',
          });
          break;
        case 'Learning institution':
          role_ = await RoleModel.findOne({
            user: userId,
            unit: unitToReport._id,
            spot: { $in: ['LEBS'] },
            status: 'active',
          });
          break;
      }

      if (!role_)
        throw new Error(
          `You do not have permissions to report in ${unitToManage.name} (${unitToManage.type}). Contact your supervisor`,
        );
      break;
    default:
      const taskToUpdate = await TaskModel.findById(resource);

      if (taskToUpdate.status === 'completed') throw new Error('The task has been completed');

      const unitFromTaskToUpdate = await UnitModel.findById(taskToUpdate.unit);

      switch (access) {
        case 'task-request':
          const requestRoleFromTaskToUpdate = await RoleModel.findOne({
            user: userId,
            unit: unitFromTaskToUpdate.parent,
            status: 'active',
          });

          if (!requestRoleFromTaskToUpdate)
            throw new Error(
              `You do not have permissions to request verification for this task (signal ID ${taskToUpdate.signalId}) for ${unitFromTaskToUpdate.name} (${unitFromTaskToUpdate.type}). Contact your supervisor`,
            );
          break;
        case 'task-verification':
          const verificationRoleFromTaskToUpdate = await RoleModel.findOne({
            user: userId,
            unit: unitFromTaskToUpdate._id,
            status: 'active',
          });

          if (!verificationRoleFromTaskToUpdate)
            throw new Error(
              `You do not have permissions to verify this task (signal ID ${taskToUpdate.signalId}) for ${unitFromTaskToUpdate.name} (${unitFromTaskToUpdate.type}). Contact your supervisor`,
            );
          break;
        case 'task-investigation':
          const investigationRoleFromTaskToUpdate = await RoleModel.findOne({
            user: userId,
            unit: unitFromTaskToUpdate.parent,
            status: 'active',
          });

          if (!investigationRoleFromTaskToUpdate)
            throw new Error(
              `You do not have permissions to investigate this task (signal ID ${taskToUpdate.signalId}) for ${unitFromTaskToUpdate.name} (${unitFromTaskToUpdate.type}). Contact your supervisor`,
            );
          break;
        case 'task-response':
          const responseRoleFromTaskToUpdate = await RoleModel.findOne({
            user: userId,
            unit: unitFromTaskToUpdate.parent,
            status: 'active',
          });

          if (!responseRoleFromTaskToUpdate)
            throw new Error(
              `You do not have permissions to respond to this task (signal ID ${taskToUpdate.signalId}) for ${unitFromTaskToUpdate.name} (${unitFromTaskToUpdate.type}). Contact your supervisor`,
            );
          break;
        case 'task-escalation':
          const escalationRoleFromTaskToUpdate = await RoleModel.findOne({
            user: userId,
            unit: unitFromTaskToUpdate.parent,
            status: 'active',
          });

          if (!escalationRoleFromTaskToUpdate)
            throw new Error(
              `You do not have permissions to escalate this task (signal ID ${taskToUpdate.signalId}) for ${unitFromTaskToUpdate.name} (${unitFromTaskToUpdate.type}). Contact your supervisor`,
            );
          break;
      }
  }

  return true;
}

async function findReportingUnit(signal: string): Promise<UnitDocument> {
  const { _id: user } = this as UserDocument;

  const roles = await RoleModel.find({ user, status: 'active' });

  let type: Unit['type'];

  if (SIGNALS_UPDATED.CEBS.includes(signal)) type = 'Community unit';
  else if (SIGNALS_UPDATED.HEBS.includes(signal)) type = 'Health facility';
  else if (SIGNALS_UPDATED.VEBS.includes(signal)) type = 'Veterinary facility';
  else if (SIGNALS_UPDATED.LEBS.includes(signal)) type = 'Learning institution';
  else
    throw new Error(
      'We are unable to identify the signal you are reporting. Reach out to your supervisor for assistance',
    );

  const unit = await UnitModel.findOne({
    _id: { $in: roles.map((role) => role.unit) },
    type,
  });

  if (unit) return unit;

  throw new Error('You do not have permissions to report this signal. Contact your supervisor');
}

async function units(): Promise<UnitDocument[]> {
  const { _id: userId } = this as UserDocument;

  const roles = await RoleModel.find({ user: userId }).populate([{ path: 'unit' }]);

  let children: UnitDocument[] = [];

  const _children: UnitDocument[] = roles.map((role) => (role.unit as unknown) as UnitDocument);

  children = [...children, ..._children];

  for (const _child of _children) {
    const _childChildren = await _child.children();

    children = [...children, ..._childChildren];
  }

  return children;
}

async function roles(status: Role['status']): Promise<RoleDocument[]> {
  const user = this as UserDocument;

  const { _id: userId } = user;

  return await RoleModel.find({
    user: userId,
    status,
  });
}

userSchema.methods = { ...userSchema.methods, ...{ addFields, findReportingUnit, units, roles, can } };

export const UserModel = model<UserDocument, PagedModel<UserDocument> & SearchableModel<UserDocument>>(
  'User',
  userSchema,
);

initSearch(UserModel);

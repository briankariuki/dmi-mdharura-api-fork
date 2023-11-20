import { injectable, inject } from 'inversify';
import { pickBy } from 'lodash';
import { PageOptions, PageResult, Query, DefaultDocument } from '../../plugin/types';
import { Task, TaskModel, TaskDocument } from '../../model/task/task';
import { TaskEventEmitter } from '../../event/task/task';

@injectable()
export class TaskService {
  @inject(TaskEventEmitter)
  private taskEventEmitter: TaskEventEmitter;

  async create(data: {
    unit: Task['unit'];
    user: Task['user'];
    signal: Task['signal'];
    via: Task['via'];
    state: Task['state'];
    'pmebs.reportForm'?: Task['pmebs']['reportForm'];
  }): Promise<Task> {
    const task = await new TaskModel(pickBy(data)).save();

    this.taskEventEmitter.emit('task-created', task);

    await task
      .populate([
        { path: 'user' },
        { path: 'unit' },
        { path: 'pmebs.reportForm.user' },
        { path: 'pmebs.requestForm.user' },
        { path: 'cebs.verificationForm.user' },
        { path: 'cebs.investigationForm.user' },
        { path: 'cebs.responseForm.user' },
        { path: 'cebs.escalationForm.user' },
        { path: 'cebs.summaryForm.user' },
        { path: 'cebs.labForm.user' },
        { path: 'vebs.verificationForm.user' },
        { path: 'vebs.investigationForm.user' },
        { path: 'vebs.responseForm.user' },
        { path: 'vebs.escalationForm.user' },
        { path: 'vebs.summaryForm.user' },
        { path: 'vebs.labForm.user' },
        { path: 'hebs.verificationForm.user' },
        { path: 'hebs.investigationForm.user' },
        { path: 'hebs.responseForm.user' },
        { path: 'hebs.escalationForm.user' },
        { path: 'hebs.summaryForm.user' },
        { path: 'hebs.labForm.user' },
        { path: 'lebs.verificationForm.user' },
        { path: 'lebs.investigationForm.user' },
        { path: 'lebs.responseForm.user' },
        { path: 'lebs.escalationForm.user' },
        { path: 'lebs.summaryForm.user' },
        { path: 'lebs.labForm.user' },
      ])
      .execPopulate();

    return task;
  }

  async update(
    taskId: string,
    data: {
      'pmebs.reportForm'?: Task['pmebs']['reportForm'];
      'pmebs.requestForm'?: Task['pmebs']['requestForm'];
      'cebs.verificationForm'?: Task['cebs']['verificationForm'];
      'cebs.investigationForm'?: Task['cebs']['investigationForm'];
      'cebs.responseForm'?: Task['cebs']['responseForm'];
      'cebs.escalationForm'?: Task['cebs']['escalationForm'];
      'cebs.summaryForm'?: Task['cebs']['summaryForm'];
      'cebs.labForm'?: Task['cebs']['labForm'];
      'vebs.verificationForm'?: Task['vebs']['verificationForm'];
      'vebs.investigationForm'?: Task['vebs']['investigationForm'];
      'vebs.responseForm'?: Task['vebs']['responseForm'];
      'vebs.escalationForm'?: Task['vebs']['escalationForm'];
      'vebs.summaryForm'?: Task['vebs']['summaryForm'];
      'vebs.labForm'?: Task['vebs']['labForm'];
      'hebs.verificationForm'?: Task['hebs']['verificationForm'];
      'hebs.investigationForm'?: Task['hebs']['investigationForm'];
      'hebs.responseForm'?: Task['hebs']['responseForm'];
      'hebs.escalationForm'?: Task['hebs']['escalationForm'];
      'hebs.summaryForm'?: Task['hebs']['summaryForm'];
      'hebs.labForm'?: Task['hebs']['labForm'];
      'lebs.verificationForm'?: Task['lebs']['verificationForm'];
      'lebs.investigationForm'?: Task['lebs']['investigationForm'];
      'lebs.responseForm'?: Task['lebs']['responseForm'];
      'lebs.escalationForm'?: Task['lebs']['escalationForm'];
      'lebs.summaryForm'?: Task['lebs']['summaryForm'];
      'lebs.labForm'?: Task['lebs']['labForm'];

      unit?: Task['unit'];
      _status?: DefaultDocument['_status'];
    },
  ): Promise<TaskDocument> {
    const task = await TaskModel.findByIdAndUpdate(taskId, { $set: pickBy(data) }, { new: true, runValidators: true });

    if (!task) throw new Error('Task not found');

    this.taskEventEmitter.emit('task-updated', task);

    await task
      .populate([
        { path: 'user' },
        { path: 'unit' },
        { path: 'pmebs.reportForm.user' },
        { path: 'pmebs.requestForm.user' },
        { path: 'cebs.verificationForm.user' },
        { path: 'cebs.investigationForm.user' },
        { path: 'cebs.responseForm.user' },
        { path: 'cebs.escalationForm.user' },
        { path: 'cebs.summaryForm.user' },
        { path: 'cebs.labForm.user' },
        { path: 'vebs.verificationForm.user' },
        { path: 'vebs.investigationForm.user' },
        { path: 'vebs.responseForm.user' },
        { path: 'vebs.escalationForm.user' },
        { path: 'vebs.summaryForm.user' },
        { path: 'vebs.labForm.user' },
        { path: 'hebs.verificationForm.user' },
        { path: 'hebs.investigationForm.user' },
        { path: 'hebs.responseForm.user' },
        { path: 'hebs.escalationForm.user' },
        { path: 'hebs.summaryForm.user' },
        { path: 'hebs.labForm.user' },
        { path: 'lebs.verificationForm.user' },
        { path: 'lebs.investigationForm.user' },
        { path: 'lebs.responseForm.user' },
        { path: 'lebs.escalationForm.user' },
        { path: 'lebs.summaryForm.user' },
        { path: 'lebs.labForm.user' },
      ])
      .execPopulate();

    return task;
  }

  async findOne(query: { signalId: string }): Promise<TaskDocument> {
    const task = await TaskModel.findOne(query);

    if (!task) throw new Error(`Task not found (Signal ID: ${query.signalId})`);

    this.taskEventEmitter.emit('task-fetched', task);

    await task
      .populate([
        { path: 'user' },
        { path: 'unit' },
        { path: 'pmebs.reportForm.user' },
        { path: 'pmebs.requestForm.user' },
        { path: 'cebs.verificationForm.user' },
        { path: 'cebs.investigationForm.user' },
        { path: 'cebs.responseForm.user' },
        { path: 'cebs.escalationForm.user' },
        { path: 'cebs.summaryForm.user' },
        { path: 'cebs.labForm.user' },
        { path: 'vebs.verificationForm.user' },
        { path: 'vebs.investigationForm.user' },
        { path: 'vebs.responseForm.user' },
        { path: 'vebs.escalationForm.user' },
        { path: 'vebs.summaryForm.user' },
        { path: 'vebs.labForm.user' },
        { path: 'hebs.verificationForm.user' },
        { path: 'hebs.investigationForm.user' },
        { path: 'hebs.responseForm.user' },
        { path: 'hebs.escalationForm.user' },
        { path: 'hebs.summaryForm.user' },
        { path: 'hebs.labForm.user' },
        { path: 'lebs.verificationForm.user' },
        { path: 'lebs.investigationForm.user' },
        { path: 'lebs.responseForm.user' },
        { path: 'lebs.escalationForm.user' },
        { path: 'lebs.summaryForm.user' },
        { path: 'lebs.labForm.user' },
      ])
      .execPopulate();

    return task;
  }

  async findById(taskId: string): Promise<TaskDocument> {
    const task = await TaskModel.findById(taskId);

    if (!task) throw new Error('Task not found');

    this.taskEventEmitter.emit('task-fetched', task);

    await task
      .populate([
        { path: 'user' },
        { path: 'unit' },
        { path: 'pmebs.reportForm.user' },
        { path: 'pmebs.requestForm.user' },
        { path: 'cebs.verificationForm.user' },
        { path: 'cebs.investigationForm.user' },
        { path: 'cebs.responseForm.user' },
        { path: 'cebs.escalationForm.user' },
        { path: 'cebs.summaryForm.user' },
        { path: 'cebs.labForm.user' },
        { path: 'vebs.verificationForm.user' },
        { path: 'vebs.investigationForm.user' },
        { path: 'vebs.responseForm.user' },
        { path: 'vebs.escalationForm.user' },
        { path: 'vebs.summaryForm.user' },
        { path: 'vebs.labForm.user' },
        { path: 'hebs.verificationForm.user' },
        { path: 'hebs.investigationForm.user' },
        { path: 'hebs.responseForm.user' },
        { path: 'hebs.escalationForm.user' },
        { path: 'hebs.summaryForm.user' },
        { path: 'hebs.labForm.user' },
        { path: 'lebs.verificationForm.user' },
        { path: 'lebs.investigationForm.user' },
        { path: 'lebs.responseForm.user' },
        { path: 'lebs.escalationForm.user' },
        { path: 'lebs.summaryForm.user' },
        { path: 'lebs.labForm.user' },
      ])
      .execPopulate();

    return task;
  }

  async delete(taskId: string): Promise<Task> {
    const task = await TaskModel.findByIdAndUpdate(
      taskId,
      { $set: { _status: 'deleted' } },
      { new: true, runValidators: true },
    );

    if (!task) throw new Error('Task not found');

    this.taskEventEmitter.emit('task-deleted', task);

    await task
      .populate([
        { path: 'user' },
        { path: 'unit' },
        { path: 'pmebs.reportForm.user' },
        { path: 'pmebs.requestForm.user' },
        { path: 'cebs.verificationForm.user' },
        { path: 'cebs.investigationForm.user' },
        { path: 'cebs.responseForm.user' },
        { path: 'cebs.escalationForm.user' },
        { path: 'cebs.summaryForm.user' },
        { path: 'cebs.labForm.user' },
        { path: 'vebs.verificationForm.user' },
        { path: 'vebs.investigationForm.user' },
        { path: 'vebs.responseForm.user' },
        { path: 'vebs.escalationForm.user' },
        { path: 'vebs.summaryForm.user' },
        { path: 'vebs.labForm.user' },
        { path: 'hebs.verificationForm.user' },
        { path: 'hebs.investigationForm.user' },
        { path: 'hebs.responseForm.user' },
        { path: 'hebs.escalationForm.user' },
        { path: 'hebs.summaryForm.user' },
        { path: 'hebs.labForm.user' },
        { path: 'lebs.verificationForm.user' },
        { path: 'lebs.investigationForm.user' },
        { path: 'lebs.responseForm.user' },
        { path: 'lebs.escalationForm.user' },
        { path: 'lebs.summaryForm.user' },
        { path: 'lebs.labForm.user' },
      ])
      .execPopulate();

    return task;
  }

  async page(query: Query, pageOptions: PageOptions): Promise<PageResult<TaskDocument>> {
    let pageResult: PageResult<TaskDocument>;

    const { q, page, limit, populate } = pageOptions;

    if (q) {
      const docs = await TaskModel.look(q, { query, populate, page, limit });

      pageResult = { docs, limit: docs.length, total: docs.length, sort: q, page: 1, pages: 1 };
    } else {
      pageResult = await TaskModel.page(pickBy(query), pageOptions);
    }

    return pageResult;
  }

  async download(query: Query): Promise<TaskDocument[]> {
    const docs = await TaskModel.aggregate([
      {
        $match: query,
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: {
          path: '$user',
        },
      },
      {
        $lookup: {
          from: 'units',
          localField: 'unit',
          foreignField: '_id',
          as: 'unit',
        },
      },
      {
        $unwind: {
          path: '$unit',
        },
      },
      {
        $lookup: {
          from: 'units',
          localField: 'unit.parent',
          foreignField: '_id',
          as: 'unit.parent',
        },
      },
      {
        $unwind: {
          path: '$unit.parent',
        },
      },
      {
        $lookup: {
          from: 'units',
          localField: 'unit.parent.parent',
          foreignField: '_id',
          as: 'unit.parent.parent',
        },
      },
      {
        $unwind: {
          path: '$unit.parent.parent',
        },
      },
    ]);

    return docs;
  }
}

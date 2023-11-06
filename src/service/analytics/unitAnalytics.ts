import { injectable } from 'inversify';
import { UnitModel } from '../../model/unit/unit';
import { TaskModel } from '../../model/task/task';

@injectable()
export class UnitAnalyticsService {
  async status(match: Record<string, any>): Promise<Dashboard> {
    const _aggregate: { _id: string; value: number; active: number }[] = await UnitModel.aggregate([
      { $match: match },
      {
        $project: {
          type: 1,
          active: {
            $cond: [
              {
                $eq: ['$state', 'live'],
              },
              1,
              0,
            ],
          },
        },
      },
      {
        $group: {
          _id: '$type',
          value: {
            $sum: 1,
          },
          active: {
            $sum: '$active',
          },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    if (_aggregate.length) {
      const _graphs: Graph[] = _aggregate.map((aggregate) => ({
        id: aggregate._id,
        color: aggregate._id.toHex(),
        graphItems: [
          {
            name: 'Registered',
            value: aggregate.value,
          },
          {
            name: 'Active',
            value: aggregate.active,
          },
        ],
      }));

      return {
        title: 'Comparison of state of units(levels)',
        graphs: _graphs,
        columns: 1,
        height: 240 + (parseInt((_graphs.length / 2).toFixed()) + 1) * 48,
      };
    }

    throw new Error('No dashboard available');
  }
  async activities(options: {
    primary: Record<string, any>;
    secondary: Record<string, any>;
    title: string;
    label: string;
  }): Promise<Dashboard> {
    const registered = await UnitModel.distinct('_id', options.primary);

    const active = await TaskModel.distinct('unit', { ...{ unit: { $in: registered } }, ...options.secondary });

    const _graphs: Graph[] = [
      {
        id: options.label,
        color: options.label.toHex(),
        graphItems: [
          {
            name: 'Registered',
            value: registered.length,
          },
          {
            name: options.title,
            value: active.length,
          },
        ],
      },
    ];

    return {
      title: 'Comparison of units(levels) activity',
      graphs: _graphs,
      columns: 1,
      height: 240 + (parseInt((_graphs.length / 2).toFixed()) + 1) * 48,
    };
  }
}

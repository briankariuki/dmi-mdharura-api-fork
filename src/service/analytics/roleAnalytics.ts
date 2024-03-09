import { injectable } from 'inversify';
import { RoleModel } from '../../model/user/role';
import { AppModel } from '../../model/app/app';
import { TaskModel } from '../../model/task/task';

@injectable()
export class RoleAnalyticsService {
  async dashboardAccess(match: Record<string, any>): Promise<Dashboard> {
    const users = await RoleModel.distinct('user', {
      unit: match.units,
      spot: {
        $in: ['HEBS', 'LEBS', 'CEBS', 'EBS', 'AHA', 'CHA', 'VEBS', 'SFP', 'HCW', 'PMEBS', 'PEBS/MEBS', 'VIEWER'],
      },
    });

    const apps = await AppModel.distinct('user', {
      user: {
        $in: users,
      },
      createdAt: match.createdAt,
      type: 'analytics',
    });

    if (users.length) {
      const _graphs: Graph[] = [
        {
          id: 'Registered',
          color: 'Registered'.toHex(),
          graphItems: [
            {
              name: 'Total',
              value: users.length,
            },
          ],
        },
        {
          id: 'Accessing dashboard',
          color: 'Accessing dashboard'.toHex(),
          graphItems: [
            {
              name: 'Total',
              value: apps.length,
            },
          ],
        },
      ];

      return {
        title: 'Users accessing the dashboard',
        graphs: _graphs,
        columns: 1,
        height: 160 + (parseInt((_graphs.length / 2).toFixed()) + 1) * 48,
      };
    }

    throw new Error('No dashboard available');
  }

  async roles(match: Record<string, any>): Promise<Dashboard> {
    const _aggregate: { _id: string; value: number }[] = await RoleModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$spot',
          value: {
            $sum: 1,
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
            name: 'Total',
            value: aggregate.value,
          },
        ],
      }));

      return {
        title: 'Comparison of new users enroled',
        graphs: _graphs,
        columns: 2,
        height: 160 + (parseInt((_graphs.length / 2).toFixed()) + 1) * 48,
      };
    }

    throw new Error('No dashboard available');
  }

  async activities(
    options: {
      primary: Record<string, any>;
      secondary: Record<string, any>;
      title: string;
      label: string;
      unique: string;
    }[],
  ): Promise<Dashboard> {
    const _graphs: Graph[] = [];

    for (const option of options) {
      const registered = await RoleModel.distinct('user', option.primary);

      const active = await TaskModel.distinct(option.unique, {
        ...{ [option.unique]: { $in: registered } },
        ...option.secondary,
      });

      _graphs.push({
        id: option.label,
        color: option.label.toHex(),
        graphItems: [
          {
            name: 'Registered',
            value: registered.length,
          },
          {
            name: option.title,
            value: active.length,
          },
        ],
      });
    }

    return {
      title: 'Comparison of users activity',
      graphs: _graphs,
      columns: 1,
      height: 240 + (parseInt((_graphs.length / 2).toFixed()) + 1) * 48,
    };
  }

  async indicators(
    options: {
      primary: Record<string, unknown>;
      secondary: Record<string, unknown>;
      name: string;
      code: string;
      unique: string;
      type: 'registered' | 'active';
    }[],
  ): Promise<ShieldIndicator[]> {
    const indicators: ShieldIndicator[] = [];

    for (const option of options) {
      const registered = await RoleModel.distinct('user', option.primary);

      const active = await TaskModel.distinct(option.unique, {
        ...{ [option.unique]: { $in: registered } },
        ...option.secondary,
      });

      if (option.type === 'registered') {
        indicators.push({
          name: option.name,
          code: option.code,
          value: registered.length,
        });
      } else {
        indicators.push({
          name: option.name,
          code: option.code,
          value: active.length,
        });
      }
    }

    return indicators;
  }
}

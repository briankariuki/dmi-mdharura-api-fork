import { inject, injectable } from 'inversify';
import { TaskModel } from '../../model/task/task';
import { UnitService } from '../unit/unit';
import { RoleModel } from '../../model/user/role';

type TaskAnalytics = {
  _id: null;
  signalsReported: number;
  signalsVerified: number;
  signalsVerifiedTrue: number;
  eventsInvestigated: number;
  eventsInvestigatedCovid19Positive: number;
  positiveCases: number;
  focalPersonsReporting: number;
  focalPersons: number;
  samplesCollected: number;
  samplesPositive: number;
};

@injectable()
export class AnalyticsService {
  @inject(UnitService)
  private unitService: UnitService;

  async taskAnalyticsPage(data: { unit: string; dateStart: Date; dateEnd: Date }): Promise<TaskAnalytics[]> {
    const { unit: unitId, dateStart, dateEnd } = data;

    const unit = await this.unitService.findById(unitId);

    const children = await unit.children();

    let match = {
      unit: {
        $in: [unit._id, ...children.map((child) => child._id)],
      },
    };

    if (dateStart && dateEnd)
      match = {
        ...match,
        ...{
          createdAt: {
            $gt: dateStart,
            $lte: dateEnd,
          },
        },
      };
    else if (dateStart)
      match = {
        ...match,
        ...{
          createdAt: {
            $gt: dateStart,
          },
        },
      };
    else if (dateEnd)
      match = {
        ...match,
        ...{
          createdAt: {
            $lte: dateEnd,
          },
        },
      };

    const query = [
      {
        $match: match,
      },
      {
        $project: {
          createdAt: 1,
          lebsVerification: {
            $ifNull: ['$lebs.verificationForm', null],
          },
          lebsInvestigation: {
            $ifNull: ['$lebs.investigationForm', null],
          },
          lebsResponse: {
            $ifNull: ['$lebs.responseForm', null],
          },
          cebsVerification: {
            $ifNull: ['$cebs.verificationForm', null],
          },
          cebsInvestigation: {
            $ifNull: ['$cebs.investigationForm', null],
          },
          hebsVerification: {
            $ifNull: ['$hebs.verificationForm', null],
          },
          hebsInvestigation: {
            $ifNull: ['$hebs.investigationForm', null],
          },
        },
      },
      {
        $group: {
          _id: null,
          signalsReported: {
            $sum: 1,
          },
          signalsVerified: {
            $sum: {
              $cond: {
                if: {
                  $ne: ['$lebsVerification', null],
                },
                then: 1,
                else: 0,
              },
            },
          },
          signalsVerifiedTrue: {
            $sum: {
              $cond: {
                if: {
                  $eq: ['$lebsVerification.isReportedBefore', 'No'],
                },
                then: 1,
                else: 0,
              },
            },
          },
          eventsInvestigated: {
            $sum: {
              $cond: {
                if: {
                  $ne: ['$lebsInvestigation', null],
                },
                then: 1,
                else: 0,
              },
            },
          },
          eventsInvestigatedCovid19Positive: {
            $sum: {
              $cond: {
                if: {
                  $eq: ['$lebsInvestigation.isCovid19WorkingCaseDefinitionMet', 'Yes'],
                },
                then: 1,
                else: 0,
              },
            },
          },
          positiveCases: {
            $sum: {
              $cond: {
                if: {
                  $ne: ['$lebsResponse.humansPositive', null],
                },
                then: '$lebsResponse.humansPositive',
                else: 0,
              },
            },
          },
          samplesCollected: {
            $sum: {
              $cond: {
                if: {
                  $ne: ['$lebsResponse.humansTested', null],
                },
                then: '$lebsResponse.humansTested',
                else: 0,
              },
            },
          },
          samplesPositive: {
            $sum: {
              $cond: {
                if: {
                  $ne: ['$lebsResponse.humansPositive', null],
                },
                then: '$lebsResponse.humansPositive',
                else: 0,
              },
            },
          },
        },
      },
    ];

    const analytics: TaskAnalytics[] = await TaskModel.aggregate(query);

    const focalPersons = await RoleModel.distinct('user', {
      unit: [unit, ...children].filter((_unit) => _unit.type === 'Learning institution').map((_unit) => _unit.id),
      ...{ spot: 'LEBS' },
    });

    const focalPersonsReporting = await TaskModel.distinct('user', {
      user: {
        $in: focalPersons,
      },
      unit: [unit, ...children].filter((_unit) => _unit.type === 'Learning institution').map((_unit) => _unit.id),
    });

    if (analytics.length) {
      analytics[0].focalPersons = focalPersons.length;
      analytics[0].focalPersonsReporting = focalPersonsReporting.length;

      return analytics;
    }

    return [
      {
        _id: null,
        signalsReported: 0,
        signalsVerified: 0,
        signalsVerifiedTrue: 0,
        eventsInvestigated: 0,
        eventsInvestigatedCovid19Positive: 0,
        positiveCases: 0,
        focalPersonsReporting: focalPersonsReporting.length,
        focalPersons: focalPersons.length,
        samplesCollected: 0,
        samplesPositive: 0,
      },
    ];
  }

  async getDashboards(data: { unit: string; dateStart: Date; dateEnd: Date; state: string }): Promise<Dashboard[]> {
    const dashboards: Dashboard[] = [];

    const { unit: unitId, dateStart, dateEnd, state } = data;

    const unit = await this.unitService.findById(unitId);

    let match = {
      units: unit._id,
    };

    if (state) match = { ...match, ...{ state } };

    if (dateStart && dateEnd)
      match = {
        ...match,
        ...{
          createdAt: {
            $gt: dateStart,
            $lte: dateEnd,
          },
        },
      };
    else if (dateStart)
      match = {
        ...match,
        ...{
          createdAt: {
            $gt: dateStart,
          },
        },
      };
    else if (dateEnd)
      match = {
        ...match,
        ...{
          createdAt: {
            $lte: dateEnd,
          },
        },
      };

    try {
      dashboards.push(await this.statusDashboard(match));
    } catch (error) {}

    try {
      dashboards.push(await this.stageDashboard(match));
    } catch (error) {}

    return dashboards;
  }

  async signalDashboard(match: Record<string, any>): Promise<Dashboard> {
    const statusAggregate: { _id: string; value: number }[] = await TaskModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$signal',
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

    if (statusAggregate.length) {
      const statusGraphs: Graph[] = statusAggregate.map((aggregate) => ({
        id: aggregate._id.toUpperCase(),
        color: aggregate._id.toHex(),
        graphItems: [
          {
            name: 'Total',
            value: aggregate.value,
          },
        ],
      }));

      return {
        title: 'Comparison of signal codes reported',
        graphs: statusGraphs,
        columns: 3,
        height: 160 + (parseInt((statusGraphs.length / 3).toFixed()) + 1) * 48,
      };
    }

    throw new Error('No dashboard available');
  }

  async statusDashboard(match: Record<string, any>): Promise<Dashboard> {
    const statusAggregate: { _id: 'completed' | 'pending'; value: number }[] = await TaskModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$status',
          value: {
            $sum: 1,
          },
        },
      },
    ]);

    if (statusAggregate.length) {
      const statusGraphs: Graph[] = [];

      statusGraphs.push({
        id: 'Reported',
        color: 'Reported'.toHex(),
        graphItems: [
          {
            name: 'Total',
            value: statusAggregate.reduce((prev, curr) => prev + curr.value, 0),
          },
        ],
      });

      statusGraphs.push({
        id: 'Acted on',
        color: 'Acted on'.toHex(),
        graphItems: [
          {
            name: 'Total',
            value: statusAggregate.reduce((prev, curr) => prev + (curr._id === 'completed' ? curr.value : 0), 0),
          },
        ],
      });

      return {
        title: 'Comparison of signals reported & acted on',
        graphs: statusGraphs,
        height: 160 + (parseInt((statusGraphs.length / 2).toFixed()) + 1) * 48,
        columns: 2,
      };
    }

    throw new Error('No dashboard available');
  }

  async stageDashboard(match: Record<string, any>): Promise<Dashboard> {
    const stageAggregate: {
      reported: number;
      verified: number;
      investigated: number;
      responded: number;
      escalated: number;
    }[] = await TaskModel.aggregate([
      { $match: match },
      {
        $project: {
          verified: {
            $cond: [
              {
                $or: [
                  {
                    $gt: ['$cebs.verificationForm', null],
                  },
                  {
                    $gt: ['$hebs.verificationForm', null],
                  },
                  {
                    $gt: ['$vebs.verificationForm', null],
                  },
                  {
                    $gt: ['$lebs.verificationForm', null],
                  },
                ],
              },
              1,
              0,
            ],
          },
          investigated: {
            $cond: [
              {
                $or: [
                  {
                    $gt: ['$cebs.investigationForm', null],
                  },
                  {
                    $gt: ['$hebs.investigationForm', null],
                  },
                  {
                    $gt: ['$vebs.investigationForm', null],
                  },
                  {
                    $gt: ['$lebs.investigationForm', null],
                  },
                ],
              },
              1,
              0,
            ],
          },
          responded: {
            $cond: [
              {
                $or: [
                  {
                    $gt: ['$cebs.responseForm', null],
                  },
                  {
                    $gt: ['$hebs.responseForm', null],
                  },
                  {
                    $gt: ['$vebs.responseForm', null],
                  },
                  {
                    $gt: ['$lebs.responseForm', null],
                  },
                ],
              },
              1,
              0,
            ],
          },
          escalated: {
            $cond: [
              {
                $or: [
                  {
                    $gt: ['$cebs.escalationForm', null],
                  },
                  {
                    $gt: ['$hebs.escalationForm', null],
                  },
                  {
                    $gt: ['$vebs.escalationForm', null],
                  },
                  {
                    $gt: ['$lebs.escalationForm', null],
                  },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          reported: {
            $sum: 1,
          },
          verified: {
            $sum: '$verified',
          },
          investigated: {
            $sum: '$investigated',
          },
          responded: {
            $sum: '$responded',
          },
          escalated: {
            $sum: '$escalated',
          },
        },
      },
    ]);

    if (stageAggregate.length) {
      const stageGraphs: Graph[] = [];

      stageGraphs.push({
        id: 'Reported',
        color: 'Reported'.toHex(),
        graphItems: [
          {
            name: 'Total',
            value: stageAggregate[0].reported,
          },
        ],
      });

      stageGraphs.push({
        id: 'Verified',
        color: 'Verified'.toHex(),
        graphItems: [
          {
            name: 'Total',
            value: stageAggregate[0].verified,
          },
        ],
      });

      stageGraphs.push({
        id: 'Assessed',
        color: 'Assessed'.toHex(),
        graphItems: [
          {
            name: 'Total',
            value: stageAggregate[0].investigated,
          },
        ],
      });

      stageGraphs.push({
        id: 'Responded',
        color: 'Responded'.toHex(),
        graphItems: [
          {
            name: 'Total',
            value: stageAggregate[0].responded,
          },
        ],
      });

      stageGraphs.push({
        id: 'Escalated',
        color: 'Escalated'.toHex(),
        graphItems: [
          {
            name: 'Total',
            value: stageAggregate[0].escalated,
          },
        ],
      });

      return {
        title: 'Comparison of EBS processes',
        graphs: stageGraphs,
        columns: 2,
        height: 160 + (parseInt((stageGraphs.length / 2).toFixed()) + 1) * 48,
      };
    }

    throw new Error('No dashboard available');
  }
}

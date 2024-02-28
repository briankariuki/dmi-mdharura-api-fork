import { injectable } from 'inversify';
import { TaskModel } from '../../model/task/task';

@injectable()
export class TaskAnalyticsService {
  async aggregate(
    match: Record<string, any>,
  ): Promise<
    {
      reported: number;
      verified: number;
      verifiedTrue: number;
      investigated: number;
      responded: number;
      toBeEscalated: number;
      escalated: number;
    }[]
  > {
    return await TaskModel.aggregate([
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
          verifiedTrue: {
            $cond: [
              {
                $or: [
                  {
                    $eq: ['$cebs.verificationForm.isThreatStillExisting', 'Yes'],
                  },
                  {
                    $eq: ['$hebs.verificationForm.isThreatStillExisting', 'Yes'],
                  },
                  {
                    $eq: ['$vebs.verificationForm.isThreatStillExisting', 'Yes'],
                  },
                  {
                    $eq: ['$lebs.verificationForm.isThreatStillExisting', 'Yes'],
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
                    $and: [
                      {
                        $gt: ['$cebs.investigationForm', null],
                      },
                      {
                        $eq: ['$cebs.verificationForm.isThreatStillExisting', 'Yes'],
                      },
                    ],
                  },
                  {
                    $and: [
                      {
                        $gt: ['$vebs.investigationForm', null],
                      },
                      {
                        $eq: ['$vebs.verificationForm.isThreatStillExisting', 'Yes'],
                      },
                    ],
                  },
                  {
                    $and: [
                      {
                        $gt: ['$hebs.investigationForm', null],
                      },
                      {
                        $eq: ['$hebs.verificationForm.isThreatStillExisting', 'Yes'],
                      },
                    ],
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
                // $or: [
                //   {
                //     $gt: ['$cebs.responseForm', null],
                //   },
                //   {
                //     $gt: ['$hebs.responseForm', null],
                //   },
                //   {
                //     $gt: ['$vebs.responseForm', null],
                //   },
                //   {
                //     $gt: ['$lebs.responseForm', null],
                //   },
                // ],

                $or: [
                  {
                    $and: [
                      {
                        $gt: ['$cebs.responseForm', null],
                      },
                      {
                        $eq: ['$cebs.verificationForm.isThreatStillExisting', 'Yes'],
                      },
                    ],
                  },
                  {
                    $and: [
                      {
                        $gt: ['$vebs.responseForm', null],
                      },
                      {
                        $eq: ['$vebs.verificationForm.isThreatStillExisting', 'Yes'],
                      },
                    ],
                  },
                  {
                    $and: [
                      {
                        $gt: ['$hebs.responseForm', null],
                      },
                      {
                        $eq: ['$hebs.verificationForm.isThreatStillExisting', 'Yes'],
                      },
                    ],
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
          toBeEscalated: {
            $cond: [
              {
                $or: [
                  {
                    $gt: [
                      {
                        $size: {
                          $setIntersection: [
                            { $ifNull: ['$cebs.responseForm.recommendations', []] },
                            ['Escalate to higher level'],
                          ],
                        },
                      },
                      0,
                    ],
                  },
                  {
                    $gt: [
                      {
                        $size: {
                          $setIntersection: [
                            { $ifNull: ['$hebs.responseForm.recommendations', []] },
                            ['Escalate to higher level'],
                          ],
                        },
                      },
                      0,
                    ],
                  },
                  {
                    $gt: [
                      {
                        $size: {
                          $setIntersection: [
                            { $ifNull: ['$vebs.responseForm.recommendations', []] },
                            ['Escalate to higher level'],
                          ],
                        },
                      },
                      0,
                    ],
                  },
                  {
                    $gt: [
                      {
                        $size: {
                          $setIntersection: [
                            { $ifNull: ['$lebs.responseForm.recommendations', []] },
                            ['Escalate to higher level'],
                          ],
                        },
                      },
                      0,
                    ],
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
          verifiedTrue: {
            $sum: '$verifiedTrue',
          },
          investigated: {
            $sum: '$investigated',
          },
          responded: {
            $sum: '$responded',
          },
          toBeEscalated: {
            $sum: '$toBeEscalated',
          },
          escalated: {
            $sum: '$escalated',
          },
        },
      },
    ]);
  }

  async processes(match: Record<string, any>): Promise<Dashboard> {
    const _aggregate = await this.aggregate(match);

    if (_aggregate.length) {
      const _graphs: Graph[] = [];

      _graphs.push({
        id: 'Reported',
        color: 'Reported'.toHex(),
        graphItems: [
          {
            name: 'Total',
            value: _aggregate[0].reported,
          },
        ],
      });

      _graphs.push({
        id: 'Verified',
        color: 'Verified'.toHex(),
        graphItems: [
          {
            name: 'Total',
            value: _aggregate[0].verified,
          },
        ],
      });

      _graphs.push({
        id: 'Verified true',
        color: 'Verified true'.toHex(),
        graphItems: [
          {
            name: 'Total',
            value: _aggregate[0].verifiedTrue,
          },
        ],
      });

      _graphs.push({
        id: 'Investigated',
        color: 'Investigated'.toHex(),
        graphItems: [
          {
            name: 'Total',
            value: _aggregate[0].investigated,
          },
        ],
      });

      _graphs.push({
        id: 'Responded',
        color: 'Responded'.toHex(),
        graphItems: [
          {
            name: 'Total',
            value: _aggregate[0].responded,
          },
        ],
      });

      _graphs.push({
        id: 'Need escalation',
        color: 'Need escalation'.toHex(),
        graphItems: [
          {
            name: 'Total',
            value: _aggregate[0].toBeEscalated,
          },
        ],
      });

      _graphs.push({
        id: 'Escalated',
        color: 'Escalated'.toHex(),
        graphItems: [
          {
            name: 'Total',
            value: _aggregate[0].escalated,
          },
        ],
      });

      return {
        title: 'Comparison of EBS processes',
        graphs: _graphs,
        columns: 2,
        height: 160 + (parseInt((_graphs.length / 2).toFixed()) + 1) * 48,
      };
    }

    throw new Error('No dashboard available');
  }

  async indicators(match: Record<string, unknown>, type: string): Promise<ShieldIndicator[]> {
    const _aggregate = await this.aggregate(match);

    if (_aggregate.length) {
      const _indicators: ShieldIndicator[] = [];

      if (type === 'CEBS') {
        _indicators.push({
          name: 'CEBS Signals Reported',
          code: 'SURV.IND.EBS04',
          value: _aggregate[0].reported,
        });

        _indicators.push({
          name: 'CEBS Signals Verified',
          code: 'SURV.IND.EBS05',
          value: _aggregate[0].verified,
        });

        _indicators.push({
          name: 'CEBS Signals Verified True',
          code: 'SURV.IND.EBS07',
          value: _aggregate[0].verifiedTrue,
        });

        _indicators.push({
          name: 'CEBS Signals Risk Assessed',
          code: 'SURV.IND.EBS09',
          value: _aggregate[0].investigated,
        });

        _indicators.push({
          name: 'CEBS Signals Responded',
          code: 'SURV.IND.EBS11',
          value: _aggregate[0].responded,
        });

        _indicators.push({
          name: 'CEBS Signals To Be Escalated',
          code: 'SURV.IND.EBS13',
          value: _aggregate[0].toBeEscalated,
        });

        _indicators.push({
          name: 'CEBS Signals Escalated',
          code: 'SURV.IND.EBS13',
          value: _aggregate[0].escalated,
        });
      }

      if (type === 'HEBS') {
        _indicators.push({
          name: 'HEBS Signals Reported',
          code: 'SURV.IND.EBS18',
          value: _aggregate[0].reported,
        });

        _indicators.push({
          name: 'HEBS Signals Verified',
          code: 'SURV.IND.EBS19',
          value: _aggregate[0].verified,
        });

        _indicators.push({
          name: 'HEBS Signals Verified True',
          code: 'SURV.IND.EBS21',
          value: _aggregate[0].verifiedTrue,
        });

        _indicators.push({
          name: 'HEBS Signals Risk Assessed',
          code: 'SURV.IND.EBS23',
          value: _aggregate[0].investigated,
        });

        _indicators.push({
          name: 'HEBS Signals Responded',
          code: 'SURV.IND.EBS25',
          value: _aggregate[0].responded,
        });

        _indicators.push({
          name: 'HEBS Signals To Be Escalated',
          code: 'SURV.IND.EBS27',
          value: _aggregate[0].toBeEscalated,
        });

        _indicators.push({
          name: 'HEBS Signals Escalated',
          code: 'SURV.IND.EBS27',
          value: _aggregate[0].escalated,
        });
      }

      return _indicators;
    }

    throw new Error('No indicators available');
  }
}

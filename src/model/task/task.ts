import { Schema, model } from 'mongoose';
import { PagedModel, SearchableModel, DefaultDocument } from '../../plugin/types';
import { defaultPlugin, initSearch } from '../../plugin/default';
import { generate } from 'randomstring';
import { SIGNALS } from '../../config/signal';
import moment from 'moment';
import { RoleModel, Role } from '../user/role';
import { UserDocument } from '../user/user';
import { UnitModel } from '../unit/unit';
import { TASK_REMINDER_ESCALATE_AFTER, TASK_REMINDER_UNITS } from '../../config/task';
import {
  VerificationForm,
  InvestigationForm,
  ResponseForm,
  EscalationForm,
  SummaryForm,
  LabForm,
} from '../../types/form';
import {
  verificationFormSchema,
  investigationFormSchema,
  responseFormSchema,
  escalationFormSchema,
  summaryFormSchema,
  labFormSchema,
} from '../../util/form.schema';

export type Task = {
  user: string;
  unit: string;
  signalId: string;
  signal: string;
  units?: string[];
  suggestions?: string[];
  pmebs?: {
    reportForm?: {
      user: string;
      dateDetected: Date;
      description: string;
      source: string;
      unit: string;
      locality: string;
      dateReported: Date;
      via: 'internet' | 'sms';
      spot?: Role['spot'];
    };
    requestForm?: {
      user: string;
      description: string;
      unit: string;
      locality: string;
      dateReported: Date;
      dateRequested: Date;
      via: 'internet' | 'sms';
      spot?: Role['spot'];
    };
  };
  vebs?: {
    verificationForm?: VerificationForm;
    investigationForm?: InvestigationForm;
    responseForm?: ResponseForm;
    escalationForm?: EscalationForm;
    summaryForm?: SummaryForm;
    labForm?: LabForm;
  };
  cebs?: {
    verificationForm?: VerificationForm;
    investigationForm?: InvestigationForm;
    responseForm?: ResponseForm;
    escalationForm?: EscalationForm;
    summaryForm?: SummaryForm;
    labForm?: LabForm;
  };
  hebs?: {
    verificationForm?: VerificationForm;
    investigationForm?: InvestigationForm;
    responseForm?: ResponseForm;
    escalationForm?: EscalationForm;
    summaryForm?: SummaryForm;
    labForm?: LabForm;
  };
  lebs?: {
    verificationForm?: {
      user: string;
      description: string;
      isMatchingSignal: string;
      updatedSignal: string;
      dateHealthThreatStarted: Date;
      informant: string;
      otherInformant: string;
      additionalInformation: string;
      dateVerified: Date;
      isStillHappening: string;
      isReportedBefore: string;
      dateSCDSCInformed: Date;

      via: 'internet' | 'sms';
      spot?: Role['spot'];
    };
    investigationForm?: {
      user: string;
      dateSCDSCInformed: Date;
      dateInvestigationStarted: Date;
      dateEventStarted: Date;
      dateRRTNotified: Date;
      isCovid19WorkingCaseDefinitionMet: string;
      isEventSettingPromotingSpread: string;
      measureHandHygiene: string;
      measureTempScreening: string;
      measurePhysicalDistancing: string;
      measureUseOfMasks: string;
      measureVentilation: string;
      additionalInformation: string;
      riskClassification: string;
      isEventInfectious: string;
      eventCategories: string[];
      systemsAffectedByEvent: string[];
      responseActivities: string[];
      symptoms: string[];
      symptomsOther: string;
      isSamplesCollected: string;
      labResults: string;
      measureSocialDistancing: string;
      via: 'internet' | 'sms';
      spot?: Role['spot'];
    };
    responseForm?: {
      user: string;
      dateSCMOHInformed: Date;
      dateResponseStarted: Date;
      dateSamplesCollected: Date;
      dateOfTestResults: Date;
      isCovid19WorkingCaseDefinitionMet: string;
      isCIFFilledAndSamplesCollected: string;
      reasonsNoSampleCollectedOther: string;
      responseActivitiesOther: string;
      isHumansQuarantinedFollowedUp: string;
      eventStatus: string;
      responseActivities: string[];
      additionalResponseActivities: string[];
      reasonsNoSampleCollected: string[];
      humansQuarantinedSelf: number;
      humansQuarantinedSchool: number;
      humansQuarantinedInstitutional: number;
      humansIsolationSchool: number;
      humansIsolationHealthFacility: number;
      humansIsolationHome: number;
      humansIsolationInstitutional: number;
      humansDead: number;
      humansPositive: number;
      humansTested: number;
      humansCases: number;
      humansQuarantined: number;
      quarantineTypes: string[];
      isHumansIsolated: string;
      isolationTypes: string[];
      eventStatuses: string[];
      additionalInformation: string;
      via: 'internet' | 'sms';
      spot?: Role['spot'];
    };
    escalationForm?: EscalationForm;
    summaryForm?: SummaryForm;
    labForm?: LabForm;
  };
  status: 'pending' | 'completed';
  state: 'test' | 'live';
  via: 'internet' | 'sms';
  spot?: Role['spot'];
  version: string;
};

export type TaskDocument = DefaultDocument &
  Task & {
    addFields(): Promise<void>;
    getStatus(): Promise<'pending' | 'completed'>;
    toInform(): Promise<{
      type: 'reminder' | 'follow-up';
      stage:
        | 'vebs-verification'
        | 'vebs-investigation'
        | 'vebs-response'
        | 'vebs-escalation'
        | 'vebs-summary'
        | 'vebs-lab'
        | 'cebs-verification'
        | 'cebs-investigation'
        | 'cebs-response'
        | 'cebs-escalation'
        | 'cebs-summary'
        | 'cebs-lab'
        | 'hebs-verification'
        | 'hebs-investigation'
        | 'hebs-response'
        | 'hebs-escalation'
        | 'hebs-summary'
        | 'hebs-lab'
        | 'lebs-verification'
        | 'lebs-investigation'
        | 'lebs-response'
        | 'lebs-lab'
        | 'lebs-summary';

      users: UserDocument[];
    }>;
    getType(): 'CEBS' | 'HEBS' | 'VEBS' | 'LEBS';
  };

const signalId = () => generate({ length: 6, charset: '12346789ABCDEFGHJKMNPQRTWXZ' });

const taskSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    unit: { type: Schema.Types.ObjectId, required: true, ref: 'Unit' },
    signalId: {
      type: String,
      unique: true,
      default: signalId,
      uppercase: true,
      es_indexed: true,
    },
    signal: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      es_indexed: true,
      enum: [...SIGNALS.CEBS, ...SIGNALS.HEBS, ...SIGNALS.LEBS, ...SIGNALS.VEBS],
    },
    units: {
      type: [Schema.Types.ObjectId],
    },
    suggestions: {
      type: [String],
      es_indexed: true,
      es_type: 'completion',
    },
    via: { type: String, default: 'internet', enum: ['internet', 'sms'] },
    pmebs: new Schema(
      {
        reportForm: new Schema(
          {
            user: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
            dateDetected: { type: Date },
            description: { type: String },
            source: { type: String },
            unit: { type: Schema.Types.ObjectId, ref: 'Unit' },
            locality: { type: String },
            dateReported: { type: Date },
            via: { type: String, default: 'internet', enum: ['internet', 'sms'] },
            spot: {
              type: String,
              enum: [
                'HEBS',
                'LEBS',
                'CEBS',
                'EBS',
                'AHA',
                'CHA',
                'CHV',
                'VEBS',
                'VET',
                'SFP',
                'HCW',
                'PMEBS',
                'PEBS/MEBS',
                'CDR',
                'VIEWER',
              ],
            },
          },
          { timestamps: true },
        ),
        requestForm: new Schema(
          {
            user: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
            description: { type: String },
            unit: { type: Schema.Types.ObjectId, ref: 'Unit' },
            locality: { type: String },
            dateReported: { type: Date },
            dateRequested: { type: Date },
            via: { type: String, default: 'internet', enum: ['internet', 'sms'] },
            spot: {
              type: String,
              enum: [
                'HEBS',
                'LEBS',
                'CEBS',
                'EBS',
                'AHA',
                'CHA',
                'CHV',
                'VEBS',
                'VET',
                'SFP',
                'HCW',
                'PMEBS',
                'PEBS/MEBS',
                'CDR',
                'VIEWER',
              ],
            },
          },
          { timestamps: true },
        ),
      },
      { timestamps: true },
    ),
    vebs: {
      type: new Schema(
        {
          verificationForm: verificationFormSchema,
          investigationForm: investigationFormSchema,
          responseForm: responseFormSchema,
          escalationForm: escalationFormSchema,
          summaryForm: summaryFormSchema,
          labForm: labFormSchema,
        },
        { timestamps: true },
      ),
      es_indexed: false,
    },
    cebs: {
      type: new Schema(
        {
          verificationForm: verificationFormSchema,
          investigationForm: investigationFormSchema,
          responseForm: responseFormSchema,
          escalationForm: escalationFormSchema,
          summaryForm: summaryFormSchema,
          labForm: labFormSchema,
        },
        { timestamps: true },
      ),
      es_indexed: false,
    },
    hebs: {
      type: new Schema(
        {
          verificationForm: verificationFormSchema,
          investigationForm: investigationFormSchema,
          responseForm: responseFormSchema,
          escalationForm: escalationFormSchema,
          summaryForm: summaryFormSchema,
          labForm: labFormSchema,
        },
        { timestamps: true },
      ),
      es_indexed: false,
    },
    lebs: {
      type: new Schema(
        {
          verificationForm: {
            type: new Schema(
              {
                user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
                description: { type: String },
                isMatchingSignal: { type: String },
                updatedSignal: { type: String },
                dateHealthThreatStarted: { type: Date },
                informant: { type: String },
                otherInformant: { type: String },
                additionalInformation: { type: String },
                dateVerified: { type: Date },
                isStillHappening: { type: String },
                isReportedBefore: { type: String },
                dateSCDSCInformed: { type: Date },
                via: { type: String, default: 'internet', enum: ['internet', 'sms'] },
                spot: {
                  type: String,
                  enum: [
                    'HEBS',
                    'LEBS',
                    'CEBS',
                    'EBS',
                    'AHA',
                    'CHA',
                    'CHV',
                    'VEBS',
                    'VET',
                    'SFP',
                    'HCW',
                    'PMEBS',
                    'PEBS/MEBS',
                    'CDR',
                    'VIEWER',
                  ],
                },
              },
              { timestamps: true },
            ),
          },
          investigationForm: {
            type: new Schema(
              {
                user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
                dateSCDSCInformed: { type: Date },
                dateInvestigationStarted: { type: Date },
                dateEventStarted: { type: Date },
                dateRRTNotified: { type: Date },
                isCovid19WorkingCaseDefinitionMet: { type: String },
                isEventSettingPromotingSpread: { type: String },
                measureHandHygiene: { type: String },
                measureTempScreening: { type: String },
                measurePhysicalDistancing: { type: String },
                measureUseOfMasks: { type: String },
                measureVentilation: { type: String },
                additionalInformation: { type: String },
                riskClassification: { type: String },
                isEventInfectious: { type: String },
                eventCategories: { type: [String] },
                systemsAffectedByEvent: { type: [String] },
                responseActivities: { type: [String] },
                symptoms: { type: [String] },
                symptomsOther: { type: String },
                isSamplesCollected: { type: String },
                labResults: { type: String },
                measureSocialDistancing: { type: String },
                via: { type: String, default: 'internet', enum: ['internet', 'sms'] },
                spot: {
                  type: String,
                  enum: [
                    'HEBS',
                    'LEBS',
                    'CEBS',
                    'EBS',
                    'AHA',
                    'CHA',
                    'CHV',
                    'VEBS',
                    'VET',
                    'SFP',
                    'HCW',
                    'PMEBS',
                    'PEBS/MEBS',
                    'CDR',
                    'VIEWER',
                  ],
                },
              },
              { timestamps: true },
            ),
          },
          responseForm: {
            type: new Schema(
              {
                user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
                dateSCMOHInformed: { type: Date },
                dateResponseStarted: { type: Date },
                dateSamplesCollected: { type: Date },
                dateOfTestResults: { type: Date },
                isCovid19WorkingCaseDefinitionMet: { type: String },
                isCIFFilledAndSamplesCollected: { type: String },
                reasonsNoSampleCollectedOther: { type: String },
                responseActivitiesOther: { type: String },
                isHumansQuarantinedFollowedUp: { type: String },
                eventStatus: { type: String },
                responseActivities: { type: [String] },
                additionalResponseActivities: { type: [String] },
                reasonsNoSampleCollected: { type: [String] },
                humansQuarantinedSelf: { type: Number },
                humansQuarantinedSchool: { type: Number },
                humansQuarantinedInstitutional: { type: Number },
                humansIsolationSchool: { type: Number },
                humansIsolationHealthFacility: { type: Number },
                humansIsolationHome: { type: Number },
                humansIsolationInstitutional: { type: Number },
                humansDead: { type: Number },
                humansPositive: { type: Number },
                humansTested: { type: Number },
                humansCases: { type: Number },
                humansQuarantined: { type: Number },
                quarantineTypes: { type: [String] },
                isHumansIsolated: { type: String },
                isolationTypes: { type: [String] },
                eventStatuses: { type: [String] },
                additionalInformation: { type: String },
                via: { type: String, default: 'internet', enum: ['internet', 'sms'] },
                spot: {
                  type: String,
                  enum: [
                    'HEBS',
                    'LEBS',
                    'CEBS',
                    'EBS',
                    'AHA',
                    'CHA',
                    'CHV',
                    'VEBS',
                    'VET',
                    'SFP',
                    'HCW',
                    'PMEBS',
                    'PEBS/MEBS',
                    'CDR',
                    'VIEWER',
                  ],
                },
              },
              { timestamps: true },
            ),
          },
          escalationForm: escalationFormSchema,
          summaryForm: summaryFormSchema,
          labForm: labFormSchema,
        },
        { timestamps: true },
      ),
      es_indexed: false,
    },
    status: {
      type: String,
      enum: ['pending', 'completed'],
      default: 'pending',
    },
    state: {
      type: String,
      enum: ['test', 'live'],
      default: 'test',
    },
    version: {
      type: String,
      default: '1',
    },
    spot: {
      type: String,
      enum: [
        'HEBS',
        'LEBS',
        'CEBS',
        'EBS',
        'AHA',
        'CHA',
        'CHV',
        'VEBS',
        'VET',
        'SFP',
        'HCW',
        'PMEBS',
        'PEBS/MEBS',
        'CDR',
        'VIEWER',
      ],
    },
  },
  { timestamps: true },
);

taskSchema.plugin(defaultPlugin, { searchable: true });

async function addFields(): Promise<void> {
  const doc = this as TaskDocument;

  doc.status = await doc.getStatus();

  const unit = await UnitModel.findById(doc.unit);

  const units = await unit.parents();

  doc.units = [unit._id, ...units.map((_unit) => _unit._id)];

  const { signal, user: userId, state, createdAt } = doc;

  const unitId = unit._id;

  await UnitModel.updateMany(
    state === 'live'
      ? { _id: { $in: doc.units }, 'dateLastReported.live': { $lt: new Date(createdAt) } }
      : { _id: { $in: doc.units }, 'dateLastReported.test': { $lt: new Date(createdAt) } },
    state === 'live'
      ? {
          $set: { 'dateLastReported.live': new Date(createdAt) },
        }
      : {
          $set: { 'dateLastReported.test': new Date(createdAt) },
        },
  );

  const { pmebs, cebs, hebs, spot } = doc;

  // Person reporting role
  if (!spot) {
    const role = await RoleModel.findOne(
      pmebs
        ? { user: userId }
        : {
            user: userId,
            spot: {
              $in: SIGNALS.CEBS.includes(signal)
                ? ['CHA', 'AHA', 'CHV', 'CDR']
                : SIGNALS.HEBS.includes(signal)
                ? ['HCW', 'SFP']
                : SIGNALS.VEBS.includes(signal)
                ? ['VET']
                : ['LEBS'],
            },
            unit: unitId,
          },
    );

    if (role) doc.spot = role.spot;
  }

  if (cebs) {
    const { verificationForm } = cebs;

    if (verificationForm) {
      const { user: _userId, spot: _spot } = verificationForm;

      if (!_spot) {
        const role = await RoleModel.findOne({
          user: _userId,
          unit: unitId,
          role: {
            $in: ['CHA', 'AHA'],
          },
        });

        if (role) doc.cebs.verificationForm.spot = role.spot;
      }
    }
  }

  if (hebs) {
    const { verificationForm } = hebs;

    if (verificationForm) {
      const { user: _userId, spot: _spot } = verificationForm;

      if (!_spot) {
        const role = await RoleModel.findOne({
          user: _userId,
          unit: unitId,
          role: {
            $in: ['SFP'],
          },
        });

        if (role) doc.hebs.verificationForm.spot = role.spot;
      }
    }
  }

  doc.suggestions = [doc.signalId];

  await doc.save();
}

async function getStatus(): Promise<'pending' | 'completed'> {
  const { signal, cebs, hebs, lebs, vebs, version } = this as TaskDocument;

  if (SIGNALS.CEBS.includes(signal)) {
    if (!cebs) return 'pending';

    const { verificationForm, escalationForm, responseForm, investigationForm, labForm, summaryForm } = cebs;

    if (escalationForm) return 'completed';

    if (!verificationForm) return 'pending';

    const { isMatchingSignal, isReportedBefore, isThreatStillExisting } = verificationForm;

    if (isMatchingSignal === 'No') return 'completed';

    if (isReportedBefore === 'Yes') return 'completed';

    if (isThreatStillExisting === 'No') return 'completed';

    if (!investigationForm) return 'pending';

    if (version == '2') {
      const { isLabSamplesCollected } = investigationForm;

      if (isLabSamplesCollected === 'Yes' && !labForm) {
        return 'pending';
      }

      if (!responseForm) return 'pending';

      if (!summaryForm) return 'pending';

      if (!responseForm.recommendations) return 'completed';

      if (responseForm.recommendations.includes('Escalate to higher level')) return 'pending';
    } else {
      if (!responseForm) return 'pending';

      if (!responseForm.recommendations) return 'completed';

      if (responseForm.recommendations.includes('Escalate to higher level')) return 'pending';
    }

    return 'completed';
  } else if (SIGNALS.VEBS.includes(signal)) {
    if (!vebs) return 'pending';

    const { verificationForm, escalationForm, responseForm, investigationForm, labForm, summaryForm } = vebs;

    if (escalationForm) return 'completed';

    if (!verificationForm) return 'pending';

    const { isMatchingSignal, isReportedBefore, isThreatStillExisting } = verificationForm;

    if (isMatchingSignal === 'No') return 'completed';

    if (isReportedBefore === 'Yes') return 'completed';

    if (isThreatStillExisting === 'No') return 'completed';

    if (!investigationForm) return 'pending';

    if (version == '2') {
      const { isLabSamplesCollected } = investigationForm;

      if (isLabSamplesCollected === 'Yes' && !labForm) {
        return 'pending';
      }

      if (!responseForm) return 'pending';

      if (!summaryForm) return 'pending';

      if (!responseForm.recommendations) return 'completed';

      if (responseForm.recommendations.includes('Escalate to higher level')) return 'pending';
    } else {
      if (!responseForm) return 'pending';

      if (!responseForm.recommendations) return 'completed';

      if (responseForm.recommendations.includes('Escalate to higher level')) return 'pending';
    }

    return 'completed';
  } else if (SIGNALS.HEBS.includes(signal)) {
    if (!hebs) return 'pending';

    const { verificationForm, escalationForm, responseForm, investigationForm, labForm, summaryForm } = hebs;

    if (escalationForm) return 'completed';

    if (!verificationForm) return 'pending';

    const { isMatchingSignal, isReportedBefore, isThreatStillExisting } = verificationForm;

    if (isMatchingSignal === 'No') return 'completed';

    if (isReportedBefore === 'Yes') return 'completed';

    if (isThreatStillExisting === 'No') return 'completed';

    if (!investigationForm) return 'pending';

    if (version == '2') {
      const { isLabSamplesCollected } = investigationForm;

      if (isLabSamplesCollected === 'Yes' && !labForm) {
        return 'pending';
      }

      if (!responseForm) return 'pending';

      if (!summaryForm) return 'pending';

      if (!responseForm.recommendations) return 'completed';

      if (responseForm.recommendations.includes('Escalate to higher level')) return 'pending';
    } else {
      if (!responseForm) return 'pending';

      if (!responseForm.recommendations) return 'completed';

      if (responseForm.recommendations.includes('Escalate to higher level')) return 'pending';
    }

    return 'completed';
  } else if (SIGNALS.LEBS.includes(signal)) {
    if (!lebs) return 'pending';

    const { responseForm, verificationForm, investigationForm, summaryForm } = lebs;

    if (responseForm) return 'completed';

    if (!verificationForm) return 'pending';

    const { isMatchingSignal, isReportedBefore, isStillHappening } = verificationForm;

    if (isMatchingSignal === 'No') return 'completed';

    if (isStillHappening === 'No') return 'completed';

    if (isReportedBefore === 'Yes') return 'completed';

    if (!investigationForm) return 'pending';

    if (version == '2') {
      const { isCovid19WorkingCaseDefinitionMet } = investigationForm;

      if (isCovid19WorkingCaseDefinitionMet === 'No') return 'completed';

      if (!summaryForm) return 'pending';

      return 'pending';
    } else {
      const { isCovid19WorkingCaseDefinitionMet } = investigationForm;

      if (isCovid19WorkingCaseDefinitionMet === 'No') return 'completed';

      return 'pending';
    }
  }

  return 'completed';
}

async function toInform(): Promise<{
  type: 'reminder' | 'follow-up';
  stage:
    | 'vebs-verification'
    | 'vebs-investigation'
    | 'vebs-response'
    | 'vebs-escalation'
    | 'vebs-summary'
    | 'vebs-lab'
    | 'cebs-verification'
    | 'cebs-investigation'
    | 'cebs-response'
    | 'cebs-escalation'
    | 'cebs-summary'
    | 'cebs-lab'
    | 'hebs-verification'
    | 'hebs-investigation'
    | 'hebs-response'
    | 'hebs-escalation'
    | 'hebs-summary'
    | 'hebs-lab'
    | 'lebs-verification'
    | 'lebs-investigation'
    | 'lebs-response'
    | 'lebs-summary'
    | 'lebs-lab';
  users: UserDocument[];
}> {
  const doc = this as TaskDocument;

  if (doc.status == 'completed') throw new Error('The task has been completed');

  const { signal, cebs, hebs, lebs, createdAt, vebs, version } = doc;

  const unitId = doc.populated('unit') || doc.unit;

  if (SIGNALS.CEBS.includes(signal)) {
    if (!cebs || !cebs.verificationForm) {
      if (moment().isBefore(moment(createdAt).add(TASK_REMINDER_ESCALATE_AFTER, TASK_REMINDER_UNITS))) {
        let roles = await RoleModel.find({
          unit: unitId,
          status: 'active',
          spot: {
            $in: ['CHA'],
          },
        })
          .populate([{ path: 'user' }])
          .limit(1);

        if (!roles.length)
          roles = await RoleModel.find({
            unit: unitId,
            status: 'active',
            spot: {
              $in: ['AHA', 'CHA'],
            },
          })
            .populate([{ path: 'user' }])
            .limit(1);

        return {
          type: 'reminder',
          stage: 'cebs-verification',
          users: roles.map((role) => (role.user as unknown) as UserDocument),
        };
      } else {
        const { parent } = await UnitModel.findById(unitId);

        let roles = await RoleModel.find({
          unit: parent,
          status: 'active',
          spot: {
            $in: ['CEBS'],
          },
        })
          .populate([{ path: 'user' }])
          .limit(1);

        if (!roles.length)
          roles = await RoleModel.find({
            unit: parent,
            status: 'active',
            spot: {
              $in: ['CEBS', 'EBS'],
            },
          })
            .populate([{ path: 'user' }])
            .limit(1);

        return {
          type: 'follow-up',
          stage: 'cebs-verification',
          users: roles.map((role) => (role.user as unknown) as UserDocument),
        };
      }
    } else if (!cebs.investigationForm) {
      const { parent } = await UnitModel.findById(unitId);

      let roles = await RoleModel.find({
        unit: parent,
        status: 'active',
        spot: {
          $in: ['CEBS'],
        },
      })
        .populate([{ path: 'user' }])
        .limit(1);

      if (!roles.length)
        roles = await RoleModel.find({
          unit: parent,
          status: 'active',
          spot: {
            $in: ['EBS', 'CEBS'],
          },
        })
          .populate([{ path: 'user' }])
          .limit(1);

      return {
        type: 'reminder',
        stage: 'cebs-investigation',
        users: roles.map((role) => (role.user as unknown) as UserDocument),
      };
    } else if (!cebs.responseForm) {
      const { parent } = await UnitModel.findById(unitId);

      let roles = await RoleModel.find({
        unit: parent,
        status: 'active',
        spot: {
          $in: ['CEBS'],
        },
      })
        .populate([{ path: 'user' }])
        .limit(1);

      if (!roles.length)
        roles = await RoleModel.find({
          unit: parent,
          status: 'active',
          spot: {
            $in: ['EBS', 'CEBS'],
          },
        })
          .populate([{ path: 'user' }])
          .limit(1);

      return {
        type: 'reminder',
        stage: 'cebs-response',
        users: roles.map((role) => (role.user as unknown) as UserDocument),
      };
    } else if (cebs.investigationForm.isLabSamplesCollected == 'Yes' && version == '2' && !cebs.labForm) {
      const { parent } = await UnitModel.findById(unitId);

      let roles = await RoleModel.find({
        unit: parent,
        status: 'active',
        spot: {
          $in: ['CEBS'],
        },
      })
        .populate([{ path: 'user' }])
        .limit(1);

      if (!roles.length)
        roles = await RoleModel.find({
          unit: parent,
          status: 'active',
          spot: {
            $in: ['EBS', 'CEBS'],
          },
        })
          .populate([{ path: 'user' }])
          .limit(1);

      return {
        type: 'reminder',
        stage: 'cebs-lab',
        users: roles.map((role) => (role.user as unknown) as UserDocument),
      };
    } else if (version == '2' && !cebs.summaryForm) {
      const { parent } = await UnitModel.findById(unitId);

      let roles = await RoleModel.find({
        unit: parent,
        status: 'active',
        spot: {
          $in: ['CEBS'],
        },
      })
        .populate([{ path: 'user' }])
        .limit(1);

      if (!roles.length)
        roles = await RoleModel.find({
          unit: parent,
          status: 'active',
          spot: {
            $in: ['EBS', 'CEBS'],
          },
        })
          .populate([{ path: 'user' }])
          .limit(1);

      return {
        type: 'reminder',
        stage: 'cebs-summary',
        users: roles.map((role) => (role.user as unknown) as UserDocument),
      };
    } else if (!cebs.escalationForm) {
      const { parent } = await UnitModel.findById(unitId);

      let roles = await RoleModel.find({
        unit: parent,
        status: 'active',
        spot: {
          $in: ['CEBS'],
        },
      })
        .populate([{ path: 'user' }])
        .limit(1);

      if (!roles.length)
        roles = await RoleModel.find({
          unit: parent,
          status: 'active',
          spot: {
            $in: ['EBS', 'CEBS'],
          },
        })
          .populate([{ path: 'user' }])
          .limit(1);

      return {
        type: 'reminder',
        stage: 'cebs-escalation',
        users: roles.map((role) => (role.user as unknown) as UserDocument),
      };
    }
  } else if (SIGNALS.VEBS.includes(signal)) {
    if (!vebs || !vebs.verificationForm) {
      const { parent } = await UnitModel.findById(unitId);

      let roles = await RoleModel.find({
        unit: parent,
        status: 'active',
        spot: {
          $in: ['VEBS'],
        },
      })
        .populate([{ path: 'user' }])
        .limit(1);

      if (!roles.length)
        roles = await RoleModel.find({
          unit: parent,
          status: 'active',
          spot: {
            $in: ['VEBS', 'EBS'],
          },
        })
          .populate([{ path: 'user' }])
          .limit(1);

      return {
        type: moment().isBefore(moment(createdAt).add(TASK_REMINDER_ESCALATE_AFTER, TASK_REMINDER_UNITS))
          ? 'reminder'
          : 'follow-up',
        stage: 'vebs-verification',
        users: roles.map((role) => (role.user as unknown) as UserDocument),
      };
    } else if (!vebs.investigationForm) {
      const { parent } = await UnitModel.findById(unitId);

      let roles = await RoleModel.find({
        unit: parent,
        status: 'active',
        spot: {
          $in: ['VEBS'],
        },
      })
        .populate([{ path: 'user' }])
        .limit(1);

      if (!roles.length)
        roles = await RoleModel.find({
          unit: parent,
          status: 'active',
          spot: {
            $in: ['VEBS', 'EBS'],
          },
        })
          .populate([{ path: 'user' }])
          .limit(1);

      return {
        type: 'reminder',
        stage: 'vebs-investigation',
        users: roles.map((role) => (role.user as unknown) as UserDocument),
      };
    } else if (!vebs.responseForm) {
      const { parent } = await UnitModel.findById(unitId);

      let roles = await RoleModel.find({
        unit: parent,
        status: 'active',
        spot: {
          $in: ['VEBS'],
        },
      })
        .populate([{ path: 'user' }])
        .limit(1);

      if (!roles.length)
        roles = await RoleModel.find({
          unit: parent,
          status: 'active',
          spot: {
            $in: ['VEBS', 'EBS'],
          },
        })
          .populate([{ path: 'user' }])
          .limit(1);

      return {
        type: 'reminder',
        stage: 'vebs-response',
        users: roles.map((role) => (role.user as unknown) as UserDocument),
      };
    } else if (vebs.investigationForm.isLabSamplesCollected == 'Yes' && version == '2' && !vebs.labForm) {
      const { parent } = await UnitModel.findById(unitId);

      let roles = await RoleModel.find({
        unit: parent,
        status: 'active',
        spot: {
          $in: ['VEBS'],
        },
      })
        .populate([{ path: 'user' }])
        .limit(1);

      if (!roles.length)
        roles = await RoleModel.find({
          unit: parent,
          status: 'active',
          spot: {
            $in: ['EBS', 'VEBS'],
          },
        })
          .populate([{ path: 'user' }])
          .limit(1);

      return {
        type: 'reminder',
        stage: 'vebs-lab',
        users: roles.map((role) => (role.user as unknown) as UserDocument),
      };
    } else if (version == '2' && !vebs.summaryForm) {
      const { parent } = await UnitModel.findById(unitId);

      let roles = await RoleModel.find({
        unit: parent,
        status: 'active',
        spot: {
          $in: ['VEBS'],
        },
      })
        .populate([{ path: 'user' }])
        .limit(1);

      if (!roles.length)
        roles = await RoleModel.find({
          unit: parent,
          status: 'active',
          spot: {
            $in: ['EBS', 'VEBS'],
          },
        })
          .populate([{ path: 'user' }])
          .limit(1);

      return {
        type: 'reminder',
        stage: 'vebs-summary',
        users: roles.map((role) => (role.user as unknown) as UserDocument),
      };
    } else if (!vebs.escalationForm) {
      const { parent } = await UnitModel.findById(unitId);

      let roles = await RoleModel.find({
        unit: parent,
        status: 'active',
        spot: {
          $in: ['VEBS'],
        },
      })
        .populate([{ path: 'user' }])
        .limit(1);

      if (!roles.length)
        roles = await RoleModel.find({
          unit: parent,
          status: 'active',
          spot: {
            $in: ['VEBS', 'EBS'],
          },
        })
          .populate([{ path: 'user' }])
          .limit(1);

      return {
        type: 'reminder',
        stage: 'vebs-escalation',
        users: roles.map((role) => (role.user as unknown) as UserDocument),
      };
    }
  } else if (SIGNALS.HEBS.includes(signal)) {
    if (!hebs || !hebs.verificationForm) {
      if (moment().isBefore(moment(createdAt).add(TASK_REMINDER_ESCALATE_AFTER, TASK_REMINDER_UNITS))) {
        const roles = await RoleModel.find({
          unit: unitId,
          status: 'active',
          spot: {
            $in: ['SFP'],
          },
        })
          .populate([{ path: 'user' }])
          .limit(1);

        return {
          type: 'reminder',
          stage: 'hebs-verification',
          users: roles.map((role) => (role.user as unknown) as UserDocument),
        };
      } else if (hebs) {
        const { parent } = await UnitModel.findById(unitId);

        let roles = await RoleModel.find({
          unit: parent,
          status: 'active',
          spot: {
            $in: ['HEBS'],
          },
        })
          .populate([{ path: 'user' }])
          .limit(1);

        if (!roles.length)
          roles = await RoleModel.find({
            unit: parent,
            status: 'active',
            spot: {
              $in: ['HEBS', 'EBS'],
            },
          })
            .populate([{ path: 'user' }])
            .limit(1);

        return {
          type: 'follow-up',
          stage: 'hebs-verification',
          users: roles.map((role) => (role.user as unknown) as UserDocument),
        };
      }
    } else if (!hebs.investigationForm) {
      const { parent } = await UnitModel.findById(unitId);

      let roles = await RoleModel.find({
        unit: parent,
        status: 'active',
        spot: {
          $in: ['HEBS'],
        },
      })
        .populate([{ path: 'user' }])
        .limit(1);

      if (!roles.length)
        roles = await RoleModel.find({
          unit: parent,
          status: 'active',
          spot: {
            $in: ['HEBS', 'EBS'],
          },
        })
          .populate([{ path: 'user' }])
          .limit(1);

      return {
        type: 'reminder',
        stage: 'hebs-investigation',
        users: roles.map((role) => (role.user as unknown) as UserDocument),
      };
    } else if (!hebs.responseForm) {
      const { parent } = await UnitModel.findById(unitId);

      let roles = await RoleModel.find({
        unit: parent,
        status: 'active',
        spot: {
          $in: ['HEBS'],
        },
      })
        .populate([{ path: 'user' }])
        .limit(1);

      if (!roles.length)
        roles = await RoleModel.find({
          unit: parent,
          status: 'active',
          spot: {
            $in: ['HEBS', 'EBS'],
          },
        })
          .populate([{ path: 'user' }])
          .limit(1);

      return {
        type: 'reminder',
        stage: 'hebs-response',
        users: roles.map((role) => (role.user as unknown) as UserDocument),
      };
    } else if (hebs.investigationForm.isLabSamplesCollected == 'Yes' && version == '2' && !hebs.labForm) {
      const { parent } = await UnitModel.findById(unitId);

      let roles = await RoleModel.find({
        unit: parent,
        status: 'active',
        spot: {
          $in: ['HEBS'],
        },
      })
        .populate([{ path: 'user' }])
        .limit(1);

      if (!roles.length)
        roles = await RoleModel.find({
          unit: parent,
          status: 'active',
          spot: {
            $in: ['EBS', 'HEBS'],
          },
        })
          .populate([{ path: 'user' }])
          .limit(1);

      return {
        type: 'reminder',
        stage: 'hebs-lab',
        users: roles.map((role) => (role.user as unknown) as UserDocument),
      };
    } else if (version == '2' && !hebs.summaryForm) {
      const { parent } = await UnitModel.findById(unitId);

      let roles = await RoleModel.find({
        unit: parent,
        status: 'active',
        spot: {
          $in: ['HEBS'],
        },
      })
        .populate([{ path: 'user' }])
        .limit(1);

      if (!roles.length)
        roles = await RoleModel.find({
          unit: parent,
          status: 'active',
          spot: {
            $in: ['EBS', 'HEBS'],
          },
        })
          .populate([{ path: 'user' }])
          .limit(1);

      return {
        type: 'reminder',
        stage: 'hebs-summary',
        users: roles.map((role) => (role.user as unknown) as UserDocument),
      };
    } else if (!hebs.escalationForm) {
      const { parent } = await UnitModel.findById(unitId);

      let roles = await RoleModel.find({
        unit: parent,
        status: 'active',
        spot: {
          $in: ['HEBS'],
        },
      })
        .populate([{ path: 'user' }])
        .limit(1);

      if (!roles.length)
        roles = await RoleModel.find({
          unit: parent,
          status: 'active',
          spot: {
            $in: ['HEBS', 'EBS'],
          },
        })
          .populate([{ path: 'user' }])
          .limit(1);

      return {
        type: 'reminder',
        stage: 'hebs-escalation',
        users: roles.map((role) => (role.user as unknown) as UserDocument),
      };
    }
  } else if (SIGNALS.LEBS.includes(signal)) {
    if (!lebs || !lebs.verificationForm) {
      const { parent } = await UnitModel.findById(unitId);

      let roles = await RoleModel.find({
        unit: parent,
        status: 'active',
        spot: {
          $in: ['LEBS'],
        },
      })
        .populate([{ path: 'user' }])
        .limit(1);

      if (!roles.length)
        roles = await RoleModel.find({
          unit: parent,
          status: 'active',
          spot: {
            $in: ['LEBS', 'EBS'],
          },
        })
          .populate([{ path: 'user' }])
          .limit(1);

      return {
        type: moment().isBefore(moment(createdAt).add(TASK_REMINDER_ESCALATE_AFTER, TASK_REMINDER_UNITS))
          ? 'reminder'
          : 'follow-up',
        stage: 'lebs-verification',
        users: roles.map((role) => (role.user as unknown) as UserDocument),
      };
    } else if (!lebs.investigationForm) {
      const { parent } = await UnitModel.findById(unitId);

      let roles = await RoleModel.find({
        unit: parent,
        status: 'active',
        spot: {
          $in: ['LEBS'],
        },
      })
        .populate([{ path: 'user' }])
        .limit(1);

      if (!roles.length)
        roles = await RoleModel.find({
          unit: parent,
          status: 'active',
          spot: {
            $in: ['LEBS', 'EBS'],
          },
        })
          .populate([{ path: 'user' }])
          .limit(1);

      return {
        type: 'reminder',
        stage: 'lebs-investigation',
        users: roles.map((role) => (role.user as unknown) as UserDocument),
      };
    } else if (!lebs.responseForm) {
      const { parent } = await UnitModel.findById(unitId);

      let roles = await RoleModel.find({
        unit: parent,
        status: 'active',
        spot: {
          $in: ['LEBS'],
        },
      })
        .populate([{ path: 'user' }])
        .limit(1);

      if (!roles.length)
        roles = await RoleModel.find({
          unit: parent,
          status: 'active',
          spot: {
            $in: ['LEBS', 'EBS'],
          },
        })
          .populate([{ path: 'user' }])
          .limit(1);

      return {
        type: 'reminder',
        stage: 'lebs-response',
        users: roles.map((role) => (role.user as unknown) as UserDocument),
      };
    } else if (version == '2' && !lebs.summaryForm) {
      const { parent } = await UnitModel.findById(unitId);

      let roles = await RoleModel.find({
        unit: parent,
        status: 'active',
        spot: {
          $in: ['LEBS'],
        },
      })
        .populate([{ path: 'user' }])
        .limit(1);

      if (!roles.length)
        roles = await RoleModel.find({
          unit: parent,
          status: 'active',
          spot: {
            $in: ['EBS', 'LEBS'],
          },
        })
          .populate([{ path: 'user' }])
          .limit(1);

      return {
        type: 'reminder',
        stage: 'lebs-summary',
        users: roles.map((role) => (role.user as unknown) as UserDocument),
      };
    }
  }

  throw new Error('The task has been completed');
}

function getType(): 'CEBS' | 'HEBS' | 'VEBS' | 'LEBS' {
  const { signal } = this as TaskDocument;

  if (SIGNALS.CEBS.includes(signal)) {
    return 'CEBS';
  } else if (SIGNALS.VEBS.includes(signal)) {
    return 'VEBS';
  } else if (SIGNALS.HEBS.includes(signal)) {
    return 'HEBS';
  } else if (SIGNALS.LEBS.includes(signal)) {
    return 'LEBS';
  }

  throw new Error('Unknown signal code');
}

taskSchema.methods = { ...taskSchema.methods, ...{ addFields, toInform, getStatus, getType } };

export const TaskModel = model<TaskDocument, PagedModel<TaskDocument> & SearchableModel<TaskDocument>>(
  'Task',
  taskSchema,
);

initSearch(TaskModel);

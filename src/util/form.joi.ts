import { joi } from './joi';

export const escalationFormJoi = joi.object({
  eventType: joi.string(),
  dateResponseStarted: joi.date().iso(),
  reason: joi.string(),
  reasonOther: joi.string(),
  dateEscalated: joi.date().iso(),
});

export const investigationFormJoi = joi.object({
  dateSCDSCInformed: joi.date().iso(),
  dateInvestigationStarted: joi.date().iso(),
  dateEventStarted: joi.date().iso(),
  symptoms: joi.string(),
  humansCases: joi.number(),
  humansCasesHospitalized: joi.number(),
  humansDead: joi.number(),
  animalsCases: joi.number(),
  animalsDead: joi.number(),
  isCauseKnown: joi.string(),
  cause: joi.string(),
  isLabSamplesCollected: joi.string(),
  dateSampleCollected: joi.date().iso(),
  labResults: joi.string(),
  dateLabResultsReceived: joi.date().iso(),
  isNewCasedReportedFromInitialArea: joi.string(),
  isNewCasedReportedFromNewAreas: joi.string(),
  isEventSettingPromotingSpread: joi.string(),
  additionalInformation: joi.string(),
  riskClassification: joi.string(),
  responseActivities: joi.array().items(joi.string()),
  dateSCMOHInformed: joi.date().iso(),
});

export const investigationFormJoiV2 = joi.object({
  dateSCDSCInformed: joi.date().iso(),
  dateInvestigationStarted: joi.date().iso(),
  dateEventStarted: joi.date().iso(),
  symptoms: joi.string(),
  humansCases: joi.number(),
  humansCasesHospitalized: joi.number(),
  humansDead: joi.number(),
  animalsCases: joi.number(),
  animalsDead: joi.number(),
  isCauseKnown: joi.string(),
  cause: joi.string(),
  isLabSamplesCollected: joi.string(),
  dateSampleCollected: joi.date().iso(),
  labResults: joi.string(),
  dateLabResultsReceived: joi.date().iso(),
  isNewCasedReportedFromInitialArea: joi.string(),
  isNewCasedReportedFromNewAreas: joi.string(),
  isEventSettingPromotingSpread: joi.string(),
  additionalInformation: joi.string(),
  riskClassification: joi.string(),
  isEventInfectious: joi.string(),
  eventCategories: joi.array().items(joi.string()),
  systemsAffectedByEvent: joi.array().items(joi.string()),
  responseActivities: joi.array().items(joi.string()),
  dateSCMOHInformed: joi.date().iso(),
});

export const responseFormJoi = joi.object({
  eventType: joi.string(),
  dateSCMOHInformed: joi.date().iso(),
  dateResponseStarted: joi.date().iso(),
  responseActivities: joi.array().items(joi.string()),
  outcomeOfResponse: joi.string(),
  otherResponseActivity: joi.string(),
  recommendations: joi.array().items(joi.string()),
  dateEscalated: joi.date().iso(),
  dateOfReport: joi.date().iso(),
  additionalInformation: joi.string(),
});

export const verificationFormJoi = joi.object({
  source: joi.string(),
  description: joi.string(),
  isMatchingSignal: joi.string(),
  updatedSignal: joi.string(),
  isReportedBefore: joi.string(),
  dateHealthThreatStarted: joi.date().iso(),
  informant: joi.string(),
  otherInformant: joi.string(),
  additionalInformation: joi.string(),
  dateVerified: joi.date().iso(),
  isThreatStillExisting: joi.string(),
  threatTo: joi.string(),
  dateSCDSCInformed: joi.date().iso(),
});

export const summaryFormJoi = joi.object({
  cause: joi.string(),
  eventStatus: joi.string(),
  escalatedTo: joi.string(),
});

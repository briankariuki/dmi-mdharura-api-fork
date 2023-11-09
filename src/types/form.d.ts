export type EscalationForm = {
  user: string;
  eventType: string;
  dateResponseStarted: Date;
  reason: string;
  reasonOther: string;
  dateEscalated: Date;
  via: 'internet' | 'sms';
};

export type InvestigationForm = {
  user: string;
  dateSCDSCInformed: Date;
  dateInvestigationStarted: Date;
  dateEventStarted: Date;
  symptoms: string;
  humansCases: number;
  humansCasesHospitalized: number;
  humansDead: number;
  animalsCases: number;
  animalsDead: number;
  isCauseKnown: string;
  cause: string;
  isLabSamplesCollected: string;
  dateSampleCollected: Date;
  labResults: string;
  dateLabResultsReceived: Date;
  isNewCasedReportedFromInitialArea: string;
  isNewCasedReportedFromNewAreas: string;
  isEventSettingPromotingSpread: string;
  additionalInformation: string;
  riskClassification: string;
  isEventInfectious: string;
  eventCategories: string[];
  systemsAffectedByEvent: string[];
  responseActivities: string[];
  dateSCMOHInformed: Date;
  via: 'internet' | 'sms';
  spot?: Role['spot'];
};

export type ResponseForm = {
  user: string;
  eventType: string;
  dateSCMOHInformed: Date;
  dateResponseStarted: Date;
  responseActivities: string[];
  otherResponseActivity: string;
  outcomeOfResponse: string;
  recommendations: string[];
  dateEscalated: Date;
  dateOfReport: Date;
  additionalInformation: string;
  via: 'internet' | 'sms';
  spot?: Role['spot'];
};

export type VerificationForm = {
  user: string;
  source: string;
  description: string;
  isMatchingSignal: string;
  updatedSignal: string;
  isReportedBefore: string;
  dateHealthThreatStarted: Date;
  informant: string;
  otherInformant: string;
  additionalInformation: string;
  dateVerified: Date;
  isThreatStillExisting: string;
  threatTo: string;
  dateSCDSCInformed: Date;
  via: 'internet' | 'sms';
  spot?: Role['spot'];
};

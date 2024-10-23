export type EbsConnectDocument = {
  ID?: string;
  UNIT_NAME: string;
  UNIT_CODE: string;
  UNIT_UID: string;
  SIGNAL_ID: string;
  SIGNAL: number;
  REPORTED_BY: string;
  REPORTED_BY_PHONE: string;
  DATE_REPORTED: string;
  CHA_NAME: string;
  CHA_PHONE: string;
  SOURCE: string;
  CREATED_AT?: string;
  UPDATED_AT?: string;
  VERIFIED?: boolean;
  VERIFIED_TRUE?: boolean;
  DATE_VERIFIED?: string;
  VERIFIED_BY_NAME?: string;
  VERIFIED_BY_PHONE?: string;
};

export type EbsConnectMessage = {
  schema: string;
  table: string;
  commit_timestamp: string;
  eventType: string;
  new: EbsConnectDocument;
  old: Pick<EbsConnectDocument, 'ID'>;
  errors: any;
};

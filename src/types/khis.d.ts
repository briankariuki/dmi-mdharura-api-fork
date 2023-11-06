export type KHIS_Wards = {
  organisationunitid: string;
  uid: string;
  wardcode: string;
  level: string;
  ward: string;
  subcounty: string;
  subcountycode: string;
  subcountyuid: string;
  county: string;
  countycode: string;
  countyuid: string;
  national: string;
  nationaluid: string;
}[];

export type KHIS_HealthFacilities = {
  uid: string;
  mflcode: number;
  facility: string;
  level: number;
  ward: string;
  wardid: string;
  subcounty: string;
  subcountyid: string;
  county: string;
  countyid: string;
}[];

export type KHIS_CommunityUnits = {
  hierarchylevel: number;
  uid: string;
  code: number;
  level1name: string;
  level2name: string;
  code__1: number;
  level3name: string;
  code__2: string;
  level4name: string;
  code__3: string;
  level5name: string;
  code__4: string;
}[];

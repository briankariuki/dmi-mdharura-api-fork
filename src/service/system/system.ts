import { inject, injectable } from 'inversify';
import { logger } from '../../loader/logger';
import { SYSTEM_ADMIN_DISPLAY_NAME, SYSTEM_ADMIN_PHONE_NUMBER, SYSTEM_ADMIN_SPOT } from '../../config/system';
import { TaskAgendaEmitter } from '../../agenda/task/task';
import { UserService } from '../user/user';
import { UnitService } from '../unit/unit';
import khisWards from './ward.json';
import khisHealthFacilities from './healthFacility.json';
import khisCommunityUnits from './communityUnit.json';
import { UnitModel } from '../../model/unit/unit';
import { KHIS_Wards, KHIS_HealthFacilities, KHIS_CommunityUnits } from '../../types/khis';
import { UNIT_SYNC } from '../../config/unit';

const { KHIS_Wards } = (khisWards as unknown) as { KHIS_Wards: KHIS_Wards };

const { KHIS_HealthFacilities } = (khisHealthFacilities as unknown) as { KHIS_HealthFacilities: KHIS_HealthFacilities };

const { KHIS_CommunityUnits } = (khisCommunityUnits as unknown) as {
  KHIS_CommunityUnits: KHIS_CommunityUnits;
};

@injectable()
export class SystemService {
  @inject(TaskAgendaEmitter)
  taskAgendaEmitter: TaskAgendaEmitter;

  @inject(UserService)
  userService: UserService;

  @inject(UnitService)
  unitService: UnitService;

  async init(): Promise<void> {
    try {
      if (UNIT_SYNC === 'enabled')
        try {
          logger.info('SYSTEM_INIT_WARDS %o', KHIS_Wards.length);

          let wardCount = 1;

          for (const ward of KHIS_Wards) {
            let country = await UnitModel.findOne({ type: 'Country' });

            if (!country)
              country = await this.unitService.create({
                name: ward.national,
                type: 'Country',
              });

            let county = await UnitModel.findOne({ code: ward.countycode });

            if (!county)
              county = await this.unitService.create({
                name: ward.county,
                type: 'County',
                code: ward.countycode,
                uid: ward.countyuid,
                parent: country._id,
              });
            else
              county = await this.unitService.update(county._id, {
                name: ward.county,
                type: 'County',
                code: ward.countycode,
                uid: ward.countyuid,
                parent: country._id,
              });

            let subCounty = await UnitModel.findOne({ code: ward.subcountycode });

            if (!subCounty)
              subCounty = await this.unitService.create({
                name: ward.subcounty,
                type: 'Subcounty',
                code: ward.subcountycode,
                uid: ward.subcountyuid,
                parent: county._id,
              });
            else
              subCounty = await this.unitService.update(subCounty._id, {
                name: ward.subcounty,
                type: 'Subcounty',
                code: ward.subcountycode,
                uid: ward.subcountyuid,
                parent: county._id,
              });

            let ward_ = await UnitModel.findOne({ code: ward.wardcode });

            if (!ward_) {
              ward_ = await this.unitService.create({
                name: ward.ward,
                type: 'Ward',
                code: ward.wardcode,
                uid: ward.organisationunitid,
                parent: subCounty._id,
              });

              logger.info('SYSTEM_INIT_WARD_CREATED %o : %o', wardCount, KHIS_Wards.length);
            } else {
              ward_ = await this.unitService.update(ward_._id, {
                name: ward.ward,
                type: 'Ward',
                code: ward.wardcode,
                uid: ward.organisationunitid,
                parent: subCounty._id,
              });

              logger.info('SYSTEM_INIT_WARD_UPDATED %o : %o', wardCount, KHIS_Wards.length);
            }

            wardCount += 1;
          }

          logger.info('SYSTEM_INIT_HEALTH_FACILITIES %o', KHIS_HealthFacilities.length);

          let healthFacilityCount = 1;

          for (const healthFacility of KHIS_HealthFacilities) {
            let healthFacility_ = await UnitModel.findOne({
              $or: [{ uid: healthFacility.uid }],
            });

            const subCounty = await UnitModel.findOne({ code: healthFacility.subcountyid });

            if (!healthFacility_) {
              try {
                healthFacility_ = await this.unitService.create({
                  name: healthFacility.facility,
                  type: 'Health facility',
                  code: healthFacility.mflcode.toString(),
                  uid: healthFacility.uid,
                  parent: subCounty._id,
                });

                logger.info(
                  'SYSTEM_INIT_HEALTH_FACILITY_CREATED %o : %o',
                  healthFacilityCount,
                  KHIS_HealthFacilities.length,
                );
              } catch (error) {
                logger.error('SYSTEM_INIT_HEALTH_FACILITY_CREATED %o', error);
              }
            } else {
              healthFacility_ = await this.unitService.update(healthFacility_._id, {
                name: healthFacility.facility,
                type: 'Health facility',
                code: healthFacility.mflcode.toString(),
                uid: healthFacility.uid,
                parent: subCounty._id,
              });

              logger.info(
                'SYSTEM_INIT_HEALTH_FACILITY_UPDATED %o : %o',
                healthFacilityCount,
                KHIS_HealthFacilities.length,
              );
            }

            healthFacilityCount += 1;
          }

          logger.info('SYSTEM_INIT_COMMUNITY_UNITS %o', KHIS_CommunityUnits.length);

          let communityUnitCount = 1;

          for (const communityUnit of KHIS_CommunityUnits) {
            let communityUnit_ = await UnitModel.findOne({ uid: communityUnit.uid });

            const subCounty = await UnitModel.findOne({ code: communityUnit.code__3 });

            if (!communityUnit_) {
              try {
                communityUnit_ = await this.unitService.create({
                  name: communityUnit.level1name,
                  type: 'Community unit',
                  code: communityUnit.code.toString(),
                  uid: communityUnit.uid,
                  parent: subCounty._id,
                });

                logger.info(
                  'SYSTEM_INIT_COMMUNITY_UNIT_CREATED %o : %o',
                  communityUnitCount,
                  KHIS_CommunityUnits.length,
                );
              } catch (error) {
                logger.error('SYSTEM_INIT_COMMUNITY_UNIT_CREATED %o', error);
              }
            } else {
              communityUnit_ = await this.unitService.update(communityUnit_._id, {
                name: communityUnit.level1name,
                type: 'Community unit',
                code: communityUnit.code.toString(),
                uid: communityUnit.uid,
                parent: subCounty._id,
              });

              logger.info('SYSTEM_INIT_COMMUNITY_UNIT_UPDATED %o : %o', communityUnitCount, KHIS_CommunityUnits.length);
            }

            communityUnitCount += 1;
          }

          const { _id: unitId } = await this.unitService.findOne({ type: 'Country' });

          try {
            await this.userService.create({
              displayName: SYSTEM_ADMIN_DISPLAY_NAME,
              phoneNumber: SYSTEM_ADMIN_PHONE_NUMBER,
              unit: unitId,
              spot: SYSTEM_ADMIN_SPOT as any,
            });

            logger.info('SYSTEM_INIT_USER_CREATED');
          } catch (error) {
            logger.error('SYSTEM_INIT_USER_EXISTS');
          }
        } catch (error) {
          logger.error('SYSTEM_UNIT_SYNC_ERROR %o', error);
        }

      await this.taskAgendaEmitter.start();

      logger.info('SYSTEM_INIT_AGENDA_STARTED');
    } catch (error) {
      logger.error('SYSTEM_INIT_ERROR %o', error);
    }
  }
}

/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 *  repository class that use handle the request-response lifecycle for API for the master data model
 */

/**
 * @class master data repository
 * purpose of master data repository is performing crud operations
 * @description repository class that use handle the request-response lifecycle for API for the master data model
 * @author chamath
 */
import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {MongoDataSource} from '../datasources';
import {MasterData, MasterDataRelations} from '../models';
import {augmentationMasterDataId} from '../settings/constants';
export class MasterDataRepository extends DefaultCrudRepository<
  MasterData,
  typeof MasterData.prototype.id,
  MasterDataRelations
> {
  constructor(@inject('datasources.mongo') dataSource: MongoDataSource) {
    super(MasterData, dataSource);
  }

  /**
   * Use for query data from method of aggregate
   * @param params {string[]} parameters for aggregate the database
   * @returns filtered data from database
   */
  public async aggregateMasterData(params?: any[]) {
    if (!params) params = [];
    const response = await (this.dataSource.connector as any)
      .collection('MasterData')
      .aggregate(params)
      .get();
    return response;
  }

  /**
   * Get the augmentation type list
   * @returns augmentation list
   */
  async augmentationTypeList() {
    let _augmentationList = await this.findById(augmentationMasterDataId);
    // let augmentationList: any[] = [];
    // if (listType == LevelAugmentation.IMAGE) augmentationList = _augmentationList.augmentationTypes?.IMAGE_LEVEL!;
    // else if (listType == LevelAugmentation.BOUNDING_BOX) augmentationList = _augmentationList.augmentationTypes?.BOUNDING_BOX_LEVEL!;
    return _augmentationList.augmentationTypes;
  }
  /**
   * Get the exort formats list
   */
  async getExportFormats() {
    let masterdata = await this.findById(augmentationMasterDataId);
    return masterdata.exportFormats;
  }
}

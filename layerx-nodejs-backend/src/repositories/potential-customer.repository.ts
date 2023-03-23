/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 *  repository class that use handle the request-response lifecycle for API for the potential  customer model
 */

/**
 * @class PotentialCustomerRepository
 * purpose of master data repository is performing crud operations
 * @description repository class that use handle the request-response lifecycle for API for the master data model
 * @author chathushka
 */
import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {MongoDataSource} from '../datasources';
import {PotentialCustomer, PotentialCustomerRelations} from '../models';

export class PotentialCustomerRepository extends DefaultCrudRepository<
  PotentialCustomer,
  typeof PotentialCustomer.prototype.id,
  PotentialCustomerRelations
> {
  constructor(
    @inject('datasources.mongo') dataSource: MongoDataSource,
  ) {
    super(PotentialCustomer, dataSource);
  }


  /**
   * Use for create or update the potential customer and company details
   * @param email {string} users customer
   * @param name {string} name of te customer
   * @param company {string} name of the company
   * @returns updated details
   */
  async newDemo(email: string, name: string, company: string) {
    let isBeforeRequestedDetails = await this.findOne(
      {
        where: {email: email}
      }
    )

    let PotentialCustomerObj = {
      name: name,
      email: email,
      company: company,
      createdAt: new Date()
    }
    if (isBeforeRequestedDetails) {
      return await this.updateById(isBeforeRequestedDetails.id, PotentialCustomerObj)
    }

    return await this.create(PotentialCustomerObj)
  }
}

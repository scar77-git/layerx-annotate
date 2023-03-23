/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 *  repository class that use handle the request-response lifecycle for API for the company model
 */

/**
 * @class company repository
 * purpose of company repository is performing crud operations
 * @description repository class that use handle the request-response lifecycle for API for the company model
 * @author chathushka
 */
import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {MongoDataSource} from '../datasources';
import {Company, CompanyRelations} from '../models';

export class CompanyRepository extends DefaultCrudRepository<
  Company,
  typeof Company.prototype.id,
  CompanyRelations
> {
  constructor(
    @inject('datasources.mongo') dataSource: MongoDataSource,
  ) {
    super(Company, dataSource);
  }
}

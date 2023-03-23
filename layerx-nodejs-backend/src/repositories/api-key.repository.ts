/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 *  repository class that use handle the request-response lifecycle for API for the api key model
 */

/**
 * @class api key repository
 * purpose of api key repository is performing crud operations
 * @description repository class that use handle the request-response lifecycle for API for the api key model
 * @author chathushka
 */
import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import {MongoDataSource} from '../datasources';
import {ApiKey, ApiKeyRelations, Company} from '../models';
import {CompanyRepository} from './company.repository';

export class ApiKeyRepository extends DefaultCrudRepository<
  ApiKey,
  typeof ApiKey.prototype.id,
  ApiKeyRelations
> {

  public readonly companyApikeys: BelongsToAccessor<Company, typeof ApiKey.prototype.id>;

  constructor(
    @inject('datasources.mongo') dataSource: MongoDataSource, @repository.getter('CompanyRepository') protected companyRepositoryGetter: Getter<CompanyRepository>,
  ) {
    super(ApiKey, dataSource);
    this.companyApikeys = this.createBelongsToAccessorFor('companyApikeys', companyRepositoryGetter,);
    this.registerInclusionResolver('companyApikeys', this.companyApikeys.inclusionResolver);
  }

  /**
   * Use for check user authorized or not
   * @param key {string} header param key
   * @param secret {string} header param secret
   * @returns user authorized or not
   */
  async checkApiKey(key: string, secret: string) {

    let authorized = await this.findOne({where: {key: key, secret: secret}});
    
    if (authorized?.secret) {
      return true;
    } else {
      return false;
    }
  }

  
}

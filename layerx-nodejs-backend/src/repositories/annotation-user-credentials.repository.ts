/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 */
import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {MongoDataSource} from '../datasources';
import {AnnotationUserCredentials, AnnotationUserCredentialsRelations} from '../models';

export class AnnotationUserCredentialsRepository extends DefaultCrudRepository<
  AnnotationUserCredentials,
  typeof AnnotationUserCredentials.prototype.id,
  AnnotationUserCredentialsRelations
> {
  constructor(
    @inject('datasources.mongo') dataSource: MongoDataSource,
  ) {
    super(AnnotationUserCredentials, dataSource);
  }
}

/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 *model class describes business domain objects and defines a list of properties with companyId, key, and other constraints.
 */

/**
 * @class Api key model
 * purpose of Task model is to define properties and relations with other models
 * @description model class describes business domain objects and defines a list of properties with name, type, and other constraints.
 * @author chathushka
 */
import {belongsTo, Entity, model, property} from '@loopback/repository';
import {Company} from './company.model';

@model()
export class ApiKey extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id?: string;

  @property({
    type: 'string',
  })
  key?: string;

  @property({
    type: 'string',
  })
  secret?: string;

  @belongsTo(() => Company, {name: 'companyApikeys'})
  companyId: string;

  constructor(data?: Partial<ApiKey>) {
    super(data);
  }
}

export interface ApiKeyRelations {
  // describe navigational properties here
}

export type ApiKeyWithRelations = ApiKey & ApiKeyRelations;

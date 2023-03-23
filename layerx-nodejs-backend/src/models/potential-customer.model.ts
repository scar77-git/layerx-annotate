/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 *model class describes business domain objects and defines a list of properties with email, company, and other constraints.
 */

/**
 * @class PotentialCustomerModel
 * purpose of MasterData model is to define properties and relations with other models
 * @description model class describes business domain objects and defines a list of properties with augmentationTypes, exportFormats, and other constraints.
 * @author Chathushka
 */
import {Entity, model, property} from '@loopback/repository';

@model()
export class PotentialCustomer extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id?: string;

  @property({
    type: 'string',
  })
  name?: string;

  @property({
    type: 'string',
  })
  email?: string;

  @property({
    type: 'string',
  })
  company?: string;

  @property({
    type: 'date',
  })
  createdAt?: Date;



  constructor(data?: Partial<PotentialCustomer>) {
    super(data);
  }
}

export interface PotentialCustomerRelations {
  // describe navigational properties here
}

export type PotentialCustomerWithRelations = PotentialCustomer & PotentialCustomerRelations;

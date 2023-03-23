/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 *model class describes business domain objects and defines a list of properties with companyId, members, and other constraints.
 */

/**
 * @class AnnotationTeam model
 * purpose of AnnotationTeam model is to define properties and relations with other models
 * @description model class describes business domain objects and defines a list of properties with name, type, and other constraints.
 * @author chathushka
 */

import {Entity, model, property} from '@loopback/repository';

@model()
export class AnnotationTeam extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id?: string;

  @property({
    type: 'string',
  })
  companyId?: string;

  @property({
    type: 'string',
  })
  adminId?: string;

  @property({
    type: 'string',
  })
  teamName?: string;

  @property({
    type: 'array',
    itemType: 'string',
  })
  members?: string[];

  @property({
    type: 'array',
    itemType: 'string',
  })
  projects?: string[];


  constructor(data?: Partial<AnnotationTeam>) {
    super(data);
  }
}

export interface AnnotationTeamRelations {
  // describe navigational properties here
}

export type AnnotationTeamWithRelations = AnnotationTeam & AnnotationTeamRelations;

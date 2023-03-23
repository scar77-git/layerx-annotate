/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 *model class describes business domain objects and defines a list of properties with dateTime, action, and other constraints.
 */

import {belongsTo, Entity, model, property} from '@loopback/repository';
import {AnnotationTask} from './annotation-task.model';
import {AnnotationUser} from './annotation-user.model';

@model({settings: {strict: false}})
export class AnnotationHistory extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id?: string;

  @property({
    type: 'date',
    required: true,
  })
  dateTime: Date;

  @property({
    type: 'string',
  })
  action?: string;

  // Define well-known properties here

  // Indexer property to allow additional data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [prop: string]: any;

  constructor(data?: Partial<AnnotationHistory>) {
    super(data);
  }

  @belongsTo(() => AnnotationTask)
  taskId: string;

  @belongsTo(() => AnnotationUser)
  userId: string;
}

export interface AnnotationHistoryRelations {
  // describe navigational properties here
}

export type AnnotationHistoryWithRelations = AnnotationHistory &
  AnnotationHistoryRelations;

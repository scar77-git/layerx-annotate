/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 */
import {UserCredentials} from '@loopback/authentication-jwt';
import {belongsTo, model} from '@loopback/repository';
import {AnnotationUser} from './annotation-user.model';

@model()
export class AnnotationUserCredentials extends UserCredentials {
  @belongsTo(() => AnnotationUser)
  annotationUserId: string;

  constructor(data?: Partial<AnnotationUserCredentials>) {
    super(data);
  }
}

export interface AnnotationUserCredentialsRelations {
  // describe navigational properties here
}

export type AnnotationUserCredentialsWithRelations = AnnotationUserCredentials &
  AnnotationUserCredentialsRelations;

/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 *model class describes business domain objects and defines a list of properties with email, name, and other constraints.
 */

import {Entity, hasOne, model, property} from '@loopback/repository';
import {AnnotationUserCredentials} from '.';

@model()
export class AnnotationUser extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id: string;

  @property({
    type: 'number',
    default: 0,
  })
  userType?: AnnotationUserType;

  @property({
    type: 'string',
  })
  email: string;

  @property({
    type: 'string',
  })
  name?: string;

  @property({
    type: 'string',
  })
  teamId?: string;

  @property({
    type: 'string',
  })
  teamName?: string;

  @property({
    type: 'date',
  })
  lastEmailSentTime?: Date;

  @property({
    type: 'date',
  })
  inviteUrlCreatedAt?: Date;

  @property({
    type: 'string',
    default: 'defaultProfileImage.png'
  })
  profileImgUrl?: string;

  @property({
    type: 'string',
  })
  imageUrl?: string;

  @property({
    type: 'number',
  })
  userStatus?: number;

  @property({
    type: 'boolean',
    default: false,
  })
  isAll?: boolean;

  @hasOne(() => AnnotationUserCredentials)
  userCredentials: AnnotationUserCredentials;

  @property({
    type: 'array',
    itemType: 'string',
  })
  projectList?: string[];

  @property({
    type: 'object',
  })
  annotationStats?: AnnotationStats;

  @property({
    type: 'object',
  })
  taskStats?: TaskStats;
  /////////
  @property({
    type: 'date',
  })
  offsetTime?: Date;


  @property({
    type: 'date',
  })
  createdAt?: Date;


  @property({
    type: 'number',
    default: 0
  })
  timeZoneOffset?: number;

  @property({
    type: 'boolean',
  })
  userStatPending?: boolean;

  @property({
    type: 'boolean',
    default: false
  })
  isUserDeactivated?: boolean;
  /////////
  constructor(data?: Partial<AnnotationUser>) {
    super(data);
  }
}

export interface AnnotationUserRelations {
  // describe navigational properties here
}

//Successful authentication reply with token and required data for FrontEnd
export interface AnnotationLoginResult {
  token: string;
  refreshToken?: string;
  expireTime?: string;

  user: {
    email: string;
    userId: string;
    name: string;
    userType: number;
    teamId: string;
    teamName: string;
    profileImgUrl: string;
    isFirstTime?: boolean;
    imageUrl?: string;
  };
}

export interface AnnotationRefreshResult {
  token: string;
}

export type AnnotationUserWithRelations = AnnotationUser &
  AnnotationUserRelations;

export class NewUserRequest extends AnnotationUser {
  @property({
    type: 'string',
    required: true,
  })
  password: string;
}

export enum AnnotationUserType {
  ANNOTATION_USER_TYPE_ANNOTATOR = 0,
  ANNOTATION_USER_TYPE_AUDITOR = 1,
  ANNOTATION_USER_TYPE_SUPER_ADMIN = 2,
  ANNOTATION_USER_TYPE_TEAM_ADMIN = 3,
  ANNOTATION_USER_TYPE_QA = 4
}

export interface TaskStats {
  inProgressCount: number;
  approvedCount: number;
  rejectedCount: number;
  completedCount: number;
  totalCount: number;
  notStartedCount: number;
  inAuditState: number;
}

export interface AnnotationStats {
  lastUpdatedTime: Date;
  monthlyBoxCount: number;
  monthlyApprovedCount: number;
  totalBoxCount: number;
  approvedBoxCount: number;
  dailyStats: DailyStatsObj[];
  monthlyStats: MonthlyStatsObj[];
}

export interface DashBoardStats {
  boundingBoxes: {
    completedForToday: number;
    dailyTarget: number;
    date: string;
    completedBoxes: number;
    approvedBoxes: number;
  };
  tasks: {
    totalCompleted: number;
    totalAssigned: number;
    inProgress: number;
    totalApproved: number;
    totalRejected: number;
  };
}

export interface DashBoardSummeryObj {
  date: string;
  completedBoxes: number;
  approvedBoxes: number;
  unapproved: number;
}

export interface DailyStatsObj {
  date: Date;
  completedBoxes: number;
  approvedBoxes: number;
  unapproved: number;
}

export interface MonthlyStatsObj {
  date: Date;
  completedBoxes: number;
  approvedBoxes: number;
  unapproved: number;
}

export interface request {

}

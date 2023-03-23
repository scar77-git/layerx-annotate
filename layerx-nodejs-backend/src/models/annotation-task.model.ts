/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 *model class describes business domain objects and defines a list of properties with frameStart, frameCount, and other constraints.
 */

/**
 * @class AnnotationTask model
 * purpose of Task model is to define properties and relations with other models
 * @description model class describes business domain objects and defines a list of properties with name, type, and other constraints.
 * @author chathushka
 */
 import {
  belongsTo,
  Entity,
  hasMany,
  model,
  property
} from '@loopback/repository';
import {AnnotationFrame, DatasetType} from './annotation-frame.model';
import {AnnotationProject} from './annotation-project.model';
import {AnnotationUser} from './annotation-user.model';

@model()
export class AnnotationTask extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id?: string;

  @property({
    type: 'number',
  })
  frameStart?: number;

  @property({
    type: 'number',
  })
  frameCount?: number;

  @property({
    type: 'number',
  })
  status?: number;

  @property({
    type: 'number',
  })
  auditStatus?: AUDIT_STATUS;

  @property({
    type: 'number',
    default: 0,
  })
  taskStatus?: TASK_STATUS;

  @property({
    type: 'number',
    default: 0,
  })
  completedFrames?: number;

  @property({
    type: 'string',
  })
  videoPath?: string;

  @property({
    type: 'date',
  })
  createdAt?: Date;

  @property({
    type: 'date',
  })
  updatedAt?: Date;

  @property({
    type: 'date',
  })
  completedAt?: Date;

  @property({
    type: 'string',
  })
  projectName?: string;

  @property({
    type: 'number',
  })
  progress?: number;

  @property({
    type: 'number',
  })
  contentType?: number;

  @property({
    type: 'string',
  })
  S3_url?: string;

  @property({
    type: 'string',
  })
  videoUrl?: string;

  @property({
    type: 'string',
  })
  urlCreatedAt?: string;

  @property({
    type: 'number',
  })
  skipFrameCount?: number;

  @property({
    type: 'number',
  })
  frameRate?: number;

  @property({
    type: 'number',
  })
  videoResolutionWidth?: number;

  @property({
    type: 'number',
  })
  videoResolutionHeight?: number;

  @property({
    type: 'number',
  })
  boxCount?: number;

  @property({
    type: 'object',
  })
  labelCounts?: LabelCounts;

  @property({
    type: 'number',
    default: 1
  })
  maxId?: number;

  @property({
    type: 'string',
  })
  videoName: string;

  @property({
    type: 'string',
  })
  taskName: string;

  @property({
    type: 'boolean',
  })
  isDownloadEnable: boolean;

  @property({
    type: 'string',
  })
  downLoadUrl: string;  

  @belongsTo(() => AnnotationProject)
  projectId: string;

  @belongsTo(() => AnnotationUser)
  assignedAnnotatorId?: string;

  @hasMany(() => AnnotationFrame, {keyTo: 'taskId'})
  annotationFrames: AnnotationFrame[];

  @property({
    type: 'array',
    itemType: 'object',
    default: []
  })
  datasetVersions?: DataSetVersionArray[];

  constructor(data?: Partial<AnnotationTask>) {
    super(data);
  }
}

export interface AnnotationTaskRelations {
  // describe navigational properties here
}

export type AnnotationTaskWithRelations = AnnotationTask &
  AnnotationTaskRelations;

export interface LabelCounts {
  totalCount: number;
  labelList: LabelList[];
}

export interface LabelList {
  label: string;
  color: string;
  count: number;
  attributes?: AttributeLabelList[];
}

export interface AttributeLabelList {
  value: string,
  count: number
}

/**
 * task status for each state
 */
export enum TASK_STATUS {
  NOT_STARTED = 0,
  IN_PROGRESS = 1,
  COMPLETED = 2,
}
/**
 * audit state for each state
 */
// export enum AUDIT_STATUS {
//   PENDING = 0,
//   ACCEPTED = 1,
//   REJECTED = 2,
//   FIXED = 3,
//   FIXING = 4,
//   COMPLETED = 5
// }
export enum AUDIT_STATUS {
  NOT_STARTED = 0,
  IN_PROGRESS = 1,
  COMPLETED = 2,
  ACCEPTED = 6,
  REJECTED = 7,
  FIXED = 8,
  FIXING = 9,
  qaInReview = 10,
  qaRejected = 11,
  qaCompleted = 12
}

/**
 * Status enum for incoming save call recognition
 */
export enum STATUS {
  ACCEPTED = 1,
  REJECTED = 2,
  FIXED = 3,
  FIXING = 4,
  COMPLETED = 5,
}

export interface DataSetVersionArray {
  versionId: string;
  datasetType: DatasetType;
}

export enum StatusOfTask {
  NOT_STARTED = 0,
  IN_PROGRESS = 1,
  COMPLETED = 2,
  ACCEPTED = 6,
  REJECTED = 7,
  FIXED = 8,
  FIXING = 9,
  qaInReview = 10,
  qaRejected = 11,
  qaCompleted = 12
}

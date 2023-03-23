/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 *model class describes business domain objects and defines a list of properties with dateTime, action, and other constraints.
 */

/**
 * @class AnnotationProject
 * purpose of project model is to define properties and relations with other models
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
import {AnnotationTask} from './annotation-task.model';
import {AnnotationTeam} from './annotation-team.model';
import {Company} from './company.model';

@model()
export class AnnotationProject extends Entity {
  @property({
    type: 'string',
  })
  name?: string;

  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id?: string;

  @property({
    type: 'number',
    default: 5,
  })
  requiredFPS?: number;

  @property({
    type: 'number',
    //required: true,
  })
  contentType?: ContentType;

  @property({
    type: 'array',
    itemType: 'object',
    default: [],
  })
  labels?: LabelInfo[];

  @property({
    type: 'object',
    default: [],
  })
  statsSummary?: ProjectStats;

  @property({
    type: 'array',
    itemType: 'object',
    default: [],
  })
  documentations?: Documentation[];

  @property({
    type: 'date',
  })
  createdAt?: Date;

  @property({
    type: 'date',
  })
  updatedAt?: Date;

  @property({
    type: 'string',
  })
  createdBy?: string;

  @property({
    type: 'array',
    itemType: 'object',
  })
  projectStats?: ProjectStatsModel[];

  @property({
    type: 'array',
    itemType: 'object',
    default: [],
  })
  annotatedOverTimeStats?: {
    date: string;
    count: any;
  }[];

  @property({
    type: 'array',
    itemType: 'object',
    default: [],
  })
  annotatedOverTimeMonthlyStats?: {
    date: string;
    count: any;
  }[];

  @property({
    type: 'array',
    itemType: 'object',
    default: [],
  })
  uploadFileList?: {
    fileId: string;
    name: any;
    size: string;
    byteSize: number;
    uploadedAt: Date;
    isProcessing: boolean;
    progress: number;
    status: number;
    message: string;
    chunkIndex?: number;
  }[];

  @property({
    type: 'boolean',
    default: false,
  })
  isFilesAvailable?: boolean;

  @property({
    type: 'boolean',
    default: false,
  })
  isProjectCreated?: boolean;

  @property({
    type: 'number',
    default: 0,
  })
  lastDocumentId?: number;

  @property({
    type: 'boolean',
    default: false,
  })
  isUploading?: boolean;

  @property({
    type: 'boolean',
    default: false,
  })
  isGoogleFileAvailable?: boolean;

  @property({
    type: 'date',
  })
  projectStatsUpdateDate?: Date;

  @property({
    type: 'boolean',
  })
  projectsSummaryPending?: boolean;

  @property({
    type: 'boolean',
  })
  projectStatPending?: boolean;

  @hasMany(() => AnnotationTask, {keyTo: 'projectId'})
  annotationTasks?: AnnotationTask[];

  @belongsTo(() => Company)
  companyId?: string;

  @belongsTo(() => AnnotationTeam)
  teamId?: string;

  constructor(data?: Partial<AnnotationProject>) {
    super(data);
  }
}

export interface AnnotationProjectRelations {
  // describe navigational properties here
}

export type AnnotationProjectWithRelations = AnnotationProject &
  AnnotationProjectRelations;

export interface ProjectStats {
  lastUpdatedTime: Date;
  totalTaskCount: number;
  completedTaskCount: number;
  inprogressTaskCount: number;
  totalAnnotatedCount: number;
}

export interface LabelInfo {
  label: string;
  key: string;
  description: string;
  color: string;
  imgFile: {srcUrl: string};
  imgURL: string;
  attributes: Attributes[];
  count?: number;
  isAnnotationEnabled?: boolean;
  isAbleDelete?: boolean;
  labelText?: string;
  isEditable?: boolean;
}

export interface Attributes {
  key: string;
  label: string;
  labelText?: string;
  values: {
    valueName: string,
    description: string,
    annotatedCount: number,
    isDefault: boolean,
    imgFile: {srcUrl: string}
    imgURL: string
  }[];
}

export interface ProjectStatsModel {
  labelName: string;
  totalObjects: number;
  subLabels: SubLabelElementModel[];
}

export interface SubLabelElementModel {
  labelName: string;
  objectCount: number;
}

export interface Documentation {
  fileName: string;
  uploadByName: string;
  uploadById: string;
  createdAt: Date;
  url: string;
  documentId: number;
}


export enum ContentType {
  Video = 1,
  Image = 2
}

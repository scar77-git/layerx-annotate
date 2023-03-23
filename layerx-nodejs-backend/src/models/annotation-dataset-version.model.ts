/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 *model class describes business domain objects and defines a list of properties with version No, labels, projects and other constraints.
 */


/**
 * @class  AnnotationDatasetVersion
 * purpose of project model is to define properties and relations with other models
 * @description model class describes business domain objects and defines a list of properties with name, type, and other constraints.
 */
import {Entity, model, property} from '@loopback/repository';
import {DatasetType, Property} from '.';
import {DataSetStat, DataSetStatsModel, GridClassAttributes} from './annotation-data-set-group.model';
import {ProjectStatsModel} from './annotation-project.model';
//import { AnnotationTask } from '.';

@model({settings: {strict: false}})
export class AnnotationDatasetVersion extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  versionId?: string;

  @property({
    type: 'string',
    required: true,
  })
  versionNo: string;

  @property({
    type: 'number',
  })
  creationType: InitialDataSetType;

  @property({
    type: 'date',
  })
  createdAt?: Date;

  @property({
    type: 'date',
  })
  updatedAt?: Date;

  @property({
    itemType: 'string',
    type: 'object',
  })
  labels?: object;

  @property({
    type: 'string',
  })
  createdBy?: string;

  @property({
    type: 'array',
    itemType: 'string',
  })
  projects?: string[];

  @property({
    type: 'string',
  })
  dataSetGroupId?: string;

  @property({
    type: 'array',
    itemType: 'string',
  })
  taskList?: string[];

  @property({
    type: 'object'
  })
  augmentationTypes?: AugmentationType;

  @property({
    type: 'array',
    itemType: 'object',
  })
  labelAttributeList?: DataSetStat[];

  @property({
    type: 'array',
    itemType: 'object',
  })
  gridClassAttributes?: GridClassAttributes[];

  @property({
    type: 'array',
    itemType: 'object',
  })
  dataSetAttributeList?: ProjectStatsModel[];

  @property({
    type: 'object',
  })
  statsSummary?: {
    totalFrames?: number;
    totalBoxes?: number;
  };

  @property({
    type: 'array',
    itemType: 'object',
  })
  labelList?: object[];

  @property({
    type: 'object',
  })
  exportFormats?: any;

  @property({
    type: 'number',
  })
  augmentationProgress?: number;

  @property({
    type: 'array',
    itemType: 'object',
  })
  splitCount?: SplitCount[];

  @property({
    type: 'array',
    itemType: 'object',
  })
  splitTasks?: {
    type: number,
    taskList: string[]
  }[]

  @property({
    type: 'number',
    default: 0
  })
  imageCount: number;

  @property({
    type: 'number',
    default: 0
  })
  size: number;

  @property({
    type: 'boolean',
    default: false
  })
  isPending?: boolean;
  /////////////////
  @property({
    type: 'any',

  })
  splitVideoArray: any;
  ///////////////
  @property({
    type: 'number',
  })
  versionType?: VersionType;

  // Define well-known properties here

  // Indexer property to allow additional data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [prop: string]: any;

  constructor(data?: Partial<AnnotationDatasetVersion>) {
    super(data);
  }
}

export interface AnnotationDatasetVersionRelations {
  // describe navigational properties here
}

export type AnnotationDatasetVersionWithRelations = AnnotationDatasetVersion &
  AnnotationDatasetVersionRelations;

export interface AugmentationType {
  IMAGE_LEVEL: Augmentation[];
  BOUNDING_BOX_LEVEL: Augmentation[];

}

export interface Augmentation {
  // augmentationType: string;
  // settings: Settings[];
  // id: string;
  // properties: Property[];
  id: string;
  description?: string;
  properties?: Property[];
  thumbnailUrl?: string;
}

export interface Settings {
  key: string;
  value?: any;
}

export interface SplitCount {
  type: DatasetType;
  objectCount: number;
  imageCount: number;
  percentage: number;
}

export interface ExportFormatsItemInfo {
  name?: string;
  fileType?: string;
  fileCount?: number;
  progress?: number;
  createdAt?: Date;
  lastUpdatedAt?: Date;
  keyField?: string;
}

export interface ExportFormatListInfo {
  [key: string]: ExportFormatsItemInfo;
}


export interface DataSetVersionMeta {
  versionId?: string;
  versionNo?: string
  name?: string;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  projects?: string[];
  labels?: object;
  labelAttributeList?: DataSetStat[];
  augmentations?: string[];
  taskList?: string[];
  dataSetStats?: object[];
  totalFrames?: number;
  totalBoxes?: number;
  imageCount?: number;
  size?: number;
  statsSummary?: {
    totalFrames?: number;
    totalBoxes?: number;
  };
  dataSetAttributeList?: DataSetStatsModel[];
  gridClassAttributes?: GridClassAttributes[];
  splitCount?: SplitCount[],
  dataSetGroupId?: string,
  splitTasks?: {
    type: number,
    taskList: string[]
  }[],
  creationType?: InitialDataSetType;
  isPending?: boolean;
  versionType?: VersionType;
  splitVideoArray?: any;
}

export enum InitialDataSetType {
  RANDOM = 1,
  MANUAL = 2
}

export enum VersionType {
  START = 0,
  LABEL = 1,
  AUGMENTATION = 2,
  EDIT = 4
}

export interface SplitVideoArray {
  type: number;
  videoArray: any;
}

export interface TaskList {
  type: number;
  videoArray: {
    _id: string;
    selectTaskCount: number;
    taskList: {
      _id: string;
    }[];
  }[];

}

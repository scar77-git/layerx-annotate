/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 *model class describes business domain objects and defines a list of properties with name, type, and other constraints.
 */

/**
 * @class annotationDataSet model
 * purpose of annotationDataSet model is to define properties and relations with other models
 * @description model class describes business domain objects and defines a list of properties with name, type, and other constraints.
 * @author chathushka
 */

import {Entity, model, property} from '@loopback/repository';

@model()
export class AnnotationDataSetGroup extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id: string;

  @property({
    type: 'string',
  })
  name?: string;

  @property({
    type: 'string',
  })
  createdBy?: string;

  @property({
    type: 'string',
  })
  teamId?: string;

  @property({
    type: 'array',
    itemType: 'string',
  })
  projects?: string[];

  @property({
    type: 'object',
  })
  labels?: object;

  @property({
    type: 'array',
    itemType: 'object',
  })
  labelAttributeList?: DataSetStat[];

  @property({
    type: 'array',
    itemType: 'object',
  })
  dataSetAttributeList?: DataSetStatsModel[];

  @property({
    type: 'array',
    itemType: 'string',
  })
  augmentations?: string[];

  @property({
    type: 'array',
    itemType: 'string',
  })
  taskList?: string[];

  @property({
    type: 'object',
  })
  taskStatus?: object;

  @property({
    type: 'array',
    itemType: 'object',
  })
  dataSetStats?: DataSetStat[];

  @property({
    type: 'string',
  })
  state?: string;

  @property({
    type: 'number',
  })
  totalFrames?: number;

  @property({
    type: 'number',
  })
  totalBoxes?: number;

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
  gridClassAttributes?: GridClassAttributes[];

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
  groupName: string;

  @property({
    type: 'string',
  })
  groupUniqueName: string;

  @property({
    type: 'array',
    itemType: 'string',
  })
  datasetVersions: string[];


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
  })
  isInitialVersionCreated?: boolean;


  constructor(data?: Partial<AnnotationDataSetGroup>) {
    super(data);
  }
}

export interface annotationDataSetRelations {
  // describe navigational properties here
}

export type annotationDataSetWithRelations = AnnotationDataSetGroup &
  annotationDataSetRelations;

export interface DataSetMeta {
  id?: string;
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
  gridClassAttributes?: GridClassAttributes[]
}

export interface Label {
  [key: string]: number;
}

export interface DataSetStat {
  count: number,
  mainLabel: string,
  label: string[],
  attributes: {
    [key: string]: string
  },
  isEnabled: boolean
}


export interface GridClassAttributes {
  label: string;
  index: number;
  key: string;
  attributes: AttributesDataSet[];
  selected: boolean;
}


export interface AttributesDataSet {
  key: string;
  label: string;
  selected: boolean;
  values: {
    valueName: string,
    description: string,
    annotatedCount: number,
    isDefault: boolean,
    imgFile: {srcUrl: string}
    imgURL: string;
    selected: boolean;
  }[];
}

export interface DataSetStatsModel {
  labelName: string;
  totalObjects: number;
  percentage?: number;
  subLabels: DataSetSubLabelElementModel[];
}

export interface DataSetSubLabelElementModel {
  labelName: string;
  objectCount: number;
  percentage?: number;
}

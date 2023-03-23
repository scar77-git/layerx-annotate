/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 *model class describes business domain objects and defines a list of properties with project id, status, and other constraints.
 */


/**
 * @class  AnnotationContentUpload
 * purpose of project model is to define properties and relations with other models
 * @description model class describes business domain objects and defines a list of properties with name, type, and other constraints.
 */
import {Entity, model, property} from '@loopback/repository';

@model()
export class AnnotationContentUpload extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id?: string;

  @property({
    type: 'string',
  })
  projectId?: string;

  @property({
    type: 'date',
  })
  createdAt?: Date;

  @property({
    type: 'date',
  })
  finishedAt?: Date;

  @property({
    type: 'string',
  })
  errorMessage?: ErrorMessage;

  @property({
    type: 'number',
  })
  status?: UploadFileStatus;

  @property({
    type: 'string',
  })
  sourceFilePath?: string;

  @property({
    type: 'number',
    required: true,
  })
  progress?: number;

  @property({
    type: 'number',
  })
  taskCount?: number;

  @property({
    type: 'number',
  })
  frame_rate?: number;

  @property({
    type: 'number',
  })
  request_type?: number;

  @property({
    type: 'number',
  })
  request_annotation_version?: number;

  @property({
    type: 'number',
  })
  force_write?: number;

  @property({
    type: 'number',
  })
  content_type?: number;

  @property({
    type: 'number',
  })
  frames_per_task?: number;


  constructor(data?: Partial<AnnotationContentUpload>) {
    super(data);
  }
}

export interface AnnotationContentUploadRelations {
  // describe navigational properties here
}

export type AnnotationContentUploadWithRelations = AnnotationContentUpload & AnnotationContentUploadRelations;



export interface ErrorMessage {
  error_code: number,
  message: string
}

export enum UploadFileStatus {
  Failed = 2,
  Succeeded = 1,
  Processing = 0,
  NodeJsError = 3,
  Downloading = 4
}


export enum AutoAnnotationVersion{
  versionZero = 0,
  versionOne = 1,
  versionTwo = 2,
  VersionThree = 3
}

export enum ForceWrite{
  Enable = 1,
  Disable = 0
}

export enum RequestType{
  AA_bar = 0,
  AA_tasks = 1,
  AA = 2
}

export enum FramesPerTask{
  Standard = 120
}

/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 *model class describes business domain objects and defines a list of properties with frameId, imageUrl, and other constraints.
 */

/**
 * @class  AnnotationFrame
 * purpose of project model is to define properties and relations with other models
 * @description model class describes business domain objects and defines a list of properties with name, type, and other constraints.
 * @author chathushka
 */
import {belongsTo, Entity, model, property} from '@loopback/repository';
import {ObjectId} from 'mongodb';
import {AnnotationTask} from './annotation-task.model';

@model()
export class AnnotationFrame extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id?: string;

  @property({
    type: 'number',
  })
  frameId?: number;

  @property({
    type: 'number',
  })
  status?: number;

  @property({
    type: 'array',
    itemType: 'object',
  })
  boxes?: AnnotationData[];

  @property({
    type: 'array',
    itemType: 'object',
  })
  commentBoxes?: CommentBox[];

  @property({
    type: 'string',
  })
  projectId?: string;

  @property({
    type: 'boolean',
  })
  isUserAnnotated?: boolean;

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
  annotatedAt?: Date;

  @property({
    type: 'boolean',
  })
  isEmpty?: boolean;

  @property({
    type: 'object',
  })
  annotatedData?: AnnotatedData;

  @property({
    type: 'array',
    itemType: 'string',
    default: [],
  })
  userLog?: string[];

  @property({
    type: 'string',
  })
  imageUrl?: string;

  @property({
    type: 'string',
  })
  awsUrl?: string;

  @property({
    type: 'string',
  })
  thumbnailUrl?: string;

  @property({
    type: 'string',
  })
  awsThumbnailUr?: string;

  @property({
    type: 'date',
  })
  awsThumbnailExpiredDate?: Date;

  @property({
    type: 'date',
  })
  awsExpiredDate?: Date;

  @property({
    type: 'number',
  })
  imageMultiplier?: number;

  @property({
    type: 'number',
  })
  imageOffSetX?: number;

  @property({
    type: 'number',
  })
  imageOffSetY?: number;

  @property({
    type: 'boolean',
  })
  resized?: boolean;

  @property({
    type: 'date',
  })
  resizedDate?: Date;

  @property({
    type: 'string',
  })
  imageAnnotationUrl?: string;

  @property({
    type: 'number',
  })
  imageResolutionHeight?: number;

  @property({
    type: 'number',
  })
  imageResolutionWidth?: number;

  // related to dataset (image and data from s3) ------
  @property({
    type: 'array',
    itemType: 'object',
    default: []
  })
  datasetVersions?: DatasetVersionInfo[];
  //------------------------------------------

  @belongsTo(() => AnnotationTask, {name: 'taskFrame'})
  taskId: string;

  constructor(data?: Partial<AnnotationFrame>) {
    super(data);
  }
}

export interface AnnotationFrameRelations {
  // describe navigational properties here
}

export type AnnotationFrameWithRelations = AnnotationFrame &
  AnnotationFrameRelations;
/*
{
    "boxes": [
        {
            "id": 2,
            "boundaries": {
                "id": 2,
                "type": "rectangle",
                "x": 700.0191387559809,
                "y": 455.6555023923445,
                "w": 347.2535885167464,
                "h": 205.77990430622003,
                "label": "Lap Sponge",
                "color": "#00d1ff",
                "status": "completed",
                "isPermanent": true,
                "attributeValues": {
                    "state": "Stacked"
                }
            },
            "attributeValues": {
                "state": "Stacked"
            }
        }
    ]
}
 */
//Object inside box
export interface AnnotationData {
  id: number;
  boundaries: {
    id: number;
    x: number;
    y: number;
    w: number;
    h: number;
    labelText?: string;
    annotatorId: ObjectId;
    createdAt: Date;
  };
}

export interface SVGTransformFactor {
  xFactor: number;
  yFactor: number;
}

export interface AnnotationModel {
  taskId: string;
  frameId: number;
  boxes: AnnotationData[];
  commentBoxes: CommentBox[];
  isUserAnnotated: boolean;
  isEmpty: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  annotatedAt?: Date;
  userLog?: string[];
}

export interface AnnotatedData {
  imageUrl: string;
  textData: {
    YOLO: string;
  };
  awsUrl: any;
  expiredDate: Date;
}

export interface AugmentationImageInfo {
  sample_type1: {
    imageUrl: string;
    textFiles: TextFileInfo;
  };
}

export interface TextFileInfo {
  YOLO?: string;
  RCNA?: string;
}

export interface DatasetVersionInfo {
  versionId: string;
  // augmentationImages: AugmentationImageInfo[];
  augmentationImages: any;
  textFiles: TextFileInfo;
  datasetType: DatasetType;
}

// export interface AugmentedBoxInfo{
//    data?:any
// }

// export interface AugmentedDataInfo{
//   sample_augmentation_type_name : AugmentedBoxInfo[]
// }

export enum DatasetType {
  TRAINING = 1,
  VALIDATION = 2,
  TESTING = 3
}


export interface CommentBox {
  isResolved: boolean,
  commentList: Comment[],
  isPermanent: boolean,
  id: number,
  commentBoxTop: number,
  commentBoxLeft: number
}

export interface Comment {
  userName: string,
  userId: string,
  imgUrl: string,
  commentText: string,
  commentedDate: Date,
  isEditable: boolean
}

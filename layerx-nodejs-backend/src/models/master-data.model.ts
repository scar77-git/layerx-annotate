/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 *model class describes business domain objects and defines a list of properties with augmentationTypes, exportFormats, and other constraints.
 */

/**
 * @class MasterData model
 * purpose of MasterData model is to define properties and relations with other models
 * @description model class describes business domain objects and defines a list of properties with augmentationTypes, exportFormats, and other constraints.
 * @author chamath,isuru
 */
import {Entity, model, property} from '@loopback/repository';

@model()
export class MasterData extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id?: string;

  @property({
    type: 'object',
  })
  augmentationTypes?: AugmentationTypes;

  @property({
    type: 'object',
  })
  exportFormats?: exportFormatsInfo;

  constructor(data?: Partial<MasterData>) {
    super(data);
  }
}

export interface MasterDataRelations {
  // describe navigational properties here
}

export type MasterDataWithRelations = MasterData & MasterDataRelations;

export interface Augmentations {
  id: string;
  description: string;
  properties: Property[];
  thumbnailUrl?: string;
}

export enum LevelAugmentation {
  IMAGE = 1,
  BOUNDING_BOX = 2,
}

export interface AugmentationTypes {
  IMAGE_LEVEL: Augmentations[];
  BOUNDING_BOX_LEVEL: Augmentations[];
}

export interface Property {
  id: string;
  values: any[];
}

export interface exportFileInfo {
  fileType: string;
  name: string;
  category: string;
}

export interface exportFormatsInfo {
  YOLO: exportFileInfo;
  YOLO_DARK: exportFileInfo;
  YOLO_KERAS: exportFileInfo;
}

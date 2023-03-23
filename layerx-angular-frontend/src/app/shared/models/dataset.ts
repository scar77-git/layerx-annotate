/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { SplitTypes } from '../constants/dataset';

export class Dataset {
  id: string;
  name: string;
  projects: Array<any>;
  rebalanceType: string;
  allFiles: Array<any>;
  trainingSet: datasetType;
  validationSet: datasetType;
  testingSet: datasetType;
  totalObjects: number;
  selectedVersionId : string;

  constructor() {
    this.id = '';
    this.name = '';
    this.projects = [];
    this.rebalanceType = SplitTypes.RANDOM;
    this.allFiles = [];
    this.totalObjects = 0;
    this.selectedVersionId = '';
    this.trainingSet = {
      dataSetType: '',
      objectsCount: 0,
      percentage: 0,
      searchKey: '',
      videoList: [],
    };
    this.validationSet = {
      dataSetType: '',
      objectsCount: 0,
      percentage: 0,
      searchKey: '',
      videoList: [],
    };
    this.testingSet = {
      dataSetType: '',
      objectsCount: 0,
      percentage: 0,
      searchKey: '',
      videoList: [],
    };
  }
}

export interface videoFiles {
  _id: string;
  taskCount: number;
  selected: boolean;
  videoName: string;
  list: Array<taskItem>;
}

export interface taskItem {
  id: string;
  taskName: string;
  totalTasks: number;
}

export interface datasetType {
  dataSetType: string;
  objectsCount: number;
  percentage: number;
  searchKey: string;
  videoList: Array<any>;
}

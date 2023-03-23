/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

export class DOverview {
  dataSetAttributeList: Array<statItem>;
  totalFrames: number;
  totalBoxes: number;

  constructor() {
    this.dataSetAttributeList = [];
    this.totalFrames = 0;
    this.totalBoxes = 0;
  }
}

export interface statItem {
  labelName: string;
  totalObjects: number;
  percentage: number,
  subLabels: Array<attribute>;
}

export interface attribute {
  labelName: string;
  objectCount: number;
  percentage: number;
}

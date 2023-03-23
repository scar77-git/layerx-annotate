/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

export class DatasetSplit {
  splitData: Array<splitDataItem>;

  constructor() {
    this.splitData = [];
  }
}

export interface splitDataItem {
  type: string;
  imageCount: number;
  objectCount: number;
  percentage: number;
}

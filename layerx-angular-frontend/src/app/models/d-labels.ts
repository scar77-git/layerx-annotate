/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

export class DLabels {
  labelList: Array<label>;
  totalFrames: number;
  totalBoxes: number;

  constructor() {
    this.labelList = [];
    this.totalFrames = 0;
    this.totalBoxes = 0;
  }
}

export interface label {
  label: string;
  count: number;
  isEnabled: boolean;
}

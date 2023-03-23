/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

export class Quality {
  qualityStats: qualityStatsObj;

  constructor() {
    this.qualityStats = {
      accepted: 0,
      fixed: 0,
      rejected: 0,
    };
  }
}

export interface qualityStatsObj {
  accepted: number;
  fixed: number;
  rejected: number;
}

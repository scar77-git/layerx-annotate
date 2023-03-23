/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

export class Overview {
  statsSummary: statsSummaryObj;
  projectStats: Array<statItem>;
  chartData: Array<chartItem>;
  startDate : string;
  endDate : string;

  DateRanges!: number;

  constructor() {
    this.statsSummary = {
      totalTaskCount: 0,
      completedTaskCount: 0,
      inprogressTaskCount: 0,
      totalAnnotatedCount: 0,
    };
    this.projectStats = [];
    this.chartData = [];
    this.startDate = ''
    this.endDate = ''
  }
}

export interface statsSummaryObj {
  totalTaskCount: number;
  completedTaskCount: number;
  inprogressTaskCount: number;
  totalAnnotatedCount: number;
}

export interface statItem {
  labelName: string;
  totalObjects: number;
  subLabels: Array<subLabel>;
}

export interface subLabel {
  labelName: string;
  objectCount: number;
}

export interface chartItem {
  date: string;
  count: number;
  isShowLabel : boolean;
  range : number
}

export class DateRanges {
  public static month = 1;
  public static threeMonths = 2;
  public static year = 3;
  public static all = 4;
}

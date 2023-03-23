/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { taskListObj } from './task.model';

export class Dashboard {
  boundingBoxes: boundingBoxesObj;
  tasks: tasksObj;
  summaryData: Array<summaryItem>;
  annotatorsList: Array<any>;

  DateRanges!: number;

  constructor() {
    this.boundingBoxes = {
      completedForToday: 0,
      dailyTarget: 0,
      date: '',
      completedBoxes: 0,
      approvedBoxes: 0,
    };

    this.tasks = {
      totalCompleted: 0,
      totalAssigned: 0,
      inProgress: 0,
      totalApproved: 0,
      totalRejected: 0,
    };

    this.summaryData = [];
    this.annotatorsList = [];
  }

  handleNullBoxes() {
    return {
      completedForToday: 0,
      dailyTarget: 1500,
      date: new Date().getFullYear().toString(),
      completedBoxes: 0,
      approvedBoxes: 0,
    };
  }

  handleNullTasks() {
    return {
      totalCompleted: 0,
      totalAssigned: 0,
      inProgress: 0,
      totalApproved: 0,
      totalRejected: 0,
    };
  }
}

export interface boundingBoxesObj {
  completedForToday: number;
  dailyTarget: number;
  date: string;
  completedBoxes: number;
  approvedBoxes: number;
}

export interface tasksObj {
  totalCompleted: number;
  totalAssigned: number;
  inProgress: number;
  totalApproved: number;
  totalRejected: number;
}

export interface summaryItem {
  date: Date;
  completedBoxes: number;
  approvedBoxes: number;
  unapproved: number;
}

export class DateRanges {
  public static year = 1;
  public static month = 2;
}

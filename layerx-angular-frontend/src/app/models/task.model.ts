/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { constant } from 'lodash';

export class Task {
  taskList: taskListObj;
  NO_OF_RECORDS: number = 100;
  taskStatus: Array<any>;
  selectedUser!: any;
  selectedUserType!: number;
  totalTasks: number;
  filter: Filter;
  videoList: Array<any>;

  constructor() {
    this.totalTasks = 0;
    this.taskList = {
      list: [],
      pageIndex: 0,
      pageSize: this.NO_OF_RECORDS,
    };
    this.videoList = [];

    this.taskStatus = [];
    this.taskStatus[0] = { statusName: 'Not Started', colorHex: '#7166F9' };
    this.taskStatus[1] = { statusName: 'In Progress', colorHex: '#FFA31A' };
    this.taskStatus[2] = { statusName: 'Completed', colorHex: '#6BC371' };

    this.taskStatus[6] = { statusName: 'Accepted', colorHex: '#589BFC' };
    this.taskStatus[7] = { statusName: 'Rejected', colorHex: '#EF5050' };
    this.taskStatus[8] = { statusName: 'Fixed', colorHex: '#1D62FE' };
    this.taskStatus[9] = { statusName: 'Fixing', colorHex: '#FE6173' };
    this.taskStatus[10] = { statusName: 'QA InReview', colorHex: '#FF8A4A' };
    this.taskStatus[11] = { statusName: 'QA Rejected', colorHex: '#C93053' };
    this.taskStatus[12] = { statusName: 'QA Verified', colorHex: '#24CEDF' };

    this.filter = {
      status: 7,
    };
  }

  //Add user model for users
  nextPage() {
    this.taskList.pageIndex = this.taskList.pageIndex + 1;
  }
}

export interface taskListObj {
  list: Array<any>;
  pageIndex: number;
  pageSize: number;
}

export interface Filter {
  status: number;
}

export class AuditStatus {
  public static pending = 0;
}

export var statusFiltersList = [
  { status: 0, isSelected: false },
  { status: 1, isSelected: false },
  { status: 2, isSelected: false },
  { status: 6, isSelected: false },
  { status: 7, isSelected: false },
  { status: 8, isSelected: false },
  { status: 9, isSelected: false },
  { status: 10, isSelected: false },
  { status: 11, isSelected: false },
  { status: 12, isSelected: false },
];

//related to quality page

export class contentTypes {
  public static video = 1;
  public static image = 2;
}

export class taskTypes {
  public static accepted = 6;
  public static rejected = 7;
  public static fixed = 8;
}

export class scrollProperties{
  public static scrollDistance = 1;
  public static throttle = 300;
}

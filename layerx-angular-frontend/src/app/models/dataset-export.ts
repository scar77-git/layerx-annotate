/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { NumberList } from 'aws-sdk/clients/iot';

export class DatasetExport {
  exportsList: Array<exportsListItem>;
  selectionList: Array<selectionListItem>;

  constructor() {
    this.exportsList = [];
    this.selectionList = [];
  }
}

export interface exportsListItem {
  keyName: string;
  name: string;
  fileType: string;
  fileCount: number;
  progress: number;
  progressStatus: number;
  lastUpdatedAt: Date;
  sample: string;
  synctoolCommand: string;
  toolDownloadLink: string;
  toolDownloadName: string;
}

export interface selectionListItem {
  categoryName: string;
  formats: Array<format>;
}

export interface format {
  isSelected: boolean;
  keyName: string;
  name: string;
}

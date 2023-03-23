/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

export class Documents {
  documentList: Array<documentListItem>;

  constructor() {
    this.documentList = [];
  }
}

export interface documentListItem {
  fileName: string;
  documentId: string;
  uploadByName: string;
  uploadById: string;
  createdAt: Date;
}

/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { UploadState } from "ngx-uploadx";

export class UploadFile {
  name!: string;
  uploadId!: string;
  progress!: number;
  status!: string;

  constructor(state: UploadState) {
    this.uploadId = state.uploadId;
    this.update(state);
  }

  update(state: UploadState): void {
    this.name = state.name;
    this.progress = state.progress;
    this.status = state.status;
  }
}

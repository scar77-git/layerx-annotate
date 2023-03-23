/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

/**
 * @class: DatasetDownloadModalComponent
 * purpose of this module is to download dataset
 * @description:implements all the logics related to download dataset
 * @author: Pasan Nethsara
 */

import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ClipboardService } from 'ngx-clipboard';

export interface DialogData {
  downloadLink: string;
  command: string;
  name: string;
}

@Component({
  selector: 'app-dataset-download-modal',
  templateUrl: './dataset-download-modal.component.html',
  styleUrls: ['./dataset-download-modal.component.scss'],
})
export class DatasetDownloadModalComponent implements OnInit {
  constructor(
    private clipboardApi: ClipboardService,
    public _dialogRef: MatDialogRef<DatasetDownloadModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
  }

  ngOnInit(): void {}

  close(): void {
    this._dialogRef.close();
  }

  /**
   * download dataset export
   */
  async downloadDatasetExport() {
    let url = this.data.downloadLink;
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = this.data.name;
    // Append to the DOM
    document.body.appendChild(anchor);
    // Trigger `click` event
    anchor.click();
    // Remove element from DOM
    document.body.removeChild(anchor);
  }

  /**
   * copy export command
   */
   copyCommand() {
    this.clipboardApi.copyFromContent(this.data.command);
  }
}

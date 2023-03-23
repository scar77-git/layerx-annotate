/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DatasetService } from 'src/app/services/dataset.service';

export interface DialogData {
  datasetId: string;
  version: string;
}

@Component({
  selector: 'app-dataset-delete',
  templateUrl: './dataset-delete.component.html',
  styleUrls: ['./dataset-delete.component.scss'],
})
export class DatasetDeleteComponent implements OnInit {
  datasetId: string;
  errorMsg: string;
  version: string;

  constructor(
    private _dataSetService: DatasetService,
    public dialogRef: MatDialogRef<DatasetDeleteComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.datasetId = data.datasetId;
    this.errorMsg = '';
    this.version = '';
  }

  ngOnInit(): void {}

  onNoClick(status?: boolean): void {
    this.dialogRef.close(status);
  }

  delete() {
    this.errorMsg = '';
    if (this.version === this.data.version) this.deleteDataset();
    else this.errorMsg = 'Dataset version miss matched!';
  }

  clearErrorMsg() {
    this.errorMsg = '';
  }

  deleteDataset() {
    this._dataSetService.deleteDatasetVersion(this.datasetId).subscribe(
      (response) => {
        this.onNoClick(true);
      },
      (error) => {
        this.errorMsg = error.error.error.message;
      }
    );
  }
}

/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface DialogData {
  dataset: string;
}

@Component({
  selector: 'app-dataset-duplicate',
  templateUrl: './dataset-duplicate.component.html',
  styleUrls: ['./dataset-duplicate.component.scss'],
})
export class DatasetDuplicateComponent implements OnInit {
  dataset : string;

  constructor(
    public dialogRef: MatDialogRef<DatasetDuplicateComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.dataset = data.dataset;
  }

  ngOnInit(): void {

  }
  onNoClick(): void {
    this.dialogRef.close();
  }
  create(){

  }
}

/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { Options } from '@angular-slider/ngx-slider';
import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface DialogData {
  trainingPercentage: number;
  validationPercentage: number;
  testingPercentage: number;
}

@Component({
  selector: 'app-dataset-split-rebalance',
  templateUrl: './dataset-split-rebalance.component.html',
  styleUrls: ['./dataset-split-rebalance.component.scss'],
})
export class DatasetSplitRebalanceComponent implements OnInit {
  //slider options
  minValue: number = 0;
  maxValue: number = 0;
  
  options: Options = {
    floor: 0,
    ceil: 100,
    step: 1,
    showTicks: false,
    hideLimitLabels: true,
    hidePointerLabels: true,
    showOuterSelectionBars: true,
  };
  @ViewChild('ngxSlide') ngxSlide!: ElementRef;

  constructor(
    public _dialogRef: MatDialogRef<DatasetSplitRebalanceComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
  ) {
      this.minValue = data.trainingPercentage;
      this.maxValue = 100 - data.testingPercentage;
  }

  ngOnInit(){
  }

  /*
   * to rebalance the dataset
   */
  rebalanceDataset() {
    const trainingSet = this.minValue;
    const validationSet = this.maxValue - this.minValue;
    const testingSet = 100 - this.maxValue;

    this._dialogRef.close({
      train: trainingSet,
      validation: validationSet,
      test: testingSet,
    });
    
  }

  close(): void {
    this._dialogRef.close();
  }
}

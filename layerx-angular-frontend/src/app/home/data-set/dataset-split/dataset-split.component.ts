/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DatasetSplitRebalanceComponent } from 'src/app/components/modals/dataset-split-rebalance/dataset-split-rebalance.component';
import { DatasetSplit } from 'src/app/models/dataset-split';
import { DatasetDataService } from 'src/app/services/data/dataset-data.service';
import { DatasetSplitService } from 'src/app/services/dataset-split.service';

@Component({
  selector: 'app-split',
  templateUrl: './dataset-split.component.html',
  styleUrls: ['./dataset-split.component.scss'],
})
export class DatasetSplitComponent implements OnInit {
  loading: boolean;
  datasetSplitObj: DatasetSplit;
  selectedVersionId: string; //to assign selected dataset version ID
  private ngUnsubscribe = new Subject();

  constructor(
    public _dialog: MatDialog,
    private _datasetSplitService: DatasetSplitService,
    private _dDatasetService: DatasetDataService
  ) {
    this.loading = false;
    this.selectedVersionId = '';
    this.datasetSplitObj = new DatasetSplit();

    // this.getSplitStats();
  }

  ngOnInit(): void {
    this.getIsDatasetRefreshed();
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  getIsDatasetRefreshed() {
    this._dDatasetService
      .getRefreshDataset()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((isRefresh: boolean) => {
        this.getSelectedVersionId();
        this.getSplitStats();
      });
  }

  getSelectedVersionId() {
    let versionID = localStorage.getItem('selectedVersion');
    if (versionID) {
      this.selectedVersionId = versionID;
    }

  }

  openRebalanceModal() {
    const dialogRef = this._dialog.open(DatasetSplitRebalanceComponent, {
      disableClose: true,
      width: '1100px',
      data: {
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
    });
  }

  /**
   * get dataset split data for the current dataset
   */
  getSplitStats() {
    this.loading = true;
    this._datasetSplitService.getSplitStats(this.selectedVersionId).subscribe(
      (response) => {
        this.loading = false;
        this.datasetSplitObj.splitData = response;
      },
      (error) => {
        this.loading = false;
      }
    );
  }
}

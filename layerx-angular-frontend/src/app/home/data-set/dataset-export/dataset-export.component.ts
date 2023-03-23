/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

/**
 * @class: DatasetExportComponent
 * purpose of this module is to export datasets
 * @description:implements all the logics related to dataset export
 * @author: Pasan Nethsara
 */

import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DatasetDownloadModalComponent } from 'src/app/components/modals/dataset-download-modal/dataset-download-modal.component';
import { DatasetExportAddFormatComponent } from 'src/app/components/modals/dataset-export-add-format/dataset-export-add-format.component';
import { DatasetExport } from 'src/app/models/dataset-export';
import { DatasetDataService } from 'src/app/services/data/dataset-data.service';
import { DatasetExportService } from 'src/app/services/dataset-export.service';

@Component({
  selector: 'app-dataset-export',
  templateUrl: './dataset-export.component.html',
  styleUrls: ['./dataset-export.component.scss'],
})
export class DatasetExportComponent implements OnInit {
  loading: boolean;
  datasetExportObj: DatasetExport; // to assign dataset export model
  selectedVersionId: string; //to assign selected dataset version ID
  generateProgress: number; //to assign the progress generation status
  private ngUnsubscribe = new Subject();
  maxProgress: number = 100; //max progress
  progressInstance!: any;

  constructor(
    public _dialog: MatDialog,
    private _datasetExportService: DatasetExportService,
    private _dDatasetService: DatasetDataService
  ) {
    this.loading = false;
    this.selectedVersionId = '';
    this.generateProgress = -1;
    this.datasetExportObj = new DatasetExport();
  }

  ngOnInit(): void {
    this.getIsDatasetRefreshed();
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
    if (this.progressInstance) {
      clearInterval(this.progressInstance);
    }
  }

  getIsDatasetRefreshed() {
    this._dDatasetService
      .getRefreshDataset()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((isRefresh: boolean) => {
        this.getSelectedVersionId();
        this.getDatasetList();
      });
  }

  getSelectedVersionId() {
    let versionID = localStorage.getItem('selectedVersion');
    if (versionID) {
      this.selectedVersionId = versionID;
    }
  }

  openAddFormatModal() {
    const dialogRef = this._dialog.open(DatasetExportAddFormatComponent, {
      disableClose: true,
      width: '1100px',
      data: {
        selectionList: this.datasetExportObj.selectionList,
        selectedVersionId: this.selectedVersionId,
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      this.getIsDatasetRefreshed();
    });
  }

  /**
   * get dataset list from back-end and assign list to exportsList
   */
  getDatasetList() {
    this.loading = true;
    this._datasetExportService.getDatasetList(this.selectedVersionId).subscribe(
      (response) => {
        this.loading = false;
        this.datasetExportObj.exportsList = response.exportsList;
        this.datasetExportObj.selectionList = response.selectionList;

        for (let i = 0; i < this.datasetExportObj.exportsList.length; i++) {
          if (
            this.datasetExportObj.exportsList[i].progress != this.maxProgress
          ) {
            this.getFormatGenerationProgress(
              this.datasetExportObj.exportsList[i].keyName
            );
            this.progressInstance = setInterval(() => {
              this.getFormatGenerationProgress(
                this.datasetExportObj.exportsList[i].keyName
              );
            }, 60000);
          }
        }
      },
      (error) => {
        this.loading = false;
      }
    );
  }

  /**
   * get dataset dataset generation progress
   */
  getFormatGenerationProgress(keyName: string) {
    this._datasetExportService
      .getFormatGenerationProgress(this.selectedVersionId, keyName)
      .subscribe(
        (response) => {},
        (error) => {
          this.loading = false;
        }
      );
  }

  /**
   * to download a sample of the dataset
   */
  getSample(link: string) {
    window.open(link);
  }

  /**
   * to download the dataset
   * @param index - index of the selected dataset export type
   */
  downloadDataset(index: number) {
    const dialogRef = this._dialog.open(DatasetDownloadModalComponent, {
      disableClose: true,
      width: '900px',
      data: {
        downloadLink: this.datasetExportObj.exportsList[index].toolDownloadLink,
        command: this.datasetExportObj.exportsList[index].synctoolCommand,
        name: this.datasetExportObj.exportsList[index].toolDownloadName,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
    });
  }
}

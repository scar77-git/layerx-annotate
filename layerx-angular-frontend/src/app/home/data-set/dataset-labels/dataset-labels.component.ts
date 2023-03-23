/**
Copyright (c) 2022 ZOOMi Technologies Inc.
all rights reserved.
This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { interval, Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AddLabelModalComponent } from 'src/app/components/modals/add-label-modal/add-label-modal.component';
import { ConfirmModalComponent } from 'src/app/components/modals/confirm-modal/confirm-modal.component';
import { NewVersionConfirmationComponent } from 'src/app/components/modals/new-version-confirmation/new-version-confirmation.component';
import { ErrorDialogComponent } from 'src/app/components/modals/error-dialog/error-dialog.component';
import { DLabels } from 'src/app/models/d-labels';
import { DLabelsService } from 'src/app/services/d-labels.service';
import { DatasetDataService } from 'src/app/services/data/dataset-data.service';
import { DatasetService } from 'src/app/services/dataset.service';
import { ProjectDataService } from 'src/app/services/project-data.service';
import { SharedService } from 'src/app/services/shared.service';
import { DataSetProgressTypes } from 'src/app/shared/constants/dataset';
import { type } from 'os';

@Component({
  selector: 'app-d-labels',
  templateUrl: './dataset-labels.component.html',
  styleUrls: ['./dataset-labels.component.scss'],
})
export class DatasetLabelsComponent implements OnInit {
  loading: boolean;
  selectedVersionId: string; // assign selected project id
  dLabelsObj: DLabels; // dataset labels object
  labelCount!: number;
  private ngUnsubscribe = new Subject();
  projectProgress: number;
  maxProgress: number = 100;
  progressInstance!: any;
  isDataSetProcessing: boolean;
  isDataProcessingError: boolean;
  dataProcessingErrorMessage: string;
  islabelDataSetProcessing!: boolean;
  subscription!: Subscription;
  processType!: number;
  clickCount: number;
  NEW_VERSION = 'new';
  UPDATE_VERSION = 'update';

  constructor(
    public _dialog: MatDialog,
    public sharedService: SharedService,
    private _projectDataService: ProjectDataService,
    private _dLabelsService: DLabelsService,
    private _dDatasetService: DatasetDataService,
    private _dataSetService: DatasetService,
    private _router: Router
  ) {
    this.loading = false;
    this.selectedVersionId = ''; //remove later
    this.dLabelsObj = new DLabels();
    this.projectProgress = -1;
    this.isDataSetProcessing = false;
    this.isDataProcessingError = false;
    this.dataProcessingErrorMessage = '';
    this.clickCount = 0;

    this.sharedService.changeEmitted$.subscribe((projectId) => {
      this.getLabelList();
    });
  }

  ngOnInit(): void {
    
    this.getIsDatasetRefreshed();
  }
  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
    if(this.subscription){
      this.subscription.unsubscribe();
    }
    clearInterval(this.progressInstance);
  }

  getLabelDataSetStatus() {
    this.islabelDataSetProcessing =
      this._dDatasetService.getDataSetLabelProgressStatus();
  }


  getIsDatasetRefreshed() {
    this._dDatasetService
      .getRefreshDataset()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((isRefresh: boolean) => {
        this.getSelectedVersionId();
        this.getLabelList();
        
      });
  }
  setNewVersion() {
    this._dDatasetService.setNewVersion(true);
  }

  getSelectedVersionId() {
    let versionID = localStorage.getItem('selectedVersion');
    if (versionID) {
      this.selectedVersionId = versionID;
    }
  }
  setDataOnRouteChange() {
    let projectId = this._projectDataService.getProjectDetails().id;
    if (projectId) {
      this.getLabelList();
    }
  }
  
  openAddLabel() {
    this.clickCount++;
    if(this.clickCount == 1){
      this._dataSetService.datasetProgress(this.selectedVersionId).subscribe(
        (response) => {
          if (!response.isPending) {
            const dialogRef = this._dialog.open(AddLabelModalComponent, {
              disableClose: true,
              width: '650px',
              data: { labelList: this.dLabelsObj.labelList },
            });
  
            dialogRef.afterClosed().subscribe((result) => {
              this.clickCount = 0;
              if (result) {
                // this.newVersion();
                this.dLabelsObj.labelList = result;
                this.calcLabelCount();
                this.isNewVersion();
                // this.updateLabelList();
              }
            });
          } else {
            let error = '';
            let type: number = response.type;
  
            switch (type) {
              case DataSetProgressTypes.creationProcessing:
                error = 'Dataset creation in progress. Please wait…';
                break;
              case DataSetProgressTypes.labelProcessing:
                error = 'Dataset label in progress. Please wait…';
                break;
              case DataSetProgressTypes.augmentationProcessing:
                error = 'Dataset augmentation in progress. Please wait…';
                break;
              case DataSetProgressTypes.updateProcessing:
                error = 'Dataset updating in progress. Please wait…';
                break;               
            }
  
            const dialogRef = this._dialog.open(ErrorDialogComponent, {
              disableClose: true,
              width: '650px',
              data: { header: 'Error', description: error },
            });
  
            dialogRef.afterClosed().subscribe((result) => {
              this.clickCount = 0;
              if (result) {
              }

            });
          }
        },
        (error) => {

          this.onError('Error', error.error.error.message);
        }
      );
    }
  }

  /**
   * get dataset stats from back-end and assign data to overview model
   */
  getLabelList() {
    this.loading = true;
    this._dLabelsService.getLabelList(this.selectedVersionId).subscribe(
      (response) => {
        this.loading = false;
        this.dLabelsObj.labelList = response.labelAttributeList;
        this.dLabelsObj.totalFrames = response.totalFrames;
        this.dLabelsObj.totalBoxes = response.totalBoxes;
        this.calcLabelCount();
      },
      (error) => {

        this.loading = false;
      }
    );
  }
  updateLabelList(isNewVersion: boolean) {
    this._dLabelsService
      .updateLabelList(
        this.selectedVersionId,
        this.dLabelsObj.labelList,
        isNewVersion
      )
      .subscribe(
        (response) => {
          if (isNewVersion) {
            this.setNewVersion();
          }
          this._dDatasetService.setRefreshProgress(true);
        },
        (error) => {
          this.loading = false;
          this.onError('Error', error.error.error.message);
        }
      );
  }

  isNewVersion() {
    const dialogRef = this._dialog.open(NewVersionConfirmationComponent, {
      disableClose: true,
      width: '550px',
      data: {
        header: 'Update labels',
        description: 'Do you want to create new version or update existing?',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this._dDatasetService.setDataSetLabelProgressStatus(true);
        if (result == this.UPDATE_VERSION) {
          this.updateLabelList(false);
        }
        if (result == this.NEW_VERSION) {
          this.updateLabelList(true);
        }
      }
    });
  }

  onConfirm(id: number) {
    this.clickCount++;
    if(this.clickCount == 1){
      this._dataSetService.datasetProgress(this.selectedVersionId).subscribe(
        (response) => {
          if (!response.isPending) {
            const dialogRef = this._dialog.open(ConfirmModalComponent, {
              disableClose: true,
              width: '500px',
              data: {
                header: 'Delete Label',
                description: 'Are you sure?',
                status: false,
              },
            });
        
            dialogRef.afterClosed().subscribe((result) => {
              this.clickCount = 0;
              if (result == true) {
                this.deleteLabel(id);
              }
            });
          } else {
            let error = '';
            let type: number = response.type;
  
            switch (type) {
              case DataSetProgressTypes.creationProcessing:
                error = 'Dataset creation in progress. Please wait…';
                break;
              case DataSetProgressTypes.labelProcessing:
                error = 'Dataset label in progress. Please wait…';
                break;
              case DataSetProgressTypes.augmentationProcessing:
                error = 'Dataset augmentation in progress. Please wait…';
                break;
              case DataSetProgressTypes.updateProcessing:
                error = 'Dataset updating in progress. Please wait…';
                break;               
            }
  
            const dialogRef = this._dialog.open(ErrorDialogComponent, {
              disableClose: true,
              width: '650px',
              data: { header: 'Error', description: error },
            });
  
            dialogRef.afterClosed().subscribe((result) => {
              this.clickCount = 0;
              if (result) {
              }

            });
          }
        },
        (error) => {
          this.onError('Error', error.error.error.message);
        }
      );
    }
  }

  deleteLabel(id: number) {
    const dialogRef = this._dialog.open(NewVersionConfirmationComponent, {
      disableClose: true,
      width: '550px',
      data: {
        header: 'Change labels',
        description: 'Do you want to creat new version or update existing?',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this._dDatasetService.setDataSetLabelProgressStatus(true);
        this.dLabelsObj.labelList[id].isEnabled = false;
        this.calcLabelCount();
        if (result == this.UPDATE_VERSION) {
          this.updateLabelList(false);
        }
        if (result == this.NEW_VERSION) {
          this.updateLabelList(true);
        }
      }
    });
  }
  formatText(txt: string) {
    let text = txt.toString().replace(/,/g, '-');
    return text;
  }

  calcLabelCount() {
    this.labelCount = 0;
    for (let i = 0; i < this.dLabelsObj.labelList.length; i++) {
      if (this.dLabelsObj.labelList[i].isEnabled) {
        this.labelCount++;
      }
    }
  }

  onError(header: string, description: string, error?: string) {
    const dialogRef = this._dialog.open(ErrorDialogComponent, {
      disableClose: true,
      width: '460px',
      data: { header: header, description: description, error: error },
    });

    dialogRef.afterClosed().subscribe((result) => {
    });
  }
}
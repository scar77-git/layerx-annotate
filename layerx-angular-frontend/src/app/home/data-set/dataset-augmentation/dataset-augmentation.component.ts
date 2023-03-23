/**
Copyright (c) 2022 ZOOMi Technologies Inc.
all rights reserved.
This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { interval, Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ConfirmModalComponent } from 'src/app/components/modals/confirm-modal/confirm-modal.component';
import { DatasetAddAugmentationModalComponent } from 'src/app/components/modals/dataset-add-augmentation-modal/dataset-add-augmentation-modal.component';
import {
  convertClassToObject,
  PromptMesseges,
} from 'src/app/constants/prompt-messeges';
import { DatasetDataService } from 'src/app/services/data/dataset-data.service';
import { DatasetAugmentationService } from 'src/app/services/dataset-augmentation.service';
import { SharedService } from 'src/app/services/shared.service';
import {
  AugmentationLevels,
  DataAugmentations,
} from 'src/app/shared/constants/augmentation';
import {
  Augmentation,
  augmentationBox,
  augmentationData,
  augmentationLevels,
} from 'src/app/shared/models/augmentation';
import { NewVersionConfirmationComponent } from 'src/app/components/modals/new-version-confirmation/new-version-confirmation.component';
import { ErrorDialogComponent } from 'src/app/components/modals/error-dialog/error-dialog.component';
import { DatasetService } from 'src/app/services/dataset.service';
import { Router } from '@angular/router';
import { DataSetProgressTypes } from 'src/app/shared/constants/dataset';

@Component({
  selector: 'app-augmentation',
  templateUrl: './dataset-augmentation.component.html',
  styleUrls: ['./dataset-augmentation.component.scss'],
})
export class DatasetAugmentationComponent implements OnInit {
  loading: boolean;
  readonly dataAugmentationConstant: typeof DataAugmentations =
    DataAugmentations;
  readonly augmentationLevelsConstant: typeof AugmentationLevels =
    AugmentationLevels;

  selectedVersionId: string; //to assign selected dataset version ID
  augmentationData: any;
  augmentationLevelPanels: any; // to assign augmentation level for auto scroll
  projectProgress: number;
  private ngUnsubscribe = new Subject();
  const: any = null;
  progressInstance!: any;
  maxProgress: number = 100;
  augmentations: any;
  isDataSetProcessing: boolean;
  isDataProcessingError: boolean;
  dataProcessingErrorMessage: string;
  isAugmentationDataSetProcessing!: boolean;
  subscription!: Subscription;
  processType!: number;
  clickCount: number;
  NEW_VERSION = 'new';
  UPDATE_VERSION = 'update';

  constructor(
    public _dialog: MatDialog,
    private sharedService: SharedService,
    private _augmentationService: DatasetAugmentationService,
    private _dDatasetService: DatasetDataService,
    private _dataSetService: DatasetService,
    private _router: Router
  ) {
    this.augmentationData = {
      IMAGE_LEVEL: [],
      BOUNDING_BOX_LEVEL: [],
    };
    this.loading = false;
    this.projectProgress = -1;
    this.selectedVersionId = '';
    this.augmentationLevelPanels =
      this.sharedService.convertClassToObject(augmentationLevels);
    this.const = convertClassToObject(PromptMesseges);
    this.isDataSetProcessing = false;
    this.isDataProcessingError = false;
    this.dataProcessingErrorMessage = '';
    this.clickCount = 0;
  }

  ngOnInit(): void {
    this.getIsDatasetRefreshed();
    this.getSelectedVersionId();
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  getAugmentationDataSetStatus() {
    this.isAugmentationDataSetProcessing =
      this._dDatasetService.getDataSetAugmentationProgressStatus();
  }

  getIsDatasetRefreshed() {
    this._dDatasetService
      .getRefreshDataset()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((isRefresh: boolean) => {
        this.getSelectedVersionId();
        this.getAugmentationList();
      });
  }


  getSelectedVersionId() {
    let versionID = localStorage.getItem('selectedVersion');
    if (versionID) {
      this.selectedVersionId = versionID;
    }
  }

  /**
   * get the list of augmentations and assign it to augmentation data
   */
  getAugmentationList() {
    this.loading = true;
    this._augmentationService
      .getAugmentationList(this.selectedVersionId)
      .subscribe(
        (response) => {
          this.loading = false;
          if (response.IMAGE_LEVEL) {
            this.augmentationData.IMAGE_LEVEL = response.IMAGE_LEVEL;
          }

          if (response.BOUNDING_BOX_LEVEL) {
            this.augmentationData.BOUNDING_BOX_LEVEL =
              response.BOUNDING_BOX_LEVEL;
          }
        },
        (error) => {
          this.loading = false;
        }
      );
  }


  /**
   * delete augmentation
   * @param augmentationId - to pass augmentation id to delete
   */
  deleteAugmentation(augmentationId: string) {
    this._augmentationService
      .deleteAugmentation(this.selectedVersionId, augmentationId)
      .subscribe(
        (response) => {
          this.getAugmentationList();
          this._dDatasetService.setRefreshProgress(true);

        },
        (error) => {
          this.onError('Error', error.error.error.message);
        }
      );
  }

  getBoxCommonProperties(
    augmentationLevel: string,
    boxType: string
  ): augmentationBox {
    let dataAugmentation = this.sharedService.convertClassToObject(
      this.dataAugmentationConstant
    );

    return dataAugmentation.augmentationItems[augmentationLevel][boxType];
  }

  onConfirmDelete(augmentationId: string) {
    const dialogRef = this._dialog.open(ConfirmModalComponent, {
      disableClose: true,
      width: '500px',
      data: {
        header: 'Delete Augmentation',
        description: this.const.augmentation_delete,
        status: false,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.deleteAugmentation(augmentationId);
      }
    });
  }

  openAddAugmentation(id?: string, panelType?: number) {
    this.clickCount++;
    if(this.clickCount == 1){
      this._dataSetService.datasetProgress(this.selectedVersionId).subscribe(
        (response) => {
          if (!response.isPending) {
            if (!this.isAugmentationDataSetProcessing) {
  
              const dialogRef = this._dialog.open(
                DatasetAddAugmentationModalComponent,
                {
                  disableClose: true,
                  width: '1200px',
                  data: {
                    selectedAugDataSet: this.augmentationData,
                    selectedId: id,
                    selectedPanelType: panelType,
                    selectedVersionId: this.selectedVersionId,
                  },
                }
              );
  
              dialogRef.afterClosed().subscribe((result) => {
                this.clickCount = 0;
                if (result) {
                  this.augmentations = result;
                  this.isNewVersion();
                }
              });
            } else {
  
              const dialogRef = this._dialog.open(ErrorDialogComponent, {
                disableClose: true,
                width: '700px',
                data: {
                  header: 'Error',
                  description: 'Augmentation in progress. Please wait…',
                  error: 'alert',
                },
              });
  
              dialogRef.afterClosed().subscribe((result) => {
                this.clickCount = 0;
                if (result) {
                }
              });
            }
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
  isNewVersion() {
    const dialogRef = this._dialog.open(NewVersionConfirmationComponent, {
      disableClose: true,
      width: '550px',
      data: {
        header: 'Add augmentations',
        description: 'Do you want to create new version or update existing?',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this._dDatasetService.setDataSetAugmentationProgressStatus(true);
        if (result == this.UPDATE_VERSION) {
          this._augmentationService
            .updateAugmentations(this.selectedVersionId, this.augmentations)
            .subscribe(
              (response) => {
                this.getAugmentationList();
                this._dDatasetService.setRefreshDataset(true);
              },
              (error) => {
                this.onError('Error', error.error.error.message);
              }
            );
        }
        if (result == this.NEW_VERSION) {
          this._augmentationService
            .saveAugmentations(this.selectedVersionId, this.augmentations)
            .subscribe(
              (response) => {
                this._dDatasetService.setNewVersion(true);
              },
              (error) => {
                this.onError('Error', error.error.error.message);
              }
            );
        }
      }
    });
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
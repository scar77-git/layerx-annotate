/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntil } from 'rxjs/operators';
import { interval, Subject, Subscription} from 'rxjs';
import { ProjectDataService } from 'src/app/services/project-data.service';
import { SharedService } from 'src/app/services/shared.service';
import { DLabelsService } from 'src/app/services/d-labels.service';
import { DatasetDataService } from 'src/app/services/data/dataset-data.service';
import { DatasetService } from 'src/app/services/dataset.service';
import { DataSetProgressTypes } from 'src/app/shared/constants/dataset';

@Component({
  selector: 'app-data-set',
  templateUrl: './data-set.component.html',
  styleUrls: ['./data-set.component.scss'],
})
export class DataSetComponent implements OnInit {
  selectedProjectName: any;
  selectedProject: any;
  subscription!: Subscription;
  selectedDataset: any;
  selectedVersionId: string; // assign selected dataset id
  selectedDatasetId!: string;
  private ngUnsubscribe = new Subject();

  isDataSetProcessing: boolean = false;
  isDataProcessingError: boolean = false;
  dataProcessingErrorMessage: string = '';
  isAugmentationDataSetProcessing!: boolean;
  projectProgress: number = 0;
  processType!:number;

  DATASET_CREATION = DataSetProgressTypes.creationProcessing;
  LABEL_PROCESSING = DataSetProgressTypes.labelProcessing;
  AUGMENTATION_PROCESSING = DataSetProgressTypes.augmentationProcessing;
  DATASET_EDIT = DataSetProgressTypes.updateProcessing;

  constructor(
    public _router: Router,
    public _sharedService: SharedService,
    private _projectDataService: ProjectDataService,
    private _dLabelsService: DLabelsService,
    private _dDataSetDataService: DatasetDataService,
    private _dataSetService: DatasetService,
  ) {
    this.selectedVersionId = '';
  }

  ngOnInit(): void {
    this.subscription = this._sharedService.projectListStatus.subscribe(
      (status) => {
        if (status) {
          this.getListStatus();
        }
      }
    );
    this.getIsDatasetRefreshed();
    this.getRefreshProgress();
  }
  
  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  getIsDatasetRefreshed(){
    this._dDataSetDataService
      .getRefreshDataset()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((isRefresh: boolean) => {
        this.getSelectedDataset();
        this.getSelectedVersionId()
        this.updateProgress();
        this.getDatasetProgress();
      });
  }
  getRefreshProgress() {
    this._dDataSetDataService
      .getRefreshProgress()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((isRefresh: boolean) => {
        this.getDatasetProgress();
      });
  }

  getSelectedVersionId(){
    let version = localStorage.getItem('selectedVersion');
    if(version){
      this.selectedVersionId = version;
    }
  }

  updateProgress(){
    const source = interval(60000);
    this.subscription = source.subscribe(val => {
      if(this._router.url.includes('dataset')) {
        this.getDatasetProgress();
      }
    });
  }
  getDatasetProgress(){
    let versionId = this._dataSetService.getSelectedDatasetVersion() || '';

    this._dataSetService.datasetProgress(this.selectedVersionId).subscribe(
      (response) => {
        this.processType = response.type;
        this.projectProgress = response.progress;
        this.isDataSetProcessing = response.isPending;
        this.isDataProcessingError = response.isError;
        this.dataProcessingErrorMessage = response.errorMessage;

        if (!this.isDataSetProcessing || versionId != this.selectedVersionId) {
          this.subscription.unsubscribe();
        }
      },
      (error) => {
      }
    );
  }
  
  getSelectedProject(project: any) {
    this.selectedProject = project;
    this.selectedProjectName = project.name;
    if (this.selectedProject) {
      localStorage.setItem(
        'selectedProject',
        JSON.stringify(this.selectedProject)
      );
      this._sharedService.emitChange(this.selectedProject.id);
    }
  }
  getSelectedDataset(){
    this.selectedDataset = JSON.parse(localStorage.getItem('selectedDataset') || '{}');
  }

  getListStatus() {
    let selectedProject = this._projectDataService.getProjectDetails();
    if (selectedProject) {
      this.selectedProjectName = selectedProject.name;
    }
  }

  /**
   * navigate to page which pass by route parameter
   * @param routeName - route name
   */
  navigateTo(routeName: any) {
    this._router.navigate([`/dataset/${routeName}`]);
  }
}

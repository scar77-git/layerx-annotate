/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { Component, ElementRef, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { Location } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { DatasetSplitRebalanceComponent } from 'src/app/components/modals/dataset-split-rebalance/dataset-split-rebalance.component';
import {
  CdkDragDrop,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import _ from 'lodash';
import { SplitTaskModalComponent } from 'src/app/components/modals/split-task-modal/split-task-modal.component';
import { SuccessDialogComponent } from 'src/app/components/modals/success-dialog/success-dialog.component';
import { ErrorDialogComponent } from 'src/app/components/modals/error-dialog/error-dialog.component';
import { SharedService } from 'src/app/services/shared.service';
import { DataSetTypes, SplitTypes } from 'src/app/shared/constants/dataset';
import { DatasetService } from 'src/app/services/dataset.service';
import { Dataset } from 'src/app/shared/models/dataset';
import { Router } from '@angular/router';

@Component({
  selector: 'app-rebalance',
  templateUrl: './rebalance.component.html',
  styleUrls: ['./rebalance.component.scss']
})
export class RebalanceComponent implements OnInit {
  @ViewChild('videoS')
  videoS!: ElementRef;

  dataset: Dataset;
  todo: any;
  done: any;
  items: any;
  // videoList: any = [];
  trainListSize: number = 0;
  validationListSize: number = 0;
  testListSize: number = 0;
  selections: Array<any>;
  panelTypes: any = null; // to assign split types
  activeSplitType: string;
  videoScroll: boolean = false;
  scroll: any;
  lastItem: any;
  selectedSet: string;
  loading: boolean;
  videoSearchedList: any;
  trainSearchedList: any;
  validationSearchedList: any;
  testSearchedList: any;
  videoSearchText: string = '';
  trainingSearchText: string = '';
  validationSearchText: string = '';
  testingSearchText: string = '';
  onEdit: boolean;
  isNewVersion: boolean;

  TASK_TYPE_TRAIN = 'trainingSet';
  TASK_TYPE_VALIDATION = 'validationSet';
  TASK_TYPE_TEST = 'testingSet';


  constructor(
    private _location: Location,
    public _dialog: MatDialog,
    public _sharedService: SharedService,
    private _dataSetService: DatasetService,
    public _router: Router,
    
  ) { 
    this.dataset = new Dataset();
    this.selections = [];
    this.panelTypes = this._sharedService.convertClassToObject(SplitTypes);
    this.selectedSet = "";
    this.loading = false;
    this.onEdit = false;

    this.panelTypes.RANDOM = 1;
    this.panelTypes.MANUAL = 2;

    this.activeSplitType = this.panelTypes.RANDOM;
    this.isNewVersion = false;

  }

  ngOnInit(): void {
    /**
     * set dataset id
     */
    let id = this._dataSetService.getCreatedDatasetId();
    this.onEdit = this._dataSetService.isEditDataset();

    if(id){
      this.dataset.id = id;
    }else if(this.onEdit) {
      let dataset = this._dataSetService.getSelectedDataSet();
      if(dataset){
        this.dataset.id = JSON.parse(dataset).id
      }
      let type = this._dataSetService.getEditType();

      if(type){
        this.activeSplitType = type;
      }
      let versionId = this._dataSetService.getSelectedDatasetVersion();
      if(versionId){
        this.dataset.selectedVersionId = versionId;
      }
    } 
    else{
      this._router.navigate([`/process-data-set/create`]);
    }
    this.getVideoList();

  }
  ngOnDestroy(): void {
    this._dataSetService.clearCreatedDatasetId();
    this._dataSetService.clearEditDataSet();
    this._dataSetService.clearEditType();
    this._dataSetService.clearIsNewVersion();
  }

  /**
   * navigate to previous page
   */
  navigateBack() {
    this._dataSetService.clearCreatedDatasetId();
    this._location.back();
  }

  /**
   * load video list
   */
  getVideoList() {
    if(this.activeSplitType == this.panelTypes.RANDOM){
      this._dataSetService.getRandomVideoList(this.dataset.id, this.dataset.selectedVersionId).subscribe(
        (response) => {
          this.dataset.allFiles = response;
          this.filterSearchedLists();
          if(this.onEdit){
            this.getSplitList();
          }
          else{
            this.rebalanceDataset(60,30,10)
          }
        },
        (error) => {
          this.onError('Error', error.error.error.message);
        }
      );
    }if(this.activeSplitType == this.panelTypes.MANUAL){
      this._dataSetService.getManualVideoList(this.dataset.id, this.dataset.selectedVersionId).subscribe(
        (response) => {
          this.dataset.allFiles = response;
          this.filterSearchedLists();
          if(this.onEdit){
            this.getSplitList();
          }
        },
        (error) => {
          this.onError('Error', error.error.error.message);
        }
      );
    }
    this.calcTotalObjects();
  }

  getSplitList() {
    this._dataSetService.getSplitList(this.dataset.selectedVersionId).subscribe(
      (response) => {
        if(this.activeSplitType == response.creationType){
          this.dataset.trainingSet.objectsCount = response.splitCount[0].objectCount;
          this.dataset.trainingSet.percentage = response.splitCount[0].percentage;
          this.dataset.validationSet.objectsCount = response.splitCount[1].objectCount;
          this.dataset.validationSet.percentage = response.splitCount[1].percentage;
          this.dataset.testingSet.objectsCount = response.splitCount[2].objectCount;
          this.dataset.testingSet.percentage = response.splitCount[2].percentage;

          this.dataset.trainingSet.videoList = response.splitVideoArray[0].videoArray
          this.dataset.validationSet.videoList = response.splitVideoArray[1].videoArray
          this.dataset.testingSet.videoList = response.splitVideoArray[2].videoArray

          this.calcTotalObjects();
        }
        this.listSize();
        this.filterSearchedLists();
      },
      (error) => {
        this.onError('Error', error.error.error.message);
      } 
    )
  }

  /**
   * change dataset creation type
   */
  changeType(type: string){
    this.activeSplitType = type;
    let emptySet = {
      objectsCount: 0,
      percentage: 0,
      dataSetType: '',
      searchKey: '',
      videoList:[]
    }
    this.dataset.allFiles = [];
    this.dataset.trainingSet = JSON.parse(JSON.stringify(emptySet));
    this.dataset.validationSet = JSON.parse(JSON.stringify(emptySet));
    this.dataset.testingSet = JSON.parse(JSON.stringify(emptySet));
    this.trainListSize = 0
    this.validationListSize = 0;
    this.testListSize = 0;
    this.getVideoList();
  }

  /**
   * open random rebalance model
   */
  rebalance() {

    const dialogRef = this._dialog.open(DatasetSplitRebalanceComponent, {
      disableClose: true,
      width: '900px',
      data: {
        trainingPercentage: this.dataset.trainingSet.percentage, 
        validationPercentage: this.dataset.validationSet.percentage,
        testingPercentage: this.dataset.testingSet.percentage,
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        let train = result.train;
        let validation = result.validation;
        let test = result.test;

        this.rebalanceDataset(train, validation, test)
        // this.listSize()
      }
    });
  }

  /**
   * rebalance dataset
   * @param result rebalance parameters
   */
  rebalanceDataset(train: number, validation: number, test: number) {
    this._dataSetService
        .rebalanceDataset(this.dataset.allFiles ,this.dataset.id, train, validation, test)
        .subscribe(
          (response) => {
            if(this.activeSplitType == this.panelTypes.RANDOM){
              let counts = response.splitCount;
              this.dataset.trainingSet.objectsCount = counts[0].objectCount;
              this.dataset.trainingSet.percentage = counts[0].percentage;
              this.dataset.validationSet.objectsCount = counts[1].objectCount;
              this.dataset.validationSet.percentage = counts[1].percentage;
              this.dataset.testingSet.objectsCount = counts[2].objectCount;
              this.dataset.testingSet.percentage = counts[2].percentage;

              let videoList = response.splitVideoArray
              this.dataset.trainingSet.videoList = videoList[0].videoArray
              this.dataset.validationSet.videoList = videoList[1].videoArray
              this.dataset.testingSet.videoList = videoList[2].videoArray
              this.filterSearchedLists();
            }
          },
          (error) => {
            this.onError('Error', error.error.error.message);
          }
        );
  }

  /**
   * drag and drop
   */
  drop(event: CdkDragDrop<any>) {
    
    let index = event.previousIndex;
    let video_id = this.videoSearchedList[index]._id;

    let fileId = this.dataset.allFiles.findIndex((t) => t._id === video_id)

    if (event.previousContainer === event.container) {
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        fileId,
        event.container.data.length
      );
      let lastIndex = event.container.data.length - 1;
      this.lastItem = event.container.data[lastIndex];
      
      let containerId = event.container.id

      let containers : (any | string)[] | any | string = event.previousContainer.connectedTo

      if(containerId == containers[0].id) {
        this.selectedSet = this.TASK_TYPE_TRAIN
      }
      if(containerId == containers[1].id) {
        this.selectedSet = this.TASK_TYPE_VALIDATION
      }
      if(containerId == containers[2].id) {
        this.selectedSet = this.TASK_TYPE_TEST
      }
      
      let dataset = this._sharedService.convertClassToObject(
        this.dataset
      );

      dataset.totalObjects += this.lastItem.objectCount;
      dataset[this.selectedSet].objectsCount += this.lastItem.objectCount;

      
      this.dataset = dataset;
      this.listSize()
    }
    this.createTask(this.selectedSet)
    this.filterSearchedLists();
  }

  /**
   * open task assign model
   * @param videoName 
   * @param videoId 
   * @param taskList 
   */
  openAddLabel(videoName: string, videoId: string, taskList:any, currentDatasetType: DataSetTypes) {
    const dialogRef = this._dialog.open(SplitTaskModalComponent, {
      disableClose: true,
      width: '650px',
      data: { name: videoName, id: videoId, tasks: taskList, currentDatasetType: currentDatasetType},
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.assignTask(videoId, result.labels, result.currentDatasetType, result.toChangeDatasetType)
      }
    });
  }
  
  /**
   * create empty task on validation list and testing list upon drag video to trainning list
   */
  createTask(droppedSet: string) {

    let dataset = this._sharedService.convertClassToObject(
      this.dataset
    );

    let size = dataset[droppedSet].videoList.length;
    let emptyTaskList = dataset[droppedSet].videoList[size - 1];
    emptyTaskList = JSON.parse(JSON.stringify(emptyTaskList))
    emptyTaskList.taskList = [];
    emptyTaskList.selectTaskCount = 0;
    emptyTaskList.objectCount = 0;

    let trainingList =  JSON.parse(JSON.stringify(emptyTaskList))
    let validationList =  JSON.parse(JSON.stringify(emptyTaskList))
    let testingList =  JSON.parse(JSON.stringify(emptyTaskList))
    
    if(droppedSet != this.TASK_TYPE_TRAIN) {
      dataset.trainingSet.videoList.push(trainingList)
    }
    if(droppedSet != this.TASK_TYPE_VALIDATION) {
      dataset.validationSet.videoList.push(validationList)
    }
    if(droppedSet != this.TASK_TYPE_TEST) {
      dataset.testingSet.videoList.push(testingList)
    }

    this.dataset = dataset;
  }

  /**
   * split tasks between sets
   * @param videoId 
   * @param labels 
   * @param type 
   */
  assignTask(videoId:string, selectedTaskList:any, currentDatasetType: any, toChangeDatasetType: any) {
    if(currentDatasetType != toChangeDatasetType) {
      let dataset = this._sharedService.convertClassToObject(
        this.dataset
      );
  
      let index = dataset[currentDatasetType].videoList.findIndex((t: { _id: string; }) => t._id === videoId)
        
      dataset[currentDatasetType].videoList[index].taskList = selectedTaskList;
  
      let objectCount = 0;

      for(let i=0; i<selectedTaskList.length; i++){
        if(selectedTaskList[i].selected) {
          dataset[toChangeDatasetType].videoList[index].taskList.push(selectedTaskList[i]);
          dataset[toChangeDatasetType].videoList[index].selectTaskCount++;
          objectCount += selectedTaskList[i].labelCounts.totalCount;
        }
      }

      for(let i=0; i<selectedTaskList.length; i++){
        if(selectedTaskList[i].selected) {
          let id = selectedTaskList[i]._id;
          let setIndex = dataset[currentDatasetType].videoList[index].taskList.findIndex((x: { _id: string; }) => x._id == id);
          dataset[currentDatasetType].videoList[index].taskList.splice(setIndex , 1);
          dataset[currentDatasetType].videoList[index].selectTaskCount--;
          i--;
        }
      }
  
      dataset[currentDatasetType].objectsCount -= objectCount;
      dataset[currentDatasetType].videoList[index].objectCount -= objectCount;
      dataset[toChangeDatasetType].objectsCount += objectCount;
      dataset[toChangeDatasetType].videoList[index].objectCount += objectCount;
  
      this.dataset = dataset;
      this.listSize()
      this.filterSearchedLists();
    }
  }
  /**
   * remove video from set
   * @param type 
   * @param videoIndex 
   */
  clearTaskList(type: string, videoIndex: number) {
    let videoId = this.dataset.trainingSet.videoList[videoIndex]._id
    let count = 0;
    switch (type) {
      case 'train':
        count = this.dataset.trainingSet.videoList[videoIndex].objectCount
        this.dataset.trainingSet.objectsCount -= count;
        this.dataset.totalObjects -= count;
        this.dataset.trainingSet.videoList[videoIndex].taskList = [];
        this.dataset.trainingSet.videoList[videoIndex].selectTaskCount = 0;
        break;

      case 'validation':
        count = this.dataset.validationSet.videoList[videoIndex].objectCount
        this.dataset.validationSet.objectsCount -= count;
        this.dataset.totalObjects -= count;
        this.dataset.validationSet.videoList[videoIndex].taskList = [];
        this.dataset.validationSet.videoList[videoIndex].selectTaskCount = 0;
        break;
      
      case 'test':
        count = this.dataset.testingSet.videoList[videoIndex].objectCount
        this.dataset.testingSet.objectsCount -= count;
        this.dataset.totalObjects -= count;
        this.dataset.testingSet.videoList[videoIndex].taskList = [];
        this.dataset.testingSet.videoList[videoIndex].selectTaskCount = 0;
        break;
    }
    let trainTaskCount = this.dataset.trainingSet.videoList[videoIndex].taskList.length;
    let validateTaskCount = this.dataset.validationSet.videoList[videoIndex].taskList.length;
    let testTaskCount = this.dataset.testingSet.videoList[videoIndex].taskList.length;

    if(trainTaskCount + validateTaskCount + testTaskCount == 0) {
      this._dataSetService.getManualVideoList(this.dataset.id,this.dataset.selectedVersionId).subscribe(
        (response) => {
          let id = response.findIndex((t: { _id: string; }) => t._id === videoId)
          if(id != -1){
            this.dataset.allFiles.splice(id, 0, response[id])
            this.dataset.trainingSet.videoList.splice(videoIndex, 1);
            this.dataset.validationSet.videoList.splice(videoIndex, 1);
            this.dataset.testingSet.videoList.splice(videoIndex, 1);
          }
        },
        (error) => {
          this.onError('Error', error.error.error.message);
        }
      );
    }

    this.listSize()
  }

  /**
   * calculate list sizes without empty task videos
   */
  listSize() {
    this.trainListSize = 0
    this.validationListSize = 0;
    this.testListSize = 0;
    for(let i=0; i<this.dataset.trainingSet.videoList.length;i++){
      if(this.dataset.trainingSet.videoList[i].selectTaskCount > 0){
        this.trainListSize++
      }
    }
    for(let i=0; i<this.dataset.validationSet.videoList.length;i++){
      if(this.dataset.validationSet.videoList[i].selectTaskCount > 0){
        this.validationListSize++
      }
    }
    for(let i=0; i<this.dataset.testingSet.videoList.length;i++){
      if(this.dataset.testingSet.videoList[i].selectTaskCount > 0){
        this.testListSize++
      }
    }
    this.percentage()
  }

  /**
   * calculate total objects after loading data for edit call
   */
  calcTotalObjects() {
    this.dataset.totalObjects = this.dataset.trainingSet.objectsCount + 
      this.dataset.validationSet.objectsCount + this.dataset.testingSet.objectsCount;
  }
  /**
   * calculate object percentage
   */
  percentage() {
    let totalObjects = Math.max(this.dataset.totalObjects,1);
    let trainObjects = this.dataset.trainingSet.objectsCount;
    let validationObjects = this.dataset.validationSet.objectsCount;
    let testObjects = this.dataset.testingSet.objectsCount;

    this.dataset.trainingSet.percentage = Math.round(trainObjects / totalObjects * 100);
    this.dataset.validationSet.percentage = Math.round(validationObjects / totalObjects * 100);
    this.dataset.testingSet.percentage = Math.round(testObjects / totalObjects * 100);
  }

  select() {
    this.rebalanceDataset(this.dataset.trainingSet.percentage, this.dataset.validationSet.percentage, this.dataset.testingSet.percentage)
  }

  /**
   * create final dataset
   */
  createDataSet() {
    
    if(this.activeSplitType == this.panelTypes.RANDOM && !this.loading) {
      this.loading = true;
      this._dataSetService
      .createRandomDataSet(this.dataset.id, this.dataset.allFiles , this.dataset.trainingSet.percentage, this.dataset.validationSet.percentage, this.dataset.testingSet.percentage)
      .subscribe(
        (response) => {
          this._dataSetService.setNewDataSet()
          this._dataSetService.setSelectedDatasetVersion(response.versionDetails.versionId)
          this.success()
          this.loading = false;
        },
        (error) => {
          this.loading = false;
          this.onError('Error', error.error.error.message);
        }
      );
    }
    if(this.activeSplitType == this.panelTypes.MANUAL && !this.loading) {
      this.loading = true;
      this._dataSetService
      .createManualDataSet(this.dataset.id, this.dataset , this.dataset.trainingSet.percentage, this.dataset.validationSet.percentage, this.dataset.testingSet.percentage)
      .subscribe(
        (response) => {
          this._dataSetService.setNewDataSet()
          this._dataSetService.setSelectedDatasetVersion(response.versionDetails.versionId)
          this.success()
          this.loading = false;
        },
        (error) => {
          this.loading = false;
          this.onError('Error', error.error.error.message);
        }
      );
    }
  }

  editDataSet() {
    let isNewVersion = this._dataSetService.getIsNewVersion();
    this.isNewVersion = isNewVersion == "true";
    if(this.activeSplitType == this.panelTypes.RANDOM && !this.loading) {
      this.loading = true;
      this._dataSetService
      .editRandomDataSet(this.dataset.selectedVersionId, this.dataset.allFiles , this.dataset.trainingSet.percentage, this.dataset.validationSet.percentage, this.dataset.testingSet.percentage,this.isNewVersion)
      .subscribe(
        (response) => {
          this.success()
          this._dataSetService.clearEditDataSet();
          this._dataSetService.clearEditType();
          this._dataSetService.clearIsNewVersion();
          this.loading = false;
        },
        (error) => {
          this.loading = false;
          this.onError('Error', error.error.error.message);
        }
      );
    }
    if(this.activeSplitType == this.panelTypes.MANUAL && !this.loading) {
      this.loading = true;
      this._dataSetService
      .editManualDataSet(this.dataset.selectedVersionId, this.dataset , this.dataset.trainingSet.percentage, this.dataset.validationSet.percentage, this.dataset.testingSet.percentage,this.isNewVersion)
      .subscribe(
        (response) => {
          this._dataSetService.setNewDataSet();
          this._dataSetService.clearEditDataSet();
          this._dataSetService.clearEditType();
          this._dataSetService.clearIsNewVersion();
          this.success()
          this.loading = false;
        },
        (error) => {
          this.loading = false;
          this.onError('Error', error.error.error.message);
        }
      );
    }
  }
  filterSearchedLists() {
    this.onSearch();
    this.onSearchTrainingList();
    this.onSearchValidationList();
    this.onSearchTestingList();
  }

  onSearch() {
    this.videoSearchedList = [];
    if (this.videoSearchText == null || this.videoSearchText == '' || this.videoSearchText == undefined) {
      this.videoSearchedList = this.dataset.allFiles;
    } else {
      
      for (let i = 0; i < this.dataset.allFiles.length; i++) {
        if (this.dataset.allFiles[i].videoName.toString().toLowerCase().search(this.videoSearchText.toString().toLowerCase()) >= 0) {
          this.videoSearchedList.push(this.dataset.allFiles[i]);
        }
      }
    }
  }

  onSearchTrainingList() {
    this.trainSearchedList = [];
    if (this.trainingSearchText == null || this.trainingSearchText == '' || this.trainingSearchText == undefined) {
      this.trainSearchedList = this.dataset.trainingSet.videoList;
    } else {
      
      for (let i = 0; i < this.dataset.trainingSet.videoList.length; i++) {
        if (this.dataset.trainingSet.videoList[i].videoName.toString().toLowerCase().search(this.trainingSearchText.toString().toLowerCase()) >= 0) {
          this.trainSearchedList.push(this.dataset.trainingSet.videoList[i]);
        }
      }
    }
  }

  onSearchValidationList() {
    this.validationSearchedList = [];
    if (this.validationSearchText == null || this.validationSearchText == '' || this.validationSearchText == undefined) {
      this.validationSearchedList = this.dataset.validationSet.videoList;
    } else {
      
      for (let i = 0; i < this.dataset.validationSet.videoList.length; i++) {
        if (this.dataset.validationSet.videoList[i].videoName.toString().toLowerCase().search(this.validationSearchText.toString().toLowerCase()) >= 0) {
          this.validationSearchedList.push(this.dataset.validationSet.videoList[i]);
        }
      }
    }
  }

  onSearchTestingList() {
    this.testSearchedList = [];
    if (this.testingSearchText == null || this.testingSearchText == '' || this.testingSearchText == undefined) {
      this.testSearchedList = this.dataset.testingSet.videoList;
    } else {
      
      for (let i = 0; i < this.dataset.testingSet.videoList.length; i++) {
        if (this.dataset.testingSet.videoList[i].videoName.toString().toLowerCase().search(this.testingSearchText.toString().toLowerCase()) >= 0) {
          this.testSearchedList.push(this.dataset.testingSet.videoList[i]);
        }
      }
    }
  }

  success() {
    const dialogRef = this._dialog.open(SuccessDialogComponent, {
      disableClose: true,
      width: '460px',
      data: { header: 'Success', description: 'Dataset creation started.' },
    });

    dialogRef.afterClosed().subscribe((result) => {
      this._dataSetService.clearCreatedDatasetId();
      this._router.navigate([`/dataset/overview`]);
    });
  }

  /**
   * open error modal
   * @param header error header
   * @param errorMsg error body
   */
  onError(header:string, errorMsg: string) {
    const dialogRef = this._dialog.open(ErrorDialogComponent, {
      disableClose: true,
      width: '650px',
      data: { header: header, description: errorMsg },
    });

    dialogRef.afterClosed().subscribe((result) => {

    });
  } 

  /**
   * exit dataset creation
   */
  close() {
    this._dataSetService.clearCreatedDatasetId();
    this._dataSetService.clearEditDataSet();
    this._dataSetService.clearEditType();
    this._dataSetService.clearIsNewVersion();
    this._router.navigate([`/dataset/overview`]);
  }
}

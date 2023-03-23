/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { Component, Inject, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AddLabelModalComponent } from '../add-label-modal/add-label-modal.component';
import { DatasetService } from 'src/app/services/dataset.service';
import { DataSetTypes } from 'src/app/shared/constants/dataset';
import { ErrorDialogComponent } from '../error-dialog/error-dialog.component';


export interface DialogData {
  id: string;
  name: string;
  tasks: any;
  currentDatasetType: DataSetTypes;
}

@Component({
  selector: 'app-split-task-modal',
  templateUrl: './split-task-modal.component.html',
  styleUrls: ['./split-task-modal.component.scss']
})
export class SplitTaskModalComponent implements OnInit {

  labelList: Array<any>;
  videoName: string;
  searchedList: any;
  searchTxt!: string;
  videoId: string;
  toChangeDatasetType: string;
  selected: number;
  selectedCount: number;

  NONE = 0;
  MULTIPLE = 1;
  ALL = 2;

  TRAIN = 'trainingSet';
  VALIDATION = 'validationSet';
  TEST = 'testingSet';

  constructor(
    public _dialogRef: MatDialogRef<AddLabelModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private _dataSetService: DatasetService,
    public _dialog: MatDialog,
  ) { 
    this.labelList = data.tasks;
    this.videoName = data.name;
    this.videoId = data.id;
    this.toChangeDatasetType = 'trainingSet';
    this.selected = 0;
    this.selectedCount = 0;
  }

  ngOnInit(): void {
    if(this.data.tasks === undefined) {
      this.getTaskList();
    }
    this.onSearch()
  }

  close(): void {
    this._dialogRef.close();
  }
  add():void {
    this._dialogRef.close({labels:this.labelList, currentDatasetType: this.data.currentDatasetType, toChangeDatasetType:this.toChangeDatasetType});
  }
  
  getTaskList() {
    this._dataSetService.getTaskList(this.videoId).subscribe(
      (response) => {
        this.labelList = response;
        this.onSearch()
      },
      (error) => {
        this.onError('Error', error.error.error.message);
      }
    );
  }
  onSearch() {
    this.searchedList = [];
    if (this.searchTxt == null || this.searchTxt == '' || this.searchTxt == undefined) {
      this.searchedList = this.labelList;
    } else {
      
      for (let i = 0; i < this.labelList.length; i++) {
        if (this.labelList[i]._id.toString().toLowerCase().search(this.searchTxt.toString().toLowerCase()) >= 0) {
          this.searchedList.push(this.labelList[i]);
        }
      }
    }
  }

  selectAll(){
    this.checkSelected();
    for(let i=0; i<this.searchedList.length; i++){
      if(this.selected == this.NONE){
        this.searchedList[i].selected = true;
      }
      else{
        this.searchedList[i].selected = false;
      }
    }
    this.checkSelected();
  }

  checkSelected(){
    this.selectedCount = 0
    for(let i=0; i<this.searchedList.length; i++){
      if(this.searchedList[i].selected){
        this.selectedCount++;
      }
    }
    if(this.selectedCount == this.labelList.length){
      this.selected = this.ALL
    }else if(this.selectedCount > 0){
      this.selected = this.MULTIPLE
    }else{
      this.selected = this.NONE;
    }
  }

  onError(header:string, errorMsg: string) {
    const dialogRef = this._dialog.open(ErrorDialogComponent, {
      disableClose: true,
      width: '650px',
      data: { header: header, description: errorMsg },
    });

    dialogRef.afterClosed().subscribe((result) => {

    });
  } 
}

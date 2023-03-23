/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { Component, Inject, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DatagridService } from 'src/app/services/datagrid.service';
import { ErrorDialogComponent } from '../error-dialog/error-dialog.component';


export interface DialogData {
  frameIndex: string;
  width: string;
}


@Component({
  selector: 'app-datagrid-image-view',
  templateUrl: './datagrid-image-view.component.html',
  styleUrls: ['./datagrid-image-view.component.scss']
})
export class DatagridImageViewComponent implements OnInit {
  frameIndex: string;
  showSvg: boolean;
  frameId: number;
  labels: any;
  taskId: string;
  projectName: string;
  objectCount: number;
  viewBox: string;
  loading: boolean;
  imageLoading: boolean;
  boxes: any;
  imgUrl: string;
  originalImgUrl: string;
  width: string;
  isImagesLoaded: boolean;
  constructor(
    public dialogRef: MatDialogRef<DatagridImageViewComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private _dataGridServices: DatagridService,
    public _dialog: MatDialog,
  ) { 
    this.frameIndex = data.frameIndex;
    this.width = data.width;
    this.showSvg = false;
    this.frameId = 0;
    this.taskId = '';
    this.projectName = '';
    this.labels = [];
    this.objectCount = 0;
    this.viewBox = '0 0 1920 1080';
    this.loading = true;
    this.imgUrl = '';
    this.originalImgUrl = '';
    this.imageLoading = false;
    this.isImagesLoaded = false;
  }

  ngOnInit(): void {
    this.getFrameData();
  }
  update(): void {
    this.dialogRef.close('update');
  }
  new(): void{
    this.dialogRef.close('new');
  }
  close(){
    this.dialogRef.close();
  }
  toggleSvg(){
    this.showSvg = !this.showSvg
  }
  getFrameData(){
    this._dataGridServices.preview(this.frameIndex)
    .subscribe(
      (response) => {
        this.frameId = response.frameId;
        this.taskId = response.taskId;
        this.projectName = response.projectName;
        this.labels = response.labelStatsObject.labelStats
        this.objectCount = response.labelStatsObject.totalObjects;
        this.viewBox = '0 0 ' + response.videoResolutionWidth + ' ' + response.videoResolutionHeight;
        this.boxes = response.boxes;
        this.imgUrl = response.awsUrl;
        this.originalImgUrl = response.originalImageUrl;
        this.imageLoading = true;
      },
      (error) => {
        this.imageLoading = false;
        this.loading = false;
        this.onError("Error", error);
      }
    );
  }
  loaded(){
    this.loading = false;
    this.imageLoading = false;
  }

  fullImageLoaded() {
    this.isImagesLoaded = true;
  }
  imgError(evt :Event) {
    if(evt.type == 'error'){
      this.loading = false;
      this.imageLoading = false
      this.onError("Error","Image loading error!")
    }
  }
  onError(header: string, description: string) {
    const dialogRef = this._dialog.open(ErrorDialogComponent, {
      disableClose: true,
      width: '460px',
      data: { header: header, description: description },
    });

    dialogRef.afterClosed().subscribe((result) => {
      this.close();
    });
  }
}

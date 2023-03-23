/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { DatasetSplitRebalanceComponent } from 'src/app/components/modals/dataset-split-rebalance/dataset-split-rebalance.component';
import {
  CdkDragDrop,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import _ from 'lodash';
import { SplitTaskModalComponent } from 'src/app/components/modals/split-task-modal/split-task-modal.component';
import { SharedService } from 'src/app/services/shared.service';
import { SplitTypes } from 'src/app/shared/constants/dataset';

@Component({
  selector: 'app-dataset-rebalance',
  templateUrl: './dataset-rebalance.component.html',
  styleUrls: ['./dataset-rebalance.component.scss'],
})
export class DatasetRebalanceComponent implements OnInit {
  todo: any;
  done: any;
  items: any;
  videoList: any;
  trainList: any;
  selections: Array<any>;
  panelTypes: any = null; // to assign split types
  activeSplitType: string;

  constructor(
    private _location: Location,
    public _dialog: MatDialog,
    public _sharedService: SharedService
  ) {
    this.selections = [];
    this.panelTypes = this._sharedService.convertClassToObject(SplitTypes);
    this.activeSplitType = this.panelTypes.RANDOM;
  }

  ngOnInit(): void {
    this.videoList = [
      { name: 'OR_Shoot_1', selected: false },
      { name: 'OR_Shoot_video6', selected: false },
      { name: 'OR_Shoot_3', selected: false },
      { name: 'OR_Shoot_video2', selected: false },
      { name: 'OR_Shoot_1', selected: false },
      { name: 'OR_Shoot_video6', selected: false },
      { name: 'OR_Shoot_3', selected: false },
    ];
    this.trainList = [
      { name: 'OR_Shoot_1', selected: false },
      { name: 'OR_Shoot_video6', selected: false },
    ];

    this.items = this.videoList;
    this.done = this.trainList;
  }
  ngAfterViewInit() {
    let videoList = document.getElementById('fileList');
    let videoScroll = videoList!.scrollHeight > videoList!.clientHeight;
  }
  navigateBack() {
    this._location.back();
  }

  rebalance() {
    const dialogRef = this._dialog.open(DatasetSplitRebalanceComponent, {
      disableClose: true,
      width: '900px',
      data: {},
    });
  }

  drop(event: CdkDragDrop<string[]>) {
  
    if (event.previousContainer === event.container) {
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        this.trainList.length
      );
    }
  }

  openAddLabel(videoName: string) {
    const dialogRef = this._dialog.open(SplitTaskModalComponent, {
      disableClose: true,
      width: '650px',
      data: { videoName: videoName, labelList: [] },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
      }
    });
  }

  select(evt: Event, index: number) {
    this.videoList[index].selected = true;
  }
  counter(i: number) {
    return new Array(i);
  }
}

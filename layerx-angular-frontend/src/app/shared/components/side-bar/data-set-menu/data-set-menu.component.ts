/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { AfterViewChecked, AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { DatasetService } from 'src/app/services/dataset.service';
import { DLabelsService } from 'src/app/services/d-labels.service';
import { DatasetDataService } from 'src/app/services/data/dataset-data.service';
import { Router } from '@angular/router';
import { DatasetDuplicateComponent } from 'src/app/components/modals/dataset-duplicate/dataset-duplicate.component';
import { DatasetDeleteComponent } from 'src/app/components/modals/dataset-delete/dataset-delete.component';
import { SidebarDataService } from 'src/app/services/data/sidebar-data.service';
import { ErrorDialogComponent } from 'src/app/components/modals/error-dialog/error-dialog.component';
import { ErrorMessages } from 'src/app/shared/constants/dataset';

@Component({
  selector: 'app-data-set-menu',
  templateUrl: './data-set-menu.component.html',
  styleUrls: ['./data-set-menu.component.scss'],
})
export class DataSetMenuComponent implements OnInit, AfterViewChecked {
  @ViewChild('scroll') private myScrollContainer!: ElementRef;

  isShowCreateButton: boolean;
  loading: boolean;
  datasetList: Array<any>;
  selectedId: number;
  selectedVersion: number;
  searchKey: string;
  searchedList: Array<any>;

  private ngUnsubscribe = new Subject();
  
  constructor(
    private _router: Router,
    public _dialog: MatDialog,
    private _dataSetService: DatasetService,
    private _datasetDataService: DatasetDataService,
    public _sidebarDataService:SidebarDataService,
  ) {
    this.isShowCreateButton = true;
    this.loading = false;
    this.datasetList = [];
    this.selectedId = 0;
    this.selectedVersion = 0;
    this.searchKey = '';
    this.searchedList = [];
  }

  ngOnInit(): void {

    this.getDataSetList();
    this.getNewDataset();
  }

  ngAfterViewChecked(): void {
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  scrollToBottom(): void {    
    this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
  }

  /**
   * filter dataset based on search key
   */
  searchDataset() {
    this.searchedList = [];
    if (this.searchKey == null || this.searchKey == '' || this.searchKey == undefined) {
      this.searchedList = this.datasetList;
    } else {
      
      for (let i = 0; i < this.datasetList.length; i++) {
        if (
          this.datasetList[i].name != null &&
          this.datasetList[i].name.toString().toLowerCase().search(this.searchKey.toString().toLowerCase()) >= 0
        ) {
          this.searchedList.push(this.datasetList[i]);
        }
      }
    }
  }

  navigateToCreateDataset(){
    this._dataSetService.clearSelectedDataSet();
    this._dataSetService.clearSelectedDataSetVersion();

    this._router.navigate(['/process-data-set/create'], {
      queryParams: { },
    });

  }

  navigateToCreateProject() {}
  
  getNewDataset() {
    this._datasetDataService
      .getNewVersion()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((isNew: boolean) => {
        this.selectedVersion = 0;
        this.getDataSetList();
      });
  }

  isNewDataset(){

    if(this._router.url.includes('process-data-set')) {
      this.selectedId = -1;
    }
    let isNewDataSet = this._dataSetService.isNewDataSet()
    if(isNewDataSet) {
      this.selectedId = this.datasetList.length - 1;
      this.scrollToBottom();
    }
  }

  getDataSetList() {
    this._dataSetService.getDataset().subscribe(
      (response) => {
        this.isNewDataset()
        this.datasetList = response;
        this.searchedList = response;
        this.loading = false;
        this._sidebarDataService.setDatasetListLength(response.length);
        if(this.datasetList[this.selectedId]){
          let dataset = {
            name: this.datasetList[this.selectedId].name,
            versionDetails:
              this.datasetList[this.selectedId].versionList[this.selectedVersion]
                .versionDetails,
            id: this.datasetList[this.selectedId].id
          };
          localStorage.setItem('selectedDataset', JSON.stringify(dataset));
          localStorage.setItem(
            'selectedVersion',
            this.datasetList[this.selectedId].versionList[this.selectedVersion]
              .versionId
        );
        }
        this._datasetDataService.setRefreshDataset(true);
      },
      (error) => {
        (error);
        this.loading = false;
      }
    );
  }
  onEdit() {
    let progress = 0;
    let versionId = this.datasetList[this.selectedId].versionList[this.selectedVersion].versionId;
    this._dataSetService.datasetProgress(versionId).subscribe(
      (response) => {
        progress = response.progress;
        if(progress != 100){
          const dialogRef = this._dialog.open(ErrorDialogComponent, {
            disableClose: true,
            width: '650px',
            data: { header: 'Error', description: ErrorMessages.inProgress },
          });
      
          dialogRef.afterClosed().subscribe((result) => {
          });
        }
        else{
          this._router.navigate([`/process-data-set/edit`]);
        }
      },
      (error) => {
        (error);
      }
    );
  }
  onDelete() {
    const dialogRef = this._dialog.open(DatasetDeleteComponent, {
      disableClose: true,
      width: '650px',
      data: {
        datasetId:
          this.datasetList[this.selectedId].versionList[this.selectedVersion]
            .versionId,
        version: this.datasetList[this.selectedId].versionList[this.selectedVersion]
        .versionNo,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.getDataSetList();
    });
  }
  setSelectedId(id: number) {
    let selectedId = this.selectedId;
    this.selectedId = id;
    if (selectedId != id) {
      this.setSelectedVersion(0);
    }
  }
  setSelectedVersion(id: number) {
    this.selectedVersion = id;

    if(this.datasetList[this.selectedId] && this.datasetList[this.selectedId].versionList[this.selectedVersion]){
      localStorage.setItem(
        'selectedVersion',
        this.datasetList[this.selectedId].versionList[this.selectedVersion]
          .versionId
      );
      let dataset = {
        name: this.datasetList[this.selectedId].name,
        versionDetails:
          this.datasetList[this.selectedId].versionList[this.selectedVersion]
            .versionDetails,
        id: this.datasetList[this.selectedId].id
      };
      localStorage.setItem('selectedDataset', JSON.stringify(dataset));
    }
    
    this._datasetDataService.setRefreshDataset(true);
    this._dataSetService.clearNewDataSet();
    sessionStorage.clear()

  }
  edit() {
    this._router.navigate([`/process-data-set/edit`]);
  }
  duplicate() {
  }
  delete() {
    this.onDelete();
  }
}

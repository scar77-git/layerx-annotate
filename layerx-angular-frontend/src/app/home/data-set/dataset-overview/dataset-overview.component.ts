/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { interval, Subject, Subscription } from 'rxjs';
import { pairwise, takeUntil } from 'rxjs/operators';
import { DOverview } from 'src/app/models/d-overview';
import { DOverviewService } from 'src/app/services/d-overview.service';
import { ProjectDataService } from 'src/app/services/project-data.service';
import { SharedService } from 'src/app/services/shared.service';
import { DLabelsService } from 'src/app/services/d-labels.service';
import { DatasetDataService } from 'src/app/services/data/dataset-data.service';
import { SidebarDataService } from 'src/app/services/data/sidebar-data.service';
import { DatasetService } from 'src/app/services/dataset.service';


@Component({
  selector: 'app-d-overview',
  templateUrl: './dataset-overview.component.html',
  styleUrls: ['./dataset-overview.component.scss'],
})
export class DatasetOverviewComponent implements OnInit {
  @ViewChild('boostListElem')
  public boostListElem!: ElementRef; // overview list table element

  @ViewChild('scrollContent')
  scrollContent!: ElementRef; // scroll view annotated list element

  @ViewChild('scrollBottom')
  public scrollBottom!: ElementRef; // table outer scroll view element

  @ViewChild('scrollTop')
  public scrollTop!: ElementRef; // table inner scroll view element

  loading: boolean;
  tableWidth: number = 0; // width of table
  isTableScroll: boolean = false; // is table scrollable
  scrollheight: any = 0; // scroll height
  isScrollLoadEnable: boolean = false; // is scroll enable
  selectedVersionId: string; // assign selected dataset id
  dOverviewObj: DOverview; // data overview object
  private ngUnsubscribe = new Subject();
  isShowDataSetEmptyView!:boolean;

  isDataSetProcessing: boolean = false;
  isDataProcessingError: boolean = false;
  dataProcessingErrorMessage: string = '';
  isAugmentationDataSetProcessing!: boolean;
  projectProgress: number = 0;
  processType!:number;
  subscription!: Subscription;



  constructor(
    public sharedService: SharedService,
    private _projectDataService: ProjectDataService,
    private _dOverviewService: DOverviewService,
    private _sidebarDataService: SidebarDataService,
    private _dDataSetDataService: DatasetDataService,
    private _dataSetService: DatasetService,

  ) {
    this.loading = false;
    this.selectedVersionId = ''; //remove later
    this.dOverviewObj = new DOverview();

    this.sharedService.changeEmitted$.subscribe((projectId) => {
      this.getDatasetOverviewStats();
    });
  }

  ngOnInit(): void {
    this.loading = true;
    this.getIsDatasetRefreshed();
    this.getDatasetListLength();
  }
  ngOnDestroy(){
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
  getIsDatasetRefreshed(){
    this._dDataSetDataService
      .getRefreshDataset()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((isRefresh: boolean) => {
        this.getSelectedVersionId();
        this.getDatasetOverviewStats();
        this.updateProgress();
        this.getDatasetProgress();
      });
  }

  updateProgress(){
    const source = interval(60000);
    this.subscription = source.subscribe(val => {
      this.getDatasetProgress();
    });
  }
  getDatasetProgress(){
    this._dataSetService.datasetProgress(this.selectedVersionId).subscribe(
      (response) => {
        this.processType = response.type;
        this.projectProgress = response.progress;
        this.isDataSetProcessing = response.isPending;
        this.isDataProcessingError = response.isError;
        this.dataProcessingErrorMessage = response.errorMessage;

        if (!this.isDataSetProcessing) {
          this.subscription.unsubscribe();
        }
      },
      (error) => {
      }
    );
  }
  getDatasetListLength() {
    this._sidebarDataService
      .getDatasetListLength()
      .pipe(pairwise())
      .subscribe(([previousValue, currentValue]) => {
        if (currentValue === 0) {
          this.isShowDataSetEmptyView = true;
        } else {
          this.isShowDataSetEmptyView = false;
        }
      });
  }

  getSelectedVersionId(){
    let version = localStorage.getItem('selectedVersion');
    if(version){
      this.selectedVersionId = version;
    }
  }

  // }

  /**
   * if screen width is smaller than device list table
   * active scroll bar to scroll table left or right
   */
  setTableWidth() {
    this.tableWidth = this.boostListElem.nativeElement.offsetWidth;

    let fullWidth = this.scrollBottom.nativeElement.offsetWidth;
    let scrollWidth = this.scrollBottom.nativeElement.scrollWidth;
    if (fullWidth < scrollWidth) {
      this.isTableScroll = true;
    } else {
      this.isTableScroll = false;
    }
  }

  /**
   * Calls when user scrolls device list table
   * device list paging control
   */
  onScroll() {
    const scrollContentUI: HTMLCanvasElement = this.scrollContent.nativeElement;
    let scrollFromBottom =
      scrollContentUI.scrollHeight -
      scrollContentUI.scrollTop -
      scrollContentUI.clientHeight;
    let offset = 350;

    if (scrollFromBottom >= offset) {
      this.isScrollLoadEnable = true;
    } else {
      this.isScrollLoadEnable = false;
    }
  }

  /**
   * when scrolling left or right get scroll position value
   */
  onScrollTop() {
    this.scrollheight = this.scrollTop.nativeElement.scrollLeft;
  }

  /**
   * when scrolling left or right get scroll position value
   */
  onScrollBottom() {
    this.scrollheight = this.scrollBottom.nativeElement.scrollLeft;
  }

  /**
   * get dataset stats from back-end and assign data to overview model
   */
  getDatasetOverviewStats() {
    this.loading = true;
    if(this.selectedVersionId){
      this._dOverviewService
      .getDatasetOverviewStats(this.selectedVersionId)
      .subscribe(
        (response) => {
          this.loading = false;
          this.dOverviewObj.dataSetAttributeList = response.dataSetStats;
          this.dOverviewObj.totalFrames = response.totalFrames;
          this.dOverviewObj.totalBoxes = response.totalBoxes;
        },
        (error) => {
          this.loading = false;
        }
      );
    }else{
      this.loading = false;
    }
    
  }
  roundNumber(num: number){
    let rounded = Math.round(num* 10) / 10
    return rounded;
  }
}

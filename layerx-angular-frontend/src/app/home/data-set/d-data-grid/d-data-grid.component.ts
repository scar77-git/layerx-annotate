/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import {
  Component,
  ElementRef,
  OnInit,
  Renderer2,
  ViewChild,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  tap,
} from 'rxjs/operators';
import { fromEvent, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DatagridService } from 'src/app/services/datagrid.service';
import { DLabelsService } from 'src/app/services/d-labels.service';
import { DatasetDataService } from 'src/app/services/data/dataset-data.service';
import { DatagridImageViewComponent } from 'src/app/components/modals/datagrid-image-view/datagrid-image-view.component';
import { bool } from 'aws-sdk/clients/signer';
import { ErrorDialogComponent } from 'src/app/components/modals/error-dialog/error-dialog.component';

@Component({
  selector: 'app-d-data-grid',
  templateUrl: './d-data-grid.component.html',
  styleUrls: ['./d-data-grid.component.scss'],
})
export class DDataGridComponent implements OnInit {
  @ViewChild('search') input!: ElementRef;

  images: Array<any> = [];
  imageCount: number;
  classes: any;
  tempClasses: any;
  searchKey: string;
  datasetVersion: string;
  filterLabelObj: any;
  selectClasses: boolean;
  selectAttributes: boolean;
  selectSplit: boolean;
  menuBtnClicked: boolean;
  showAnnotations: boolean;
  isClassesSelected: boolean = false;
  isAttributesAvailable: boolean = false;
  isAttributesSelected: boolean = false;
  splitFilters: Array<boolean>;
  selectedVersionId!: string;
  scrolledPosition: number;
  index: number;
  size: number;
  splitOut: Array<number>;
  imageLoading: boolean;
  maxIndex: number;
  loadedImageCount: number;
  renderedImageCount: number;

  SIZE = 24;

  private ngUnsubscribe = new Subject();
  constructor(
    private _dataGridServices: DatagridService,
    private _dLabelsService: DLabelsService,
    private dDataSetDataService: DatasetDataService,
    public _dialog: MatDialog,
    private renderer: Renderer2
  ) {
    this.selectClasses = false;
    this.selectAttributes = false;
    this.selectSplit = false;
    this.menuBtnClicked = false;
    this.showAnnotations = false;
    this.searchKey = '';
    this.datasetVersion = '0.0.1';
    this.scrolledPosition = 0;
    this.index = 0;
    this.size = this.SIZE;
    this.imageCount = 0;
    this.splitFilters = [false, false, false];
    this.splitOut = [];
    this.imageLoading = false;
    this.maxIndex = 0;
    this.loadedImageCount = 0;
    this.renderedImageCount = 0;
    this.renderer.listen('window', 'click', (e: Event) => {
      if (!this.menuBtnClicked) {
        this.outSideClick();
      }
      this.menuBtnClicked = false;
    });
  }

  ngOnInit(): void {
    this.getIsDatasetRefreshed();
  }

  ngAfterViewInit() {
    fromEvent(this.input.nativeElement, 'keyup')
      .pipe(
        filter(Boolean),
        debounceTime(800),
        distinctUntilChanged(),
        tap((text) => {
          this.images = [];
          this.index = 0;
          this.onSearch();
        })
      )
      .subscribe();
  }

  /**
   * refresh dataset data on changes
   */
  getIsDatasetRefreshed() {
    this.dDataSetDataService
      .getRefreshDataset()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((isRefresh: boolean) => {
        this.getLabelList();
        this.images = [];
        this.searchKey = '';
        this.imageCount = 0;
        this.isClassesSelected = false;
        this.filterLabelObj = [];
        this.index = 0;
        this.size = this.SIZE;
        this.filterImages();
      });
  }

  /**
   * get selected version label list
   */
  getLabelList() {
    this.imageLoading = true;

    let versionID = localStorage.getItem('selectedVersion');
    if (versionID) {
      this.selectedVersionId = versionID;
    }
    this._dataGridServices.getLabelList(this.selectedVersionId).subscribe(
      (response) => {
        this.classes = response;
        this.tempClasses = JSON.parse(JSON.stringify(this.classes));
      },
      (error) => {
        this.onError('Error', error.error.error.message);
      }
    );
  }

  /**
   * filter images based on selected labels
   */
  filterImages() {
    this._dataGridServices
      .filter(
        this.selectedVersionId,
        this.searchKey,
        this.filterLabelObj,
        this.index,
        this.size,
        this.splitOut
      )
      .subscribe(
        (response) => {
          this.loadedImageCount = response.imageCount;
          this.renderedImageCount = 0;
          if (this.index == 0) {
            this.images = [];
          }
          for (let i = 0; i < response.frameArray.length; i++) {
            this.images.push(response.frameArray[i]);
          }
          this.imageCount = response.frameCount;
          if (this.imageCount == 0) {
            this.imageLoading = false;
          }
          if (this.index == 0) {
            this.index = 3;
          } else {
            this.index++;
          }
          this.size = 8;
        },
        (error) => {
          this.onError('Error', error.error.error.message);
        }
      );
  }

  onSearch() {
    this.images = [];
    this.index = 0;
    this.size = 24;
    this.filterImages();
  }

  onScrollDown(ev: any) {
    if (this.images.length < this.imageCount) {
      this.filterImages();
    }
  }

  onScrollUp(ev: any) {
  }

  setClasses() {
    this.tempClasses = JSON.parse(JSON.stringify(this.classes));
    this.selectAttributes = false;
    this.selectSplit = false;
    this.selectClasses = !this.selectClasses;
  }
  setAttributes() {
    this.tempClasses = JSON.parse(JSON.stringify(this.classes));
    this.selectClasses = false;
    this.selectSplit = false;
    this.selectAttributes = !this.selectAttributes;
  }
  setSplit() {
    this.selectAttributes = false;
    this.selectClasses = false;
    this.selectSplit = !this.selectSplit;
  }
  preventCloseOnClick() {
    this.menuBtnClicked = true;
  }
  outSideClick() {
    this.selectClasses = false;
    this.selectAttributes = false;
    this.selectSplit = false;
  }

  selectClass(evt: any, index: number) {
    if (evt.target.checked) {
      this.tempClasses[index].selected = true;
    } else {
      this.tempClasses[index].selected = false;
    }
  }
  selectAttribute(evt: any, classesID: number, attributesID: number) {
    let key = this.filterLabelObj.findIndex(
      (x: { labelKey: string }) => x.labelKey == this.classes[classesID].key
    );

    if (evt.target.checked) {
      this.tempClasses[classesID].attributes[attributesID].selected = true;

    } else {
      this.tempClasses[classesID].attributes[attributesID].selected = false;

    }
  }
  selectValue(
    evt: any,
    classesID: number,
    attributesID: number,
    valueID: number
  ) {

    if (evt.target.checked) {
      this.tempClasses[classesID].attributes[attributesID].selected = true;
      this.tempClasses[classesID].attributes[attributesID].values[
        valueID
      ].selected = true;
    } else {
      this.tempClasses[classesID].attributes[attributesID].values[
        valueID
      ].selected = false;
      let valueLength = 0;
      let values = this.tempClasses[classesID].attributes[attributesID].values;
      for (let i = 0; i < values.length; i++) {
        if (values[i].selected) {
          valueLength++;
        }
      }
      if (valueLength == 0) {
        this.tempClasses[classesID].attributes[attributesID].selected = false;
      }
    }
  }
  addClassFilter() {
    this.closeFilterModals();
    this.classes = JSON.parse(JSON.stringify(this.tempClasses));
    this.selectClasses = false;
    for (let i = 0; i < this.classes.length; i++) {
      let key = this.filterLabelObj.findIndex(
        (x: { labelKey: string }) => x.labelKey == this.classes[i].label
      );
      if (this.classes[i].selected && key == -1) {
        this.filterLabelObj.push({
          labelKey: this.classes[i].label,
          attributes: [],
        });
      } else if (this.classes[i].selected == false && key != -1) {
        this.filterLabelObj.splice(key, 1);
        this.deleteClassFilter(this.classes[i].key);
      }
    }
    this.index = 0;
    this.images = [];
    this.checkClasses();
    this.filterImages();
  }

  addAttributesFilter() {
    this.closeFilterModals();
    this.classes = JSON.parse(JSON.stringify(this.tempClasses));
    this.selectAttributes = false;
    for (let i = 0; i < this.tempClasses.length; i++) {
      if (this.tempClasses[i].selected) {
        let labelKey = this.filterLabelObj.findIndex(
          (x: { labelKey: string }) => x.labelKey == this.tempClasses[i].label
        );
        this.filterLabelObj[labelKey].attributes = [];
        for (let j = 0; j < this.tempClasses[i].attributes.length; j++) {
          if (this.tempClasses[i].attributes[j].selected) {
            this.filterLabelObj[labelKey].attributes.push({
              key: this.tempClasses[i].attributes[j].key,
              values: [],
            });
            let attributeKey = this.filterLabelObj[
              labelKey
            ].attributes.findIndex(
              (x: { key: string }) =>
                x.key == this.tempClasses[i].attributes[j].key
            );
            for (
              let k = 0;
              k < this.tempClasses[i].attributes[j].values.length;
              k++
            ) {
              if (this.tempClasses[i].attributes[j].values[k].selected) {
                this.filterLabelObj[labelKey].attributes[
                  attributeKey
                ].values.push({
                  valueName:
                    this.tempClasses[i].attributes[j].values[k].valueName,
                });
              }
            }
          }
        }
      }
    }
    this.index = 0;
    this.images = [];
    this.checkAttributes();
    this.filterImages();
  }

  addSplitFilter() {
    this.closeFilterModals();
    this.splitOut = [];
    for (let i = 0; i < this.splitFilters.length; i++) {
      if (this.splitFilters[i]) {
        this.splitOut.push(i + 1);
      }
    }
    this.index = 0;
    this.images = [];
    this.filterImages();
  }

  closeFilterModals() {
    this.index = 0;
    this.size = this.SIZE;
    this.images = [];
    this.selectClasses = false;
    this.selectAttributes = false;
    this.selectSplit = false;
  }

  checkClasses() {
    this.isClassesSelected = false;
    for (let i = 0; i < this.classes.length; i++) {
      if (this.classes[i].selected && this.classes[i].attributes.length > 0) {
        this.isClassesSelected = true;
      }
    }
  }

  checkAttributes() {
    this.isAttributesSelected = false;

    for (let i = 0; i < this.classes.length; i++) {
      if (this.classes[i].attributes) {
        for (let j = 0; j < this.classes[i].attributes.length; j++) {
          if (this.classes[i].attributes[j].selected) {
            this.isAttributesSelected = true;
          }
        }
      }
    }
  }

  deleteClassFilter(key: string, isClearAll?: boolean) {
    let id = this.classes.findIndex((x: { key: string }) => x.key == key);
    this.classes[id].selected = false;
    let filterKey = this.filterLabelObj.findIndex(
      (x: { labelKey: string }) => x.labelKey == this.classes[id].label
    );
    this.filterLabelObj.splice(filterKey, 1);
    this.removeAttributes(id);
    this.checkClasses();
    this.checkAttributes();
    if (!isClearAll) {
      this.size = this.SIZE;
      this.index = 0;
      this.filterImages();
    }
  }

  deleteAttributeFilter(classKey: string, attributeKey: string) {
    let classID = this.classes.findIndex(
      (x: { key: string }) => x.key == classKey
    );
    let attributeID = this.classes[classID].attributes.findIndex(
      (x: { key: string }) => x.key == attributeKey
    );
    let filterClass = this.filterLabelObj.findIndex(
      (x: { labelKey: string }) => x.labelKey == this.classes[classID].label
    );
    let filterAttribute = this.filterLabelObj[filterClass].attributes.findIndex(
      (x: { key: string }) =>
        x.key == this.classes[classID].attributes[attributeID].key
    );

    this.classes[classID].attributes[attributeID].selected = false;
    this.tempClasses[classID].attributes[attributeID].selected = false;
    this.filterLabelObj[filterClass].attributes.splice(filterAttribute, 1);
    this.removeValues(classID, attributeID);
    this.checkAttributes();
    this.size = 24;
    this.index = 0;
    this.filterImages();
  }

  removeValues(classID: number, attributeID: number) {
    let values = this.classes[classID].attributes[attributeID].values;
    let tempValues = this.tempClasses[classID].attributes[attributeID].values;
    for (let i = 0; i < values.length; i++) {
      values[i].selected = false;
      tempValues[i].selected = false;
    }
  }

  removeAttributes(id: number) {
    for (let i = 0; i < this.classes[id].attributes.length; i++) {
      this.classes[id].attributes[i].selected = false;
      for (let j = 0; j < this.classes[id].attributes[i].values.length; j++) {
        this.classes[id].attributes[i].values[j].selected = false;
      }
    }
  }

  setSplitFilters(id: number) {
    this.splitFilters[id] = !this.splitFilters[id];
  }

  /**
   * open image preview popup
   * @param frameIndex frameId of image
   * @param id image array index
   */
  openImageModal(frameIndex: number, id: number) {
    const dialogRef = this._dialog.open(DatagridImageViewComponent, {
      disableClose: true,
      width: '100%',
      data: { frameIndex: frameIndex },
    });
  }

  /**
   * clear all filters
   */
  clearAll() {
    this.filterLabelObj = [];
    this.size = this.SIZE;
    this.index = 0;
    this.filterImages();
    for (let i = 0; i < this.classes.length; i++) {
      if (this.classes[i].selected) {
        let key = this.classes[i].key;
        this.deleteClassFilter(key, true);
      }
    }
  }

  /**
   * Error modal
   * @param header error header
   * @param description error message
   */
  onError(header: string, description: string) {
    const dialogRef = this._dialog.open(ErrorDialogComponent, {
      disableClose: true,
      width: '460px',
      data: { header: header, description: description },
    });

    dialogRef.afterClosed().subscribe((result) => {
      console.log('The dialog was closed');
    });
  }

  /**
   * check whether all images loaded
   * @param i last image index
   */
  loaded(i: number) {
    this.renderedImageCount++;
    if (this.renderedImageCount == this.loadedImageCount) {
      this.imageLoading = false;
    }
  }
}

/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { Component, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Audit } from 'src/app/models/audit.model';
import { Shape } from 'src/app/models/shape.model';
import { AuditDataService } from 'src/app/services/data/audit-data.service';
import { FramePropertyService } from 'src/app/services/data/frame-property.service';

@Component({
  selector: 'app-frame-property',
  templateUrl: './frame-property.component.html',
  styleUrls: ['./frame-property.component.scss']
})
export class FramePropertyComponent implements OnInit {

  audit: Audit;
  shapes!: Array<Shape>;
  selectedBoxIndex: number;
  selectedLabel!: String;
  selectedBoxId!: number;
  saved:boolean;
  items = ['', '', '', ''];
  labelObject: any;

  private ngUnsubscribe = new Subject();
  constructor(private _auditDataService: AuditDataService,
    private _filterPropertyService: FramePropertyService) {
    this.audit = new Audit();
    this.selectedBoxIndex = -1;
    this.saved = false;
    this.labelObject = {};
  }

  ngOnInit(): void {
    this.getAuditData();
    this.getShapeData();
    this.getSelectedBoxIndex();
    this.getSelectedLabel();
    this.getSelectedBoxId();
    this.getItems();
    this.getLabelObject();
  }

  /**
   * Monitor audit data
   */
  getAuditData(): void {
    this._auditDataService
      .getAuditInstance()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((auditInstance: Audit) => {
        this.audit = auditInstance;
        
      });
  }

  /**
   * Monitor shape data
   */
  getShapeData(): void {
    this._filterPropertyService
      .getShapes()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((shapes: Shape[]) => {
        this.shapes = shapes;
      });
  }

  /**
   * Monitor selected box  data
   */
  getSelectedBoxIndex(): void {
    this._filterPropertyService
      .getSelectedBoxIndex()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((selectedBoxIndex: number) => {
        this.selectedBoxIndex = selectedBoxIndex;
      });
  }

/**
 * Monitor selected label  data
 */
  getSelectedLabel(): void {
    this._filterPropertyService
      .getSelectedLabel()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((selectedLabel: String) => {        
        this.selectedLabel = selectedLabel;
      });
  }

/**
* Monitor selected box id  data
*/
  getSelectedBoxId(): void {
    this._filterPropertyService
      .getSelectedBoxId()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((selectedBoxId: number) => {
        this.selectedBoxId = selectedBoxId;
      });
  }

  /**
* Monitor selected box id  data
*/
getItems(): void {
  this._filterPropertyService
    .getItems()
    .pipe(takeUntil(this.ngUnsubscribe))
    .subscribe((items: string[]) => {
      this.items = items;
    });
}

 /**
* Monitor selected box id  data
*/
getLabelObject(): void {
  this._filterPropertyService
    .getLabelObject()
    .pipe(takeUntil(this.ngUnsubscribe))
    .subscribe((labelObject: string[]) => {
      this.labelObject = labelObject;  
    });
}


  deleteSelectedShape() {
    this._filterPropertyService.deleteSelectedShape();
  }

  setSelectedBoxLabel(event:any){
    this._filterPropertyService.setSelectedBoxLabel(event);
  }

  onClicklabel(){
    this._filterPropertyService.onClicklabel();
  }
  onChangeLabel(event: any, subLabelKey: string){
    this._filterPropertyService.onChangeLabel(event, subLabelKey);
  }


  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

}

/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { Component, OnInit } from '@angular/core';
import { FramePropertyService } from 'src/app/services/data/frame-property.service';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { AuditDataService } from 'src/app/services/data/audit-data.service';
import { Audit } from 'src/app/models/audit.model';
import { FrameFilterService } from 'src/app/services/data/frame-filter.service';


@Component({
  selector: 'app-filter-property',
  templateUrl: './filter-property.component.html',
  styleUrls: ['./filter-property.component.scss']
})
export class FilterPropertyComponent implements OnInit {
  showAllLabels: boolean = true;
  labels: any;
  audit: Audit;
  private ngUnsubscribe = new Subject();

  constructor(private _auditDataService: AuditDataService,
    private _frameFilterService: FrameFilterService) {
    this.audit = new Audit();
  }

  ngOnInit(): void {
    this.getAuditData();
    this.labels = this.audit.labelsList

  }

  getAuditData(): void {
    this._auditDataService
      .getAuditInstance()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((auditInstance: Audit) => {
        this.audit = auditInstance;
      });
  }

  isShowAllLabels(evt: boolean) {
    if (evt) {
      for (var i = 0; i < this.labels.length; i++) {
        this.labels[i].checked = false
      }
    } else {
      this.showAllLabels = false;
    }
  }

  filterLabel(): void {
    this._frameFilterService.setLabelFilterAll(this.showAllLabels);
    this._frameFilterService.setLabelFilter(this.labels);
  }

  selectSubLabel(labelId: number, subLabelId: number){
    let subLabel = this.labels[labelId].attributes[subLabelId];
    subLabel.checked = !subLabel.checked;
    if(subLabel.checked){
      for(let i=0; i<subLabel.values.length; i++){
        subLabel.values[i].checked = true;
      }
    }
  }
}

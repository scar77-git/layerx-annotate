/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FrameFilterService {

  private labelFilter: BehaviorSubject<Array<any>> = new BehaviorSubject<Array<any>>([]);
  private showAllLabels: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  constructor() {

  }

  setLabelFilter(labelFilter:Array<any>) {
    this.labelFilter.next(labelFilter);
  }

  getLabelFilters():Observable<Array<any>>{
    return this.labelFilter.asObservable();
  }

  setLabelFilterAll(showAllLabels:boolean) {
    
    this.showAllLabels.next(showAllLabels);
  }

  getLabelFiltersAll():Observable<boolean>{
    return this.showAllLabels.asObservable();
  }
}

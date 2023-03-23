/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SubLabel } from 'src/app/models/sub-label.model';

@Injectable({
  providedIn: 'root'
})
export class LabelDataService {
  private subLabels: BehaviorSubject<SubLabel[]> = new BehaviorSubject<SubLabel[]>([]);
  constructor() { }

  setSelectedLabels(subLabels: SubLabel[]) {
    this.subLabels.next(subLabels);
  }

  getSelectedFrameCommentBoxes():Observable<SubLabel[]>{
    return this.subLabels.asObservable();
  }
}
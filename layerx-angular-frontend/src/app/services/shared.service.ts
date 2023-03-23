/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

/**
 * @class: SharedService
 * purpose of this module is communicate with child components
 * @description:implements all the logics related shared service class
 * @author: Isuru Avishka
 */
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SharedService {
  constructor() {}

  // Observable string sources
  private emitChangeSource = new Subject<any>();
  private projectDataStatus = new BehaviorSubject(false);
  private datasetStatus = new BehaviorSubject(false);
  private refreshTaskList = new BehaviorSubject<boolean>(false);

  // Observable string streams
  changeEmitted$ = this.emitChangeSource.asObservable();
  projectListStatus = this.projectDataStatus.asObservable();
  datasetListStatus = this.datasetStatus.asObservable();
  taskListStatus = this.refreshTaskList.asObservable();

  // Service message commands
  emitChange(change: any) {
    this.emitChangeSource.next(change);
  }

  setProjectDataStaus(status: boolean) {
    this.projectDataStatus.next(status);
  }

  setDatasetStatus(status: boolean) {
    this.datasetStatus.next(status);
  }

  convertClassToObject(classObject: any) {
    let objectString = JSON.stringify({ ...classObject });
    return JSON.parse(objectString);
  }

  setRefreshTaskList(isRefresh: boolean){
    this.refreshTaskList.next(isRefresh);
  }

  nFormatter(num: number, digits: number) {
    if (num !== undefined) {
      var si = [
        { value: 1, symbol: '' },
        { value: 1e3, symbol: 'K' },
        { value: 1e6, symbol: 'M' },
        { value: 1e9, symbol: 'G' },
        { value: 1e12, symbol: 'T' },
        { value: 1e15, symbol: 'P' },
        { value: 1e18, symbol: 'E' },
      ];
      var rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
      var i;
      for (i = si.length - 1; i > 0; i--) {
        if (num >= si[i].value) {
          break;
          // return 0
        }
      }
      return (
        (num / si[i].value).toFixed(digits).replace(rx, '$1') + si[i].symbol
      );
    }
    return 0;
  }
}

/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { FrameSideBarTabs } from 'src/app/shared/constants/frame';

@Injectable({
  providedIn: 'root'
})
export class SidebarDataService {

  private selectedTab : BehaviorSubject<string> = new BehaviorSubject<string>(FrameSideBarTabs.annotations.key);
  private listLength : BehaviorSubject<number> = new BehaviorSubject<number>(NaN);
  private dataSetListLength : BehaviorSubject<number> = new BehaviorSubject<number>(NaN);
  
  constructor() { }

  /**
   * set selectedTab
   * @param selectedTab - selectedTaskId
   */
   setSelectedTab(selectedTab: string) {
    this.selectedTab.next(selectedTab);
  }

  /**
   * get selectedTab
   * @returns selectedTab
   */
  getSelectedTab(): Observable<string> {
    return this.selectedTab.asObservable();
  }


  setProjectListLength(listLength:number){
    this.listLength.next(listLength);
  }

  getProjectListLength(): Observable<number>{
    return this.listLength.asObservable();
  }

  setDatasetListLength(dataSetListLength:number){
    this.dataSetListLength.next(dataSetListLength);
  }

  getDatasetListLength(): Observable<number>{
    return this.dataSetListLength.asObservable();
  }
}

/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DatasetDataService {
  private refreshDataset: BehaviorSubject<boolean> =
    new BehaviorSubject<boolean>(false);
  private refreshProgress: BehaviorSubject<boolean> =
    new BehaviorSubject<boolean>(false);
  private newVersion: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(
    false
  );
  DATA_SET_AUGMENTATION_PROGRESS_KEY = 'isDataSetAugmentationProcessing';
  DATA_SET_LABEL_PROGRESS_KEY = 'isDataSetLabelProcessing';
  constructor() {}

  setRefreshProgress(isRefresh: boolean) {
    this.refreshProgress.next(isRefresh);
  }
  getRefreshProgress(): Observable<boolean> {
    return this.refreshProgress.asObservable();
  }

  setRefreshDataset(isRefresh: boolean) {
    this.refreshDataset.next(isRefresh);
  }
  getRefreshDataset(): Observable<boolean> {
    return this.refreshDataset.asObservable();
  }
  setNewVersion(isCreate: boolean) {
    this.newVersion.next(isCreate);
  }
  getNewVersion(): Observable<boolean> {
    return this.newVersion.asObservable();
  }

  setDataSetAugmentationProgressStatus(status: boolean): void {
    const value = JSON.stringify(status);
    localStorage.setItem(this.DATA_SET_AUGMENTATION_PROGRESS_KEY, value);
  }
  getDataSetAugmentationProgressStatus(): any {
    let datasetProgressStatus: any = localStorage.getItem(
      this.DATA_SET_AUGMENTATION_PROGRESS_KEY
    );
    if (datasetProgressStatus) {
      return JSON.parse(datasetProgressStatus);
    }
    return null;
  }
  clearDataSetAugmentationProgressStatus(): void {
    localStorage.removeItem(this.DATA_SET_AUGMENTATION_PROGRESS_KEY);
  }

  setDataSetLabelProgressStatus(status: boolean): void {
    const value = JSON.stringify(status);
    localStorage.setItem(this.DATA_SET_LABEL_PROGRESS_KEY, value);
  }
  getDataSetLabelProgressStatus(): any {
    let datasetProgressStatus: any = localStorage.getItem(
      this.DATA_SET_LABEL_PROGRESS_KEY
    );
    if (datasetProgressStatus) {
      return JSON.parse(datasetProgressStatus);
    }
    return null;
  }
  clearDataSetLabelProgressStatus(): void {
    localStorage.removeItem(this.DATA_SET_LABEL_PROGRESS_KEY);
  }
}

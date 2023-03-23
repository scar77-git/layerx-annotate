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
export class ProjectDataService {
  PROJECT_DETAILS_KEY = 'selectedProject';

  constructor() {}

  public isNewProjectCreated = new BehaviorSubject(false);
  public isResetFilter = new BehaviorSubject(false);

  setProjectDetails(details: any): void {
    const value = JSON.stringify(details);
    if (value !== undefined) {
      localStorage.setItem(this.PROJECT_DETAILS_KEY, value);
    }
  }

  getProjectDetails(): any {
    let projectDetails: any = localStorage.getItem(this.PROJECT_DETAILS_KEY);
    if (projectDetails !== undefined) {
      return JSON.parse(projectDetails);
    }
    return null;
  }

  clearProjectDetails(): void {
    localStorage.removeItem(this.PROJECT_DETAILS_KEY);
  }

  setNewProjectStatus(status: boolean) {
    this.isNewProjectCreated.next(status);
  }

  setProjectFilterDataStatus(status: boolean){
    this.isResetFilter.next(status);
  }

  getProjectFilterDataStatus(): Observable<boolean>{
    return this.isResetFilter.asObservable();
  }
}

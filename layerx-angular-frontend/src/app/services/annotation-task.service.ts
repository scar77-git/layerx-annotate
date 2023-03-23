/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { bool } from 'aws-sdk/clients/signer';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AnnotationTaskService {
  TASK_PROGRESS_KEY = 'isTaskProcessing';

  constructor(private http: HttpClient) {}

  getSelectedTaskDetails(taskId: string) {
    return this.http.get<any>(`${environment.apiUrl}/api/tasks/${taskId}`);
  }

  saveFrameData(
    taskId: string,
    frameId: number,
    boxes: Array<any>,
    commentBoxes: Array<any>,
    userLog: Array<any>,
    isEmpty: boolean
  ) {
    return this.http
      .post<any>(
        `${environment.apiUrl}/api/frames/${taskId}/${frameId}/update`,
        {
          boxes: boxes,
          commentBoxes: commentBoxes,
          userLog: userLog,
          isEmpty: isEmpty,
        }
      )
      .pipe(
        map(
          (res) => {
            return res;
          },
          (error: any) => {

            return error;
          }
        )
      );
  }

  getFrameData(taskId: string) {
    return this.http.get<any>(
      `${environment.apiUrl}/api/frames/${taskId}/list`
    );
  }

  setTaskStatus(taskId: string, status: number) {
    return this.http
      .post<any>(`${environment.apiUrl}/api/tasks/${taskId}/setStatus`, {
        status: status,
      })
      .pipe(
        map(
          (res) => {
            return res;
          },
          (error: any) => {

            return error;
          }
        )
      );
  }

  getCommentList(taskId: string) {
    return this.http.get<any>(
      `${environment.apiUrl}/api/frames/comments/${taskId}`
    );
  }

  downloadJson(taskId: string){
    return this.http.get<any>(
      `${environment.apiUrl}/api/${taskId}/jsonData/`
    );
  }

  setTaskProgressStatus(status: boolean): void {
    const value = JSON.stringify(status);
    localStorage.setItem(this.TASK_PROGRESS_KEY, value);
  }

  getTaskProgressStatus(): any {
    let taskProgressStatus: any = localStorage.getItem(this.TASK_PROGRESS_KEY);
    if (taskProgressStatus) {
      return JSON.parse(taskProgressStatus);
    }
    return null;
  }
  
  clearTaskProgressStatus(): void {
    localStorage.removeItem(this.TASK_PROGRESS_KEY);
  }
}

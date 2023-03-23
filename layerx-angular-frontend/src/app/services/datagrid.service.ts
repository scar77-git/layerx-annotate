/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { map } from 'rxjs/operators';


@Injectable({
  providedIn: 'root'
})
export class DatagridService {

  constructor(private http: HttpClient) { }

  getLabelList(datasetId: string) {
    return this.http.get<any>(`${environment.apiUrl}/api/dataSet/dataGrid/labels/${datasetId}`);
  }

  /**
   * get filtered image list
   * @param datasetId selected dataset Id
   * @param searchKey search string
   * @param labels selected labels
   * @param index starting position
   * @param size expected image count
   * @param split split data
   * @returns images
   */
  filter(datasetId: string, searchKey: string, labels: any, index: number, size:number, split:any){
    return this.http
      .post<any>(
        `${environment.apiUrl}/api/dataSet/dataGrid/filter/${datasetId}`,{
          pageIndex: index,
          pageSize: size,
          searchKey: searchKey,
          split: split,
          labelObj: labels,
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

  /**
   * load image preview data
   * @param frameId selected frame id
   * @returns frame data
   */
  preview(frameId: string){
    return this.http
    .get<any>(
      `${environment.apiUrl}/api/dataSet/dataGridImagePreview/${frameId}`
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
}

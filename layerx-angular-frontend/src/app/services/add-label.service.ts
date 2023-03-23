/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { map } from 'rxjs/operators';
import { ClassWithAttributes } from 'src/app/models/label.model';


@Injectable({
  providedIn: 'root'
})
export class AddLabelService {

  constructor(private http: HttpClient) { }

  getProjectLabelList(projectId: string) {
    return this.http.get<any>(`${environment.apiUrl}/api/projects/${projectId}/labels/list`)
  }
  saveNewLabel(projectId: string, document: any){
    return this.http
      .post<any>(
        `${environment.apiUrl}/api/projects/${projectId}/labels/create`,
        {
          labels: document
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
  editLabel(projectId: string, labelKey: string, document: any){
    return this.http
      .post<any>(
        `${environment.apiUrl}/api/projects/${projectId}/labels/${labelKey}/edit`,
        {
          labels: document
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
  uploadImages(projectId: string, document: any){
    let formData = new FormData();
    formData.append('type',document.type)
    formData.append('labelKey',document.labelKey)
    formData.append('attributeKey',document.attributeKey)
    formData.append('valueName',document.valueName)
    formData.append('imgData',document.imgData)

    return this.http.post(
      `${environment.apiUrl}/api/projects/${projectId}/labelImage/upload`,
      formData
    );
  }
  deleteLabel(projectId: string, labelKey: string){
    return this.http
      .get<any>(
        `${environment.apiUrl}/api/projects/${projectId}/labels/${labelKey}/delete`,{}
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

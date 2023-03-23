/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})

export class DLabelsService {

  constructor(private http: HttpClient) {}

  getLabelList(versionId: string) {
    return this.http.get<any>(
      `${environment.apiUrl}/api/dataSet/labels/${versionId}`
    );
  }
  updateLabelList(versionId: string,labelList: any, isNewVersion: boolean) {
    return this.http.post(
      `${environment.apiUrl}/api/dataSet/labels/update/${versionId}?newVersion=${isNewVersion}`,labelList
    )
  }
}

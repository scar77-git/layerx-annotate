/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

/**
 * @class: OverviewService
 * purpose of this module is communicate with backend API
 * @description:implements all the api calls related to project overview
 * @author: Pasan Nethsara
 */

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class OverviewService {
  constructor(private http: HttpClient) {}

  getAnnotationStats(projectId: string) {
    return this.http.get<any>(
      `${environment.apiUrl}/api/project/overview/annotationStats/${projectId}`
    );
  }

  getAnnotationGraph(projectId: string, range: number) {
    return this.http.get<any>(
      `${environment.apiUrl}/api/project/overview/annotationSummery?projectId=${projectId}&range=${range}`
    );
  }
}

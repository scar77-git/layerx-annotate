/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

/**
 * @class: DOverviewService
 * purpose of this module is communicate with backend API
 * @description:implements all the api calls related to project overview of dataset tab
 * @author: Pasan Nethsara
 */

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DOverviewService {
  constructor(private http: HttpClient) {}

  getDatasetOverviewStats(dataSetId: string) {
    return this.http.get<any>(
      `${environment.apiUrl}/api/dataSet/overview/stats/${dataSetId}`
    );
  }
}

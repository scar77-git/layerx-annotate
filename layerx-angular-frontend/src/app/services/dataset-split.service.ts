/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DatasetSplitService {
  constructor(private http: HttpClient) {}

  getSplitStats(datasetVersionId: string) {
    return this.http.get<any>(
      `${environment.apiUrl}/api/dataSet/spitDatasetStat/${datasetVersionId}`
    );
  }
}

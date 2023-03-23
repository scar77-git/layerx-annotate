/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

/**
 * @class: DatasetExportService
 * purpose of this module is to export datasets
 * @description:implements all the logics related dataset export service
 * @author: Pasan Nethsara
 */

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DatasetExportService {
  constructor(private http: HttpClient) {}

  getDatasetList(datasetVersionId: string) {
    return this.http.get<any>(
      `${environment.apiUrl}/api/datasetVersion/getExportTab/${datasetVersionId}`
    );
  }

  generateDataset(selectedVersionId: string, selectedFormats: Array<any>) {
    return this.http.post<any>(
      `${environment.apiUrl}/api/datasetVersion/generateSelectedFormats/${selectedVersionId}`,
      {
        selectedFormats: selectedFormats,
      }
    );
  }

  getFormatGenerationProgress(datasetVersionId: string, formatName: string) {
    return this.http.get<any>(
      `${environment.apiUrl}/api/datasetVersion/getGenerationProgress/${datasetVersionId}/${formatName}`
    );
  }
}

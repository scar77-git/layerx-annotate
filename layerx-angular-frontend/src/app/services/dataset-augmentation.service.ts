/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { augmentationData } from '../shared/models/augmentation';

@Injectable({
  providedIn: 'root',
})
export class DatasetAugmentationService {
  constructor(private http: HttpClient) {}

  getAugmentationList(versionId: string) {
    return this.http.get<any>(
      `${environment.apiUrl}/api/dataSet/enableAugmentations/${versionId}`
    );
  }

  getAugmentationProgress(versionId: string) {
    return this.http.get<any>(
      `${environment.apiUrl}/api/dataSet/augmentationProgress/${versionId}`
    );
  }

  saveAugmentations(
    selectedVersionId: string,
    selectedAugmentations: augmentationData
  ) {
    return this.http.post<any>(
      `${environment.apiUrl}/api/dataSet/augmentationListSave/${selectedVersionId}`,
      {
        selectedAugmentations: selectedAugmentations,
      }
    );
  }

  updateAugmentations(
    selectedVersionId: string,
    selectedAugmentations: augmentationData
  ) {
    return this.http.post<any>(
      `${environment.apiUrl}/api/dataSet/updateAugmentation/${selectedVersionId}`,
      {
        selectedAugmentations: selectedAugmentations,
      }
    );
  }

  deleteAugmentation(selectedVersionId: string, augmentationId: string) {
    return this.http.post<any>(
      `${environment.apiUrl}/api/dataSet/deleteAugmentations/${selectedVersionId}?augmentationId=${augmentationId}`,
      {}
    );
  }


}

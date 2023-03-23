/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NumberList } from 'aws-sdk/clients/iot';
import { bool } from 'aws-sdk/clients/signer';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DatasetService {
  DATASET_KEY = 'selectedDataset';
  DATASET_CREATE = 'createdDatasetId';
  DATASET_VERSION_KEY = 'selectedVersion';
  IS_NEW_DATASET = 'isNewDataset';
  DATASET_EDIT = 'datasetOnEdit';
  DATASET_TYPE = 'datasetType';
  IS_NEW_VERSION = 'isNewVersion';

  constructor(private http: HttpClient) {}

  getDataset() {
    return this.http.get<any>(`${environment.apiUrl}/api/dataSet/list`);
  }

  setCreatedDataSetId(id: string): void {
    localStorage.setItem(this.DATASET_CREATE,id);
  }

  getCreatedDatasetId() {
    return localStorage.getItem(this.DATASET_CREATE)
  }

  clearCreatedDatasetId() {
    localStorage.removeItem(this.DATASET_CREATE);
  }

  setNewDataSet(): void {
    localStorage.setItem(this.IS_NEW_DATASET, 'true')
  }

  isNewDataSet() {
    return localStorage.getItem(this.IS_NEW_DATASET)
  }

  clearNewDataSet() {
    localStorage.removeItem(this.IS_NEW_DATASET)
  }

  setIsNewVersion(isNewVersion: string) {
    localStorage.setItem(this.IS_NEW_VERSION, isNewVersion)
  }

  getIsNewVersion() {
    return localStorage.getItem(this.IS_NEW_VERSION);
  }

  clearIsNewVersion() {
    localStorage.removeItem(this.IS_NEW_VERSION);
  }

  setEditDataset() {
    localStorage.setItem(this.DATASET_EDIT,'true');
  }

  isEditDataset() {
    let bool = localStorage.getItem(this.DATASET_EDIT);
    if(bool){
      return true;
    }else{
      return false;
    }
  }

  clearEditDataSet() {
    localStorage.removeItem(this.DATASET_EDIT)
  }

  setEditType(type: string) {
    localStorage.setItem(this.DATASET_TYPE, type);
  }

  getEditType() {
    return localStorage.getItem(this.DATASET_TYPE)
  }

  clearEditType() {
    localStorage.removeItem(this.DATASET_TYPE)
  }

  getSelectedDataSet() {
    return localStorage.getItem(this.DATASET_KEY)
  }
  
  clearSelectedDataSet(): void {
    localStorage.removeItem(this.DATASET_KEY);
  }

  setSelectedDatasetVersion(versionId: string) {
    localStorage.setItem(this.DATASET_VERSION_KEY, versionId)
  }
  getSelectedDatasetVersion() {
    return localStorage.getItem(this.DATASET_VERSION_KEY);
  }
  clearSelectedDataSetVersion(): void {
    localStorage.removeItem(this.DATASET_VERSION_KEY);
  }

  getVersionEditDetails(versionId: string) {
    return this.http.get<any>(
      `${environment.apiUrl}/api/dataSetVersion/versionEditDetails/${versionId}`
    );
  }

  createDataset(projects: Array<any>, dataSetName: string) {
    return this.http
      .post<any>(`${environment.apiUrl}/api/dataSet/initialCreate`, {
        projects: projects,
        dataSetName: dataSetName,
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

  editDataset(projects: Array<any>, dataSetVersionId: string, newVersion: boolean) {
    return this.http
      .post<any>(`${environment.apiUrl}/api/dataSet/${dataSetVersionId}/initialEdit?newVersion=${newVersion}`, {
        projects: projects,
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

  getManualVideoList(datasetId: string, versionId?: string) {
    if(versionId == undefined){
      versionId = '';
    }
    return this.http.get<any>(
      `${environment.apiUrl}/api/dataSet/manual/${datasetId}/taskAndObjectList?dataSetVersionId=${versionId}`
    );
  }
  getRandomVideoList(datasetId: string, versionId?: string) {
    let id = datasetId
    return this.http.get<any>(
      `${environment.apiUrl}/api/dataSet/videoSet/${id}?dataSetVersionId=${versionId}`

    );
  }

  getSplitList(versionId: string) {
    return this.http.get<any>(
      `${environment.apiUrl}/api/dataSetVersion/showVersionSplitStat/${versionId}`
    );
  }

  rebalanceDataset(
    videoList: any,
    datasetVersionId: string,
    trainingSetPercentage: number,
    validationSetPercentage: number,
    testingSetPercentage: number
  ) {
    return this.http
      .post<any>(
        `${environment.apiUrl}/api/dataSet/reBalance/${datasetVersionId}`,
        {
          videoList: videoList,
          splitPercentage: {
            "trainingSetPercentage": trainingSetPercentage,
            "validationSetPercentage": validationSetPercentage,
            "testingSetPercentage": testingSetPercentage
          },
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
  deleteDatasetVersion(datasetVersionId: string) {
    return this.http.get<any>(
      `${environment.apiUrl}/api/dataSet/version/${datasetVersionId}/delete`
    );
  }

  datasetProgress(versionId: string) {
    return this.http.get<any>(
      `${environment.apiUrl}/api/dataSet/createProgress/${versionId}`
    );
  }

  datasetAugmentationProgress(versionId: string) {
    return this.http.get<any>(
      `${environment.apiUrl}/api/dataSet/createProgressAugmentation/${versionId}`
    );
  }
  getTaskList(id: string, dataSetType?: number, dataSetVersionId?: string) {
    if(dataSetType == undefined || dataSetVersionId == undefined){
      dataSetType = 0;
      dataSetVersionId = '';
    }
    return this.http
      .get<any>(
        `${environment.apiUrl}/api/dataSet/manual/VideoTaskList/${id}?dataSetType=${dataSetType}&dataSetVersionId=${dataSetVersionId}`
      );
  }
  createRandomDataSet(datasetId: string,
    videoList: any,
    trainingSetPercentage: number,
    validationSetPercentage: number,
    testingSetPercentage: number
  ) {
    return this.http
      .post<any>(
        `${environment.apiUrl}/api/dataSet/splitData/random/${datasetId}/create`,
        {
          videoList: videoList,
          splitPercentage: {
            "trainingSetPercentage": trainingSetPercentage,
            "validationSetPercentage": validationSetPercentage,
            "testingSetPercentage": testingSetPercentage
          },
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

  editRandomDataSet(datasetVersionId: string,
    videoList: any,
    trainingSetPercentage: number,
    validationSetPercentage: number,
    testingSetPercentage: number,
    newVersion: boolean
  ) {
    return this.http
      .post<any>(
        `${environment.apiUrl}/api/dataSet/random/${datasetVersionId}/edit?newVersion=${newVersion}`,
        {
          videoList: videoList,
          splitPercentage: {
            "trainingSetPercentage": trainingSetPercentage,
            "validationSetPercentage": validationSetPercentage,
            "testingSetPercentage": testingSetPercentage
          },
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

  createManualDataSet(datasetId: string,
    videoList: any,
    trainingSetPercentage: number,
    validationSetPercentage: number,
    testingSetPercentage: number
  ) {
    return this.http
      .post<any>(
        `${environment.apiUrl}/api/dataSet/splitData/manual/${datasetId}/create`,
        {
          tasks:[{
            type: 1,
            videoArray:videoList.trainingSet.videoList
          },{
            type: 2,
            videoArray:videoList.validationSet.videoList
          },{
            type: 3,
            videoArray:videoList.testingSet.videoList
          }
        ],
          splitPercentage: {
            "trainingSetPercentage": trainingSetPercentage,
            "validationSetPercentage": validationSetPercentage,
            "testingSetPercentage": testingSetPercentage
          },
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

    editManualDataSet(datasetVersionId: string,
      videoList: any,
      trainingSetPercentage: number,
      validationSetPercentage: number,
      testingSetPercentage: number,
      newVersion: boolean
    ) {
      return this.http
        .post<any>(
          `${environment.apiUrl}/api/dataSet/manual/${datasetVersionId}/edit?newVersion=${newVersion}`,
          {
            tasks:[{
              type: 1,
              videoArray:videoList.trainingSet.videoList
            },{
              type: 2,
              videoArray:videoList.validationSet.videoList
            },{
              type: 3,
              videoArray:videoList.testingSet.videoList
            }
          ],
            splitPercentage: {
              "trainingSetPercentage": trainingSetPercentage,
              "validationSetPercentage": validationSetPercentage,
              "testingSetPercentage": testingSetPercentage
            },
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
  
}

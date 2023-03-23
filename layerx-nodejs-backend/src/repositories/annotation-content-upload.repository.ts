/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 *perform CRUD operations in Annotation Content Upload model
 */

/**
 * @class Annotation Content Upload Repository
 * purpose of this Repository is to perform CRUD operations in Annotation Content Upload model
 * @description perform CRUD operations in Annotation Content Upload model
 * @author chathushka
 */

import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {ObjectId} from 'mongodb';
import {MongoDataSource} from '../datasources';
import {AnnotationContentUpload, AnnotationContentUploadRelations, AnnotationProject, StatusOfTask, UploadFileStatus} from '../models';

export class AnnotationContentUploadRepository extends DefaultCrudRepository<
  AnnotationContentUpload,
  typeof AnnotationContentUpload.prototype.id,
  AnnotationContentUploadRelations
> {
  constructor(
    @inject('datasources.mongo') dataSource: MongoDataSource,
  ) {
    super(AnnotationContentUpload, dataSource);
  }




  /**
   * Use for send the progress of task creation
   * @param projectId {string} id of the project
   * @returns progress of the task creation
   */
  async getContentsProcessProgress(projectId: string, projObj: AnnotationProject) {
    let pending = false
    let uploadContents: AnnotationContentUpload[] = await this.find(
      {where: {projectId: projectId}}
    )


    let progress = 0;
    if (!uploadContents) {
      progress = 0;
      pending = true
    }
    if (uploadContents.length == 0) {
      progress = 0;
      pending = true

    }

    if (projObj.isGoogleFileAvailable) pending = true
    if (!projObj.isGoogleFileAvailable) pending = false


    /**
     * calculate the progress
     */
    let percentages = 0;
    let count = 0


    let isProjectStarted = false
    for (let obj of uploadContents) {
      if (obj.status == 0) {
        pending = true
        percentages += obj.progress!
        count += 1
      }
      if (obj.status == 1) isProjectStarted = true
    }
    if (count > 0) {
      progress = percentages / count
    }
    if (count == 0 && isProjectStarted == true) progress = 100

    if (progress == 100) pending = false


    let result = {
      progress: progress,
      isPending: pending,
      isUploading: projObj.isUploading ?? true
    }
    if (result.isUploading) {
      result.isPending = false
      result.progress = 0
    }
    
    for (let obj of uploadContents) {
      if(obj.status == UploadFileStatus.Downloading){
        result.isPending = true
      }
    }


    return result

  }

  /**
   * Use for find the documents match the condition
   * @param filter {object} filtering object
   * @returns documents match the condition
   */
  async findObjList(filter: object) {
    return await this.find(filter
    )
  }

  /**
   * Get task list with object count
   * @param videoIdList user selected video list array
   * @returns task list with object count
   */
  async getTaskListWithObjectsCount(videoIdList: string[]) {
    let params: any[] = [];
    let _videoList = videoIdList.map(videoId => {
      return new ObjectId(videoId);
    });
    params = [
      {$match: {"_id": {$in: _videoList}}},
      {$lookup: {from: 'AnnotationTask', localField: '_id', foreignField: 'uploadId', as: 'tasks'}},
      {$match: {"tasks.status": {$in: [StatusOfTask.qaCompleted, StatusOfTask.ACCEPTED]}}},
      {$project: {"tasks._id": 1, "tasks.labelCounts.totalCount": 1, "tasks.frameCount": 1, "clipName": 1}},

    ]
    return await this.aggregate(params);

  }







  /**
   * Get video list belonging to a  project
   * @param projectId {string} project id
   * @returns video clip name,content id and isSelected boolean
   */
  async videoListOfProject(projectId: string) {
    let param: any[] = [];
    param = [
      {$match: {projectId: new ObjectId(projectId)}},
      {
        $project:
          {sourceFilePath: 1}
      }
    ];
    let _videoList: VideoList[] = await this.aggregate(param);

    let videoList = _videoList.map(video => {
      let videoPath = video.sourceFilePath.split("/").pop();
      let videoName = videoPath!.split(".")[0];
      return {
        id: video._id,
        videoName: videoName,
        isSelected: false
      }
    });
    return videoList;
  }





  /**
   * Use for query data from method of aggregate
   * @param params {string[]} parameters for aggregate the database
   * @returns filtered data from database
   */
  public async aggregate(params?: any[]) {
    if (!params) params = [];
    const response = await (this.dataSource.connector as any)
      .collection('AnnotationContentUpload')
      .aggregate(params)
      .get();
    return response;
  }
}




export interface VideoDetails {
  tasks: {
    _id: string,
    labelCounts: {
      totalCount: number
    }
  }

}

export interface VideoList {
  _id: string;
  sourceFilePath: string;
}

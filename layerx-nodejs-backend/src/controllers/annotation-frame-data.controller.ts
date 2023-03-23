/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 *controller class that use handle the request-response lifecycle for API for the annotation frame data model
 */

/**
 * @class annotation frame data controller
 * Handle the developer request to the frame related data
 * @description controller class that use Handle the developer request to the frame related data
 * @author chathushka
 */

import {repository} from '@loopback/repository';
import {get, param, post, RestBindings, Response} from '@loopback/rest';
import {ObjectId} from 'mongodb';
import {logger} from '../config';
import {
  AnnotationDataSetRepository,
  AnnotationDatasetVersionRepository,
  AnnotationFrameRepository,
  AnnotationTaskRepository,
  ApiKeyRepository
} from '../repositories';
import {AnnotationUserMessages} from '../settings/annotation.user.messages';
import fs from 'fs-extra'
import Path from 'path'
import archiver from 'archiver'
import { AnnotationData } from '../models';
import { inject, service } from '@loopback/core';
import { FileSizeRelatedService, File_SizeRelated_Service } from '../services/file-related.service';

export class AnnotationFrameDataController {
  constructor(
    @repository(AnnotationFrameRepository)
    public annotationFrameRepository: AnnotationFrameRepository,
    @repository(AnnotationTaskRepository)
    public annotationTaskRepository: AnnotationTaskRepository,
    @repository(ApiKeyRepository) public apiKeyRepository: ApiKeyRepository,
    @repository(AnnotationDataSetRepository)
    public annotationDataSetRepository: AnnotationDataSetRepository,
    @repository(AnnotationDatasetVersionRepository)
    public annotationDatasetVersionRepository: AnnotationDatasetVersionRepository,
    @inject(File_SizeRelated_Service) private fileSizeRelatedService: FileSizeRelatedService,
  ) { }





  /**
   * Use for send annotation data for develope users
   * @param projectId {string} id of the relevant project
   * @param taskList {string} id of the relevant task
   * @param labels {string} labels for filtering
   * @param pageSize {number} page size for sending data
   * @param pageIndex {number} page indexing for skip the data
   * @param key {string} verify the user
   * @param secret {string} verify the user
   * @returns annotation data by filtering with task list and labels
   */
  @get('/dev-api/{projectId}/frames/getData')
  async getData(
    @param.path.string('projectId') projectId: string,
    @param.query.string('taskList') taskList: string,
    @param.query.string('labels') labels: string,
    @param.query.number('pageSize') pageSize: number,
    @param.query.number('pageIndex') pageIndex: number,
    @param.header.string('key') key: string,
    @param.header.string('secret') secret: string,
  ) {
    /**
     * Check for key and secret pair in the database
     */
    if (!(key && secret)) {
      logger.debug(`UnAuthorized Access`);
      return {result: 'UnAuthorized Access'};
    }
    let isAuthorized = await this.apiKeyRepository.checkApiKey(key, secret);
    if (isAuthorized) {
      logger.debug(`Authorized Access`);
      /**
       * Find the frames with limits
       */
      let taskListArray: string[] = []
      if(!taskList || taskList == ''){
        let taskIdList = await this.annotationTaskRepository.find({
          where: {projectId: projectId},
          fields: {id: true}
        })
        taskListArray = taskIdList.map(obj => obj.id!)
      }else{
        taskListArray = taskList.split(',')
      }
      return await this.annotationFrameRepository.getData(
        projectId,
        taskListArray,
        labels,
        pageSize,
        pageIndex,
      );
    } else {
      logger.debug(`UnAuthorized Access`);
      return {result: 'UnAuthorized Access'};
    }
  }




  /**
   *
   * @param dataSetId
   * @param key {string} verify the user
   * @param secret {string} verify the user
   * @returns
   */
  @get('/dev-api/dataSet/{dataSetId}/metaInfo')
  async getDataSetMeta(
    @param.path.string('dataSetId') dataSetId: string,
    @param.header.string('key') key: string,
    @param.header.string('secret') secret: string,
  ) {
    /**
     * Check for key and secret pair in the database
     */
    if (!(key && secret)) {
      logger.debug(`UnAuthorized Access`);
      return {result: 'UnAuthorized Access'};
    }
    let isAuthorized = await this.apiKeyRepository.checkApiKey(key, secret);
    if (isAuthorized) {
      logger.debug(`Authorized Access`);
      return await this.annotationDataSetRepository.getDataSetMeta(dataSetId);
    } else {
      logger.debug(`UnAuthorized Access`);
      return {result: 'UnAuthorized Access'};
    }
  }



  /**
   *
   * @param dataSetId {string} id of the dataSet
   * @param pageSize {number} page size for sending data
   * @param pageIndex {number} page indexing for skip the data
   * @param key {string} verify the user
   * @param secret {string} verify the user
   * @returns
   */
  @get('/dev-api/dataSet/{dataSetVersionId}/data')
  async getDataSet(
    @param.path.string('dataSetVersionId') dataSetVersionId: string,
    @param.query.number('pageSize') pageSize: number,
    @param.query.number('pageIndex') pageIndex: number,
    @param.header.string('key') key: string,
    @param.header.string('secret') secret: string,
  ) {
    /**
     * Check for key and secret pair in the database
     */
    if (!(key && secret)) {
      logger.debug(`UnAuthorized Access`);
      return {result: AnnotationUserMessages.API_ACCESS_DENIED};
    }
    let isAuthorized = await this.apiKeyRepository.checkApiKey(key, secret);
    if (isAuthorized) {
      logger.debug(`Authorized Access`);
      return await this.annotationDatasetVersionRepository.getDataSet(
        dataSetVersionId,
        pageIndex,
        pageSize,
      );
    } else {
      logger.debug(`UnAuthorized Access`);
      return {result: AnnotationUserMessages.API_ACCESS_DENIED};
    }
  }



  /**
   * UpdateMany testing purpose
   * @returns result
   */
  @post('api/test/updateMany')
  async testUpdateMany(
    @param.query.string('id') id: string,
    @param.query.string('data') data: string,
  ) {
    return await this.annotationFrameRepository.updateMany(
      {_id: new ObjectId(id), "boxes.id": 5}, {"boxes.$.boundaries.type": data}
    )
  }


  /**
   * Use for create key secret pair for developer user
   * @param key {string} key 
   * @param secret {string}
   */
  @post('api/addKeySecretPair')
  async addKeySecretPair(
    @param.query.string('key') key: string,
    @param.query.string('secret') secret: string,
  ){
    try{
      await this.apiKeyRepository.create({
        key: key,
        secret: secret
      })
      return {success: true}
    }catch(error){
      return {success: false}
    }
  }


  @get('/api/latest/jsonData')
  async getLatestJsonData(){
    // logging the function
    logger.debug("Request received to send the latest task id");
    const frames = await this.annotationFrameRepository.getEntireList();

    return frames[frames.length - 1];
  }




  /**
   * Use for download the tasks frame data as json file
   * @param dataSetId {string} id of the dataSet
   * @param pageSize {number} page size for sending data
   * @param pageIndex {number} page indexing for skip the data
   * @param key {string} verify the user
   * @param secret {string} verify the user
   * @returns downloadable json file
   */
   @get('/api/{taskId}/jsonData')
   async getFrameDataOfTask(
     @param.path.string('taskId') taskId: string,
     @param.header.string('key') key: string,
     @param.header.string('secret') secret: string,
     @inject(RestBindings.Http.RESPONSE) response: Response,
   ) {
     logger.debug(`json data download request for taskId: ${taskId} initiated`)
     
    
    logger.debug(`Authorized Access`);
    let frameData: {
      _id: string,
      frameId: string,
      taskId: string,
      boxes: AnnotationData[]
    }[] = await this.annotationFrameRepository.getFrameDataOfTask(taskId)

    if(!frameData) return {
      success: false,
      error: 'No any completed boxes'
    }
    //create the taskData folder if it is not existing
    let taskFolder = Path.join(__dirname, '../../../annotation-manager/taskData')
    if(!fs.pathExistsSync(taskFolder)) fs.mkdirSync(taskFolder)

    //create the taskData TaskId folder if it is not existing
    let taskFileFolder = Path.join(__dirname, `../../../annotation-manager/taskData/${taskId}`)
    if(!fs.pathExistsSync(taskFileFolder)) fs.mkdirSync(taskFileFolder)

    let taskFileFolderData = Path.join(__dirname, `../../../annotation-manager/taskData/${taskId}/${taskId}.json`)
    

    //check if path of json file existed previously it will deleted
    if(fs.pathExistsSync(taskFileFolderData)) fs.removeSync(taskFileFolderData)
    fs.writeFileSync(taskFileFolderData, JSON.stringify(frameData, null, 2))
    
    
    response.download(taskFileFolderData);

    return response;

  }



  
}

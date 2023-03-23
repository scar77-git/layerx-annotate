/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 * using parameters call python flask APIs
 */

/**
 * @class Python Request service
 * purpose of this service is to call python APIs and handle them
 * @description using parameters call python flask APIs
 * @author chathushka
 */
import {
  BindingKey,
 BindingScope,
  injectable
} from '@loopback/core';
import { repository } from '@loopback/repository';
import axios from 'axios';
import FormData from 'form-data';
import {logger} from '../config';
import { AutoAnnotationVersion, ForceWrite, FramesPerTask, RequestType, UploadFileStatus } from '../models';
import { AnnotationContentUploadRepository } from '../repositories/annotation-content-upload.repository';
import {PythonServer} from '../settings/python.apis';

@injectable({scope: BindingScope.TRANSIENT})
export class PythonRequestService {
  constructor(
    @repository(AnnotationContentUploadRepository)
    private annotationContentUploadRepository: AnnotationContentUploadRepository,
  ) { }

  /**
   * Use for post call to flask server with projectId framerate and path to the video
   * @param projectId {string} id of the relevant project
   * @param frameRate {number} framerate which needed to divide the video
   * @param path {string} filepath to the downloaded video
   * @returns the response of flask
   */
  async uploadGoogleDrive(projectId: string, frameRate: number, path: string, uploadId: string, contentType: number) {
    //logger.debug('python server request begins uploadId ( edited ): ', uploadId, 'projectId: ', projectId)

    let force_write = ForceWrite.Disable
    let request_annotation_version = AutoAnnotationVersion.versionZero
    let request_type = RequestType.AA_bar
    let frames_per_task = FramesPerTask.Standard

    await this.annotationContentUploadRepository.updateById(uploadId, {
      frame_rate: frameRate,
      frames_per_task: frames_per_task,
      content_type: contentType,
      force_write: force_write,
      request_annotation_version: request_annotation_version,
      request_type: request_type,
      status : UploadFileStatus.Processing
    })
    
    let driveDetails = new FormData();

    driveDetails.append('project_id', projectId);
    driveDetails.append('frame_rate', Number(frameRate));
    driveDetails.append('upload_id', uploadId);
    driveDetails.append('content_type', Number(contentType))
    driveDetails.append(
      'auth_key',
      PythonServer.authKey,
    );
    driveDetails.append('content_path', path);
    driveDetails.append('force_write', force_write);
    driveDetails.append('auto_anno_version', request_annotation_version);
    driveDetails.append('request_type', request_type);

    logger.info(
      'project_id', projectId, typeof (projectId),
      'frame_rate', frameRate, typeof (frameRate),
      'upload_id', uploadId, typeof (uploadId),
      'content_type', contentType, typeof (contentType),
      'content_path', path, typeof (path),
      'auth_key',
      PythonServer.authKey, typeof (PythonServer.authKey),
    )
    const formHeaders = driveDetails.getHeaders();
    logger.debug(formHeaders)
    axios
      .post(PythonServer.baseUrl + '/api/processContent', driveDetails, {
        headers: {
          ...formHeaders,
        },
      })
      .then(response => {
        logger.info(response.data);
        return response.data;
      })
      .catch(error => {
        logger.info('python request error: ', error);
        return error;
      });
  }



  /**
   * Use for handle the request to the python flask server
   * @param projectIdList {string[]} project list of the dataset
   * @param dataSetName {string} data set name
   * @param dataSetMetaId {string} dataset meta id
   */
  async createDataSet(dataSetVersionId: string) {
    let dataSetDetails = new FormData();
    dataSetDetails.append('data_version_id', dataSetVersionId);


    const formHeaders = dataSetDetails.getHeaders();
    console.log(PythonServer.baseUrl);
    axios
      .post(PythonServer.baseUrl + '/api/createDataSet', dataSetDetails, {
        headers: {
          ...formHeaders,
        },
      })
      .then(response => {
        console.log(response.data);
        logger.info(response.data);
        return response.data;
      })
      .catch(error => {
        logger.info(error);
        return error;
      });
  }


  /**
   * Use for handle the request to the python flask server
   * @param projectIdList {string[]} project list of the dataset
   * @param dataSetName {string} data set name
   * @param dataSetMetaId {string} dataset meta id
   */
  async editDataset(projectIdList: string[], dataSetName: string, dataSetMetaId: string) {
    let dataSetDetails = new FormData();
    dataSetDetails.append('project_id_list', JSON.stringify(projectIdList));
    dataSetDetails.append('data_set_name', dataSetName);
    dataSetDetails.append('data_set_Meta_id', dataSetMetaId);


    const formHeaders = dataSetDetails.getHeaders();
    //console.log(dataSetDetails)
    axios
      .post(PythonServer.baseUrl + '/api/editDataSet', dataSetDetails, {
        headers: {
          ...formHeaders,
        },
      })
      .then(response => {
        console.log(response.data);
        logger.info(response.data);
        return response.data;
      })
      .catch(error => {
        logger.info(error);
        return error;
      });
  }

}
export const PYTHON_REQUEST_SERVICE = BindingKey.create<PythonRequestService>(
  'service.pythonRequestService',
);

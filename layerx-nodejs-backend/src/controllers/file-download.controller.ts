/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 *use to download file to the front end
 */

/**
 * @class file download controller
 * purpose of file download controller is to handle api and call the repository for response without jwt authentication
 * @description use to download file to the front end eg: profile images, label images, documents, layerX logo
 */

import {inject, service} from '@loopback/core';
import {repository} from '@loopback/repository';
import {get, oas, param, Response, RestBindings} from '@loopback/rest';
import fs from 'fs';
import path from 'path';
import {logger} from '../config';
import {AnnotationTaskRepository} from '../repositories';
import {AnnotationProjectRepository} from '../repositories/annotation-project.repository';
import {VideoService} from '../services/video.service';
const IMAGE_URL = path.resolve(__dirname, '../../imagePreview');


export class FileDownloadController {
  constructor(
    @repository(AnnotationProjectRepository)
    public annotationProjectRepository: AnnotationProjectRepository,
    @repository(AnnotationTaskRepository)
    public annotationTaskRepository: AnnotationTaskRepository,
    @service(VideoService)
    private videosService: VideoService,
  ) { }

  /**
   * Use for send user profile Images
   * @param userId {string} userId of the user
   * @param response {Response} interface
   * @returns profile image or default profile image
   */
  @get('/api/user/profileImage/{userId}/{imageName}')
  @oas.response.file()
  async getProfileImage(
    @param.path.string('userId') userId: string,
    @param.path.string('imageName') imageName: string,
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ) {
    let pathToImage = path.join(__dirname, `../../storage/profileImages/${userId}/defaultProfileImage.png`)
    if (!fs.existsSync(pathToImage)) {
      pathToImage = path.join(__dirname, '../../profileImages/defaultProfile.png')
    }

    logger.debug(pathToImage);
    response.download(pathToImage);
    return response;
  }

  /**
   * Use for send layerx logo
   * @returns layerx logo
   */
   @get('/api/layerx/logo')
   @oas.response.file()
   async getLogoImage(
     @inject(RestBindings.Http.RESPONSE) response: Response,
   ) {
     let pathToImage = path.join(__dirname, `../../src/logo/logo.png`)
 
     logger.debug(pathToImage);
     response.download(pathToImage);
     return response;
   }





  /**
   * Use for send label image
   * @param projectId {string} projectId of the project
   * @param label {string} label of the project
   * @param attribute {string} attribute of the label
   * @param image {string} image of the attribute
   * @param response {Response} interface
   * @returns label image or default profile image
   */
  @get('/api/storage/labels/{projectId}/{label}/label/{image}')
  @oas.response.file()
  async getLabelImage(
    @param.path.string('projectId') projectId: string,
    @param.path.string('label') label: string,
    @param.path.string('image') image: string,
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ) {
    let pathToImage = path.join(__dirname, `../../storage/labels/${projectId}/${label}/label/${image}`)
    if (!fs.existsSync(pathToImage)) {
      pathToImage = path.join(__dirname, '../../storage/labels/defaultLabel/defaultLabel.png')
    }

    logger.debug(pathToImage);
    response.download(pathToImage);
    return response;
  }



  /**
  * Use for send label image
  * @param projectId {string} projectId of the project
  * @param label {string} label of the project
  * @param attribute {string} attribute of the label
  * @param image {string} image of the attribute
  * @param response {Response} interface
  * @returns label image or default profile image
  */
  @get('/api/storage/labels/{projectId}/{label}/attribute/{attributeKey}/{valueName}/{image}')
  @oas.response.file()
  async getAttributeImage(
    @param.path.string('projectId') projectId: string,
    @param.path.string('label') label: string,
    @param.path.string('attributeKey') attributeKey: string,
    @param.path.string('valueName') valueName: string,
    @param.path.string('image') image: string,
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ) {
    let pathToImage = path.join(__dirname, `../../storage/labels/${projectId}/${label}/attribute/${attributeKey}/${valueName}/${image}`)
    if (!fs.existsSync(pathToImage)) {
      pathToImage = path.join(__dirname, '../../storage/labels/defaultLabel/defaultLabel.png')
    }

    logger.debug(pathToImage);
    response.download(pathToImage);
    return response;
  }




  /**
   * Use for download the project document files
   * @param projectId {string} id of the project
   * @param documentId {number} id of the document
   * @param response downloadable file
   * @returns result
   */
  @get('/api/projects/{projectId}/documents/download/{documentId}')
  async downloadDocument(
    @param.path.string('projectId') projectId: string,
    @param.path.number('documentId') documentId: number,
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ) {
    logger.debug(`search for document in project ${projectId} doc id of ${documentId}`)

    let projObj = await this.annotationProjectRepository.findById(projectId);

    if (!projObj) return {result: "projectId invalid"}

    if (!projObj.documentations) return {result: "No documents available"}

    let documentName
    for (let document of projObj.documentations) {
      if (document.documentId == documentId) {
        documentName = document.fileName
      }
    }
    if (!documentName) return {result: "No documents available"}
    let pathToFile = path.join(__dirname, `../../storage/documents/${projectId}/${documentId}/${documentName}`)
    logger.debug(pathToFile);
    try {
      response.download(pathToFile);
    } catch (error) {
      logger.error('file download failed')
      return error
    }

    return response;
  }





  @get('/api/videoStream/{taskId}')
  @oas.response.file()
  async videoStream(
    @param.path.string('taskId') taskId: string,
  ) {
    let taskDetails = await this.annotationTaskRepository.findById(taskId);
    let url = taskDetails.videoUrl;
    await this.videosService.downloadVideos(url!, taskDetails.id!);
  }





  @get('api/download/imagePreview/{imageName}')
  @oas.response.file()
  downloadFile(
    @param.path.string('imageName') imageName: string,
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ) {

    let fileName = `/${imageName}`;
    const imagePath = path.join(IMAGE_URL, fileName);
    response.download(imagePath, fileName);
    return response;
  }
}

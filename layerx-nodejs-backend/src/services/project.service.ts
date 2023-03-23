/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 * update the project when save the project data and change of status
 */

/**
 * @class Project Update service
 * purpose of this service is to update the project when save the project data and change of status
 * @description update the project when save the project data and change of status
 * @author chathushka
 */

import {
  BindingScope,
  inject,
  injectable,
  service
} from '@loopback/core';
import {repository} from '@loopback/repository';
import {logger} from '../config';
import {ContentType, UploadFileStatus} from '../models';
import {AnnotationContentUploadRepository} from '../repositories/annotation-content-upload.repository';
import {AnnotationProjectRepository} from '../repositories/annotation-project.repository';
import {FileSizeRelatedService, File_SizeRelated_Service} from './file-related.service';
import {GoogleDrive, GOOGLE_DRIVE_SERVICE} from './googleDrive.service';
import {
  PythonRequestService,
  PYTHON_REQUEST_SERVICE
} from './python-request.service';

@injectable({scope: BindingScope.TRANSIENT})
export class ProjectService {
  constructor(
    @repository(AnnotationProjectRepository)
    public annotationProjectRepository: AnnotationProjectRepository,
    @inject(GOOGLE_DRIVE_SERVICE)
    private googleDrive: GoogleDrive,
    @inject(PYTHON_REQUEST_SERVICE)
    private pythonRequest: PythonRequestService,
    @inject(File_SizeRelated_Service) private fileSizeRelatedService: FileSizeRelatedService,
    @repository(AnnotationContentUploadRepository)
    private AnnotationContentUploadRepository: AnnotationContentUploadRepository,
  ) { }

  /**
   * Use for upload the projects images for create tasks
   * @param projectId {string} id of the project
   * @param projectDetails
   * @returns result of creation
   */
  async createImageProject(
    projectId: string,
    projectDetails: {
      name: string;
      fps: number;
      type: number;
      sources: {id: string}[];
      token: string;
    },
  ) {
    let updateOvj = {
      name: projectDetails.name,
      requiredFPS: projectDetails.fps,
      contentType: projectDetails.type,
      updatedAt: new Date(),
    };

    await this.annotationProjectRepository.updateProject(projectId, updateOvj);

    /**
     * call google drive service to upload file
     */
    if (projectDetails.sources) {
      let tempArray: {
        id: string;
        size: number;
        name: string;
        mimeType: string;
      }[] = [];
      for (let file of projectDetails.sources) {
        try {
          await this.googleDrive.chooseImageFiles(
            projectId,
            file.id,
            projectDetails.fps,
            projectDetails.token,
            tempArray,
          );
        } catch (error) {
          logger.error('google check file failed', 'projectId: ', projectId);
          logger.error(error);
          return {result: 'google check file failed'};
        }
      }

      let totalSize = 0;
      for (let file of tempArray) {
        totalSize += Number(file.size);
        if (totalSize / (1024 * 1024 * 1024) > 2)
          return {result: 'File sizes are larger than 2GB'};
      }

      let sizeWithSymbol = await this.fileSizeRelatedService.calculateFileSize(
        Number(totalSize),
        0,
      );

      let projObj = await this.annotationProjectRepository.findById(projectId);

      /**
       * check the file availability
       *
       */
      if (projectDetails.sources.length > 0) {
        projObj.isGoogleFileAvailable = true;
      } else {
        projObj.isGoogleFileAvailable = false;
      }

      if (!projObj.uploadFileList) {
        projObj.uploadFileList = [];
      }

      let uploadDetails = await this.AnnotationContentUploadRepository.create({
        projectId: projectId,
        createdAt: new Date(),
        sourceFilePath: `./contents/uploads/${projectId}/image`,
        progress: 0,
        taskCount: 0,
        status: UploadFileStatus.Downloading
      });

      projObj.uploadFileList.push({
        fileId: uploadDetails!.id!,
        name: 'image folder',
        byteSize: totalSize,
        size: sizeWithSymbol,
        uploadedAt: new Date(),
        isProcessing: true,
        progress: 0,
        status: UploadFileStatus.Downloading,
        message: '',
      });
      projObj.isFilesAvailable = true;
      projObj.isProjectCreated = true;

      this.annotationProjectRepository.updateById(projectId, projObj);

      logger.debug(
        `image download for project id is ${projectId}, uploadId: ${uploadDetails!.id!.toString()}, totalSize: ${totalSize}`,
      );

      let index = 0
      for (let file of tempArray) {
        index += 1
        try {
          await this.googleDrive.downloadImageFile(
            projectId,
            file.id,
            projectDetails.fps,
            projectDetails.token,
            projectDetails.name,
            uploadDetails!.id!.toString(),
            projectDetails.type,
            file.mimeType,
            tempArray.length,
            index
          );
        } catch {
          logger.debug('google download file failed', 'projectId: ', projectId);
          return {result: 'google download file failed'};
        }

        logger.debug(`File download ${file.id} of project ${projectId}`);
      }
      await this.AnnotationContentUploadRepository.updateById(uploadDetails!.id!.toString(), {status: UploadFileStatus.Processing})
      let pathString = `./contents/uploads/${projectId}/image`;

      this.pythonRequest.uploadGoogleDrive(
        projectId,
        projectDetails.fps,
        pathString,
        uploadDetails.id!.toString(),
        ContentType.Image,
      );

      let result = {
        id: projObj.id,
        name: projObj.name,
        contentType: projObj.contentType,
        totalTaskCount: 0,
      };
      return result;
    }
  }
}

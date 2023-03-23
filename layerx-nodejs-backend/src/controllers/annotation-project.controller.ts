/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 * controller class that use handle the request-response lifecycle for API for the annotation project model
 */

/**
 * @class ProjectControllerController
 * Handle the project related requests
 * @description this controller Handle the project related requests eg: project list, update create edit delete project, label create edit delete list
 * File downloads from google and local machine, project stat serve, project create progress, document upload, delete, list
 * @author chathushka
 */

import {authenticate} from '@loopback/authentication';
import {inject, service} from '@loopback/core';
import {repository} from '@loopback/repository';
import {
  get, HttpErrors, param,
  post,
  Request,
  requestBody,
  Response,
  RestBindings
} from '@loopback/rest';
import {SecurityBindings, securityId, UserProfile} from '@loopback/security';
import dotenv from 'dotenv';
import fs from 'fs';
import { ObjectId } from 'mongodb';
import multer from 'multer';
import path from 'path';
import {logger} from '../config';
import {UploadFileStatus} from '../models/annotation-content-upload.model';
import {ContentType, Documentation, LabelInfo} from '../models/annotation-project.model';
import {
  AnnotationContentUploadRepository,
  AnnotationDataSetRepository,
  AnnotationDatasetVersionRepository,
  AnnotationFrameRepository,
  AnnotationProjectRepository,
  AnnotationTaskRepository,
  AnnotationUserRepository,
  RANGE,
  RangeValue
} from '../repositories';
import {
  AwsCloudService,
  AWS_CLOUD_SERVICE
} from '../services/aws-cloud.service';
import {FileSizeRelatedService, File_SizeRelated_Service} from '../services/file-related.service';
import {
  FileStorageService,
  StorageName
} from '../services/file-storage.service';
import {
  GoogleDrive,
  GOOGLE_DRIVE_SERVICE
} from '../services/googleDrive.service';
import {ProjectStatsUpdateService, PROJECT_STATS_UPDATE_SERVICE} from '../services/project-stats-update.service';
import {ProjectService} from '../services/project.service';
import {PythonRequestService, PYTHON_REQUEST_SERVICE} from '../services/python-request.service';
import {AnnotationUserMessages} from '../settings/annotation.user.messages';
import {ErrorCodes} from '../settings/errorCode';
import { EXPIRE_TIME } from '../settings/time-constants';
var randomColor = require('randomcolor');

dotenv.config()

@authenticate('jwt')
export class AnnotationProjectController {
  constructor(
    @repository(AnnotationProjectRepository)
    public annotationProjectRepository: AnnotationProjectRepository,
    @inject(GOOGLE_DRIVE_SERVICE)
    private googleDrive: GoogleDrive,
    @inject(AWS_CLOUD_SERVICE)
    private awsCloudService: AwsCloudService,
    @repository(AnnotationUserRepository)
    private userRepo: AnnotationUserRepository,
    @inject(PROJECT_STATS_UPDATE_SERVICE)
    private projectStatsUpdateService: ProjectStatsUpdateService,
    @inject(File_SizeRelated_Service) private fileSizeRelatedService: FileSizeRelatedService,
    @repository(AnnotationContentUploadRepository)
    private AnnotationContentUploadRepository: AnnotationContentUploadRepository,
    @inject(PYTHON_REQUEST_SERVICE)
    private pythonRequest: PythonRequestService,
    @service(ProjectService)
    public projectService: ProjectService,
    @repository(AnnotationTaskRepository)
    public annotationTaskRepository: AnnotationTaskRepository,
    @repository(AnnotationFrameRepository)
    public annotationFrameRepository: AnnotationFrameRepository,
    @repository(AnnotationDataSetRepository)
    public annotationDataSetRepository: AnnotationDataSetRepository,
    @repository(AnnotationDatasetVersionRepository)
    private datasetVersionRepository: AnnotationDatasetVersionRepository,
  ) {

  }





  /**
   * handle API in Get project list details method
   * @param searchKey {object} userid who belongs project
   * @returns project list of the user
   */
  @get('/api/projects/list')
  async findProjectListOfUser(
    @param.query.string('searchKey') searchKey: string,
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
  ) {
    //this.awsCloudService.generateAWSVideoUrl();
    const userId = currentUserProfile[securityId];
    let user = await this.userRepo.findById(userId);
    let teamId = user.teamId;
    if (teamId) {
      return this.annotationProjectRepository.findProjectListOfUser(teamId);
    }
    return this.annotationProjectRepository.findProjectListOfUser();
  }






  /**
   * Use for send the project summery
   * @param projectId {string} id of the project
   * @returns project Overview Stats
   */
  @get('/api/project/overview/annotationStats/{projectId}')
  async projectOverviewStats(
    @param.path.string('projectId') projectId: string,
  ) {
    let result = await this.annotationProjectRepository.projectOverviewStats(
      projectId,
    );
    return result;
  }





  /**
   * Use for send the annotated stats for the chart
   * @param projectId {string} id of the project
   * @param range {number} indication of the time range for data
   * @returns data time array
   */
  @get('/api/project/overview/annotationSummery')
  async getAnnotationSummery(
    @param.query.string('projectId') projectId: string,
    @param.query.number('range') range: number,
  ) {
    /**
     * get the database projectDataOverTime
     */
    let result = await this.annotationProjectRepository.getAnnotationSummery(
      projectId,
      range,
    );

    /**
     * Process the output for 30days range
     */
    if (range == RANGE.THIRTY_DAYS) {
      if (result?.length == RangeValue.thirtyDays) {
        return result;
      } else {

        let timeStats = result;
        console.log(timeStats)
        let lengthDiff = RangeValue.thirtyDays - timeStats!.length;
        let lastDate
        if (timeStats!.length > 0) lastDate = timeStats![timeStats!.length - 1].date
        else lastDate = new Date().toISOString()
        let dateList = await this.projectStatsUpdateService.getDateList(
          lengthDiff,
          lastDate,
        );

        for (let index = 0; index < lengthDiff; index++) {
          timeStats?.push({
            date: `${dateList[index].getUTCFullYear()}-${dateList[index].getUTCMonth() + 1
              }-${dateList[index].getDate()}`,
            count: 0,
          });
        }
        return timeStats;
      }
    }

    /**
     * Process the output for 90days range
     */
    if (range == RANGE.NINETY_DAYS) {
      if (result?.length == RangeValue.NinetyDays) {
        return result;
      } else {
        let timeStats = result;
        let lengthDiff = RangeValue.NinetyDays - timeStats!.length;
        let lastDate
        if (timeStats!.length > 0) lastDate = timeStats![timeStats!.length - 1].date
        else lastDate = new Date().toISOString()
        let dateList = await this.projectStatsUpdateService.getDateList(
          lengthDiff,
          lastDate,
        );
        for (let index = 0; index < lengthDiff; index++) {
          timeStats?.push({
            date: `${dateList[index].getUTCFullYear()}-${dateList[index].getUTCMonth() + 1
              }-${dateList[index].getDate()}`,
            count: 0,
          });
        }
        return timeStats;
      }
    }

    /**
     * Process the output for 1 year range
     */
    if (range == RANGE.ONE_YEAR) {
      if (result?.length == RangeValue.OneYear) {
        return result;
      } else {
        let timeStats = result;
        let lengthDiff = RangeValue.OneYear - timeStats!.length;
        let lastDate
        if (timeStats!.length > 0) lastDate = timeStats![timeStats!.length - 1].date
        else lastDate = new Date().toISOString()
        let dateList = await this.projectStatsUpdateService.getMonthList(
          lengthDiff,
          lastDate,
        );
        for (let index = 0; index < lengthDiff; index++) {
          timeStats?.push({
            date: `${dateList[index].getUTCFullYear()}-${dateList[index].getUTCMonth() + 1
              }`,
            count: 0,
          });
        }
        return timeStats;
      }
    }

    /**
     * Process the output for 1 year range
     */
    if (range == RANGE.ALL) {
      if (result?.length == RangeValue.OneYear) {
        return result;
      } else {
        let timeStats = result;
        let lengthDiff = RangeValue.OneYear - timeStats!.length;
        let lastDate
        if (timeStats!.length > 0) lastDate = timeStats![timeStats!.length - 1].date
        else lastDate = new Date().toISOString()
        let dateList = await this.projectStatsUpdateService.getMonthList(
          lengthDiff,
          lastDate
        );
        for (let index = 0; index < lengthDiff; index++) {
          timeStats?.push({
            date: `${dateList[index].getUTCFullYear()}-${dateList[index].getUTCMonth() + 1
              }`,
            count: 0,
          });
        }
        return timeStats;
      }
    }
  }







  /**
   * Use for create the empty project only with id
   * @returns empty project details with only id
   */
  @get('/api/projects/initial/create')
  async projectInitialCreate(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ) {
    const userId = currentUserProfile[securityId];
    let user = await this.userRepo.findById(userId)
    return await this.annotationProjectRepository.projectInitialCreate(userId, user.teamId!);
  }







  /**
   * Use for delete the initially created project
   * @param projectId {string} id of the project
   * @returns deleted object or error message
   */
  @post('/api/projects/initial/delete/{projectId}')
  async projectInitialDelete(
    @param.path.string('projectId') projectId: string,
  ) {
    logger.debug(`project initial delete for projectId: ${projectId} initiated`)


    //check if project is used for dataSet and throw error
    let filter = [
      {
        $match: {projects: new ObjectId(projectId)}
      },
      {$limit: 1}]
    

    let dataSet = await this.datasetVersionRepository.aggregate(filter);
    if (dataSet.length > 0) throw new HttpErrors.NotAcceptable(AnnotationUserMessages.PROJECT_IS_USED)
    
    //empty the s3 directory
    let response = await this.awsCloudService.emptyS3Directory(projectId);
    
    if (response.isSuccess == true) {
      return await this.annotationProjectRepository.projectInitialDelete(
        projectId,
      );
    } else {
      return {result: response.result};

    }
  }






  /**
   * Use for update the project details and upload the video sources
   * @param projectId {string} id of the project which is going to update
   * @param projectDetails {object} updating object
   * @returns updated project details
   */
  @post('/api/projects/create/{projectId}')
  async createProject(
    @param.path.string('projectId') projectId: string,
    @requestBody()
    projectDetails: {
      name: string;
      fps: number;
      type: number;
      sources: {id: string}[];
      token: string;
    },
  ) {
    logger.debug(`project create for projectId: ${projectId} project details: ${projectDetails} initiated`)
    let updateOvj = {
      name: projectDetails.name,
      requiredFPS: projectDetails.fps,
      contentType: projectDetails.type,
      updatedAt: new Date(),
    };

    if (projectDetails.type == ContentType.Image) {
      return await this.projectService.createImageProject(projectId, projectDetails)

    }
    /**
     * update the project details
     */
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
          await this.googleDrive.checkFileType(
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
        throw new HttpErrors.NotAcceptable(AnnotationUserMessages.FILE_SIZE_EXCEEDED_LIMIT)
      }

      
      let fileDetailArray = [];
      for (let element of tempArray) {
        let sizeWithSymbol =
          await this.fileSizeRelatedService.calculateFileSize(
            Number(element.size),
            0,
          );
        fileDetailArray.push({
          fileId: element.id,
          name: element.name,
          byteSize: element.size,
          size: sizeWithSymbol,
          uploadedAt: new Date(),
          isProcessing: true,
          progress: 0,
          status: UploadFileStatus.Downloading,
          message: ''
        });
      }

      let projObj = await this.annotationProjectRepository.findById(projectId);


      /**
       * check the file availability
       *
       */
      if (projectDetails.sources.length > 0) {
        projObj.isGoogleFileAvailable = true
      } else {
        projObj.isGoogleFileAvailable = false
      }


      if (!projObj.uploadFileList) {
        projObj.uploadFileList = [];
      }
      for (let item of fileDetailArray) {
        
        let includes = false;
        for (let item2 of projObj.uploadFileList) {
          if (item.fileId == item2.fileId) {
            includes = true;
          }
        }
        if (!includes) projObj.uploadFileList.push(item);
      }
      projObj.isFilesAvailable = true;
      projObj.isProjectCreated = true;
      this.annotationProjectRepository.updateById(projectId, projObj);

      for (let file of tempArray) {
        let fileType = file.mimeType.split('/')[1];
        let uploadDetails =
          await this.AnnotationContentUploadRepository.findOne({
            where: {
              sourceFilePath: `./contents/uploads/${projectId}/${file.name}`,
            },
          });
        if (uploadDetails) {
          await this.AnnotationContentUploadRepository.updateById(
            uploadDetails.id,
            {
              projectId: projectId,
              createdAt: new Date(),
              sourceFilePath: `./contents/uploads/${projectId}/${file.name}`,
              progress: 0,
              status: UploadFileStatus.Downloading
            },
          );
        } else {
          uploadDetails = await this.AnnotationContentUploadRepository.create({
            projectId: projectId,
            createdAt: new Date(),
            sourceFilePath: `./contents/uploads/${projectId}/${file.name}`,
            progress: 0,
            status: UploadFileStatus.Downloading
          });
        }
        
        try {
          this.googleDrive.downloadFile(
            projectId,
            file.id,
            projectDetails.fps,
            projectDetails.token,
            projectDetails.name,
            uploadDetails.id!.toString(),
            projectDetails.type,
            file.name
          );
        } catch {
          logger.debug('google download file failed', 'projectId: ', projectId);
          return {result: 'google download file failed'};
        }

        logger.debug(`File download ${file.id} of project ${projectId}`);
      }

      let result = {
        id: projObj.id,
        name: projObj.name,
        contentType: projObj.contentType,
        totalTaskCount: 0,
      };
      return result;
    }
  }







  /**
   * Use for edit the project details
   * @param projectId {string} id of the project
   * @param projectDetails {object} edited details of the project
   */
  @post('/api/projects/{projectId}/edit')
  async editProject(
    @param.path.string('projectId') projectId: string,
    @requestBody()
    projectDetails: {
      name: string;
      fps: number;
      type: number;
      sources: {id: string}[];
      token: string;
    },
  ) {
    logger.debug(`project edit for projectId: ${projectId} project details: ${projectDetails} initiated`)
    let updateOvj = {
      name: projectDetails.name,
      requiredFPS: projectDetails.fps,
      contentType: projectDetails.type,
      updatedAt: new Date(),
    };
    /**
     * update the project details
     */
    await this.annotationProjectRepository.updateProject(projectId, updateOvj);
    logger.debug('creating project: ', updateOvj);

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
          await this.googleDrive.checkFileType(
            projectId,
            file.id,
            projectDetails.fps,
            projectDetails.token,
            tempArray,
          );
        } catch {
          logger.debug('google check file failed', 'projectId: ', projectId);
          return {result: 'google check file failed'};
        }
      }

      let totalSize = 0;
      for (let file of tempArray) {
        totalSize += Number(file.size);
        if (totalSize / (1024 * 1024 * 1024) > 2)
        throw new HttpErrors.NotAcceptable(AnnotationUserMessages.FILE_SIZE_EXCEEDED_LIMIT)
      }

      let fileDetailArray = [];
      for (let element of tempArray) {
        let sizeWithSymbol =
          (await this.fileSizeRelatedService.calculateFileSize(
            Number(element.size),
            0,
          )) || '0B';
        fileDetailArray.push({
          fileId: element.id,
          name: element.name,
          byteSize: element.size,
          size: sizeWithSymbol,
          uploadedAt: new Date(),
          isProcessing: true,
          progress: 0,
          status: UploadFileStatus.Downloading,
          message: ''
        });
      }

      let projObj = await this.annotationProjectRepository.findById(projectId);

      if (!projObj.uploadFileList) {
        projObj.uploadFileList = [];
      }
      for (let item of fileDetailArray) {
        
        let includes = false;
        for (let item2 of projObj.uploadFileList) {
          if (item.fileId == item2.fileId) {
            includes = true;
          }
        }
        if (!includes) projObj.uploadFileList.push(item);
      }

      projObj.isFilesAvailable = true;

      this.annotationProjectRepository.updateById(projectId, projObj);
      for (let file of tempArray) {
        let fileType = file.mimeType.split('/')[1];
        let uploadObj = await this.AnnotationContentUploadRepository.create({
          projectId: projectId,
          createdAt: new Date(),
          sourceFilePath: `./contents/uploads/${projectDetails.name}/${file.name}`,
          progress: 0,
          status: UploadFileStatus.Downloading
        });
        try {
          this.googleDrive.downloadFile(
            projectId,
            file.id,
            projectDetails.fps,
            projectDetails.token,
            projectDetails.name,
            uploadObj.id!,
            projectDetails.type,
            file.name
          );
        } catch {
          logger.debug('google download file failed', 'projectId: ', projectId);
          return {result: 'google download file failed'};
        }

        logger.debug(`File download ${file.id} of project ${projectId}`);
      }

      let result = {
        id: projObj.id,
        name: projObj.name,
        contentType: projObj.contentType,
        totalTaskCount: projObj.statsSummary?.totalTaskCount || 0,
      };
      return result;
    }
  }




  /**
   * Use for send the progress of task creation
   * @param projectId {string} id of the project
   * @returns progress of the task creation
   */
  @get('/api/projects/{projectId}/contents/processProgress')
  async getContentsProcessProgress(
    @param.path.string('projectId') projectId: string,
  ) {
    let projObj = await this.annotationProjectRepository.findById(projectId);
    return await this.AnnotationContentUploadRepository.getContentsProcessProgress(
      projectId,
      projObj
    );
  }






  /**
   * Use for get the project details of the project
   * @param projectId {string} id of the project
   * @returns uploaded file list details
   */
  @get('/api/projects/{projectId}')
  async getProjectFileList(@param.path.string('projectId') projectId: string) {
    let result = await this.annotationProjectRepository.getProjectFileList(
      projectId,
    );
    //Validate the response
    if (!result) return {result: 'projectId Invalid'};
    if (!result.uploadFileList) return result;

    let filter = {where: {projectId: projectId}};
    
    //Get uploaded file details as array
    let uploadDetails =
      await this.AnnotationContentUploadRepository.findObjList(filter);
    
    //get info from uploaded file details array and process the response
    for (let obj of uploadDetails) {
      //fileName extract from path
      let path = obj.sourceFilePath?.split('/');
      let fileNameEx = path![path!.length - 1];

      //loop through the project uploadFileArray
      for (let i in result!.uploadFileList) {

        //find same upload file by using name matching
        if (result!.uploadFileList[i].name == fileNameEx) {

          //update initially process and status of uploaded file
          result!.uploadFileList[i].isProcessing = false;
          result.uploadFileList[i].status = obj.status || UploadFileStatus.Processing;
          if (obj.progress) result.uploadFileList[i].progress = obj.progress;



          //Attach the relevant error messages
          if (result.uploadFileList[i].status == UploadFileStatus.NodeJsError) {
            result.uploadFileList[i].message = AnnotationUserMessages.PROJECT_GOOGLE_UPLOAD_FAILED
          }

          //Attach the relevant error messages
          if (result.uploadFileList[i].status == UploadFileStatus.Failed) {
            if (obj.errorMessage?.error_code == ErrorCodes.RequestHasSucceeded) {
              result.uploadFileList[i].status = UploadFileStatus.Succeeded
            } else {
              result.uploadFileList[i].message = AnnotationUserMessages.PROJECT_GOOGLE_PROCESS_FAILED
            }
          }

          //Even after 3 hours task generation pending show error message
          if (
            (obj.status == UploadFileStatus.Processing || obj.status == UploadFileStatus.Downloading || !obj.status) && 
            ((new Date()).getTime() - obj.createdAt!.getTime()) > EXPIRE_TIME.FILE_UPLOAD_WAIT_TIME) 
            {
            result.uploadFileList[i].message = AnnotationUserMessages.PROJECT_UPLOAD_FILE_TIME_OUT,
            result.uploadFileList[i].status = UploadFileStatus.Failed
            
            result.isUploading = false
          }

          //If file still downloading attach messages
          if(result.uploadFileList[i].status == UploadFileStatus.Downloading){
            //result.uploadFileList[i].status = UploadFileStatus.Processing
            result.uploadFileList[i].message = AnnotationUserMessages.DOWNLOADING
          }
        }
      }
    }
    
    //update project details with compared upload details
    this.annotationProjectRepository.updateById(projectId, result);

    return result;
  }






  /**
   * Use for get the label list of the project
   * @param projectId {string} id of the project
   * @returns label list of the project
   */
  @get('/api/projects/{projectId}/labels/list')
  async getProjectLabelList(@param.path.string('projectId') projectId: string) {
    let filter = {
      where: {id: projectId},
      fields: {labels: true},
    };
    let result = await this.annotationProjectRepository.
      findOneDocument(filter);
    return result;

  }




  /**
   * Use for create new label for the project
   * @param projectId {string} id of the project
   * @param labelData {object} label data
   * @returns error or success
   */
  @post('/api/projects/{projectId}/labels/create')
  async labelCreate(
    @param.path.string('projectId') projectId: string,
    @requestBody() labelData: {labels: LabelInfo}
  ) {
    logger.debug(`project label create for projectId: ${projectId} project label: ${labelData.labels} initiated`)

    //find the project details
    let projObj = await this.annotationProjectRepository.findById(projectId);

    //exception checking
    if (!projObj) {
      logger.debug('project does not exists')
      return
    }

    //update the project labels
    if (projObj.labels) {
      labelData.labels.isAnnotationEnabled = true

      labelData.labels.color = randomColor();
      logger.debug(labelData.labels)
      ///////////////////////////////////
      // const uid = new ShortUniqueId({length: 10});
      // let labelId = uid();
      // labelData.labels.label = labelId;
      //////////////////////////////////////
      projObj.labels.push(labelData.labels);
    }

    //update and send response
    try {
      await this.annotationProjectRepository.updateById(projectId, {labels: projObj.labels})
      return {
        result: 'success',
        label: labelData.labels
      }
    } catch (error) {
      logger.debug('label create error', error)
      return {result: 'error'}
    }

  }






  /**
   * Use for edit new label for the project
   * @param projectId {string} id of the project
   * @param labelData {object} label data
   * @returns error or success
   */
  @post('/api/projects/{projectId}/labels/{labelKey}/edit')
  async editCreate(
    @param.path.string('projectId') projectId: string,
    @param.path.string('labelKey') labelKey: string,
    @requestBody() labelData: {labels: LabelInfo}
  ) {
    logger.debug(`project label edit for projectId: ${projectId} labelKey: ${labelKey}, project label: ${labelData.labels} initiated`)


    //find the project details
    let projObj = await this.annotationProjectRepository.findById(projectId);

    //exception checking
    if (!projObj) {
      logger.debug('project does not exists')
      return
    }

    if (!projObj.labels) return


    //update the label with matching all fields
    for (let index in projObj.labels) {
      if (projObj.labels[index].key == labelKey) {
        for (let i in labelData.labels.attributes) {
          for (let j in labelData.labels.attributes[i].values) {
            if (labelData.labels.attributes[i].values[j].imgFile) {
              labelData.labels.attributes[i].values[j].imgURL = labelData.labels.attributes[i].values[j].imgFile.srcUrl
            }
          }
        }
        
        labelData.labels.isAnnotationEnabled = projObj.labels[index].isAnnotationEnabled
        labelData.labels.color = projObj.labels[index].color
        labelData.labels.count = projObj.labels[index].count

        projObj.labels[index] = labelData.labels
      }
    }

    //update and send response
    try {
      await this.annotationProjectRepository.updateById(projectId, {labels: projObj.labels})
      return {
        result: 'success',
        label: labelData.labels
      }
    } catch (error) {
      logger.debug('label create error', error)
      return {result: 'error'}
    }

  }





  /**
   * Use for edit the exciting label with new details and image
   * @param projectId {string} id of the project
   * @param labelKey {string} key of the label
   * @param request {object} image data
   * @param response {object}
   * @returns {object} created label object
   */
  @post('api/projects/{projectId}/labelImage/upload')
  async labelImageUpload(
    @param.path.string('projectId') projectId: string,
    @requestBody({
      description: 'label picture',
      required: true,
      content: {
        'multipart/form-data': {
          'x-parser': 'stream',
          schema: {type: 'object'},
        },
      },
    })
    request: Request,
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ) {
    logger.debug(`project label image upload for projectId: ${projectId} initiated`)

    const fileStorage = new FileStorageService(StorageName.LABELS);
    const storage = multer.memoryStorage();
    const upload = multer({storage});
    const fileArr = <FileInterface[]>(
      await new Promise<object>((resolve, reject) => {
        upload.any()(<any>request, <any>response, (err: any) => {
          if (err) reject(err);
          else {
            resolve(request.files!); //.files!
          }
        });
      })
    );
    logger.debug(request);

    let type = request.body.type;
    let labelKey = request.body.labelKey;
    let attributeKey = request.body.attributeKey;
    let valueName = request.body.valueName

    logger.debug(`type ${type} key ${labelKey}`)
    let labelObj

    let projObj = await this.annotationProjectRepository.findById(projectId);

    if (!projObj.labels) {
      logger.error('labels list does not exists')
      return
    }

    let index: number
    for (let i in projObj.labels) {
      if (projObj.labels[i].key == labelKey) {
        labelObj = projObj.labels[i]
        index = Number(i)
      }
    }
    if (!labelObj) {
      logger.error(`labels named ${labelKey} does not exists`)
      return
    }
    if (!fileArr[0]) return;

    if (type == Label_Image_Type.attribute) {
      const fileName = fileArr[0].originalname;
      const fileBuffer = fileArr[0].buffer;
      let url = fileStorage.createSingleFile(
        projectId + '/' + projObj.labels[index!].key + '/attribute/' + attributeKey + '/' + valueName,
        fileName,
        fileBuffer,
        false
      );
      for (let i in labelObj.attributes) {
        if (labelObj.attributes[i].key == attributeKey) {
          for (let j in labelObj.attributes[i].values) {
            if (labelObj.attributes[i].values[j].valueName == valueName) {
              labelObj.attributes[i].values[j].imgFile = {srcUrl: url.url};
              labelObj.attributes[i].values[j].imgURL = url.url
              
            }
          }
        }
        logger.debug(labelObj.attributes[i]);
      }
      logger.debug(url.url)
    } else if (type == Label_Image_Type.label) {
      const fileName = fileArr[0].originalname;
      const fileBuffer = fileArr[0].buffer;
      let url = fileStorage.createSingleFile(
        projectId + '/' + projObj.labels[index!].key + '/label',
        fileName,
        fileBuffer,
        false
      );
      labelObj.imgFile = {srcUrl: url.url}
      labelObj.imgURL = url.url
      
    }
    logger.debug(labelObj);
    projObj.labels[index!] = labelObj

    await this.annotationProjectRepository.updateById(
      projectId,
      projObj
    );
    return labelObj;
  }





  /**
   * Use for delete the label from the project id
   * @param projectId {string} id of the project
   * @param labelKey {string} key of the label
   * @returns updated object
   */
  @get('/api/projects/{projectId}/labels/{labelKey}/delete')
  async deleteLabel(
    @param.path.string('projectId') projectId: string,
    @param.path.string('labelKey') labelKey: string,
  ) {
    return await this.annotationProjectRepository.deleteLabel(
      projectId,
      labelKey,
    );
  }






  /**
   * Use foe get the document details of the project
   * @param projectId {string} id of the project
   * @returns list of details of documents
   */
  @get('/api/projects/{projectId}/documents/list')
  async getDocumentList(@param.path.string('projectId') projectId: string) {

    try {
      let response = await this.annotationProjectRepository.getDocumentList(projectId);
      return response
    } catch (error) {
      logger.error("error occurred while getting document list of project id", projectId)
      return error
    }

  }






  /**
   * use for upload the documents of the project
   * @param projectId {string} id of the project
   * @param request
   * @param response
   * @param currentUserProfile
   * @returns
   */
  @post('/api/projects/{projectId}/documents/upload')
  async uploadDocument(
    @param.path.string('projectId') projectId: string,
    @requestBody({
      description: 'label picture',
      required: true,
      content: {
        'multipart/form-data': {
          'x-parser': 'stream',
          schema: {type: 'object'},
        },
      },
    })
    request: Request,
    @inject(RestBindings.Http.RESPONSE) response: Response,
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ) {
    const userId = currentUserProfile[securityId];
    logger.debug(`project document upload for projectId: ${projectId} by userId: ${userId} initiated`)

    const fileStorage = new FileStorageService(StorageName.Documents);
    const storage = multer.memoryStorage();
    const upload = multer({storage});
    const fileArr = <FileInterface[]>(
      await new Promise<object>((resolve, reject) => {
        upload.any()(<any>request, <any>response, (err: any) => {
          if (err) reject(err);
          else {
            resolve(request.files!); //.files!
          }
        });
      })
    );
    let projObj = await this.annotationProjectRepository.findById(projectId);
    if (!projObj.lastDocumentId) projObj.lastDocumentId = 0
    projObj.lastDocumentId += 1


    logger.info(fileArr[0])
    const fileName = fileArr[0].originalname;
    const fileBuffer = fileArr[0].buffer;
    let fileDetails = fileStorage.createSingleFile(
      projectId + '/' + projObj.lastDocumentId,
      fileName,
      fileBuffer,
      true
    );
    let userObj = await this.userRepo.findById(userId)
    



    let saveObj: Documentation = {
      documentId: projObj.lastDocumentId,
      fileName: fileArr[0].originalname,
      uploadByName: userObj.name || '',
      uploadById: userId,
      createdAt: new Date(),
      url: fileDetails.url
    }

    projObj.documentations?.push(saveObj)
    await this.annotationProjectRepository.updateById(projectId, projObj);
    return {result: "document updated"}
  }





  /**
   * Use for upload local media file to the server
   * @param projectId {string} id of the project
   * @param request {object} media file buffer and media details
   * @param response {object}
   * @returns {success: false,error: "file upload failed"}
   */
  @post('api/upload/files/{projectId}')
  async uploadLocalFile(
    @param.path.string('projectId') projectId: string,
    @requestBody({
      description: 'local file upload',
      required: true,
      content: {
        'multipart/form-data': {
          'x-parser': 'stream',
          schema: {type: 'object'},
        },
      },
    })
    request: Request,
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ) {
    logger.info('chunk upload to projectId', projectId)
    const fileStorage = new FileStorageService(StorageName.ProjectFiles);
    const storage = multer.memoryStorage();
    const upload = multer({storage});
    const fileArr = <FileInterface[]>(
      await new Promise<object>((resolve, reject) => {
        upload.any()(<any>request, <any>response, (err: any) => {
          if (err) reject(err);
          else {
            resolve(request.files!); 
          }
        });
      })
    );


    
    const fileName = request.body.fileName;
    const fileBuffer = fileArr[0].buffer;

    let fileSize = request.body.fileSize;
    let chunkIndex = request.body.chunkIndex;
    let totalChunks = request.body.totalChunks;

    if (fileSize > FileSizes.TwoGB) {
      throw new HttpErrors.NotAcceptable(AnnotationUserMessages.FILE_SIZE_EXCEEDED_LIMIT)
    }
    let projObj = await this.annotationProjectRepository.findById(projectId);

    let uploadDetails =
      await this.AnnotationContentUploadRepository.findOne({
        where: {
          sourceFilePath: `./contents/uploads/${projectId}/${fileName}`,
        },
      });
    let uploadId = uploadDetails?.id
    let previousChunk
    if (projObj.uploadFileList) {
      for (let video of projObj.uploadFileList)
        if (video.fileId == uploadId) {
          previousChunk = video.chunkIndex
        }
    }

    if (!previousChunk) previousChunk = 1

    try {
      let fileDetails = await fileStorage.createSingleFileWithoutErasing(
        projectId,
        fileName,
        fileBuffer,
        chunkIndex,
        previousChunk
      );
      if (!fileDetails) return {success: true}

      logger.info('url is', fileDetails);
      logger.info(fileArr[0].buffer)
      logger.debug(fileDetails);
      let filePath = path.join(
        __dirname,
        process.env.PYTHON_SERVER ?? '../../../../../deepzea-python-backend/contents/uploads/',
        '../../',
        fileDetails
      )
      logger.debug(filePath)
      let stats = fs.statSync(filePath)
      let fileSizeInBytes = stats.size;
      logger.debug(fileSizeInBytes)
      let frameRate = request.body.frameRate || 5

      logger.debug('total chunk: ', totalChunks, 'current chunk: ', chunkIndex)

      let pathString = './contents/uploads/' + projectId + '/' + fileName



      projObj.isUploading = true

      let uploadDetails =
        await this.AnnotationContentUploadRepository.findOne({
          where: {
            sourceFilePath: `./contents/uploads/${projectId}/${fileName}`,
          },
        });

      let sizeWithSymbol =
        await this.fileSizeRelatedService.calculateFileSize(
          Number(fileSize),
          0,
        );
      if (uploadDetails) {

        let fileDetail = {
          fileId: uploadDetails.id!.toString(),
          name: fileName,
          byteSize: fileSize,
          size: sizeWithSymbol,
          uploadedAt: new Date(),
          isProcessing: true,
          progress: 0,
          status: UploadFileStatus.Downloading,
          message: 'File Uploading',
          chunkIndex: chunkIndex
        };

        if (!projObj.uploadFileList) {
          projObj.uploadFileList = [];
        }

        let isInclude = false
        for (let index in projObj.uploadFileList) {
          if (projObj.uploadFileList[index].fileId == fileDetail.fileId) {
            projObj.uploadFileList[index].chunkIndex = chunkIndex
            isInclude = true
          }
        }

        if (!isInclude) {
          projObj.uploadFileList.push(fileDetail)
        }

        await this.annotationProjectRepository.updateById(projObj.id, projObj)

      } else {
        uploadDetails = await this.AnnotationContentUploadRepository.create({
          projectId: projectId,
          createdAt: new Date(),
          sourceFilePath: `.${fileDetails}`,
          progress: 0,
          status: UploadFileStatus.Downloading
        });



        let fileDetail = {
          fileId: uploadDetails.id!.toString(),
          name: fileName,
          byteSize: fileSize,
          size: sizeWithSymbol,
          uploadedAt: new Date(),
          isProcessing: true,
          progress: 0,
          status: UploadFileStatus.Downloading,
          message: 'File Uploading',
          chunkIndex: chunkIndex
        };


        if (!projObj.uploadFileList) {
          projObj.uploadFileList = [];
        }

        let isInclude = false
        for (let index in projObj.uploadFileList) {
          if (projObj.uploadFileList[index].fileId == fileDetail.fileId) {
            projObj.uploadFileList[index].chunkIndex = chunkIndex
            isInclude = true
          }
        }

        if (!isInclude) {
          projObj.uploadFileList.push(fileDetail)
        }

        await this.annotationProjectRepository.updateById(projObj.id, projObj)
      }

      /**
       * Check thh current chunkIndex with total chunkCount and send python request
       */
      if (Number(chunkIndex.toString()) == Number(totalChunks.toString())) {
        logger.debug('python request initiate')

        await this.AnnotationContentUploadRepository.updateById(uploadDetails.id!.toString(), {status: UploadFileStatus.Processing})

        projObj.isUploading = false

        let fileDetail = {
          fileId: uploadDetails.id!.toString(),
          name: fileName,
          byteSize: fileSize,
          size: sizeWithSymbol,
          uploadedAt: new Date(),
          isProcessing: true,
          progress: 0,
          status: UploadFileStatus.Downloading,
          message: 'Tasks are creating. Please wait…',
          chunkIndex: chunkIndex
        };

        if (!projObj.uploadFileList) {
          projObj.uploadFileList = [];
        }

        for (let i in projObj.uploadFileList) {
          if (projObj.uploadFileList[i].fileId == fileDetail.fileId) {
            projObj.uploadFileList[i] = fileDetail
          }
        }

        await this.annotationProjectRepository.updateById(projObj.id, projObj)
        logger.info('projectId is', projectId, 'uploadId is', uploadId, 'byte size', fileSizeInBytes, 'buffer is', fileArr[0])

        return this.pythonRequest.uploadGoogleDrive(projectId, frameRate, pathString, uploadDetails.id!.toString(), ContentType.Video);
      }


      return {success: true}
    } catch (error) {
      logger.error('fileUpload failed with error', error)
      return {
        success: false,
        error: "file upload failed"
      }
    }
  }






/**
* Use for delete the project
* @param projectId {string} id of the project
* @returns {success: true}
*/
  @post('/api/projects/delete/{projectId}')
  async deleteProject(
    @param.path.string('projectId') projectId: string,

  ) {
    logger.debug(`project delete for projectId: ${projectId} initiated`)

    //check if project is used for dataSet and throw error
    let filter = [
      {
        $match: {projects: new ObjectId(projectId)}
      },
      {$limit: 1}
    ]

    let dataSet = await this.datasetVersionRepository.aggregate(filter);
    
    if (dataSet.length > 0) throw new HttpErrors.NotAcceptable(AnnotationUserMessages.PROJECT_IS_USED)
    
    try {
      //find all task of project
      let tasks = await this.annotationTaskRepository.find(
        {
          where: {projectId: projectId},
          fields: {id: true},
        },
      )
      //delete frames of each task
      for (let obj of tasks) {
        await this.annotationFrameRepository.deleteAll({taskId: obj.id})
      }
      //delete tasks, content uploads and project
      await this.annotationTaskRepository.deleteAll({projectId: projectId});
      await this.AnnotationContentUploadRepository.deleteAll({projectId: projectId});
      await this.annotationProjectRepository.deleteById(projectId);

      //delete s3 directory of the project
      await this.awsCloudService.emptyS3Directory(projectId);


      return {success: true}
    } catch (error) {
      logger.debug('project id delete failed projectId: ', projectId, 'with error: ', error,)
      return {success: false}
    }
  }



}


/**
 * interface of the local file upload request
 */
interface FileInterface {
  path: string;
  fieldname: string;
  originalname: string;
  buffer: any;
  mimetype: string;
}



/**
 * differ the label update by label and attribute updates
 */
export enum Label_Image_Type {
  label = 1,
  attribute = 2
}


/**
 * Files sizes use for reject the file upload
 */
export enum FileSizes {
  OneGB = 1024 * 1024 * 1024,
  TwoGB = 1024 * 1024 * 1024 * 2
}

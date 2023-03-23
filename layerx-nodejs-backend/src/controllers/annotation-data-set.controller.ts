/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 * controller class that use handle the request-response lifecycle for API for the AnnotationDataSetController model
 */

/**
 * @class AnnotationDataSetController
 * Use for Handle the dataSet group related requests
 * @description This controller use for handle the dataSet group related requests eg: dataSet initial create and create
 * datSet video Set, dataSet re balance, dataSet create, delete, edit, dataSet version create
 * @author chathushka
 */

import {authenticate} from '@loopback/authentication';
import {inject, service} from '@loopback/core';
import {repository} from '@loopback/repository';
import {
  get, HttpErrors, oas, param,
  post,
  requestBody, Response, RestBindings
} from '@loopback/rest';
import {
  SecurityBindings,
  securityId,
  UserProfile
} from '@loopback/security';
import {ObjectId} from 'mongodb';
import path from 'path';
import {logger} from '../config';
import {AnnotationDatasetVersion, InitialDataSetType, StatusOfTask, TaskList} from '../models';
import {AnnotationContentUploadRepository, AnnotationDatasetVersionRepository, AnnotationFrameRepository, AnnotationTaskRepository, AnnotationUserRepository, LabelObj, MasterDataRepository, SplitDataPercentage} from '../repositories';
import {AnnotationDataSetRepository} from '../repositories/annotation-data-set.repository';
import {AwsCloudService, AWS_CLOUD_SERVICE, DataSetVersionService, FileSizeRelatedService, File_SizeRelated_Service, SplitType, TaskArray} from '../services';
import {
  PythonRequestService,
  PYTHON_REQUEST_SERVICE
} from '../services/python-request.service';
import {AnnotationUserMessages} from '../settings/annotation.user.messages';
import {MONTHS} from '../settings/time-constants';
const URL = path.resolve(__dirname, '../../');

@authenticate('jwt')
export class AnnotationDataSetController {
  constructor(
    @repository(AnnotationDataSetRepository)
    public annotationDataSetRepository: AnnotationDataSetRepository,
    @repository(AnnotationFrameRepository)
    private annotationFrameRepository: AnnotationFrameRepository,
    @repository(AnnotationDatasetVersionRepository)
    private annotationDatasetVersionRepository: AnnotationDatasetVersionRepository,
    @repository(MasterDataRepository)
    public masterDataRepository: MasterDataRepository,
    @inject(PYTHON_REQUEST_SERVICE)
    private pythonRequestService: PythonRequestService,
    @inject(AWS_CLOUD_SERVICE) private awsCloudService: AwsCloudService,
    @service(DataSetVersionService) public dataSetVersionService: DataSetVersionService,
    @inject(File_SizeRelated_Service) private fileSizeRelatedService: FileSizeRelatedService,
    @repository(AnnotationUserRepository)
    private userRepo: AnnotationUserRepository,
    @repository(AnnotationContentUploadRepository)
    public annotationContentUploadRepository: AnnotationContentUploadRepository,
    @repository(AnnotationTaskRepository)
    public annotationTaskRepository: AnnotationTaskRepository,
  ) { }



  /**
   * Use  for handle the dataSet create API
   * @param projectIdList {string[]} project list foe get dataset
   * @param currentUserProfile {string} current user who creating the data set
   * @returns data set meta details
   */
  @post('/api/dataSet/initialCreate')
  async createInitialDataSet(
    @requestBody() projectIdList: {
      projects: string[],
      dataSetName: string
    },
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ) {
    const userId = currentUserProfile[securityId];

    logger.debug(`dataSet initial create request by userId: ${userId}, projects: ${projectIdList.projects}, dataSetName: ${projectIdList.dataSetName} initiated`)
    try {
      let user = await this.userRepo.findById(userId);

      let dataGroup = await this.annotationDataSetRepository.create({
        projects: projectIdList.projects,
        name: projectIdList.dataSetName,
        createdAt: new Date(),
        createdBy: user.name,
        teamId: user.teamId
      })
      logger.debug(`dataSet initial create request by userId: ${userId}, projects: ${projectIdList.projects}, dataSetName: ${projectIdList.dataSetName} success`)
      return dataGroup
    } catch (error) {
      logger.debug(`dataSet initial create request by userId: ${userId} failed with error: ${error}`)
    }

  }


  /**
  * Use  for handle the dataSet create API
  * @param projectIdList {string[]} project list foe get dataset
  * @param currentUserProfile {string} current user who creating the data set
  * @returns data set meta details
  */
  @get('/api/dataSet/videoSet/{dataSetId}')
  async getVideoDetails(
    @param.path.string('dataSetId') dataSetId?: string,
    @param.query.string('dataSetVersionId') dataSetVersionId?: string,
  ) {

    let projectList: any[] = [];
    let previousVideoList: any[] = [];
    let dataSetType: InitialDataSetType;

    /**
     * when data set version editing
     */
    if (dataSetVersionId) {
      let dataSetVersionDetail = await this.annotationDatasetVersionRepository.findById(dataSetVersionId);
      dataSetType = dataSetVersionDetail.creationType;
      projectList = [...dataSetVersionDetail.projects!];

      /**
       * add already selected videos into an array
       */
      for (let videoType of dataSetVersionDetail.splitVideoArray) {
        for (let video of videoType.videoArray) {
          if (!previousVideoList.includes(video._id.toString())) previousVideoList.push(video._id.toString());
        }
      }
    }

    else if (dataSetId) {
      let dataSet = await this.annotationDataSetRepository.findById(dataSetId);
      projectList = [...dataSet.projects!]
    }

    //convert id list to object is list
    let projectIdList = projectList.map((id: any) => new ObjectId(id))

    logger.debug('video list: ', projectIdList)

    let params = [
      {$match: {"projectId": {$in: projectIdList}}},
      {
        $lookup: {
          from: 'AnnotationTask', 'let': {uploadId: "$_id"}, pipeline: [
            {
              $match: {
                $expr: {$eq: ["$$uploadId", "$uploadId"]},
              }
            },
            {$match: {status: {$in: [StatusOfTask.qaCompleted, StatusOfTask.ACCEPTED]}}}], as: 'tasks'
        }
      },
      {$addFields: {"taskCount": {$size: "$tasks"}}},
      {$match: {"taskCount": {$ne: 0}}},
      {$project: {_id: 1, clipName: 1, sourceFilePath: 1, taskCount: 1}}
    ]

    let videoDetails = await this.annotationContentUploadRepository.aggregate(params)
    let returnList = []
    for (let obj of videoDetails) {
      let videoNameList = obj.sourceFilePath.split('/')
      let videoName = videoNameList[videoNameList.length - 1]
      let tempObj = {
        _id: obj._id,
        selected: true,
        videoName: videoName,
        taskCount: obj.taskCount,
        selectTaskCount: obj.taskCount
      }

      /**
        * check whether if video is selected
      */
      if (dataSetVersionId && !previousVideoList.includes(obj._id.toString())) {
        if (dataSetType! == InitialDataSetType.RANDOM) {
          tempObj.selected = false;
        }

      }

      returnList.push(tempObj)
    }
    return returnList

  }







  /**
  * Use  for handle the dataSet create API
  * @param projectIdList {string[]} project list foe get dataset
  * @param currentUserProfile {string} current user who creating the data set
  * @returns data set meta details
  */
  @post('/api/dataSet/reBalance/{dataSetId}')
  async getReBalanceVideoList(
    @param.path.string('dataSetId') dataSetId: string,
    @requestBody() videoDetails: {
      videoList: {
        _id: string,
        selected: boolean,
        videoName: string,
        taskCount: number,
        selectTaskCount: number
      }[],
      splitPercentage: SplitDataPercentage
    }
  ) {

    logger.debug(`dataSet tasks reBalance for dataSetId: ${dataSetId} initiated`)
    //convert id list to object is list
    let videoIdList = videoDetails.videoList.map(obj => {
      if (obj.selected) return new ObjectId(obj._id)
    })

    logger.debug(videoIdList)
    let params = [
      {$match: {"_id": {$in: videoIdList}}},
      {
        $lookup: {
          from: 'AnnotationTask', 'let': {uploadId: "$_id"}, pipeline: [
            {
              $match: {
                $expr: {$eq: ["$$uploadId", "$uploadId"]},
              }
            },
            {$match: {status: {$in: [StatusOfTask.qaCompleted, StatusOfTask.ACCEPTED]}}}], as: 'tasks'
        }
      },
      {$addFields: {"taskCount": {$size: "$tasks"}}},
      {$unwind: "$tasks"},
      {
        $project: {
          "tasks._id": 1, "tasks.labelCounts.totalCount": 1,
          "tasks.frameCount": 1, "clipName": 1, "sourceFilePath": 1, "taskCount": 1
        }
      },
    ]

    let paramsForCount = [
      {$match: {"_id": {$in: videoIdList}}},
      {
        $lookup: {
          from: 'AnnotationTask', 'let': {uploadId: "$_id"}, pipeline: [
            {
              $match: {
                $expr: {$eq: ["$$uploadId", "$uploadId"]},
              }
            },
            {$match: {status: {$in: [StatusOfTask.qaCompleted, StatusOfTask.ACCEPTED]}}}], as: 'tasks'
        }
      },
      {$addFields: {"taskCount": {$size: "$tasks"}}},
      {$unwind: "$tasks"},
      {$project: {"tasks._id": 1, "tasks.labelCounts.totalCount": 1}},
      {$group: {_id: null, count: {$sum: "$tasks.labelCounts.totalCount"}}}
    ]

    let taskIdList: TaskArray[] = await this.annotationContentUploadRepository.aggregate(params)


    /**
     * Check for taskList and total count of the objects in dataSet. If they are zero throw error
     */
    let totalCount = await this.annotationContentUploadRepository.aggregate(paramsForCount)
    logger.debug('total tasks count: ', totalCount)
    if (taskIdList.length == 0) throw new HttpErrors.NotAcceptable(AnnotationUserMessages.DATASET_TASK_COUNT_ZERO)
    logger.debug(totalCount[0].count)

    let splitVideoData = await this.dataSetVersionService.dataSetReBalancingCalculation(
      taskIdList,
      videoDetails.splitPercentage,
      totalCount[0].count,
      SplitType.INITIAL
    )

    //create the 3 types of video and task array
    let tempSplitVideoArray: {
      type: number,
      videoArray: {
        _id: string,
        clipName: string,
        videoName: string,
        taskCount: number,
        selectTaskCount: number
      }[]
    }[] = []
    for (let obj of splitVideoData.taskIdArray) {
      let tempVideoArray: {
        _id: string,
        clipName: string,
        videoName: string,
        taskCount: number,
        selectTaskCount: number
      }[] = []
      for (let taskIdArray of obj.idArray) {
        let isInclude = false
        for (let i in tempVideoArray) {
          if ((tempVideoArray[i]._id).toString() == (taskIdArray._id).toString()) {
            tempVideoArray[i].selectTaskCount += 1
            isInclude = true
          }
        }
        if (!isInclude) {
          let videoNameList = taskIdArray.sourceFilePath.split('/')
          let videoName = videoNameList[videoNameList.length - 1]
          tempVideoArray.push({
            _id: taskIdArray._id,
            clipName: taskIdArray.clipName,
            videoName: videoName,
            taskCount: taskIdArray.taskCount,
            selectTaskCount: 1
          })
        }

      }
      tempSplitVideoArray.push({
        type: obj.type,
        videoArray: tempVideoArray
      })

    }
    return {
      splitVideoArray: tempSplitVideoArray,
      splitCount: splitVideoData.splitCount
    }


  }







  /**
   * Use for split the dataSet to randomly
   * @param dataSetId {string} id of the dataSet
   * @param videoDetails {number} split type random = 1 and manual = 2
   * returns
   */
  @post('/api/dataSet/splitData/random/{dataSetId}/create')
  async getSplitData(
    @param.path.string('dataSetId') dataSetId: string,
    @requestBody() videoDetails: {
      videoList: {
        _id: string,
        selected: boolean,
        videoName: string,
        taskCount: number,
        selectTaskCount: number
      }[],
      splitPercentage: SplitDataPercentage
    }
  ) {

    logger.debug(`dataSetVersion random create for dataSetId: ${dataSetId}, split percentage: ${videoDetails.splitPercentage} initiated`)
    //convert id list to object is list
    let videoIdList = videoDetails.videoList.map(
      obj => {
        if (obj.selected) return new ObjectId(obj._id)
      })

    logger.debug(videoIdList)
    let params = [
      {$match: {"_id": {$in: videoIdList}}},
      {
        $lookup: {
          from: 'AnnotationTask', 'let': {uploadId: "$_id"}, pipeline: [
            {
              $match: {
                $expr: {$eq: ["$$uploadId", "$uploadId"]},
              }
            },
            {$match: {status: {$in: [StatusOfTask.qaCompleted, StatusOfTask.ACCEPTED]}}}], as: 'tasks'
        }
      },
      {$addFields: {"taskCount": {$size: "$tasks"}}},
      {$unwind: "$tasks"},
      {
        $project: {
          "tasks._id": 1, "tasks.labelCounts.totalCount": 1,
          "tasks.frameCount": 1, "clipName": 1, "sourceFilePath": 1, "taskCount": 1
        }
      },
    ]

    let paramsForCount = [
      {$match: {"_id": {$in: videoIdList}}},
      {
        $lookup: {
          from: 'AnnotationTask', 'let': {uploadId: "$_id"}, pipeline: [
            {
              $match: {
                $expr: {$eq: ["$$uploadId", "$uploadId"]},
              }
            },
            {$match: {status: {$in: [StatusOfTask.qaCompleted, StatusOfTask.ACCEPTED]}}}], as: 'tasks'
        }
      },
      {$addFields: {"taskCount": {$size: "$tasks"}}},
      {$unwind: "$tasks"},
      {$project: {"tasks._id": 1, "tasks.labelCounts.totalCount": 1}},
      {$group: {_id: null, count: {$sum: "$tasks.labelCounts.totalCount"}}}
    ]

    /**
     * Check for taskList and total count of the objects in dataSet. If they are zero throw error
     */
    let taskIdList: TaskArray[] = await this.annotationContentUploadRepository.aggregate(params)
    if (taskIdList.length == 0) throw new HttpErrors.NotAcceptable(AnnotationUserMessages.DATASET_TASK_COUNT_ZERO)
    let totalCount = await this.annotationContentUploadRepository.aggregate(paramsForCount)
    if (!totalCount[0].count) throw new HttpErrors.NotAcceptable("Annotated object count is zero")


    //split the video and task to given percentages
    let splitVideoData = await this.dataSetVersionService.dataSetReBalancingCalculation(
      taskIdList,
      videoDetails.splitPercentage,
      totalCount[0].count,
      SplitType.INITIAL
    )

    //create the splitVideo and task as 3 arrays for save in dataSet version
    let tempSplitVideoArray: {
      type: number,
      videoArray: {
        _id: string,
        clipName: string,
        videoName: string,
        taskCount: number,
        selectTaskCount: number
      }[]
    }[] = []
    for (let obj of splitVideoData.taskIdArray) {
      let tempVideoArray: {
        _id: string,
        clipName: string,
        videoName: string,
        taskCount: number,
        selectTaskCount: number
      }[] = []
      for (let taskIdArray of obj.idArray) {
        let isInclude = false
        for (let i in tempVideoArray) {
          if ((tempVideoArray[i]._id).toString() == (taskIdArray._id).toString()) {
            tempVideoArray[i].selectTaskCount += 1
            isInclude = true
          }
        }
        if (!isInclude) {
          let videoNameList = taskIdArray.sourceFilePath.split('/')
          let videoName = videoNameList[videoNameList.length - 1]
          tempVideoArray.push({
            _id: taskIdArray._id,
            clipName: taskIdArray.clipName,
            videoName: videoName,
            taskCount: taskIdArray.taskCount,
            selectTaskCount: 1
          })
        }

      }
      tempSplitVideoArray.push({
        type: obj.type,
        videoArray: tempVideoArray
      })

    }

    //create function for random dataSet version
    return await this.dataSetVersionService.randomOrManualSplitDataSet(
      splitVideoData.taskIdArray,
      splitVideoData.splitCount, dataSetId, InitialDataSetType.RANDOM, tempSplitVideoArray
    );

  }







  /**
   * Use for split the dataSet to manually
   * @param dataSetId {string} id of the dataSet
   * @param taskIdArray task id array
   * @returns data set version details
   */
  @post('/api/dataSet/splitData/manual/{dataSetId}/create')
  async saveManualSplitData(
    @param.path.string('dataSetId') dataSetId: string,
    @requestBody() taskIdArray: {
      tasks: TaskList[];
      splitPercentage: SplitDataPercentage
    }
  ) {
    logger.debug(`dataSetVersion manual create for dataSetId: ${dataSetId}, split percentage: ${taskIdArray.splitPercentage} initiated`)
    let splitPercentageNullCount: number = 0
    // let splitPercentageNullCount: number = 0

    for (const [key, value] of Object.entries(taskIdArray.splitPercentage)) {
      if (value == 0) splitPercentageNullCount += 1;
    }

    if (splitPercentageNullCount == DataSet.DATASET_TYPES) return {result: AnnotationUserMessages.NO_TASKS_IN_DATASET};

    /**
     * break down only selected videos and tasks in to data set types
     */
    let _taskIdArray = await this.dataSetVersionService.breakDownVideosToTasks(taskIdArray.tasks);

    /**
     * divide all selected tasks in to relevant data set type
     */
    let splitCount = await this.dataSetVersionService.calculateSplitCount(_taskIdArray, taskIdArray.splitPercentage)

    /**
     * break down videos and selected task counts
     */
    // let videoTask = await this.dataSetVersionService.breakDownTasksOfVideo(taskIdArray.tasks);

    /**
     * method to save random or manual data split
     */
    ////////////////////

    /////////////////////
    return await this.dataSetVersionService.randomOrManualSplitDataSet(_taskIdArray, splitCount, dataSetId, InitialDataSetType.MANUAL, taskIdArray.tasks);
  }





  /**
     * Get task list with object count
     * @param videoIdList user selected video list array
     * @returns task list with object count
     */
  @post('/api/dataSet/manual/taskAndObjectList')
  async getTaskListAndObjectCount(
    @requestBody() videoList: {
      videoId: string[]
    }
  ) {
    logger.debug(`get task and object list`)
    return await this.annotationContentUploadRepository.getTaskListWithObjectsCount(videoList.videoId);
  }





  /**
 * Get video tasks list and object count
 * @param videoId {string} video id
 * @returns video tasks list and object count
 */
  @get('api/dataSet/manual/VideoTaskList/{videoId}')
  async getTskOfVideo(
    @param.path.string("videoId") videoId: string,
    @param.query.number("dataSetType") dataSetType?: number,
    @param.query.string("dataSetVersionId") dataSetVersionId?: string,
  ) {

    /**
     * when data set version edit
     */
    if (dataSetType && dataSetVersionId) {

      /**
       * get whether all tasks are selected and selected tasks list
       */
      let response = await this.annotationDatasetVersionRepository
        .getTaskListSavedInDataSetVersion(videoId, dataSetVersionId, dataSetType);

      if (!response.allTasksSelected) return response.taskList;

      /**
       * get all tasks(qa verified and completed) of a video
       */
      else return await this.annotationTaskRepository.TaskListOfVideo(videoId);
    }

    /**
       * get all tasks(qa verified and completed) of a video
       */
    else if (videoId) return await this.annotationTaskRepository.TaskListOfVideo(videoId);
  }








  /**
   * Use for handle API request for getting data set list
   * @returns list of data set details
   */
  @get('/api/dataSet/list')
  async getDataSetList(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
  ) {
    //get the current logged user
    const userId = currentUserProfile[securityId];
    let user = await this.userRepo.findById(userId);

    let dataSetList

    /**
     * If user has team filter teams dataSets
     */
    if (user.teamId) dataSetList = await this.annotationDataSetRepository.getDataSetList(user.teamId)
    else dataSetList = await this.annotationDataSetRepository.getDataSetList()


    //create the return dataSet and Version object list
    let returnList: {
      id: string,
      name?: string,
      createdAt?: Date,
      versionList: AnnotationDatasetVersion[]
    }[] = []
    //dataSet loop
    for (let index in dataSetList) {


      let versionList = await this.annotationDatasetVersionRepository.find({
        where: {
          dataSetGroupId: dataSetList[index].id
        },
        fields: {
          versionId: true,
          createdAt: true,
          createdBy: true,
          statsSummary: true,
          versionNo: true,
          imageCount: true,
          size: true,
          projects: true
        },
        order: ['versionNo DESC']
      })

      //dataSet version loop
      let versionListTemp: any[] = []

      for (let obj of versionList) {
        let day = obj.createdAt?.getDate()
        let month = MONTHS[obj.createdAt!.getMonth()]
        let year = obj.createdAt?.getFullYear()


        let size = await this.fileSizeRelatedService.calculateFileSize(obj.size, 0)

        let versionDetails;
        //dataSet detail string creation
        if (obj.imageCount > 0) versionDetails = `${day} ${month} ${year}, ${obj.imageCount ?? 0} Images - ${size ?? '0MB'}`;
        else versionDetails = `${day} ${month} ${year}`;


        versionListTemp.push({
          versionId: obj.versionId,
          createdAt: obj.createdAt,
          createdBy: obj.createdBy,
          statsSummary: obj.statsSummary,
          versionNo: obj.versionNo,
          versionDetails: versionDetails
        })
      }

      let tempObjDataSetGroup = {
        id: dataSetList[index].id,
        name: dataSetList[index].name,
        createdAt: dataSetList[index].createdAt,
        versionList: versionListTemp
      }
      returnList.push(tempObjDataSetGroup)
    }
    return returnList
  }





  /**
   * Use for handle th editing API of the dataset
   * @param dataSetId {string} id of the dataSet
   * @param editObj {object} new details for edit
   * @returns result of editing
   */
  @post('/api/dataSet/edit/{dataSetId}')
  async editDataSetMeta(
    @param.path.string("dataSetId") dataSetId: string,
    @requestBody() editObj: {
      dataSetName: string
    }
  ) {
    logger.debug(`dataSe edit for dataSetId: ${dataSetId}, new dataSetNAme: ${editObj.dataSetName} initiated`)
    try {
      let dataSetDetails = await this.annotationDataSetRepository.findById(dataSetId)
      dataSetDetails.name = editObj.dataSetName
      await this.annotationDataSetRepository.updateById(dataSetId, {
        name: editObj.dataSetName,
        groupName: editObj.dataSetName
      })
      return {success: true}
    } catch (error) {
      logger.error('data set version created failed with ', error)
      return {success: false}
    }
  }







  /**
   * Use for handle th deleting API of the dataset
   * @param dataSetId {string} id of the dataSet
   * @param editObj {object} new details for delete
   * @returns result of deleting
   */
  @post('/api/dataSet/delete/{dataSetId}')
  async deleteDataSetMeta(
    @param.path.string("dataSetId") dataSetId: string,
    @requestBody() editObj: {
      dataSetName: string
    }
  ) {
    logger.debug(`dataSe delete for dataSetId: ${dataSetId}, new dataSetNAme: ${editObj.dataSetName} initiated`)
    //delete the dataSet version
    return this.annotationDataSetRepository.deleteDataSetMeta(editObj.dataSetName, dataSetId)
  }





  /**
   * Use for handle the dataSet stats get API
   * @param dataSetId {string} id of the dataSet
   * @returns dataSet stat object
   */
  @get('api/dataSet/overview/stats/{dataSetVersionId}')
  async getDataSetOverViewStats(
    @param.path.string("dataSetVersionId") dataSetVersionId: string
  ) {
    //Call and return Data Set Group Over View Stats
    return this.annotationDatasetVersionRepository.getDataSetOverViewStats(dataSetVersionId)
  }






  /**
   * Use for handle the dataSet labels get API
   * @param dataSetId {string} id of the dataSet
   * @returns list of the dataSet labels objects
   */
  @get('api/dataSet/labels/{dataSetVersionId}')
  async getLabelList(
    @param.path.string("dataSetVersionId") dataSetVersionId: string
  ) {
    return this.annotationDatasetVersionRepository.getLabelList(dataSetVersionId)
  }





  /**
   * Use for test the image s3url working or not
   * @param taskId {string} id of the task
   * @param frameId {string} id of the frame
   * @returns image s3url
   */
  @get('api/task/frameImage/s3Url')
  async getImageUrl(
    @param.query.string("key") key: string,
  ) {
    return await this.awsCloudService.generateAWSVideoUrl(key);
  }





  /**
   * Filter data grid
   * @param dataSetVersionId {string}data set version Id
   * @param filterObj It contains page index,size, search key and label object
   * @returns
   */
  @post('/api/dataSet/dataGrid/filter/{dataSetVersionId}')
  async filterDataGrid(
    @param.path.string("dataSetVersionId") dataSetVersionId: string,
    @requestBody() filterObj: {
      pageIndex: number;
      pageSize: number;
      searchKey: string;
      split: number[];
      labelObj: LabelObj[];
    }
  ) {

    let taskList = ((await this.annotationDatasetVersionRepository.findById(dataSetVersionId)).taskList);

    if (taskList != undefined) {
      let filterImage = await this.annotationFrameRepository.filterDataGrid(
        filterObj.pageIndex,
        filterObj.pageSize,
        filterObj.searchKey,
        filterObj.labelObj, taskList, filterObj.split, dataSetVersionId);
      return filterImage;
    } else return;
  }






  /**
   * Use for get the labels of the dataset for dataGrid query images
   * @param dataSetId {string} id of the data set
   * @returns labels of the dataset
   */
  @get('/api/dataSet/dataGrid/labels/{dataSetVersionId}')
  async dataGridLabels(
    @param.path.string("dataSetVersionId") dataSetVersionId: string,) {
    const result = await this.annotationDatasetVersionRepository.findOne({
      where: {versionId: dataSetVersionId},
      fields: {
        gridClassAttributes: true
      }
    })
    if (result) return result.gridClassAttributes
    else {success: false}
  }






  /**
   * Download augmentation thumbnails
   * @param folderName  {string} mage level thumbnail or bounding box level thumbnail
   * @param imageName {string} saved name
   * @param response download the image
   * @returns
   */
  @get('/api/dataSet/{folderName}/{imageName}')
  @oas.response.file()
  downloadFile(
    @param.path.string('folderName') folderName: string,
    @param.path.string('imageName') imageName: string,
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ) {

    let fileName = `${folderName}/${imageName}`;
    const imagePath = path.join(URL, fileName);
    response.download(imagePath, fileName);
    return response;
  }






  /**
   * get augmentation list
   * @returns list of augmentation type
   */
  @get('/api/dataSet/augmentationList')
  async augmentationTypeList(
  ) {
    return await this.masterDataRepository.augmentationTypeList();
  }





  /**
   * get tasks details
   * @param dataSetId {string} dataSet group Id
   * @returns task frame Count and objects
   */
  @get('api/dataSet/manual/{dataSetId}/taskAndObjectList')
  async tasksOfDataSet(
    @param.path.string('dataSetId') dataSetId?: string,
    @param.query.string('dataSetVersionId') dataSetVersionId?: string,
  ) {

    let projectList: any[] = [];
    let previousVideoList: any[] = [];
    let dataSetType: InitialDataSetType;
    /**
     * when data set version editing
     */
    if (dataSetVersionId) {
      let dataSetVersionDetail = await this.annotationDatasetVersionRepository.findById(dataSetVersionId);
      dataSetType = dataSetVersionDetail.creationType;
      projectList = [...dataSetVersionDetail.projects!];

      /**
       * add already selected videos into an array
       */
      for (let videoType of dataSetVersionDetail.splitVideoArray) {
        for (let video of videoType.videoArray) {
          if (!previousVideoList.includes(video._id.toString())) previousVideoList.push(video._id.toString());
        }
      }

    }

    else if (dataSetId) {
      let dataSet = await this.annotationDataSetRepository.findById(dataSetId);
      projectList = [...dataSet.projects!]
    }

    //convert id list to object is list
    let projectIdList = projectList.map((id: any) => new ObjectId(id));

    let params = [
      {$match: {"projectId": {$in: projectIdList}}},
      {$lookup: {from: 'AnnotationTask', localField: '_id', foreignField: 'uploadId', as: 'tasks'}},
      {$unwind: "$tasks"},
      {$match: {"tasks.status": {$in: [StatusOfTask.qaCompleted, StatusOfTask.ACCEPTED]}}},

      {
        '$group': {
          _id: '$_id',
          taskCount: {$sum: 1},
          objectCount: {$sum: "$tasks.labelCounts.totalCount"},
          "sourceFilePath": {
            "$first": "$sourceFilePath"
          },
        }
      },
      {$sort: {_id: 1}},
      {
        $project: {
          taskCount: 1, sourceFilePath: 1, "tasks._id": 1, objectCount: 1
        }
      },
    ]

    let videoDetails = await this.annotationContentUploadRepository.aggregate(params);
    let returnList = []

    for (let obj of videoDetails) {
      let videoNameList = obj.sourceFilePath.split('/')
      let videoName = videoNameList[videoNameList.length - 1]
      let tempObj = {
        _id: obj._id,
        videoName: videoName,
        taskCount: obj.taskCount,
        selectTaskCount: obj.taskCount,
        selected: true,
        objectCount: obj.objectCount
      }

      /**
       * check whether if video is selected
       */
      if (dataSetVersionId && !previousVideoList.includes(obj._id.toString())) {
        if (dataSetType! == InitialDataSetType.MANUAL) {
          tempObj.selected = false;
          returnList.push(tempObj);
        }
      }
      if (!dataSetVersionId) returnList.push(tempObj);
      if (dataSetVersionId) {
        if (dataSetType! == InitialDataSetType.RANDOM) returnList.push(tempObj);

      }
    }
    return returnList
  }
}

export enum DataSet {
  DATASET_TYPES = 3,
}

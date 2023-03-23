/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 * controller class that use handle the request-response lifecycle for API for the AnnotationDataSetVersionController model
 */

/**
 * @class annotationDataSetVersion controller
 * Handle the request related to the annotation data set version
 * @description this controller is use for handle the dataSet version related requests eg: dataSetVersion create edit delete
 * and version creating progress, dataSet version rebalanced for random
 * @author chathushka, isuru, chamath
 */

import {authenticate} from '@loopback/authentication';
import {inject, service} from '@loopback/core';
import {repository} from '@loopback/repository';
import {get, HttpErrors, param, post, requestBody} from '@loopback/rest';
import {SecurityBindings, securityId, UserProfile} from '@loopback/security';
import {ObjectId} from 'mongodb';
import path from 'path';
import {logger} from '../config';
import {Augmentations, InitialDataSetType, StatusOfTask, TaskList} from '../models';
import {DataSetStat} from '../models/annotation-data-set-group.model';
import {
  AnnotationContentUploadRepository,
  AnnotationDataSetRepository,
  AnnotationDatasetVersionRepository,
  AnnotationFrameRepository,
  AnnotationProjectRepository,
  AnnotationTaskRepository,
  AnnotationUserRepository,
  SplitDataPercentage
} from '../repositories';
import {AwsCloudService, AWS_CLOUD_SERVICE} from '../services/aws-cloud.service';
import {
  DataSetVersionService, SplitType,
  TaskArray,
  VersionKey
} from '../services/data-set-version.service';
import {AnnotationUserMessages} from '../settings/annotation.user.messages';
import {DataSet} from './annotation-data-set.controller';

const BASE_PATH = 'api/datasetVersion';
const IMAGE_URL = path.resolve(__dirname, '../../imagePreview');



@authenticate('jwt')
export class AnnotationDatasetVersionController {
  constructor(
    @repository(AnnotationDatasetVersionRepository)
    private datasetVersionRepository: AnnotationDatasetVersionRepository,
    @service(DataSetVersionService)
    public dataSetVersionService: DataSetVersionService,
    @repository(AnnotationFrameRepository)
    private frameRepository: AnnotationFrameRepository,
    @repository(AnnotationContentUploadRepository)
    public annotationContentUploadRepository: AnnotationContentUploadRepository,
    @repository(AnnotationDataSetRepository)
    public annotationDataSetRepository: AnnotationDataSetRepository,
    @inject(AWS_CLOUD_SERVICE)
    private awsCloudService: AwsCloudService,
    @repository(AnnotationUserRepository)
    private userRepo: AnnotationUserRepository,
    @repository(AnnotationProjectRepository)
    public annotationProjectRepository: AnnotationProjectRepository,
    @repository(AnnotationTaskRepository)
    public annotationTaskRepository: AnnotationTaskRepository,
  ) { }


  /**
   * test
   * use for get data of all frames for given version
   * @param groupName, versionNo
   * @returns list of frames
   */
  @get(BASE_PATH + '/getVersionData/{groupName}/{versionNo}')
  async getGroupVersionDataset(
    @param.path.string('groupName') groupName: string,
    @param.path.string('versionNo') versionNo: string,
    @param.query.string('pageNo') pageNo: number,
    @param.query.string('pageSize') pageSize: number,
  ) {
    console.log(
      `get version dataset request for groupName: ${groupName}, versionNo: ${versionNo}`,
    );
    return this.datasetVersionRepository.getDatasetVersion(
      groupName,
      pageNo,
      pageSize,
      versionNo,
    );
  }







  //if only groupName is given
  @get(BASE_PATH + '/getVersionData/{groupName}')
  async getGroupDataset(
    @param.path.string('groupName') groupName: string,
    @param.query.string('pageNo') pageNo: number,
    @param.query.string('pageSize') pageSize: number,
  ) {
    console.log(`get latest dataset request for groupName: ${groupName}`);
    return this.datasetVersionRepository.getDatasetVersion(
      groupName,
      pageNo,
      pageSize,
    );
  }









  /**
   * Use for crate new version of when label changes
   * @param versionId {string} Base version Id
   * @param labelList {Object[]} new label list
   * @returns success or fail massage
   */
  @post('/api/dataSet/labels/update/{versionId}')
  async updateLabel(
    @param.path.string('versionId') versionId: string,
    @param.query.boolean('newVersion') newVersion: boolean,
    @requestBody() labelAttributeList: DataSetStat[],
  ) {
    logger.debug(`dataSetVersion label edit for dataSetVersionId: ${versionId}, newVersion: ${newVersion} initiated`)

    try {
      let _versionId;
      if (newVersion) {
        _versionId = await this.dataSetVersionService.createDataSetVersion(versionId, VersionKey.LABEL, labelAttributeList)
      }

      else {
        await this.dataSetVersionService.updateDataSetVersion(versionId, VersionKey.LABEL, labelAttributeList);
        _versionId = versionId;
      }
      return {
        success: true,
        versionId: _versionId
      }
    } catch (error) {
      logger.debug('version created failed with error: ', error);
      return {success: false};
    }
  }









  /**
   * Save augmentation list in new version
   * @param versionId {string} data set version id
   * @param augmentationSettings augmentation settings
   */
  @post('/api/dataSet/augmentationListSave/{versionId}')
  async saveAugmentation(
    @param.path.string('versionId') versionId: string,
    @requestBody()
    augmentationSettings: {
      selectedAugmentations: {
        BOUNDING_BOX_LEVEL: Augmentations[];
        IMAGE_LEVEL: Augmentations[];
      };
    },
  ) {
    try {
      logger.debug('save augmentation list', versionId);
      logger.debug(`augmentations`, augmentationSettings.selectedAugmentations);

      let _versionId = await this.dataSetVersionService.createDataSetVersion(versionId, VersionKey.AUGMENTATION, augmentationSettings.selectedAugmentations);
      return {
        success: true,
        versionId: _versionId
      }
    } catch (error) {
      logger.error('failed to save augmentation list', error);
      return {success: false};
    }
  }








  /**
   * Delete augmentation of data set version
   * @param versionId {string} data set version id
   * @param augmentationId {string} augmentation id
   * @returns success or fail massage
   */
  @post('/api/dataSet/deleteAugmentations/{versionId}')
  async deleteAugmentation(
    @param.path.string('versionId') versionId: string,
    @param.query.string('augmentationId') augmentationId: string,
  ) {
    try {
      logger.debug(`augmentation delete, version Id ${versionId} augmentation Id ${augmentationId}`)
      await this.datasetVersionRepository.deleteAugmentation(
        versionId,
        augmentationId,
      );
      return {success: true};
    } catch (error) {
      logger.error('failed to delete augmentation list', error);
      return {success: false};
    }
  }








  /**
   * get enable augmentation list relevant to the version
   * @param versionId {string} data set version id
   * @param pageIndex {number} page number
   * @param pageSize  {number} size of the page
   */
  @get('/api/dataSet/enableAugmentations/{versionId}')
  async enableAugmentations(
    @param.path.string('versionId') versionId: string,
    @param.query.number('pageIndex') pageIndex: number,
    @param.query.number('pageSize') pageSize: number,
  ) {
    return await this.datasetVersionRepository.getEnabledAugmentationList(
      versionId,
      pageIndex,
      pageSize,
    );
  }






  /**
   * update augmentation settings of an existing version
   * @param versionId {string} data set version id
   * @param augmentationSettings augmentation settings
   * @returns {boolean} success
   */
  @post('/api/dataSet/updateAugmentation/{versionId}')
  async updateAugmentation(
    @param.path.string('versionId') versionId: string,
    @requestBody()
    augmentationSettings: {
      selectedAugmentations: {
        BOUNDING_BOX_LEVEL: Augmentations[];
        IMAGE_LEVEL: Augmentations[];
      };
    },
  ) {
    try {
      logger.debug(`augmentation update version Id: ${versionId}`)
      await this.dataSetVersionService.updateDataSetVersion(
        versionId,
        VersionKey.AUGMENTATION,
        augmentationSettings.selectedAugmentations,
      );
      return {success: true};
    } catch (error) {
      logger.error('failed to update augmentation list', error);
      return {success: false};
    }
  }







  /**
   * Get augmentation progress
   * @param versionId {string} data set version Id
   * @returns {number} augmentation progress
   */
  @get('/api/dataSet/augmentationProgress/{versionId}')
  async augmentationProgress(
    @param.path.string('versionId') versionId: string,
  ) {
    return await this.datasetVersionRepository.getAugmentationProgress(
      versionId,
    );
  }







  /**
   *  update split dataset stats
   * @param dataSetVersionId {string} data set version Id
   * @returns {boolean} success
   */
  @get('/api/dataSet/updateSplitDatasetStats/{dataSetVersionId}')
  async getSplitDataSetCalculation(
    @param.path.string('dataSetVersionId') dataSetVersionId: string,
  ) {
    try {
      let versionDetails = await this.datasetVersionRepository.findById(
        dataSetVersionId,
      );
      let taskList = versionDetails.taskList;
      let spiltCount = await this.frameRepository.calculateSplitDataSet(
        taskList!,
        dataSetVersionId,
      );
      this.datasetVersionRepository.updateById(dataSetVersionId, {
        splitCount: spiltCount,
      });
      return {success: true};
    } catch (error) {
      logger.error('failed to update version split data set stats', error);
      return {success: false};
    }
  }




  /**
   * Get split dataset stats related to the data set version
   * @param versionId {string} data set version Id
   * @returns data set version stat list
   */
  @get('/api/dataSet/spitDatasetStat/{versionId}')
  async splitDatasetStatsList(
    @param.path.string('versionId') versionId: string,
  ) {
    return await this.datasetVersionRepository.splitDatasetStats(versionId);
  }





  /**
   * Re balance split data set
   * @param versionId {string} data set version Id
   * @param reBalanceSettings percentage values of data sets
   * @returns {boolean} success
   */
  @post('/api/dataSet/splitDataSetReBalance/{versionId}')
  async splitDataSetReBalance(
    @param.path.string('versionId') versionId: string,
    @requestBody() reBalanceSettings: SplitDataPercentage,
  ) {
    logger.debug(`dataSetVersion splitDataSetReBalance for dataSetVersionId: ${versionId} initiated`)
    try {
      let versionDetails = await this.datasetVersionRepository.findById(
        versionId,
      );
      let splitCount = await this.dataSetVersionService.splitDataSetReBalancing(
        versionId,
        reBalanceSettings,
        versionDetails,
      );
      await this.datasetVersionRepository.updateById(versionId, {
        splitCount: splitCount,
      });
      return {success: true};
    } catch (error) {
      logger.error('failed to update version split data set stats', error);
      return {success: false};
    }
  }




  /**
   * get dataset - export tab
   * @param versionId
   * @returns list of export formats available and status, list of all export formats from masterdata
   */
  @get(BASE_PATH + '/getExportTab/{versionId}')
  async getDatasetExportTab(
    @param.path.string('versionId') versionId: string,
    @param.header.string('Authorization') auth_head: string,
  ) {
    console.log(
      `get dataset export tab list request for versionId: ${versionId}`,
    );
    let tokenData: string[] = auth_head.split(' ');
    let token = tokenData.pop();
    console.log(token);
    return await this.datasetVersionRepository.getExportFormatsList(
      versionId,
      token || '<access token here',
    );




  }

  /**
   * add dataset formats
   * @param versionId, selected formats
   * requests python server to generate selected formats
   * @returns list of export formats available and status, list of all export formats from masterdata
   */
  @post(BASE_PATH + '/generateSelectedFormats/{versionId}')
  async generateSelectedFormats(
    @param.path.string('versionId') versionId: string,
    @param.header.string('Authorization') auth_head: string,
    @requestBody() {selectedFormats}: {selectedFormats: string[]}, // @param.query.string('pageNo') pageNo: number,
  ) {
    console.log(
      `dataset export tab generate selected formats  request for versionId: ${versionId}`,
    );
    let tokenData: string[] = auth_head.split(' ');
    let token = tokenData.pop();
    console.log(token);
    return await this.datasetVersionRepository.generateDatasetFormats(
      versionId,
      selectedFormats,
      token || '<access token here',
    );


  }





  /**
   * get dataset generation status (progress)
   * @param versionId, format-unique-key
   * @returns progress
   */
  @get(BASE_PATH + '/getGenerationProgress/{versionId}/{formatId}')
  async getGenerationProgress(
    @param.path.string('versionId') versionId: string,
    @param.path.string('formatId') formatId: string,
  ) {
    console.log(
      `dataset export tab generation status request for versionId: ${versionId}, format unique name: ${formatId}`,
    );
    return await this.datasetVersionRepository.getFormatGenerationProgress(
      versionId,
      formatId,
    );


  }





  /**
   * get data grid image preview details
   * @param frameId {string} frame id
   * @returns image preview details
   */
  @get('/api/dataSet/dataGridImagePreview/{frameId}')
  async dataGridImagePreview(@param.path.string('frameId') frameId: string) {

    return await this.frameRepository.dataGridImagePreview(frameId);
  }




  /**
   * Use for edit dataSetVersion
   * @param dataSetVersionId {string} id of the dataSet
   * @param projectList {number} list of projects in dataSet version
   * returns
   */
  @post('/api/dataSet/{dataSetVersionId}/initialEdit')
  async updateProjectList(
    @param.path.string('dataSetVersionId') dataSetVersionId: string,
    @param.query.boolean('newVersion') newVersion: boolean,
    @requestBody()
    projectList: {
      projects: string[];
    },
  ) {
    let _dataSetVersionId: string;

    logger.info(`data set version Id `, dataSetVersionId);
    logger.info(`new version require `, newVersion);

    try {
      if (!newVersion) {
        _dataSetVersionId = dataSetVersionId;

        /**
         * update project list of existing data set version
         */
        await this.datasetVersionRepository.updateById(dataSetVersionId, {
          projects: projectList.projects,
        });

        /**
       * update project list of data set group
       */
        await this.dataSetVersionService.updateProjectListOfDataset(dataSetVersionId);
      }
      else {

        /**
         * create new version and update project list of a dataset group
         */
        let response = await this.dataSetVersionService.createdDatasetVersionInEditing(dataSetVersionId, projectList.projects);

        /**
        * update project list of data set group
       */
        await this.dataSetVersionService.updateProjectListOfDataset(dataSetVersionId);

        _dataSetVersionId = response.dataSetVersionId;
      }
      return {
        isSuccess: true,
        versionId: _dataSetVersionId,
      };
    } catch (err) {
      logger.debug("error in initial dataset version edit ", err);
      return {
        isSuccess: false
      }
    }

  }





  /**
   * Use for split the dataSet to randomly
   * @param dataSetId {string} id of the dataSet
   * @param videoDetails {number} split type random = 1 and manual = 2
   * returns
   */
  @post('/api/dataSet/random/{dataVersionId}/edit')
  async randomDataSetEdit(
    @param.query.boolean('newVersion') newVersion: boolean,
    @param.path.string('dataVersionId') dataVersionId: string,
    @requestBody()
    videoDetails: {
      videoList: {
        _id: string,
        selected: boolean,
        videoName: string,
        taskCount: number,
        selectTaskCount: number
      }[];
      splitPercentage: SplitDataPercentage;
    },
  ) {
    logger.debug(`dataSetVersion random edit for dataSetVersionId: ${dataVersionId}, newVersion: ${newVersion} initiated`)
    //convert id list to object is list
    let videoIdList = videoDetails.videoList.map(obj => {
      if (obj.selected) return new ObjectId(obj._id)
    });

    logger.debug(videoIdList);
    let params = [
      {$match: {_id: {$in: videoIdList}}},
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
          'tasks._id': 1,
          'tasks.labelCounts.totalCount': 1,
          'tasks.frameCount': 1,
          clipName: 1,
          sourceFilePath: 1,
          taskCount: 1,
        },
      },

    ];

    let paramsForCount = [
      {$match: {_id: {$in: videoIdList}}},
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
      {$project: {'tasks._id': 1, 'tasks.labelCounts.totalCount': 1}},
      {$group: {_id: null, count: {$sum: '$tasks.labelCounts.totalCount'}}},
    ];



    /**
     * Check for taskList and total count of the objects in dataSet. If they are zero throw error
     */
    let taskIdList: TaskArray[] =
      await this.annotationContentUploadRepository.aggregate(params);
    let totalCount = await this.annotationContentUploadRepository.aggregate(
      paramsForCount,
    );

    if (taskIdList.length == 0) throw new HttpErrors.NotAcceptable(AnnotationUserMessages.DATASET_TASK_COUNT_ZERO)


    //split the video and task to given percentages
    let splitVideoData =
      await this.dataSetVersionService.dataSetReBalancingCalculation(
        taskIdList,
        videoDetails.splitPercentage,
        totalCount[0].count,
        SplitType.INITIAL,
      );

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

    return await this.dataSetVersionService.randomOrManualSplitDataEdit(
      splitVideoData.taskIdArray,
      splitVideoData.splitCount,
      dataVersionId,
      InitialDataSetType.RANDOM,
      newVersion,
      tempSplitVideoArray
    );
  }






  /**
   * Use for split the dataSet to manually
   * @param dataSetId {string} id of the dataSet
   * @param taskIdArray task id array
   * @returns data set version details
   */
  @post('/api/dataSet/manual/{dataVersionId}/edit')
  async saveManualSplitData(
    @param.query.boolean('newVersion') newVersion: boolean,
    @param.path.string('dataVersionId') dataVersionId: string,
    @requestBody()
    taskIdArray: {
      tasks: TaskList[];
      splitPercentage: SplitDataPercentage

    },
  ) {
    logger.debug(`dataSetVersion manual edit for dataSetVersionId: ${dataVersionId}, newVersion: ${newVersion} initiated`);
    let splitPercentageNullCount: number = 0

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
    let splitCount = await this.dataSetVersionService.calculateSplitCount(_taskIdArray, taskIdArray.splitPercentage);

    /**
     * method to edit random or manual data split
     */
    return await this.dataSetVersionService.randomOrManualSplitDataEdit(
      _taskIdArray,
      splitCount,
      dataVersionId,
      InitialDataSetType.MANUAL,
      newVersion,
      taskIdArray.tasks
    );
  }







  /**
   * Use for send the progress of dataSet Version creation
   * @param projectId {string} versionId of the dataSet
   * @returns progress of the dataSet Version creation
   */
  @get('/api/dataSet/createProgress/{versionId}')
  async getContentsProcessProgress(
    @param.path.string('versionId') versionId: string,
  ) {
    let dataSetVersion = await this.datasetVersionRepository.findOne({
      where: {versionId: versionId},
      fields: {
        isPending: true,
        versionType: true
      }
    })

    let param = [
      {$match: {_id: new ObjectId(versionId)}},
      {$unwind: "$taskStatus.tasks"},
      {$group: {_id: "$taskStatus.tasks.state", count: {$sum: 1}}}
    ]
    let taskDetailsArray: {
      _id: string,
      count: number
    }[] = await this.datasetVersionRepository.aggregate(param);

    if (taskDetailsArray.length == 0) {
      return {
        progress: 0,
        isError: false,
        errorMessage: '',
        isPending: true,
        type: dataSetVersion?.versionType
      }
    }

    let totalTaskCount = 0;
    let completedTaskCount = 0;
    for (let obj of taskDetailsArray) {
      if (obj._id == DataSetTaskStatus.Completed) completedTaskCount += obj.count;
      totalTaskCount += obj.count
    }

    let progress = Math.ceil(completedTaskCount / totalTaskCount * 100)

    let isPending = dataSetVersion!.isPending
    if (progress == 100) isPending = false
    this.datasetVersionRepository.updateById(versionId, {isPending: isPending})

    return {
      progress: progress,
      isError: false,
      errorMessage: '',
      isPending: isPending,
      type: dataSetVersion?.versionType
    }

  }




  /**
   * Use for delete the version of dataSet
   * @param versionId {string} id of the dataSet version
   * @returns {success: boolean}
   */
  @get('/api/dataSet/version/{versionId}/delete')
  async deleteVersion(
    @param.path.string("versionId") versionId: string,
  ) {
    try {
      logger.debug(`version Id to be deleted `, versionId);
      let response = await this.datasetVersionRepository.deleteDataSetVersion(versionId);

      /**
       * remove data set version details from frame
       */
      this.frameRepository.removeDataSetVersionsFromFrame(versionId);

      /**
       * remove data set version details from data set group
       */
      this.annotationDataSetRepository.removeDataSetVersionsFromDataSetGroup(versionId);

      /**
       * remove data set version details from tasks
       */
      this.annotationTaskRepository.removeDataSetVersionsFromTask(versionId);

      if (response.success && response.deleteDataSetGroup) {

        await this.annotationDataSetRepository.deleteById(response.dataSetGroupId);

      }

      return {success: true}
    } catch (error) {
      logger.debug('Delete failed for version id: ', versionId, 'error: ', error)
      return {success: false}
    }

  }








  /**
   * Use for send the progress of dataSet Version creation
   * @param projectId {string} versionId of the dataSet
   * @returns progress of the dataSet Version creation
   */
  @get('/api/dataSet/createProgressAugmentation/{versionId}')
  async createProgressAugmentation(
    @param.path.string('versionId') versionId: string,
  ) {
    let dataSetVersion = await this.datasetVersionRepository.findOne({
      where: {versionId: versionId},
      fields: {
        isPending: true,
        versionType: true
      }
    })

    let param = [
      {$match: {_id: new ObjectId(versionId)}},
      {$unwind: "$taskStatus.tasks"},
      {$group: {_id: "$taskStatus.tasks.state", count: {$sum: 1}}}
    ]
    let taskDetailsArray: {
      _id: string,
      count: number
    }[] = await this.datasetVersionRepository.aggregate(param);
    logger.debug(taskDetailsArray)
    if (taskDetailsArray.length == 0) {
      return {
        progress: 0,
        isError: false,
        errorMessage: '',
        isPending: true,
        type: dataSetVersion?.versionType
      }
    }

    let totalTaskCount = 0;
    let completedTaskCount = 0;
    for (let obj of taskDetailsArray) {
      if (obj._id == DataSetTaskStatus.Completed) completedTaskCount += obj.count;
      totalTaskCount += obj.count
    }

    let progress = Math.ceil(completedTaskCount / totalTaskCount * 100)

    let isPending = dataSetVersion!.isPending
    if (progress == 100) isPending = false
    this.datasetVersionRepository.updateById(versionId, {isPending: isPending})

    return {
      progress: progress,
      isError: false,
      errorMessage: '',
      isPending: isPending,
      type: dataSetVersion?.versionType
    }

  }






  /**
   * get version details when editing the version
   * @param versionId {string} data set version id
   * @param currentUserProfile user details
   * @returns data set group name and projects
   */
  @get('/api/dataSetVersion/versionEditDetails/{versionId}')
  async dataSetVersionEditDetail(
    @param.path.string("versionId") versionId: string,
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
  ) {
    const userId = currentUserProfile[securityId];
    let user = await this.userRepo.findById(userId);
    let teamId = user.teamId?.toString();
    let projectDetails: any;
    let param: any[] = [
      {$match: {_id: new ObjectId(versionId)}},
      {$lookup: {from: 'AnnotationDataSetGroup', localField: 'dataSetGroupId', foreignField: '_id', as: 'dataSetGroup'}},
      {
        $addFields: {
          dataSet: {
            $arrayElemAt: ['$dataSetGroup', 0]
          }
        }
      },
      {$project: {projects: 1, "dataSet.name": 1, "creationType": 1}}
    ]
    let dataSetVersionDetail: DataSetVersionDetail = (await this.datasetVersionRepository.aggregate(param)).pop();

    if (dataSetVersionDetail) {
      let usedProjects = dataSetVersionDetail.projects;

      if (teamId !== undefined) {
        projectDetails = await this.annotationProjectRepository.userProjectList(usedProjects, teamId);
      }
      else projectDetails = await this.annotationProjectRepository.userProjectList(usedProjects);

      return {
        _id: dataSetVersionDetail._id,
        creationType: dataSetVersionDetail.creationType,
        dataSetName: dataSetVersionDetail.dataSet.name || "",
        projects: projectDetails
      };
    }
    else return;

  }



  /**
   *  Get data set version details when editing
   * @param versionId {string} data set version Id
   * @returns data set version details
  */
  @get('/api/dataSetVersion/showVersionSplitStat/{versionId}')
  async showVersionSplitStat(
    @param.path.string("versionId") versionId: string,
  ) {

    /**
     * ger data set version details(dataset type, video list etc.)
     */
    return await this.datasetVersionRepository.getVersionDetailInEdit(versionId);
  }
}

export enum DataSetTaskStatus {
  Completed = "complete",
  Pending = "pending"
}

export interface DataSetVersionDetail {
  _id: string;
  projects: any[];
  dataSet: {
    name: string;
  }
  creationType: InitialDataSetType;
}

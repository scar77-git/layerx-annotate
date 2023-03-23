/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 *service to handle data set versions related functions(eg:create & update data set versions, data set re balancing)
 */

/**
 * @class DataSetVersionService
 * purpose of DataSetVersionService for handle the dataSet related calculation and functions
 * @description DataSetVersionService for handle the dataSet related calculation and functions
 * @author chathushka, chamath
 */
import { /* inject, */ BindingScope, inject, injectable} from '@loopback/core';
import {repository} from '@loopback/repository';
import {ObjectId} from 'mongodb';
import {logger} from '../config';
import {AnnotationData, AnnotationDatasetVersion, InitialDataSetType, SplitCount, StatusOfTask, TaskList, VersionType} from '../models';
import {AnnotationDataSetRepository, AnnotationFrameRepository, AnnotationTaskRepository, SplitDataPercentage} from '../repositories';
import {AnnotationDatasetVersionRepository} from '../repositories/annotation-dataset-version.repository';
import {frameIdArrayLimit as taskIdArrayLimit} from '../settings/constants';
import {PythonRequestService, PYTHON_REQUEST_SERVICE} from './python-request.service';

@injectable({scope: BindingScope.TRANSIENT})
export class DataSetVersionService {
  constructor(
    @repository(AnnotationDatasetVersionRepository)
    private annotationDatasetVersionRepository: AnnotationDatasetVersionRepository,
    @repository(AnnotationDataSetRepository)
    public annotationDataSetRepository: AnnotationDataSetRepository,
    @repository(AnnotationTaskRepository)
    public annotationTaskRepository: AnnotationTaskRepository,
    @repository(AnnotationFrameRepository)
    private annotationFrameRepository: AnnotationFrameRepository,
    @inject(PYTHON_REQUEST_SERVICE)
    private pythonRequest: PythonRequestService,
  ) { }

  /**
   * update frame and tasks after re balancing split data sets
   * @param versionId{string} data set version id
   * @param splitPercentage {object} training set,validation set and testing set percentages
   * @param versionDetails data set version details
   * @returns split data set stats
   */
  async splitDataSetReBalancing(versionId: string, splitPercentage: SplitDataPercentage, versionDetails: AnnotationDatasetVersion) {
    let param: any[] = [];
    let totalObject: number = 0;

    if (!versionDetails.splitCount) return;


    param = [{
      $match: {"datasetVersions.versionId": new ObjectId(versionId)}
    },
    {$addFields: {objectsCount: "$labelCounts.totalCount"}},
    {$project: {"_id": 1, "objectsCount": 1, "frameCount": 1}}];


    let tasks: TaskArray[] = await this.annotationTaskRepository.aggregate(param);
    for (let stat of tasks) {
      totalObject += stat.objectsCount;
    }

    let splitStats = await this.dataSetReBalancingCalculation(tasks, splitPercentage, totalObject, SplitType.UPDATE);

    /**
     * update frame and tasks with the data type
     */
    for (let index = 0; index < splitStats.taskIdArray.length; index++) {
      let iterations: number;
      let _taskIdArray = splitStats.taskIdArray[index].idArray;

      if (_taskIdArray.length < taskIdArrayLimit) iterations = 1;
      else iterations = Math.ceil(_taskIdArray.length / taskIdArrayLimit);

      for (let _iteration = 0; _iteration < iterations; _iteration++) {
        let type = splitStats.taskIdArray[index].type;
        let start = taskIdArrayLimit * _iteration;
        let end = start + taskIdArrayLimit;

        let subTaskIdArray = _taskIdArray.slice(start, end);

        let updateTaskParam = {
          _id: {$in: subTaskIdArray},
          "datasetVersions.versionId": new ObjectId(versionId),
        };
        let updateFrameParam = {
          taskId: {$in: subTaskIdArray},
          "datasetVersions.versionId": new ObjectId(versionId),
        };
        let data = {"datasetVersions.$.datasetType": type};

        this.annotationTaskRepository.updateMany(updateTaskParam, data);
        this.annotationFrameRepository.updateMany(updateFrameParam, data, type);
      }
    }

    return splitStats.splitCount;
  }



  /**
  * calculate data set balancing stats
  * @param taskArray tas array to be updated
  * @param splitPercentage {object} training set,validation set and testing set percentages
  * @param totalObject {number} total objects in frames
  * @param splitType {number} whether initial re balance or update
  * @returns tasks Id belongs to data sets,split stats
  */
  async dataSetReBalancingCalculation(taskArray: TaskArray[], splitPercentage: SplitDataPercentage, totalObject: number, splitType: SplitType) {
    // logger.debug(splitPercentage, totalObject)
    let taskIdArray: any[] = [];
    let splitCount: SplitCount[] = [];
    let calculatedObjectCount: number[] = [];

    //calculate the new objects count
    calculatedObjectCount.push(Math.round(totalObject * splitPercentage.trainingSetPercentage / 100));
    calculatedObjectCount.push(Math.round(totalObject * splitPercentage.validationSetPercentage / 100));
    calculatedObjectCount.push(Math.round(totalObject * splitPercentage.testingSetPercentage / 100));

    for (let iterate = 0; iterate < 3; iterate++) {
      let whileLoopCondition = true;
      let _taskIdArray: any[] = [];
      let objectCount = 0
      let previousCount = 0;
      let index = 0;
      let frameCount = 0;

      /**
       *get object count according to the calculated new object count
       */
      if (taskArray.length == 0) whileLoopCondition = false;
      while (whileLoopCondition) {
        let boxesInTask: number = 0;
        //logger.debug('task: ',taskArray[index])
        if (splitType == SplitType.UPDATE) boxesInTask = taskArray[index].objectsCount;
        if (splitType == SplitType.INITIAL) boxesInTask = taskArray[index].tasks.labelCounts.totalCount;

        previousCount = objectCount;
        objectCount += boxesInTask;

        if (objectCount > calculatedObjectCount[iterate]) {

          let positiveError = objectCount - calculatedObjectCount[iterate];
          let negativeError = calculatedObjectCount[iterate] - previousCount;

          if (positiveError < negativeError || iterate == 2) {
            if (splitType == SplitType.UPDATE) {
              _taskIdArray.push(taskArray[index]._id);
              frameCount += taskArray[index].frameCount;
            }
            if (splitType == SplitType.INITIAL) {
              _taskIdArray.push(taskArray[index]);
              frameCount += taskArray[index].tasks.frameCount;
            }
            whileLoopCondition = false;
          } else {
            objectCount = previousCount;
            whileLoopCondition = false;
          }

        } else {
          if (splitType == SplitType.UPDATE) {
            _taskIdArray.push(taskArray[index]._id);
            frameCount += taskArray[index].frameCount;
          }
          if (splitType == SplitType.INITIAL) {
            _taskIdArray.push(taskArray[index]);
            frameCount += taskArray[index].tasks.frameCount;
          }

        };

        index += 1;
        if (index == taskArray.length) whileLoopCondition = false;
      }

      splitCount.push({
        type: iterate + 1,
        imageCount: frameCount,
        objectCount: objectCount,
        percentage: Math.round(objectCount * 100 / totalObject)

      })
      taskArray = taskArray.slice(_taskIdArray.length);
      taskIdArray.push({
        type: iterate + 1,
        idArray: _taskIdArray
      });
    }

    return {
      taskIdArray: taskIdArray,
      splitCount: splitCount
    }
  }









  /**
   *  Use to create new data set version
   * @param dataSetVersionId {string} id of the dataset version
   * @param key {string} filed to be updated in data set version
   * @param value {any} value of the field
   */
  async createDataSetVersion(dataSetVersionId: string, key: VersionKey, value: any) {

    let dataSetVersionDetails = await this.annotationDatasetVersionRepository.findById(dataSetVersionId)
    let dataSetGroupId = dataSetVersionDetails.dataSetGroupId!;

    let nextVersionNo = await this.getNextVersionNo(dataSetGroupId);

    dataSetVersionDetails.versionNo = nextVersionNo;
    dataSetVersionDetails.createdAt = new Date();
    if (key && value) {
      dataSetVersionDetails[key] = value;
    }



    dataSetVersionDetails.isPending = true
    if (key == VersionKey.AUGMENTATION) dataSetVersionDetails.versionType = VersionType.AUGMENTATION
    else if (key == VersionKey.LABEL) dataSetVersionDetails.versionType = VersionType.LABEL



    //remove current data set version mongo db Id
    delete dataSetVersionDetails.versionId;
    delete dataSetVersionDetails.taskStatus;
    // logger.debug('dataset',dataSetVersionDetails.dataSetAttributeList)
    // logger.debug(JSON.stringify(value, null, 2))
    let newVersion = await this.annotationDatasetVersionRepository.create(dataSetVersionDetails);

    if (dataSetVersionDetails.dataSetGroupId) {
      let dataSetGroup = await this.annotationDataSetRepository.findById(dataSetVersionDetails.dataSetGroupId);
      if (dataSetGroup.datasetVersions) {
        dataSetGroup.datasetVersions.push(newVersion.versionId!)
      } else dataSetGroup.datasetVersions = [dataSetVersionDetails.versionId!];

      this.annotationDataSetRepository.updateById(dataSetVersionDetails.dataSetGroupId, dataSetGroup)
    }

    let newDataSetVersionId = newVersion.versionId

    this.addVersionId(newVersion, newDataSetVersionId!);
    // for (let obj of newVersion.splitTasks!) {
    //   await this.updateFrameAndTaskVersionDetails(obj.type, newDataSetVersionId!, obj.taskList)
    // }
    // this.pythonRequest.createDataSet(newDataSetVersionId!.toString());

    return newDataSetVersionId;
  }

  /**
   * add version id into frames and tasks
   * @param newVersion new version details
   * @param newDataSetVersionId {string} new version details
   */
  async addVersionId(newVersion: any, newDataSetVersionId: string) {
    for (let obj of newVersion.splitTasks!) {
      await this.updateFrameAndTaskVersionDetails(obj.type, newDataSetVersionId!, obj.taskList)
    }
    logger.debug('python request initiated version id:', newDataSetVersionId)
    await this.pythonRequest.createDataSet(newDataSetVersionId!.toString());
  }






  /**
   * Use for update the frames and task about the version details
   * @param type {number} type of the taskSet training, validating and testing vise
   * @param versionId {string} id of the version
   * @param taskList {string[]} task id list
   */
  async updateFrameAndTaskVersionDetails(type: number, versionId: string, taskList: string[]) {
    /**
     * Use for update all frames of the dataSet version
     */
    await this.updateFramesOfDataSet(type, new ObjectId(versionId), taskList)
    /**
     * Use for update all tasks of the dataSet version
     */
    await this.updateTasksOfDataSet(type, new ObjectId(versionId), taskList)
  }


  /**
    * Use for update the frames and tasks with data set type
    * @param type {number} type of the taskSet training, validating and testing vise
    * @param versionId {string} id of the version
    * @param taskList {string[]} task id list
    */
  async setFrameAndTaskVersionId(type: number, versionId: string, taskList: string[]) {
    /**
     * Use for update all frames data set type
     */
    await this.setVersionIdOfFrames(type, new ObjectId(versionId), taskList)
    /**
     * Use for update all tasks data set type
     */
    await this.setVersionIdOfTasks(type, new ObjectId(versionId), taskList)
  }















  /**
   * Use to get next version number
   * @param dataSetGroupId {string} id of the dataset group
   * @returns next version No
   */
  async getNextVersionNo(dataSetGroupId: string) {
    let dataSetVersions = await this.annotationDatasetVersionRepository.find({
      where: {dataSetGroupId: dataSetGroupId}
    })
    let dataSetVersionIdList = dataSetVersions.map(dataSetVersion => dataSetVersion.versionNo)
    let maxId = dataSetVersionIdList.reduce((a: string, b: string) => a > b ? a : b)
    let maxIdList = maxId.split('.')
    if (Number(maxIdList[2]) < 9) maxIdList[2] = String(Number(maxIdList[2]) + 1)
    else {
      maxIdList[2] = String(0)
      if (Number(maxIdList[1]) < 9) maxIdList[1] = String(Number(maxIdList[1]) + 1)
      else {
        maxIdList[1] = String(0)
        maxIdList[0] = String(Number(maxIdList[0]) + 1)
      }
    }

    let nextVersionNo = maxIdList.join('.');
    return nextVersionNo;
  }













  /**
   * Update data set version field
   * @param dataSetVersionId {string} id of the dataset version
   * @param key {string} filed to be updated in data set version
   * @param value {any} value of the field
   */
  async updateDataSetVersion(dataSetVersionId: string, key: VersionKey, value: any) {

    let updatingObj: any = {};
    updatingObj[key] = value;
    updatingObj['isPending'] = true
    if (key == VersionKey.AUGMENTATION) updatingObj.versionType = VersionType.AUGMENTATION
    else if (key == VersionKey.LABEL) updatingObj.versionType = VersionType.LABEL

    logger.debug(`dataset version Id `, dataSetVersionId)
    logger.debug(`updating object `, updatingObj);
    let params = {_id: new ObjectId(dataSetVersionId)};

    /**
     * unset task status field
     */
    await this.annotationDatasetVersionRepository.deleteFields(params, {taskStatus: ""})

    await this.annotationDatasetVersionRepository.updateById(dataSetVersionId, updatingObj);

    logger.debug('python request initiated version id:', dataSetVersionId!.toString())
    await this.pythonRequest.createDataSet(dataSetVersionId!.toString());
  }











  /**
    *  Use to save random or manual data split
    * @param taskIdArray task id array
    * @param SplitCount split count
    * @param dataSetId {string} data set group id
    * @param createDataSetType whether manual or random
    * @param splitVideoArray videos break down in to the relevant data set type
    * @returns data set version details
    */
  async randomOrManualSplitDataSet(taskIdArray: any[], SplitCount: SplitCount[], dataSetId: string, createDataSetType: InitialDataSetType, splitVideoArray?: any) {
    logger.debug('dataSet create id: ', dataSetId)

    let taskList: {
      type: number,
      taskList: string[]
    }[] = []

    if (createDataSetType == InitialDataSetType.RANDOM) {

      /**
     * Split tasks into the relevant data set type when random data set version creating
     */
      for (let typeObj of taskIdArray) {

        let tempList = typeObj.idArray.map((obj: {tasks: any;}) => obj.tasks._id)
        taskList.push({
          type: typeObj.type,
          taskList: tempList
        })
      }
    }
    if (createDataSetType == InitialDataSetType.MANUAL) {

      /**
    * Split tasks into the relevant data set type when manual data set version creating
    */
      for (let task of taskIdArray) {
        let _taskList = task.taskList.map((taskId: any) => {
          return new ObjectId(taskId);
        });
        taskList.push(
          {
            type: task.type,
            taskList: _taskList
          }
        )
      }
    }
    let dataSetGroup = await this.annotationDataSetRepository.findById(dataSetId);

    if (dataSetGroup.isInitialVersionCreated) return

    /**
     * create initial data set version
     */
    let initialVersion = await this.annotationDatasetVersionRepository.createInitialVersion(dataSetGroup, SplitCount,
      taskList, createDataSetType, undefined, splitVideoArray)

    //update the initial version created flag for remove multiple version creations
    await this.annotationDataSetRepository.updateById(dataSetId, {isInitialVersionCreated: true});

    if (initialVersion?.success && initialVersion.versionDetails) {
      for (let typeObj of taskIdArray) {
        let tempList: any[] = [];

        /**
         * Add tasks which are belonged to specific data set type into an array
         */
        if (createDataSetType == InitialDataSetType.RANDOM) tempList = typeObj.idArray.map((obj: {tasks: any;}) => obj.tasks._id);
        if (createDataSetType == InitialDataSetType.MANUAL) {
          tempList = typeObj.taskList.map((taskId: any) => {
            return new ObjectId(taskId);
          })
        }

        /**
         * add data set version details in to tasks and frames
         */
        await this.updateFrameAndTaskVersionDetails(typeObj.type, initialVersion.versionDetails!.versionId!, tempList);

      }
      try {
        logger.debug('python request initiated version id:', initialVersion.versionDetails.versionId, 'dataSet id: ', dataSetId)
        let pythonResponse = await this.pythonRequest.createDataSet(initialVersion.versionDetails.versionId!)
        logger.debug(pythonResponse)
      } catch (error) {
        logger.error('python request failed', error)
      }


    } else {
      logger.error('No project list in dataSetId: ', dataSetId)
    }

    return initialVersion

  }






  /**
   * Use for update the frames of the dataSet
   * @param type {number} type of the dataSet (testing, validation ...)
   * @param versionId {string} id od the
   * @param idArray {string}[] tasks id array for update frame
   */
  async updateFramesOfDataSet(type: number, versionId: ObjectId, idArray: string[]) {

    let iterations: number;

    /**
     * maximum tasks to be updated at once is limited by taskIdArrayLimit constant
     */
    if (idArray.length < taskIdArrayLimit) iterations = 1;
    else iterations = Math.ceil(idArray.length / taskIdArrayLimit);


    for (let _iteration = 0; _iteration < iterations; _iteration++) {
      let start = taskIdArrayLimit * _iteration;
      let end = start + taskIdArrayLimit;
      let subTaskArray = idArray.slice(start, end);

      let params = {taskId: {$in: subTaskArray}}

      /**
       * add data set version details in to  frames
       */
      await this.annotationFrameRepository.updateManyPushToList(params, {
        datasetVersions: {
          versionId: versionId,
          augmentationImages: null,
          textFiles: null,
          datasetType: type
        }
      }, type
      )

    }
  }







  /**
   * Use for update the tasks of the dataSet
   * @param type {number} type of the dataSet (testing, validation ...)
   * @param versionId {string} id od the
   * @param idArray {string}[] task id array for update tasks
   */
  async updateTasksOfDataSet(type: number, versionId: ObjectId, idArray: string[]) {

    let iterations: number;

    /**
     * maximum tasks to be updated at once is limited by taskIdArrayLimit constant
     */
    if (idArray.length < taskIdArrayLimit) iterations = 1;
    else iterations = Math.ceil(idArray.length / taskIdArrayLimit);


    for (let _iteration = 0; _iteration < iterations; _iteration++) {
      let start = taskIdArrayLimit * _iteration;
      let end = start + taskIdArrayLimit;
      let subTaskArray = idArray.slice(start, end);

      let params = {_id: {$in: subTaskArray}}

      /**
       * add data set version details in to  tasks
       */
      await this.annotationTaskRepository.updateManyPushToList(params, {
        datasetVersions: {
          versionId: versionId,
          datasetType: type
        }
      }, type
      )

    }
  }


  /**
   * update frames with data ser version type
   * @param type {number} type of the dataSet (testing, validation ...)
   * @param versionId {string} id od the
   * @param idArray {string}[] task id array for update frame
   */
  async setVersionIdOfFrames(type: number, versionId: ObjectId, idArray: string[]) {

    let iterations: number;

    /**
     * maximum tasks to be updated at once is limited by taskIdArrayLimit constant
     */
    if (idArray.length < taskIdArrayLimit) iterations = 1;
    else iterations = Math.ceil(idArray.length / taskIdArrayLimit);


    for (let _iteration = 0; _iteration < iterations; _iteration++) {
      let start = taskIdArrayLimit * _iteration;
      let end = start + taskIdArrayLimit;
      let subTaskArray = idArray.slice(start, end);


      let updateFrameParam = {
        taskId: {$in: subTaskArray},
        "datasetVersions.versionId": versionId,
      };
      let data = {"datasetVersions.$.datasetType": type};

      /**
       * update  data set version details in frames
       */
      await this.annotationFrameRepository.updateMany(updateFrameParam, data, type)

    }
  }

  /**
   * update tasks with data ser version type
   * @param type {number} type of the dataSet (testing, validation ...)
   * @param versionId {string} id od the
   * @param idArray {string}[] task id array for update tasks
   */
  async setVersionIdOfTasks(type: number, versionId: ObjectId, idArray: string[]) {

    let iterations: number;

    /**
     * maximum tasks to be updated at once is limited by taskIdArrayLimit constant
     */
    if (idArray.length < taskIdArrayLimit) iterations = 1;
    else iterations = Math.ceil(idArray.length / taskIdArrayLimit);


    for (let _iteration = 0; _iteration < iterations; _iteration++) {
      let start = taskIdArrayLimit * _iteration;
      let end = start + taskIdArrayLimit;
      let subTaskArray = idArray.slice(start, end);
      logger.debug(versionId)
      logger.debug(subTaskArray)
      let updateTaskParam = {
        _id: {$in: subTaskArray},
        "datasetVersions.versionId": new ObjectId(versionId),

      };
      let data = {"datasetVersions.$.datasetType": type};

      /**
     * update  data set version details in tasks
     */
      await this.annotationTaskRepository.updateMany(updateTaskParam, data, type)

    }
  }





  /**
   * Calculate split count from task id array
   * @param taskIdArrays task Id arrays
   * @param splitPercentage  {object} training set,validation set and testing set percentages
   * @returns splitCount
   */
  async calculateSplitCount(taskIdArrays: ManualTaskList[], splitPercentage: SplitDataPercentage) {
    let splitPercentageArray: number[] = [];
    let splitCount: SplitCount[] = [];
    splitPercentageArray.push(splitPercentage.trainingSetPercentage);
    splitPercentageArray.push(splitPercentage.validationSetPercentage);
    splitPercentageArray.push(splitPercentage.testingSetPercentage);

    for (let iteration in taskIdArrays) {
      let _taskIdArray = taskIdArrays[iteration].taskList.map(taskId => {
        return new ObjectId(taskId);
      });

      let param = [
        {
          $match: {_id: {$in: _taskIdArray}}
        }, {
          $group: {
            "_id": null,
            frameCount: {$sum: "$frameCount"},
            objectCount: {$sum: "$labelCounts.totalCount"}
          }
        }
      ];

      let _countDetails = await this.annotationTaskRepository.aggregate(param);
      let countDetails = _countDetails.pop();

      let imageCount = 0;
      let objectCount = 0;
      if (countDetails != undefined) {
        imageCount = countDetails.frameCount;
        objectCount = countDetails.objectCount;
      }

      splitCount.push({
        type: parseInt(iteration) + 1,
        imageCount: imageCount,
        objectCount: objectCount,
        percentage: splitPercentageArray[iteration]
      })
    }
    return splitCount;
  }



  /**
   *  Use to edit random or manual data split
   * @param taskIdArray task id array
   * @param SplitCount split count
   * @param dataVersionSetId {string} data set group id
   * @param createDataSetType whether manual or random
   * @param newVersion whether new version is required
   * @param splitVideoArray videos break down in to the relevant data set type
   * @returns data set version details
   */
  async randomOrManualSplitDataEdit(taskIdArray: any[], SplitCount: SplitCount[],
    dataVersionSetId: string, createDataSetType: InitialDataSetType,
    newVersion: boolean, splitVideoArray?: any) {

    let taskList: {
      type: number,
      taskList: string[]
    }[] = []

    if (createDataSetType == InitialDataSetType.RANDOM) {

      /**
       * Split tasks into the relevant data set type when random data set version editing
       */
      for (let typeObj of taskIdArray) {

        let tempList = typeObj.idArray.map((obj: {tasks: any}) => obj.tasks._id)
        taskList.push({
          type: typeObj.type,
          taskList: tempList
        })
      }
    }

    if (createDataSetType == InitialDataSetType.MANUAL) {

      /**
     * Split tasks into the relevant data set type when manual data set version editing
     */
      for (let task of taskIdArray) {
        let _taskList = task.taskList.map((taskId: any) => {
          return new ObjectId(taskId);
        });
        taskList.push(
          {
            type: task.type,
            taskList: _taskList
          }
        )
      }
    }

    let dataSetVersion = await this.annotationDatasetVersionRepository.findById(dataVersionSetId);
    let versionId: string;

    /**
     * add already used tasks in to an array
     */
    let previousTaskList = dataSetVersion.taskList;

    /**
     * push selected tasks Id in to an array
     */
    let newTaskList: any[] = [];
    for (let taskType of taskList) {
      for (let tasks of taskType.taskList) {
        newTaskList.push(tasks.toString())
      }
    }

    let nextVersion

    if (newVersion) {
      versionId = dataVersionSetId;

      let nextVersionNumber = dataSetVersion.versionNo;

      /**
       * update the created  data set version
       */
      nextVersion = await this.annotationDatasetVersionRepository.
        createInitialVersion(dataSetVersion, SplitCount, taskList,
          createDataSetType, nextVersionNumber, splitVideoArray, true, versionId);


    }
    else {
      versionId = dataVersionSetId;
      delete dataSetVersion.versionId
      let taskListObj: any[] = [];
      for (let obj of taskList) {
        taskListObj = [...taskListObj, ...obj.taskList]
      }

      let versionObject = {
        taskList: taskListObj,
        splitTasks: taskList,
        splitCount: SplitCount,
        isPending: true,
        splitVideoArray: splitVideoArray,
      }
      await this.annotationDatasetVersionRepository.updateById(dataVersionSetId, versionObject);

      let nextVersionNumber = dataSetVersion.versionNo;

      /**
       * update data set version if new tasks are added
       */
      await this.annotationDatasetVersionRepository.
        createInitialVersion(dataSetVersion, SplitCount, taskList,
          createDataSetType, nextVersionNumber, splitVideoArray, true, versionId);

    }

    /**
     * when new data set version is required,add data set version details in to frames and tasks
     */
    if (nextVersion?.versionDetails instanceof AnnotationDatasetVersion) {
      for (let typeObj of taskIdArray) {
        let tempList: any[] = [];

        /**
         * Add tasks which are belonged to specific data set type into an array
         */
        if (createDataSetType == InitialDataSetType.RANDOM) tempList = typeObj.idArray.map((obj: {tasks: any;}) => obj.tasks._id);
        if (createDataSetType == InitialDataSetType.MANUAL) {
          tempList = typeObj.taskList.map((taskId: any) => {
            return new ObjectId(taskId);
          })
        }

        /**
         * add data set version details in to frame and tasks
         */
        await this.updateFrameAndTaskVersionDetails(typeObj.type, versionId!, tempList);
      }

      logger.debug('python request initiated version id:', versionId!, 'dataSet id: ', dataVersionSetId);
      await this.pythonRequest.createDataSet(versionId!)
    }

    /**
    * when new data set version is not required,update data set version details in  frames and tasks
    */
    else if (newVersion == false) {

      let RemovedTaskIdArray: any[] = [];

      for (let typeObj of taskIdArray) {
        let tempList: any[] = [];

        /**
         * Add tasks which are belonged to specific data set type into an array
         */
        if (createDataSetType == InitialDataSetType.RANDOM) tempList = typeObj.idArray.map((obj: {tasks: any}) => obj.tasks._id);
        if (createDataSetType == InitialDataSetType.MANUAL) {
          tempList = typeObj.taskList.map((taskId: any) => {
            return new ObjectId(taskId);
          })
        }

        /**
         * add previously used tasks id into an array
         */
        let _previousTaskList = previousTaskList?.map(taskId => {
          return taskId.toString();
        });

        let includedList: any[] = [];
        let notIncludedList: any[] = [];

        /**
         * add new tasks in to notIncludedList array and already used tasks in to includedList
         */

        for (let _taskId of tempList) {

          /**
           * check if selected task id is already included in the existing data set version
           */
          if (_previousTaskList!.includes(_taskId.toString())) includedList.push(_taskId);
          else notIncludedList.push(_taskId);
        }

        /**
        * add data set version details in to frame and tasks
        */
        await this.updateFrameAndTaskVersionDetails(typeObj.type, versionId!, notIncludedList);

        /**
         * update data set version detail in already used tasks and frame
         */
        await this.setFrameAndTaskVersionId(typeObj.type, versionId!, includedList);

      }

      /**
         * add previously used tasks id into an array
         */
      let _previousTaskList = previousTaskList?.map(taskId => {
        return taskId.toString();
      });

      /**
       * If tasks of existing version is removed, add tasks id to an array
       */
      for (let tasksId of _previousTaskList!) {
        if (!newTaskList.includes(tasksId.toString())) {
          RemovedTaskIdArray.push(new ObjectId(tasksId))
        }
      }

      logger.debug("all removed Id", JSON.stringify(RemovedTaskIdArray));

      if (RemovedTaskIdArray.length > 0) {

        /**
         * remove data set version details from removed tasks and frames of removed tasks
         */
        await this.removeDataSetVersionsFromFrameAndTasks(versionId!, RemovedTaskIdArray)
      }

      let params = {_id: new ObjectId(versionId!)};

      /**
       * remove task status field form a data set version
       */
      await this.annotationDatasetVersionRepository.deleteFields(params, {taskStatus: ""})

      logger.debug('python request initiated version id:', versionId!, 'dataSet id: ', dataVersionSetId);
      await this.pythonRequest.createDataSet(versionId!)
    }

    return nextVersion ?? dataSetVersion;

  }

  /**
   * create task list relevant to data set type
   * @param taskList It contain dataSet type,and video List
   * @returns Array containing
   */
  async breakDownVideosToTasks(taskList: TaskList[]) {

    let manualTaskList: ManualTaskList[] = [];

    for (let dataSetType of taskList) {
      let taskList: string[] = [];
      let type = dataSetType.type;

      let index: number = 0;
      let videoListLength: number = dataSetType.videoArray.length;
      let videoList: ObjectId[] = [];

      for (let video of dataSetType.videoArray) {
        index += 1;
        if (video.taskList && video.taskList.length > 0) {
          for (let task of video.taskList) {
            taskList.push(task._id)
          }
          // taskList = [...taskList, ...video.taskList];
        }
        else if (video.selectTaskCount > 0) {
          videoList.push(new ObjectId(video._id));
        }
        if (index == videoListLength && videoList.length > 0) {
          let param = [
            {$match: {uploadId: {$in: videoList}, status: {$in: [StatusOfTask.ACCEPTED, StatusOfTask.qaCompleted]}}},
            {$project: {_id: 1}},

          ]
          let _taskList: {_id: string}[] = await this.annotationTaskRepository.aggregate(param);
          let taskArray = _taskList.map(task => {
            return task._id.toString();
          })

          taskList = [...taskList, ...taskArray];
        }
      }
      manualTaskList.push({
        type: type,
        taskList: taskList
      })
    }
    return manualTaskList;
  }

  /**
   * breakDown selected videos and tasks
   * @param taskList It contain dataSet type,and video List
   * @returns selected videos and tasks
   */
  async breakDownTasksOfVideo(taskList: TaskList[]) {

    let manualTaskList: {
      type: number;
      videoArray: any
    }[] = [];

    for (let dataSetType of taskList) {
      let videoArray: any[] = [];
      let type = dataSetType.type;

      for (let video of dataSetType.videoArray) {

        if (video.selectTaskCount > 0) {
          videoArray.push(video);
        }
      }
      manualTaskList.push({
        type: type,
        videoArray: videoArray
      })
    }
    return manualTaskList;
  }


  /**
   * remove data set version details from tasks and frames
   * @param versionId {string} data set version Id
   * @param taskList task list to be removed
   */
  async removeDataSetVersionsFromFrameAndTasks(versionId: string, taskList: string[]) {
    /**
     * Use for update all frames of the dataSet version
     */
    await this.removeFramesOfDataSet(new ObjectId(versionId), taskList)
    /**
     * Use for update all tasks of the dataSet version
     */
    await this.removeTasksOfDataSet(new ObjectId(versionId), taskList)
  }



  /**
   * remove dataset version details form frames
   * @param versionId {string} data set version Id
   * @param idArray task list to be removed
   */
  async removeFramesOfDataSet(versionId: ObjectId, idArray: string[]) {

    let iterations: number;

    /**
     * maximum tasks to be updated at once is limited by taskIdArrayLimit constant
     */
    if (idArray.length < taskIdArrayLimit) iterations = 1;
    else iterations = Math.ceil(idArray.length / taskIdArrayLimit);


    for (let _iteration = 0; _iteration < iterations; _iteration++) {
      let start = taskIdArrayLimit * _iteration;
      let end = start + taskIdArrayLimit;
      let subTaskArray = idArray.slice(start, end);


      let _dataSetVersionId = new ObjectId(versionId!);
      let _params = {taskId: {$in: subTaskArray}};

      await this.annotationFrameRepository.updateManyRemoveFromList(_params,
        {
          datasetVersions: {versionId: _dataSetVersionId}
        }
      )

    }
  }


  /**
   * remove dataset version details from tasks
   * @param versionId {string} data set version Id
   * @param idArray  task list to be removed
   */
  async removeTasksOfDataSet(versionId: ObjectId, idArray: string[]) {

    let iterations: number;

    /**
     * maximum tasks to be updated at once is limited by taskIdArrayLimit constant
     */
    if (idArray.length < taskIdArrayLimit) iterations = 1;
    else iterations = Math.ceil(idArray.length / taskIdArrayLimit);


    for (let _iteration = 0; _iteration < iterations; _iteration++) {
      let start = taskIdArrayLimit * _iteration;
      let end = start + taskIdArrayLimit;
      let subTaskArray = idArray.slice(start, end);


      let _dataSetVersionId = new ObjectId(versionId!);
      let _params = {_id: {$in: subTaskArray}}
      await this.annotationTaskRepository.updateManyRemoveFromList(_params,
        {
          datasetVersions: {versionId: _dataSetVersionId}
        }
      )

    }
  }



  /**
   * create new data set version when editing
   * @param dataSetVersionId {string} data set version id of  existing version
   * @returns new data set version id
   */
  async createdDatasetVersionInEditing(dataSetVersionId: string, projects: string[]) {
    let _dataSetVersionId: string;

    let dataSetVersionDetails = await this.annotationDatasetVersionRepository.findById(dataSetVersionId)
    let dataSetGroupId = dataSetVersionDetails.dataSetGroupId!;

    let nextVersionNo = await this.getNextVersionNo(dataSetGroupId);


    dataSetVersionDetails.versionNo = nextVersionNo;
    dataSetVersionDetails.createdAt = new Date();
    dataSetVersionDetails.updatedAt = new Date();
    dataSetVersionDetails.versionType = VersionType.EDIT;
    dataSetVersionDetails.projects = projects;

    delete dataSetVersionDetails.versionId;
    delete dataSetVersionDetails.taskStatus;
    delete dataSetVersionDetails.augmentationTypes;
    delete dataSetVersionDetails.labelAttributeList;


    let newVersionDetail = await this.annotationDatasetVersionRepository.create(dataSetVersionDetails);
    _dataSetVersionId = newVersionDetail.versionId!.toString();


    /**
     * add dataset version in to the data set group
     */
    if (dataSetVersionDetails.dataSetGroupId) {
      let dataSetGroupDetails = await this.annotationDataSetRepository.findById(dataSetVersionDetails.dataSetGroupId);
      let datasetVersionsArray = dataSetGroupDetails.datasetVersions ?? []

      datasetVersionsArray.push(newVersionDetail.versionId!)
      await this.annotationDataSetRepository.updateById(dataSetVersionDetails.dataSetGroupId, {datasetVersions: datasetVersionsArray});
    }
    return {
      dataSetVersionId: _dataSetVersionId
    }
  }


  /**
   * find distinct projects in data set versions and update data set group projects
   * @param dataSetVersionId {string} dataset version Id
   */
  async updateProjectListOfDataset(dataSetVersionId: string) {
    let dataSetVersionDetails = await this.annotationDatasetVersionRepository.findById(dataSetVersionId);
    let datasetId = dataSetVersionDetails.dataSetGroupId;

    if (datasetId) {
      let filter = {dataSetGroupId: new ObjectId(datasetId)};

      /**
       * find distinct projects in data set versions belong to a data set
       */
      let projectList = await this.annotationDatasetVersionRepository.findDistinctProjects("projects", filter);
      logger.debug(`dataSet group Id `, datasetId);
      logger.debug(`project list `, JSON.stringify(projectList));

      await this.annotationDataSetRepository.updateById(datasetId, {
        projects: projectList,
      });
    }

  }

}





export enum VersionKey {
  AUGMENTATION = 'augmentationTypes',
  LABEL = 'labelAttributeList'
}


export interface TaskArray {
  _id: string;
  objectsCount: number;
  taskCount: number;
  frameCount: number;
  clipName: string,
  sourceFilePath: string,
  tasks: {
    _id: string,
    labelCounts: {
      totalCount: number
    }
    frameCount: number
  }
}

export interface TaskIdArray {
  type: number;
  idArray: string[];
}

export interface LabelObject {
  frameId: number;
  boxes: AnnotationData[];
  taskId: string;
  projectName: string;
  labelStatsObject: {
    totalObjects: number;
    labelStats: LabelStatsObject[];
  }
}

export interface LabelStatsObject {
  _id?: string;
  labelName?: string;
  objectCount: number;
}

export enum SplitType {
  INITIAL = 1,
  UPDATE = 2
}

export interface ManualTaskList {
  type: number;
  taskList: string[]
}


/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 * repository class that use for Service interface that provides strong-typed data access operation in task model
 */

/**
 * @class AnnotationTaskRepository
 * purpose of task repository is to query and create project data
 * @description repository class that use for Service interface that provides strong-typed data access operation in task model
 * @author chathushka
 */
 import {Getter, inject} from '@loopback/core';
 import {
   BelongsToAccessor,
   DefaultCrudRepository,
   HasManyRepositoryFactory,
   repository
 } from '@loopback/repository';
 import {ObjectId} from 'mongodb';
 import {logger} from '../config';
 import {MongoDataSource} from '../datasources';
 import {
   AnnotationFrame,
   AnnotationProject,
   AnnotationTask,
   AnnotationTaskRelations,
   AUDIT_STATUS,
   LabelInfo,
   ProjectStats,
   StatusOfTask,
   TASK_STATUS
 } from '../models';
 import {SVGTransformFactor} from '../models/annotation-frame.model';
 import {
   AnnotationUser,
   AnnotationUserType
 } from '../models/annotation-user.model';
 import {
   AwsCloudService,
   AWS_CLOUD_SERVICE
 } from '../services/aws-cloud.service';
 import {EXPIRE_TIME} from '../settings/time-constants';
 import {AnnotationFrameRepository} from './annotation-frame.repository';
 import {AnnotationProjectRepository} from './annotation-project.repository';
 import dotenv from 'dotenv';
 dotenv.config()
 
 const SVG_WIDTH = 1920;
 const SVG_HEIGHT = 1080;
 
 export class AnnotationTaskRepository extends DefaultCrudRepository<
   AnnotationTask,
   typeof AnnotationTask.prototype.id,
   AnnotationTaskRelations
 > {
   public readonly project: BelongsToAccessor<
     AnnotationProject,
     typeof AnnotationTask.prototype.id
   >;
 
   public readonly annotationFrames: HasManyRepositoryFactory<
     AnnotationFrame,
     typeof AnnotationTask.prototype.id
   >;
 
 
   constructor(
     @inject(AWS_CLOUD_SERVICE) private awsCloudService: AwsCloudService,
     @inject('datasources.mongo') dataSource: MongoDataSource,
     @repository.getter('AnnotationProjectRepository')
     protected annotationProjectRepositoryGetter: Getter<AnnotationProjectRepository>,
     @repository.getter('AnnotationFrameRepository')
     protected annotationFrameRepositoryGetter: Getter<AnnotationFrameRepository>,
     @repository('AnnotationProjectRepository')
     public annotationProjectRepository: AnnotationProjectRepository,
   ) {
     super(AnnotationTask, dataSource);
     this.annotationFrames = this.createHasManyRepositoryFactoryFor(
       'annotationFrames',
       annotationFrameRepositoryGetter,
     );
     this.registerInclusionResolver(
       'annotationFrames',
       this.annotationFrames.inclusionResolver,
     );
     this.project = this.createBelongsToAccessorFor(
       'project',
       annotationProjectRepositoryGetter,
     );
     this.registerInclusionResolver('project', this.project.inclusionResolver);
   }
 
 
 
 
   /**
    * Use for get task list for project but with skip and limit for displaying
    * @param id {string} project Id
    * @param pageIndex {number} page index which need to display
    * @param pageSize {number} page size or list size need to send
    * @param filter {object} filter element to filter
    * @param projectObj {object} Project which the task list belonging to
    * @param userObj {object} Requesting user - to check the list of tasks to show for this user
    * @returns list of task according to parameters
    */
   async findTaskListOfProject(
     id: string,
     pageIndex: number,
     pageSize: number,
     filter: {status: string},
     projectObj: AnnotationProject,
     userObj: AnnotationUser,
     filterObject?: {statusArray: string[], videos: string[], search: string}
   ) {
     let countParam: any[] = [];
     let matchFilter: any = {}
     let taskFilter: {[k: string]: any} = {projectId: id};
     //////////////////
     matchFilter = {...matchFilter, projectId: new ObjectId(id)}
     ////////////////////
     if (userObj.userType == AnnotationUserType.ANNOTATION_USER_TYPE_ANNOTATOR) {
       taskFilter.assignedAnnotatorId = userObj.id;
       ///////////
       matchFilter = {...matchFilter, assignedAnnotatorId: new ObjectId(userObj.id)}
       ///////////
       // countParam = [{$match: {assignedAnnotatorId: new ObjectId(userObj.id)}}];
     }
 
     if (filter) {
       if (filter.status) {
         taskFilter.status = filter.status;
         countParam = [...countParam, {$match: {status: filter.status}}]
         ///////////
         matchFilter = {...matchFilter, status: filter.status}
         ///////////
       }
     }
 
     if (filterObject) {
       if (filterObject.statusArray.length > 0) {
         let taskStatus = filterObject.statusArray.map(status => {
           return parseInt(status);
         });
 
         taskFilter = {...taskFilter, status: {inq: taskStatus}}
         ///////////
         matchFilter = {...matchFilter, status: {$in: taskStatus}}
         ///////////
       }
 
       if (filterObject.videos.length > 0) {
         let videoList = filterObject.videos.map(id => {
           return new ObjectId(id);
         });
 
         taskFilter = {...taskFilter, uploadId: {inq: videoList}}
         ///////////
         matchFilter = {...matchFilter, uploadId: {$in: videoList}}
         ///////////
       }
 
       if (filterObject.search) {
         let taskId = filterObject.search;
         taskFilter = {...taskFilter, _id: taskId}
         ///////////
         matchFilter = {...matchFilter, _id: new ObjectId(taskId)}
         ///////////
       }
     }
 
     logger.debug(taskFilter);
     try {
       const arrTasks = await this.find({
         where: taskFilter,
         limit: pageSize,
         order: ['status DESC', 'completedFrames DESC', 'id ASC'],
         //order: ['S3_url ASC', 'frameStart ASC'],
         skip: pageIndex * pageSize,
         fields: {
           projectId: false,
           frameStart: false,
           videoPath: false,
           S3_url: false,
           frameRate: false,
           urlCreatedAt: false,
           taskStatus: false,
           auditStatus: false,
           boxCount: false,
           labelCounts: false,
           maxId: false,
           skipFrameCount: false,
           videoUrl: false,
           assignedAnnotatorId: false,
           datasetVersions: false
         },
       });
       ///////////////////////////////////////////////////
       countParam = [{$match: matchFilter},
       {
         $group: {
           _id: "$_id",
         },
 
       }, {$count: "taskCount"}]
 
       let _taskCount = await this.aggregate(countParam);
 
 
       let taskCount = _taskCount.length > 0 ? _taskCount[0].taskCount : 0;
       logger.debug(`number of tasks `, taskCount);
       //////////////////////////////////////////////
       let taskList = arrTasks.map(taskObj => {
         if (taskObj.status) {
           if (
             taskObj.status > TASK_STATUS.COMPLETED &&
             taskObj.status < AUDIT_STATUS.ACCEPTED
           ) {
             logger.warn(
               'Unknown status for task ' + taskObj.id + ' : ' + taskObj.status,
             );
             taskObj.status = TASK_STATUS.COMPLETED;
           }
         } else {
           logger.warn('Undefined status for task ' + taskObj.id);
           taskObj.status = TASK_STATUS.NOT_STARTED;
         }
         taskObj.projectName = projectObj.name; //Assign project name to task
         taskObj.contentType = projectObj.contentType; //Assign project content type to task
 
 
 
 
         //Set the json file download enable or disable flag
         if(
           taskObj.status >= TASK_STATUS.COMPLETED && 
           (userObj.userType == AnnotationUserType.ANNOTATION_USER_TYPE_SUPER_ADMIN ||
             userObj.userType == AnnotationUserType.ANNOTATION_USER_TYPE_TEAM_ADMIN || 
             userObj.userType == AnnotationUserType.ANNOTATION_USER_TYPE_AUDITOR
           )){
             taskObj.isDownloadEnable = true
         }else{
           taskObj.isDownloadEnable = false  
         }
         taskObj.downLoadUrl = `${process.env.BASE_URL}/api/${taskObj.id}/jsonData`
         
 
         //Assign Video Name to task list details
         if(!taskObj.videoName){
           let videoNameArray = taskObj.taskName.split('-')
           videoNameArray = videoNameArray.slice(2)
           let videoName = videoNameArray.join('-')
           taskObj.videoName = videoName
         }
         
 
         return taskObj;
       });
       /////////////////////
       let taskDetails = {taskCount: taskCount, taskList: taskList}
       //////////////////
       // return taskList;
       return taskDetails;
       /////////////////////////////
     } catch {
       logger.debug(`task list of projectId ${id} failed`);
     }
   }
 
 
 
 
 
 
 
   /**
    * get task for relevant id with labels of the project
    * @param id {string} id of the task
    * @returns task details for above id with labels of the project
    */
   async findTaskById(id: string, user: AnnotationUser) {
     logger.debug('Get Task ' + id);
     let taskDetails = await this.findOne({
       where: {id: id},
       include: [{relation: 'project'}],
     }); //find task and project details
     // console.log(taskDetails);
     let taskDetailsPrase = JSON.parse(JSON.stringify(taskDetails));
     let taskOnlyDetails = {...taskDetailsPrase}; //restructure data for change details as needed
     delete taskOnlyDetails.project;
 
     //create date for compare the expiration date
     let urlCreateTime = new Date();
     let previousCreateTime = new Date(taskOnlyDetails.urlCreatedAt);
 
     let timeDiff =
       (urlCreateTime.getTime() - previousCreateTime.getTime()) / 1000;
 
     //check for URL expiration
     if (
       !taskOnlyDetails.videoUrl ||
       !taskOnlyDetails.urlCreatedAt ||
       timeDiff > EXPIRE_TIME.AWS_TIME_DIFF
     ) {
       logger.debug(`Task Details: ${taskDetailsPrase}`);
       const url = await this.awsCloudService.generateAWSVideoUrl(
         taskDetailsPrase.S3_url,
       );
       taskDetailsPrase.videoUrl = url;
       logger.debug(`url of AWS: ${url}`);
 
       //update task details
       taskOnlyDetails.urlCreatedAt = new Date();
       taskOnlyDetails.videoUrl = url;
       this.updateById(id, taskOnlyDetails);
     }
 
     /**
      * Building needed output for request
      */
     taskDetailsPrase.labels = taskDetailsPrase.project.labels;
 
     let ProjectLabels: LabelInfo[] = taskDetailsPrase.project.labels
 
     if (!taskDetailsPrase.labelCounts) {
       //if label counts empty add initial labelCount for it
       let labelList: object[] = [];
 
       for (let obj of ProjectLabels) {
         let object = {
           label: obj.label,
           //////////////////////////////////////////
           // labelText: obj.labelText,
           //////////////////////////////////////////
           color: obj.color,
           count: 0,
         };
         labelList.push(object);
       }
       let labelCounts = {totalCount: 0, labelList: labelList};
 
       taskDetailsPrase.labelCounts = labelCounts;
     }
     logger.debug('label counts of project: ', taskDetailsPrase.labelCounts)
 
 
 
 
 
     delete taskDetailsPrase.project;   // delete unwanted project fields from sending object
 
     /**
      * Use for get the previous and next task in task details
      */
     let taskFilter: {[k: string]: any} = {
       projectId: taskDetailsPrase.projectId,
     };
     if (user.userType == AnnotationUserType.ANNOTATION_USER_TYPE_ANNOTATOR) {
       taskFilter.assignedAnnotatorId = user.id;
     }
     logger.debug(
       'user is ',
       user.id,
       'userType ',
       user.userType,
       'get the next and previous task id',
     );
     let taskArray = await this.find({
       where: taskFilter,
       order: ['status DESC', 'completedFrames DESC', 'id ASC'],
       fields: {id: true},
     });
 
     for (let i = 0; i < taskArray.length; i++) {
       if (taskArray[i].id == taskDetailsPrase.id) {
         if (taskArray[i - 1])
           taskDetailsPrase.previousTask = taskArray[i - 1].id;
         //else taskDetailsPrase.previousTask = taskArray[taskArray.length - 1].id
         if (taskArray[i + 1]) taskDetailsPrase.nextTask = taskArray[i + 1].id;
         //else taskDetailsPrase.nextTask = taskArray[0].id
         //console.log(i,i-1,i+1)
         logger.debug(
           'previousTask',
           taskDetailsPrase.previousTask,
           'nextTask',
           taskDetailsPrase.nextTask,
         );
       }
     }
 
     let params = [
       {$match: {_id: new ObjectId(id)}},
       {$lookup: {from: 'AnnotationFrame', localField: '_id', foreignField: 'taskId', as: 'frames'}},
       {$unwind: "$frames"},
       {$unwind: "$frames.commentBoxes"},
       {$count: "count"}
     ]
 
     let commentCount = await this.aggregate(params)
     if (commentCount[0] && commentCount[0].count) taskDetailsPrase.totalComments = commentCount[0].count
     else taskDetailsPrase.totalComments = 0
 
 
 
 
 
     /**
      * Use for append initial label to label count list
      */
     for (let labelDetails of ProjectLabels) {
       //console.log(labelDetails.label)
       let isExists = false
       for (let obj of taskDetailsPrase.labelCounts.labelList) {
         //console.log(obj.label)
 
         if ((obj.label.toString() == labelDetails.label.toString())) {
           isExists = true
           //console.log("its equal")
         }
       }
       if (!isExists) {
         taskDetailsPrase.labelCounts.labelList.push({
           label: labelDetails.label,
           color: labelDetails.color,
           count: 0
         })
       }
     }
 
 
     /**
      * Remove labels if it doesn't included in project labels
      */
     let labelListTemp = []
     for(let i in taskDetailsPrase.labelCounts.labelList){
 
       let index = ProjectLabels.findIndex( obj => obj.label == taskDetailsPrase.labelCounts.labelList[i].label)
       if(index >= 0){
         labelListTemp.push(taskDetailsPrase.labelCounts.labelList[i])
       }
     }
     taskDetailsPrase.labelCounts.labelList = labelListTemp
 
     /**
      * Use for sort initial label to label count list
      */
     taskDetailsPrase.labelCounts.labelList.sort(
       (labelOne: {count: number;}, labelTwo: {count: number;}) => (labelOne.count > labelTwo.count) ? -1 : 1)
     
     if(
         taskDetailsPrase.status >= TASK_STATUS.COMPLETED && 
         (user.userType == AnnotationUserType.ANNOTATION_USER_TYPE_SUPER_ADMIN ||
           user.userType == AnnotationUserType.ANNOTATION_USER_TYPE_TEAM_ADMIN
     )){
       taskDetailsPrase.isDownloadEnable = true
     }else{
       taskDetailsPrase.isDownloadEnable = false  
     }
     taskDetailsPrase.downLoadUrl = `${process.env.BASE_URL}/api/${taskDetailsPrase.id}/jsonData`
 
     return taskDetailsPrase;
   }
 
 
 
 
 
 
 
 
 
 
   /**
    * Returns the height / width multiplication factors based on video resolution
    * This is required to transform image coordinates / SVG coordinates back and forth
    * @param taskId ID of the task
    */
   async getSVGTransformFactor(taskId: string): Promise<SVGTransformFactor> {
     //Disabled conversion as this is handled in frontend now
     return <SVGTransformFactor>{
       xFactor: 1,
       yFactor: 1,
     };
     /*
     //Get the video resolution from task
     const taskObj = await this.findById(taskId, {
       fields: {videoResolutionWidth: true, videoResolutionHeight: true},
     });
 
     return <SVGTransformFactor>{
       xFactor: taskObj.videoResolutionWidth
         ? SVG_WIDTH / taskObj.videoResolutionWidth
         : 1,
       yFactor: taskObj.videoResolutionHeight
         ? SVG_HEIGHT / taskObj.videoResolutionHeight
         : 1,
     };*/
   }
 
 
 
 
 
 
 
 
   /**
    * Use for update task status
    * @param taskId {string} task id for update status
    * @param status {number} status
    * @returns updated task details
    */
   async updateTaskStatus(taskId: string, status: number) {
     try {
       //let oldFrame: frame
       let oldTask = await this.findOne({
         where: {id: taskId},
         fields: {
           id: true,
           status: true,
           auditStatus: true,
           taskStatus: true,
           completedAt: true,
           projectId: true,
           frameCount: true
         },
       });
       let oldTaskObj: AnnotationTask = JSON.parse(JSON.stringify(oldTask));
 
       oldTaskObj.status = status;
 
       if (status < AUDIT_STATUS.ACCEPTED) {
         oldTaskObj.taskStatus = status;
       } else {
         oldTaskObj.auditStatus = status;
       }
       if (status == TASK_STATUS.COMPLETED) {
         oldTaskObj.completedAt = new Date();
         oldTaskObj.completedFrames = oldTaskObj.frameCount,
           oldTaskObj.progress = 100
       }
 
       if (status == TASK_STATUS.IN_PROGRESS) {
         let params = [
           {$match: {_id: new ObjectId(taskId)}},
           {$lookup: {from: 'AnnotationFrame', foreignField: 'taskId', localField: '_id', as: 'frames'}},
           {$unwind: "$frames"},
           {$match: {"frames.isUserAnnotated": true}},
           {$count: "count"}
         ]
         let frameCount = await this.aggregate(params)
         let completedCount = 0;
 
         if (frameCount) completedCount = frameCount[0].count
         delete oldTaskObj.completedAt
         oldTaskObj.completedFrames = completedCount,
           oldTaskObj.progress = completedCount / oldTaskObj.frameCount! * 100
       }
 
       await this.updateById(taskId, oldTaskObj);
       return oldTaskObj;
     } catch {
       return {result: 'error'};
     }
   }
 
 
 
 
 
 
 
 
 
 
 
   /**
    * Use for update the progress of task
    * Called when new frame is created or updated when annotating
    * @param taskId {string} id of the task
    * @param newFramesCount {number} count of the annotated frames
    * @param labelCounts {number}
    * @param maxId {number}
    */
   async updateTaskFrameCreate(
     taskId: string,
     newFramesCount: number,
     labelCounts: labelCount[],
     maxId: number,
   ) {
     let taskDetails = await this.findOne({where: {id: taskId}});
 
     if (taskDetails!.maxId! < maxId) taskDetails!.maxId = maxId;
 
     //Params for filter and get counts of the labels
     let params = [
       {$match: {_id: new ObjectId(taskDetails?.projectId)}},
       {$unwind: '$labels'},
       {$group: {_id: {label: '$labels.label', color: '$labels.color'}}},
       {$project: {label: '$_id.label', color: '$_id.color', _id: 0}},
     ];
 
     //query the label count
     let projectObjList = await this.annotationProjectRepository.aggregate(
       params,
     );
 
     //create the labelCount object
     let labelList = [];
     let totalCount = 0;
     for (let projObj of projectObjList) {
       for (let taskObj of labelCounts) {
         if (projObj.label == taskObj.label) {
           projObj.count = taskObj.count;
           totalCount += taskObj.count;
         }
       }
       if (!projObj.count) {
         projObj.count = 0;
       }
       labelList.push(projObj);
     }
 
     //add new fields to the task
     if (!taskDetails?.completedAt) {
       taskDetails!.progress = (100 * newFramesCount) / taskDetails?.frameCount!;
 
       taskDetails!.completedFrames = newFramesCount;
     }
 
     taskDetails!.labelCounts = {totalCount: totalCount, labelList: labelList};
 
     taskDetails!.updatedAt = new Date();
 
 
     //For not started tasks, set to in progress state
     if (taskDetails?.status == TASK_STATUS.NOT_STARTED) {
       logger.debug('Setting task ' + taskId + ' to in progress');
       taskDetails!.taskStatus = TASK_STATUS.IN_PROGRESS;
       taskDetails!.status = TASK_STATUS.IN_PROGRESS;
     }
 
     await this.updateById(taskDetails?.id, taskDetails!);
 
     let taskList = await this.find({
       where: {projectId: taskDetails?.projectId},
     });
 
     //this.userRepo.taskDetailsOfUser(userId);
     await this.annotationProjectRepository.updateById(taskDetails!.projectId, {projectsSummaryPending: true})
 
     this.updateProjectStats(taskList, taskDetails!.projectId);
   }
 
 
 
 
 
 
 
 
 
 
   /**
    * Use for calculate the project stats
    * @param taskList {string[]} task id list of the project
    * @param projectId project id
    */
   async updateProjectStats(taskList: AnnotationTask[], projectId: string) {
     // To reduce the CPU load - minimize the stat update frequency by checking with last stat update timestamp
     // If the time gap is less than 4 mins, then skip the stat update
     const currTime = new Date();
     const projectObj = await this.annotationProjectRepository.findById(
       projectId,
     );
     if (
       projectObj.statsSummary?.lastUpdatedTime &&
       projectObj.statsSummary.lastUpdatedTime.getTime() >
       currTime.getTime() - 240000
     ) {
       logger.debug(
         'Project stats last updated on ' +
         projectObj.statsSummary.lastUpdatedTime,
       );
       return;
     }
     let totalTasks = taskList.length;
     let completedTasks = taskList.filter(
       task => task.status! >= TASK_STATUS.COMPLETED,
     ).length;
     let inprogressTasks = taskList.filter(
       task => task.status == TASK_STATUS.IN_PROGRESS,
     ).length;
 
     let params = [
       {
         $match: {projectId: new ObjectId(projectId)},
       },
       {
         $project: {'labelCounts.labelList': 1},
       },
       {$unwind: '$labelCounts.labelList'},
       {
         $group: {
           _id: '$labelCounts.labelList.label',
           count: {$sum: '$labelCounts.labelList.count'},
         },
       },
     ];
 
     let annotationObjectList = await this.aggregate(params);
     let annotatedObjectCount = 0;
 
     for (let obj of annotationObjectList) {
       annotatedObjectCount += obj.count;
     }
 
     let paramsFrameBox = [
       {$match: {projectId: new ObjectId(projectId)}},
       {
         $lookup: {
           from: 'AnnotationFrame',
           foreignField: 'taskId',
           localField: '_id',
           as: 'frames',
         },
       },
       {$unwind: {path: '$frames'}},
       {$unwind: '$frames.boxes'},
       {$match: {'frames.isUserAnnotated': true, "frames.boxes.boundaries.createdAt": {$exists: true}}},
       {$count: 'count'},
     ];
 
     let boxCountObj = await this.aggregate(paramsFrameBox);
     //logger.debug(boxCountObj[0].count);
     let totalAnnotatedCount = 0
     if (boxCountObj[0]) totalAnnotatedCount = boxCountObj[0].count
 
     logger.debug('total count: ', totalAnnotatedCount)
 
     let projectStats: ProjectStats = {
       lastUpdatedTime: currTime,
       totalTaskCount: totalTasks,
       completedTaskCount: completedTasks,
       inprogressTaskCount: inprogressTasks,
       totalAnnotatedCount: totalAnnotatedCount,
     };
 
     logger.debug(
       'project statSummery updated for projectId ' +
       projectId +
       ' and stats are ' +
       projectStats,
     );
 
     this.annotationProjectRepository.updateStatSummery(projectId, projectStats);
   }
 
 
 
 
 
 
 
 
 
 
 
   /**
    * Use for get the taskList of the created dataSet
    * @param projectList {string[]} projectId list of the created dataSet
    * @returns taskList of the created dataSet
    */
   async taskListOfDataSet(projectList: string[]) {
     let projectIdList = projectList.map(Element => new ObjectId(Element));
     let params = [
       {
         $match: {
           projectId: {$in: projectIdList},
           status: {$in: [StatusOfTask.qaCompleted, StatusOfTask.ACCEPTED]},
         },
       },
       {
         $project: {_id: 1},
       },
     ];
 
     return await this.aggregate(params);
   }
 
 
 
 
 
 
 
 
 
 
 
 
   /**
    * Use for get the Task list belongs to the annotator user
    * @param userId {string} id of the User
    * @returns Task list belongs to the annotator user
    */
   async getTaskListOfUser(userId: string) {
     return await this.find({
       where: {assignedAnnotatorId: userId},
       fields: {
         auditStatus: true,
         taskStatus: true,
         status: true,
       },
     });
   }
 
 
 
 
 
 
 
 
 
 
 
 
 
   /**
    * Use for get the completed FrameCount done by user
    * @param userId {string} id of the User
    * @param dayMonthYear {string} day string
    * @returns completed FrameCount
    */
   async getCompletedFrameCount(
     userId: string,
     dayMonthYear: string,
     disabledList: string[],
   ) {
     let params = [
       {$match: {assignedAnnotatorId: new ObjectId(userId)}},
       {
         $lookup: {
           from: 'AnnotationFrame',
           foreignField: 'taskId',
           localField: '_id',
           as: 'frames',
         },
       },
       {$unwind: {path: '$frames'}},
       {$match: {'frames.annotatedAt': {$gte: new Date(dayMonthYear)}}},
       {$unwind: '$frames.boxes'},
       {$match: {'frames.boxes.boundaries.label': {$nin: disabledList}}},
       {$count: 'count'},
     ];
     return await this.aggregate(params);
   }
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
   /**
    * Use for get the Approved FrameCount done by user
    * @param userId {string} id of the User
    * @param dayMonthYear {string} day string
    * @returns completed FrameCount
    */
   async getApprovedFrameCount(
     userId: string,
     dayMonthYear: string,
   ) {
     let params = [
       {
         $match: {
           assignedAnnotatorId: new ObjectId(userId),
           status: AUDIT_STATUS.ACCEPTED,
         },
       },
       {
         $lookup: {
           from: 'AnnotationFrame',
           foreignField: 'taskId',
           localField: '_id',
           as: 'frames',
         },
       },
       {$unwind: {path: '$frames'}},
       {$unwind: '$frames.boxes'},
       {$match: {'frames.boxes.boundaries.createdAt': {$gte: new Date(dayMonthYear)}}},
       {$count: 'count'},
     ];
     return await this.aggregate(params);
   }
 
 
 
 
 
 
 
 
 
 
 
 
 
 
   /**
    * Use for get taskList which are completed
    * @param params {object[]} parameters for the aggregate the taskList and limit the fields
    * @returns limited fields of taskList
    */
   async findAllTaskOfProject(params: object[]) {
     return await this.aggregate(params);
   }
 
 
 
 
 
 
   /**
    *
    * @param taskId
    * @returns
    */
   async findProjectBelongsTaskId(taskId: string) {
     return await this.findOne({
       where: {id: taskId},
       fields: {projectId: true},
     });
   }
 
 
 
 
 
 
   /**
    * Use for get the project quality stats for show in quality section
    * @param projectId {string} id of the project
    * @returns project quality stats
    */
   async getQualityStats(projectId: string, userId: string, userType: number) {
     let params = [];
     if (userType == AnnotationUserType.ANNOTATION_USER_TYPE_ANNOTATOR) {
       params = [
         {
           $match: {
             projectId: new ObjectId(projectId),
             assignedAnnotatorId: new ObjectId(userId),
           },
         },
         {$group: {_id: '$status', count: {$sum: 1}}},
       ];
     } else {
       params = [
         {$match: {projectId: new ObjectId(projectId)}},
         {$group: {_id: '$status', count: {$sum: 1}}},
       ];
     }
     let stats = await this.aggregate(params);
 
     if (!stats) return {result: 'No stats'};
 
     let accepted = 0;
     let fixed = 0;
     let rejected = 0;
     for (let element of stats) {
       if (element._id == AUDIT_STATUS.ACCEPTED) accepted = element.count;
       if (element._id == AUDIT_STATUS.FIXED) fixed = element.count;
       if (element._id == AUDIT_STATUS.REJECTED) rejected = element.count;
     }
 
     let qualityStats = {
       accepted: accepted,
       fixed: fixed,
       rejected: rejected,
     };
 
     return qualityStats;
   }
 
 
 
 
 
 
 
 
   /**
   * Get video tasks list and object count
   * @param videoId {string} video id
   * @returns video tasks list and object count
   */
   async TaskListOfVideo(videoId: string) {
     let param = [
       {
         $match: {
           uploadId: new ObjectId(videoId),
           status: {$in: [StatusOfTask.qaCompleted, StatusOfTask.ACCEPTED]}
         }
       },
       {
         $project: {
           "_id": 1, "labelCounts.totalCount": 1, "Originalframerate": 1,
           "frameStart": 1, "frameEnd": 1, "frameStartTime": 1
         }
       },
     ];
     let videoDetails: TaskOfVideo[] = await this.aggregate(param);
 
     let taskList = videoDetails.map(task => {
       let timeDuration: string;
 
       if (task.Originalframerate) {
 
         /**
          * Get starting adn ending time using original frame rate
          */
         let startTimeInSecond = Math.round(task.frameStartTime) ?? Math.round(task.frameStart / task.Originalframerate);
         let endTimeInSecond = Math.round(task.frameEnd / task.Originalframerate);
         let startTime = new Date(startTimeInSecond * 1000).toISOString().substr(11, 8);
         let endTime = new Date(endTimeInSecond * 1000).toISOString().substr(11, 8);
         timeDuration = `${startTime} - ${endTime}`
       }
 
       return {
         _id: task._id,
         duration: timeDuration! ?? "0:00:00 - 0:00:30",
         selected: false,
         labelCounts: {
           totalCount: task.labelCounts.totalCount
         }
 
       }
     });
     return taskList;
 
   }
 
 
   /**
    * Remove data set version details from tasks
    * @param dataSetVersionId {string} data set version id
    */
   async removeDataSetVersionsFromTask(dataSetVersionId: string) {
 
     let _dataSetVersionId = new ObjectId(dataSetVersionId);
     let params = {"datasetVersions.versionId": _dataSetVersionId};
 
     /**
      * remove data set version details from mongo db
      */
     await this.updateManyRemoveFromList(params,
       {
         datasetVersions: {versionId: _dataSetVersionId}
       }
     )
 
 
   }
 
 
 
 
 
 
 
   /**
    * Use for query data from method of aggregate
    * @param params {string[]} parameters for aggregate the database
    * @returns filtered data from database
    */
   public async aggregate(params?: any[]) {
     if (!params) params = [];
     const response = await (this.dataSource.connector as any)
       .collection('AnnotationTask')
       .aggregate(params)
       .get();
     return response;
   }
 
 
 
 
 
 
 
 
 
 
 
 
 
 
   /**
    * MongoDB direct updateMany in AnnotationFrame
    * @param params {object} filter Object
    * @param data {object} updating data
    * @returns response
    */
   public async updateManyPushToList(params: any, data: any, type?: any) {
     if (!params || !data) return
     const response = await (this.dataSource.connector as any)
       .collection('AnnotationTask')
       .updateMany(params, {$push: data})
     logger.debug('MongoDB tasks updateMany modified count(push):', response.modifiedCount);
 
     if (type) logger.debug('data Set type(tasks): ', type);
 
     return response;
   }
 
 
 
 
 
 
 
 
 
 
 
 
   /**
    * MongoDB direct updateMany in AnnotationFrame
    * @param params {object} filter Object
    * @param data {object} updating data
    * @returns response
    */
   public async updateMany(params: any, data: any, type?: number) {
     if (!params || !data) return
     const response = await (this.dataSource.connector as any)
       .collection('AnnotationTask')
       .updateMany(params, {$set: data})
     logger.debug('MongoDB tasks updateMany modified count(set):', response.modifiedCount)
     if (type) {
       logger.debug('data Set type(tasks): ', type);
     }
     return response;
   }
 
   /**
    * remove element form array
    * @param params {object} filter Object
    * @param data {object} updating data
    * @returns response
    */
   public async updateManyRemoveFromList(params: any, data: any) {
     if (!params || !data) return
     const response = await (this.dataSource.connector as any)
       .collection('AnnotationTask')
       .updateMany(params, {$pull: data})
     logger.debug('MongoDB tasks updateMany modified count(versions removed):', response.modifiedCount)
     return response;
   }
 
 }
 
 /**
  * label count interface
  */
 export interface labelCount {
   count: number;
   label: string;
 }
 
 export interface TaskOfVideo {
   _id: string;
   labelCounts: {
     totalCount: number;
   };
   Originalframerate: number;
   frameStart: number;
   frameEnd: number;
   frameStartTime: number;
 }
/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 *controller class that use handle the request-response lifecycle for API for the annotation-task model
 */

/**
 * @class AnnotationTaskController
 * Handle the request related to the Task controller
 * @description This controller use for Handle the request related to the Task controller eg: task list
 * videoList of project, task details, set the status and quality tab stats
 * @author chathushka
 */
import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {
  get,
  getModelSchemaRef,
  param,
  post,
  requestBody,
  response
} from '@loopback/rest';
import {SecurityBindings, securityId, UserProfile} from '@loopback/security';
import {ObjectId} from 'mongodb';
import { logger } from '../config';
import {
  AnnotationProject,
  AnnotationTask,
  AUDIT_STATUS,
  TASK_STATUS
} from '../models';
import {
  AnnotationContentUploadRepository,
  AnnotationHistoryRepository,
  AnnotationProjectRepository,
  AnnotationTaskRepository,
  AnnotationUserRepository
} from '../repositories';
import {
  ProjectStatsUpdateService,
  PROJECT_STATS_UPDATE_SERVICE
} from '../services/project-stats-update.service';
import {
  UserStatsUpdateService,
  USER_STATS_UPDATE_SERVICE
} from '../services/user-stats-update.service';

@authenticate('jwt')
export class AnnotationtaskController {
  constructor(
    @repository(AnnotationTaskRepository)
    public annotationTaskRepository: AnnotationTaskRepository,
    @repository(AnnotationProjectRepository)
    public annotationProjectRepository: AnnotationProjectRepository,
    @repository(AnnotationUserRepository)
    private userRepo: AnnotationUserRepository,
    @repository(AnnotationHistoryRepository)
    private historyRepository: AnnotationHistoryRepository,
    @inject(USER_STATS_UPDATE_SERVICE)
    private userStatsUpdateService: UserStatsUpdateService,
    @inject(PROJECT_STATS_UPDATE_SERVICE)
    private projectStatsUpdateService: ProjectStatsUpdateService,
    @repository(AnnotationContentUploadRepository)
    private AnnotationContentUploadRepository: AnnotationContentUploadRepository,
  ) { }




  /**
   * Use for handle get method API for request and response of task list
   * @param projectId {string} projectid of the task list
   * @param filter {object} page index which need to display
   * @param pageIndex {number} page size or list size need to send
   * @param pageSize {number} filter element to filter
   * @returns list of task according to parameters to frontend
   */
  @post('/api/tasks/list')
  async findTaskListOfProject(
    @param.query.string('projectId') projectId: string,
    @param.query.object('filterObj') filterObj: {status: string},
    @param.query.string('pageIndex') pageIndex: number,
    @param.query.string('pageSize') pageSize: number,
    @requestBody()
    filterObject: {
      statusArray: string[];
      videos: string[];
      search: string;
    },
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ) {
    const userId = currentUserProfile[securityId];
    
    
    const userObj = await this.userRepo.findById(userId);
 
    let projectObj: AnnotationProject;
    projectObj = await this.annotationProjectRepository.findProjectById(
      projectId,
    );
    
    return await this.annotationTaskRepository.findTaskListOfProject(
      projectId,
      pageIndex,
      pageSize,
      filterObj,
      projectObj,
      userObj,
      filterObject,
    );
  }





  /**
   * Get video list belonging to a  project
   * @param projectId {string} project id
   * @returns video clip name,content id and isSelected boolean
   */
  @get('/api/tasks/videoList/{projectId}')
  async getVideoListOfProject(
    @param.path.string('projectId') projectId: string,
  ) {
    return await this.AnnotationContentUploadRepository.videoListOfProject(
      projectId,
    );
  }





  /**
   * Use for handle get method API for request and response for task details according to task id
   * @param id {string} id of the task
   * @returns task details
   */
  @get('/api/tasks/{id}')
  async findTaskById(
    @param.path.string('id') id: string,
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ) {
    const userId = currentUserProfile[securityId];
    const userObj = await this.userRepo.findById(userId);
    return this.annotationTaskRepository.findTaskById(id, userObj);
  }





  /**
   * Use for handle API for task status update
   * @param taskId {string} task id for update status
   * @param status {number} status
   * @returns task details after update
   */
  @post('/api/tasks/{taskId}/setStatus')
  async updateStatus(
    @param.path.string('taskId') taskId: string,
    @requestBody() status: status,
    @param.header.number('timeZoneOffset') timeZoneOffset: number,
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ) {
    let offsetTime = new Date(
      new Date().getTime() - timeZoneOffset * 60 * 1000,
    );
    let offsetTimeDiff = -1 * timeZoneOffset * 60 * 1000;

    const userId = currentUserProfile[securityId];
    logger.debug(`Set task status by userId: ${userId} and status ${status}`)
    let result = await this.annotationTaskRepository.updateTaskStatus(
      taskId,
      status.status,
    );
    /**
     * Update the user dashboard Stats
     */
    this.userStatsUpdateService.updateTaskUserStats(userId, offsetTime, taskId);
    this.userStatsUpdateService.updateFrameUserStats(
      userId,
      offsetTime,
      taskId,
      timeZoneOffset,
    );
    //Update to activity log
    this.historyRepository.addToHistory(
      userId,
      taskId,
      'set status to ' + status.status,
      status,
    );
    
    if ((result as AnnotationTask).status == TASK_STATUS.COMPLETED) {
      this.projectStatsUpdateService.updateTaskCompletedOverTime(
        (result as AnnotationTask).projectId,
      );
    }
    

    if (status.status == AUDIT_STATUS.ACCEPTED) {
      this.userStatsUpdateService.approvedCountCalc(taskId, offsetTimeDiff);
    }
    return result;
  }

  /**
   * Use for get the project quality stats for show in quality section
   * @param projectId {string} id of the project
   * @returns project quality stats
   */
  @get('/api/quality/stats/{projectId}')
  async getQualityStats(
    @param.path.string('projectId') projectId: string,
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ) {
    const userId = currentUserProfile[securityId];
    let userObj = await this.userRepo.findById(userId);

    return await this.annotationTaskRepository.getQualityStats(
      projectId,
      userId,
      userObj.userType!,
    );
  }




  /**
   * for update the database by temporary endpoint
   * @param projectId
   * for update the database by temporary endpoint
   */
  @get('/api/updateTask/{projectId}')
  async updateTask(@param.path.string('projectId') projectId: string) {
    let taskList = await this.annotationTaskRepository.findAllTaskOfProject([
      {$match: {projectId: new ObjectId(projectId)}},
      {$project: {_id: 1}},
    ]);
    
    let taskIdList = taskList.map((element: any) => element._id);
    console.log(taskIdList);
    taskIdList.forEach((element: string) => {
      this.projectStatsUpdateService.calcAttributeStatsTask(element);
    });
    
  }
}


/**
 * status interface
 */
interface status {
  status: number;
}

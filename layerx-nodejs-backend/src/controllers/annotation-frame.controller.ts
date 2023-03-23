/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 * controller class that use handle the request-response lifecycle for API for the annotation frame-model
 */

/**
 * @class AnnotationFrameController
 * Handle the Annotation Frame related services
 * @description this controller Handle the Annotation Frame related services eg: frame update, frame list, frame comments list
 * @author chathushka
 */

import {authenticate} from '@loopback/authentication';
import {inject, service} from '@loopback/core';
import {repository} from '@loopback/repository';
import {get, param, post, requestBody} from '@loopback/rest';
import {SecurityBindings, securityId, UserProfile} from '@loopback/security';
import {logger} from '../config';
import {AnnotationData, CommentBox, ContentType} from '../models';
import {
  AnnotationFrameRepository,
  AnnotationHistoryRepository,
  AnnotationTaskRepository,
  AnnotationUserRepository
} from '../repositories';
import {AwsCloudService, AWS_CLOUD_SERVICE} from '../services';
import {ImageAnnotationService} from '../services/image-annotation.service';
import {ProjectStatsUpdateService, PROJECT_STATS_UPDATE_SERVICE} from '../services/project-stats-update.service';
import {PythonRequestService, PYTHON_REQUEST_SERVICE} from '../services/python-request.service';
import {
  UserStatsUpdateService,
  USER_STATS_UPDATE_SERVICE
} from '../services/user-stats-update.service';

@authenticate('jwt')
export class AnnotationFrameController {
  constructor(
    @repository(AnnotationFrameRepository)
    public annotationFrameRepository: AnnotationFrameRepository,
    @repository(AnnotationTaskRepository)
    public annotationTaskRepository: AnnotationTaskRepository,
    @repository(AnnotationTaskRepository)
    private taskRepository: AnnotationTaskRepository,
    @repository(AnnotationHistoryRepository)
    private historyRepository: AnnotationHistoryRepository,
    @repository(AnnotationUserRepository)
    public annotationUserRepository: AnnotationUserRepository,
    @inject(USER_STATS_UPDATE_SERVICE)
    private userStatsUpdateService: UserStatsUpdateService,
    @inject(PROJECT_STATS_UPDATE_SERVICE)
    private projectStatsUpdateService: ProjectStatsUpdateService,
    @inject(PYTHON_REQUEST_SERVICE)
    private pythonRequest: PythonRequestService,
    @service(ImageAnnotationService)
    public imageAnnotationService: ImageAnnotationService,
    @inject(AWS_CLOUD_SERVICE) private awsCloudService: AwsCloudService,
  ) { }

  /**
   *Use for create or update the frame annotation data
   * @param taskId {string} id of the task which belong frame
   * @param frameId {number} frame id
   * @param labelList {object[]} annotated data
   * @returns success or error
   */
  @post('/api/frames/{taskId}/{frameId}/update')
  async updateFrame(
    @param.path.string('taskId') taskId: string,
    @param.path.string('frameId') frameId: number,
    @param.query.string('contentType') contentType: number,
    @param.header.number('timeZoneOffset') timeZoneOffset: number,
    @requestBody()
    labelList: {
      boxes: AnnotationData[];
      commentBoxes: CommentBox[];
      isEmpty: boolean;
      userLog: string[];
    },
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ) {
    /**
     * Get time offset time of the user
     */
    let offsetTime = new Date(
      new Date().getTime() - timeZoneOffset * 60 * 1000,
    );

    /////////////////////////////////////////////////////////////////////////////////
    //comment box user image url
    ////////////////////////////////////////////////////////////////////////////////
    if (labelList.commentBoxes && labelList.commentBoxes.length > 0) {

      for (let i in labelList.commentBoxes) {

        for (let j in labelList.commentBoxes[i].commentList) {
          let userId = labelList.commentBoxes[i].commentList[j].userId
          let user = await this.annotationUserRepository.findById(userId)
          let imgUrl = `${process.env.BASE_URL}/api/user/profileImage/${userId}/${user.profileImgUrl}`
          labelList.commentBoxes[i].commentList[j].imgUrl = imgUrl
        }
      }
    }


    if (contentType == ContentType.Image) {
      let boxes = await this.imageAnnotationService.boxConvert(labelList.boxes, taskId, frameId)
      labelList.boxes = boxes
    }

    const userId = currentUserProfile[securityId];
    logger.debug(`frame update for taskId: ${taskId}, frameId: ${frameId} contentType: ${contentType} initiated by userId: ${userId}`)
    logger.debug('User time offset is: ', offsetTime, 'user id is: ', userId);
    //Update to activity log
    this.historyRepository.addToHistory(
      userId,
      taskId,
      'save-frame #' + frameId,
      labelList,
    );

  

    let result = await this.annotationFrameRepository.updateFrame(
      taskId,
      frameId,
      labelList.boxes,
      labelList.commentBoxes,
      labelList.isEmpty,
      labelList.userLog,
      await this.taskRepository.getSVGTransformFactor(taskId),
      userId,
    );
    /**
     * Update the user dashboard Stats
     */
    this.userStatsUpdateService.updateTaskUserStats(userId, offsetTime, taskId);
    this.userStatsUpdateService.updateFrameUserStats(
      userId,
      offsetTime,
      taskId,
      timeZoneOffset
    );

    /**
     * update the project overview stats
     */
    this.projectStatsUpdateService.calcAttributeStatsTask(taskId);
    let taskObj = await this.annotationTaskRepository.findById(taskId);
    this.projectStatsUpdateService.calcAnnotatedOverTime(taskObj.projectId);

    return result;
  }








  /**
   * use for get list of frames for given task id
   * @param taskId {string} id of the task
   * @returns list of frames for above task id
   */
  @get('/api/frames/{taskId}/list')
  async getFrameList(
    @param.path.string('taskId') taskId: string,
    @param.query.string('contentType') contentType: number,
  ) {
    if (contentType == ContentType.Image) {
      let frameList = await this.imageAnnotationService.boxReConvert(taskId)
      return frameList
    }
    const xyFactors = await this.taskRepository.getSVGTransformFactor(taskId);
    return this.annotationFrameRepository.getFrameList(taskId, xyFactors);
  }






  /**
   * Use for handle API of update the status of the frame
   * @param taskId {string} task id of the frame which belongs to
   * @param frameId {number} frame id of the frame
   * @param status {number} status of the frame
   * @returns result of update (success or failed)
   */
  @post('/api/frames/{taskId}/{frameId}/setStatus')
  async updateStatus(
    @param.path.string('taskId') taskId: string,
    @param.path.string('frameId') frameId: number,
    @requestBody() status: status,
  ) {
    let result = await this.annotationFrameRepository.updateStatus(
      taskId,
      frameId,
      status.status,
    );

    return result;
  }







  /**
   * use for get list of comments for given task id
   * @param frameId {string} id of the frame
   * @returns list of comments for given frame id
   */
  @get('/api/frames/comments/{taskId}')
  async getFrameCommentList(@param.path.string('taskId') taskId: string) {
    console.log(`comments request for taskId: ${taskId}`);
    return this.annotationFrameRepository.getFrameComments(taskId);
  }

  /**
   * Use for update project stat of existing project when it has no stats
   * @param projectId {string} id of the project
   */
  @get('/api/{projectId}')
  async test(@param.path.string('projectId') projectId: string) {
    this.projectStatsUpdateService.calcAttributeStatsProject(projectId);
  }

  ////////////////////Load Testing//////////////////////
  //////////////////////////////////////////////////////////
  /**
   * to create new users for load testing
   * @returns
   */
  // @get('/api/loadTesting')
  // async createUsers() {
  //   return await this.loadTesting.createUser();
  // }

  // /**
  //  *sign in to users and write down token
  //  * @returns
  //  */
  // @get('/api/loadTestingLogin')
  // async loadTestingLogin() {
  //   return await this.pythonRequest.logUser();
  // }

  // /**
  //  * read tasks file and update tasks
  //  * @param start {number}starting number
  //  * @param end {number} ending number
  //  * @returns
  //  */
  // @get('/api/fileRead')
  // async readTasksFile(
  //   @param.query.number('start') start: number,
  //   @param.query.number('end') end: number,
  // ) {
  //   return await this.loadTesting.readTaskFileAndUpdateTasks(start, end);
  // }
  // /**
  //  *write down history for each user
  // * @param start {number}starting number
  //  * @param end {number} ending number
  //  * @returns
  //  */
  // @get('/api/writeHistory')
  // async writeHistory(
  //   @param.query.number('start') start: number,
  //   @param.query.number('end') end: number,
  // ) {
  //   return await this.loadTesting.writeHistory(start, end);
  // }

  ////////////////////Load Testing//////////////////
  // //////////////////////////////////////////////////

}


/**
 * Interface for status update req
 */
interface status {
  status: number;
}

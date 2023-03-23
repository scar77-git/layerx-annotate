/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 * update the UserStatOverTime field in user model
 */

/**
 * @class User stats Update service
 * purpose of this service is to update the stats of the User when save the project data and change of status
 * @description update the UserStatOverTime field in user model
 * @author chathushka
 */


import {
  BindingKey,
  BindingScope,
  injectable
} from '@loopback/core';
import {repository} from '@loopback/repository';
import {ObjectId} from 'mongodb';
import {logger} from '../config';
import {AUDIT_STATUS, TASK_STATUS} from '../models/annotation-task.model';
import {AnnotationStats, AnnotationUser, AnnotationUserType, DailyStatsObj, MonthlyStatsObj, TaskStats} from '../models/annotation-user.model';
import {AnnotationFrameRepository, AnnotationProjectRepository} from '../repositories';
import {AnnotationTaskRepository} from '../repositories/annotation-task.repository';
import {AnnotationUserRepository, USER_STATUS} from '../repositories/annotation-user.repository';
import {userStatUpdateMinutes} from '../settings/constants';
@injectable({scope: BindingScope.TRANSIENT})
export class UserStatsUpdateService {
  constructor(
    @repository(AnnotationUserRepository)
    public userRepo: AnnotationUserRepository,
    @repository(AnnotationTaskRepository)
    public annotationTaskRepository: AnnotationTaskRepository,
    @repository(AnnotationProjectRepository)
    public annotationProjectRepository: AnnotationProjectRepository,
    @repository(AnnotationFrameRepository)
    public annotationFrameRepository: AnnotationFrameRepository,
  ) { }

  /**
   * aggregate users to update
   */
  async aggregateUserToUpdate() {
    let params: any[] = [];
    let currentTime = new Date();
    params = [
      {
        $match: {
          $and: [
            {
              "annotationStats.lastUpdatedTime":
                {$exists: true}
            }, {
              "annotationStats.lastUpdatedTime": {$lte: new Date(currentTime.getTime() - (userStatUpdateMinutes * 60 * 1000))},
              userStatPending: true
            }]
        }
      }
    ];

    let usersArray: any[] = await this.userRepo.aggregate(params);
    logger.info(`number of users to update ${usersArray.length}`)
    for (let user of usersArray) {
      logger.debug(`user Id ${user._id}`)
      await this.updateFrameUserStats(user._id);
    }
  }

  /**
   * Use for calculate User assigned task stats
   * @param userId {string} userId fof the User
   */
  async updateTaskUserStats(userId: string, offsetTime?: Date, taskId?: string) {
    /**
     * Use for get user assigned task list
     */
    if (taskId) {
      logger.debug('task id is: ', taskId, 'user id: ', userId)
      let task = await this.annotationTaskRepository.findById(taskId)
      if (task.assignedAnnotatorId == undefined) {
        return;
      }
      userId = task.assignedAnnotatorId
      logger.debug('annotator user id: ', userId)

    }
    let taskStatOfUser = await this.annotationTaskRepository.getTaskListOfUser(
      userId,
    );

    /**
     * Calculation for stats
     */
    let inProgressCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;
    let completedCount = 0;
    let totalCount = 0;
    let notStartedCount = 0;
    let inAuditState = 0;
    for (let obj of taskStatOfUser) {
      if (obj.status == TASK_STATUS.IN_PROGRESS) inProgressCount += 1;
      else if (obj.status == AUDIT_STATUS.ACCEPTED) approvedCount += 1;
      else if (obj.status == AUDIT_STATUS.REJECTED) rejectedCount += 1;
      else if (obj.status == TASK_STATUS.NOT_STARTED) notStartedCount += 1;
      else inAuditState += 1;
      if (obj.status! >= TASK_STATUS.COMPLETED) completedCount += 1;
      totalCount += 1;
    }
    logger.debug(
      'User stats ara calculated for user: ',
      userId,
      inProgressCount,
      approvedCount,
      rejectedCount,
      completedCount,
      totalCount,
      notStartedCount,
      inAuditState,
    );

    let taskStats: TaskStats = {
      inProgressCount: inProgressCount,
      approvedCount: approvedCount,
      rejectedCount: rejectedCount,
      completedCount: completedCount,
      totalCount: totalCount,
      notStartedCount: notStartedCount,
      inAuditState: inAuditState,
    };
    /**
     * update task stats in user details
     */
    this.userRepo.taskDetailsOfUser(userId, taskStats);
  }


  /**
   * Use for calculate the users annotated box counts in user stats
   * @param userId {string} userId of the annotator
   * @param offsetTime {Date} local time of the user
   * @returns result success or failure
   */
  async updateFrameUserStats(
    userId: string,
    offsetTime: Date = new Date(),
    taskId?: string,
    timeZoneOffset?: number
  ) {
    const currTime = new Date();

    if (taskId) {
      let task = await this.annotationTaskRepository.findById(taskId);
      if (task.assignedAnnotatorId == undefined) {
        return;
      }
      userId = task.assignedAnnotatorId;
      await this.userRepo.updateById(userId,
        {
          offsetTime: offsetTime,
          userStatPending: true,
          timeZoneOffset: timeZoneOffset
        });
    }


    let userObj = await this.userRepo.findById(userId);
    //First check whether user stats are updated within last 1 minute
    //To control frequency of user stats update - to prevent high CPU in mongodb
    if (
      userObj.annotationStats?.lastUpdatedTime &&
      userObj.annotationStats.lastUpdatedTime.getTime() >
      currTime.getTime() - 60000
    ) {
      logger.debug(
        'User stats for ' +
        userId +
        ' last updated on ' +
        userObj.annotationStats.lastUpdatedTime,
      );
      logger.debug('user stat not updated', userId)
      return;
    }
    logger.debug('user stat updated', userId)


    userObj!.userStatPending = false;
    offsetTime = userObj.offsetTime!;///
    const date = offsetTime;
    logger.debug('User date is: ', offsetTime, userId);
    let today = date.getUTCDate();
    let month = date.getUTCMonth() + 1;
    let year = date.getUTCFullYear();

    let todayString;
    if (today < 10) {
      todayString = '0' + today;
    } else todayString = today;
    let monthString;
    if (month < 10) {
      monthString = '0' + month;
    } else monthString = month;
    logger.debug('today is: ', todayString, monthString, year);

    let dayMonthYear = `${year}-${monthString}-${todayString}`;
    let monthYear = `${year}-${monthString}`;

    /**
     * Get Daily Counts of completed and approved boxes
     */
    let completedFrameCount =
      await this.annotationFrameRepository.getBoxCountOfUser(
        userId,
        dayMonthYear,
      );
    logger.debug("completedFrameCount: ", completedFrameCount)
    let approvedFrameCount =
      await this.annotationTaskRepository.getApprovedFrameCount(
        userId,
        dayMonthYear
      );

    /**
     * Get Monthly Counts of completed and approved boxes
     */
    let completedMonthlyFrameCount =
      await this.annotationFrameRepository.getBoxCountOfUser(
        userId,
        monthYear,
      );
    logger.debug("completedMonthlyFrameCount: ", completedMonthlyFrameCount)
    let approvedMonthlyFrameCount =
      await this.annotationTaskRepository.getApprovedFrameCount(
        userId,
        monthYear
      );


    /**
     * Process Daily Counts of completed and approved boxes
     */
    let completedFrameCountNumber = 0;
    let approvedFrameCountNumber = 0;
    if (completedFrameCount[0])
      completedFrameCountNumber = completedFrameCount[0].count;
    if (approvedFrameCount[0])
      approvedFrameCountNumber = approvedFrameCount[0].count;

    logger.debug(
      `completed box count ${completedFrameCountNumber} and Approved box Count ${approvedFrameCountNumber}`,
    );

    /**
     * Process Daily Counts of completed and approved boxes
     */
    let completedMonthlyFrameCountNumber = 0;
    let approvedMonthlyFrameCountNumber = 0;
    if (completedMonthlyFrameCount[0])
      completedMonthlyFrameCountNumber = completedMonthlyFrameCount[0].count;
    if (approvedMonthlyFrameCount[0])
      approvedMonthlyFrameCountNumber = approvedMonthlyFrameCount[0].count;

    logger.debug(
      `completed box count ${completedMonthlyFrameCountNumber} and Approved box Count ${approvedMonthlyFrameCountNumber}`,
    );

    let dailyStatsObj: DailyStatsObj = {
      date: new Date(dayMonthYear),
      completedBoxes: completedFrameCountNumber,
      approvedBoxes: approvedFrameCountNumber,
      unapproved: completedFrameCountNumber - approvedFrameCountNumber,
    };

    let monthlyStatsObj: MonthlyStatsObj = {
      date: new Date(monthYear),
      completedBoxes: completedMonthlyFrameCountNumber,
      approvedBoxes: approvedMonthlyFrameCountNumber,
      unapproved: completedMonthlyFrameCountNumber - approvedMonthlyFrameCountNumber,
    };


    let dailyStatsList = userObj.annotationStats?.dailyStats!;
    let monthlyStatsList = userObj.annotationStats?.monthlyStats!;

    if (dailyStatsList) {
      let updated = false;
      let totalBoxCount = 0;
      let approvedBoxCount = 0;

      for (let index in dailyStatsList) {
        if (
          dailyStatsList[index].date.toString() ==
          new Date(dayMonthYear).toString()
        ) {
          dailyStatsList[index] = dailyStatsObj;
          updated = true;
        }
      }
      if (updated) userObj.annotationStats!.dailyStats = dailyStatsList;
      if (!updated) {
        userObj.annotationStats?.dailyStats.unshift(dailyStatsObj);
      }
      for (let element of dailyStatsList) {
        totalBoxCount += element.completedBoxes;
        approvedBoxCount += element.approvedBoxes;
      }


      userObj.annotationStats!.totalBoxCount = totalBoxCount;
      userObj.annotationStats!.approvedBoxCount = approvedBoxCount;
    }
    if (monthlyStatsList) {
      let updated = false;

      let monthlyBoxCount = 0;
      let approvedMonthlyBoxCount = 0;
      for (let index in monthlyStatsList) {
        if (
          monthlyStatsList[index].date.toString() ==
          new Date(monthYear).toString()
        ) {
          monthlyStatsList[index] = monthlyStatsObj;
          updated = true;
          logger.debug('Monthly stats updated:', updated);
        }
      }
      if (updated) userObj.annotationStats!.monthlyStats = monthlyStatsList;
      if (!updated) {
        userObj.annotationStats?.monthlyStats.unshift(monthlyStatsObj);
        logger.debug('Monthly stats created:', !updated);
      }
      for (let element of monthlyStatsList) {
        if (
          element.date.getUTCFullYear() == year &&
          element.date.getUTCMonth() == month - 1
        ) {
          monthlyBoxCount = element.completedBoxes;
          approvedMonthlyBoxCount = element.approvedBoxes;
        }
      }
      userObj.annotationStats!.monthlyBoxCount = monthlyBoxCount;
      userObj.annotationStats!.monthlyApprovedCount = approvedMonthlyBoxCount;
    }
    if (dailyStatsList && monthlyStatsList) {
      if (userObj.annotationStats)
        userObj.annotationStats.lastUpdatedTime = currTime;
      this.userRepo.updateUser(userId, userObj);
      this.allUserUpdate(userObj.teamId!);
      return
    }
    let dailyStatsListTemp: DailyStatsObj[] = [];
    if (!dailyStatsList) {
      dailyStatsListTemp.unshift(dailyStatsObj);
    } else dailyStatsListTemp = dailyStatsList;

    let monthlyStatsListTemp: MonthlyStatsObj[] = [];
    if (!monthlyStatsList) {
      monthlyStatsListTemp.unshift(monthlyStatsObj);
    } else monthlyStatsListTemp = monthlyStatsList;

    let annotationStatObj: AnnotationStats = {
      lastUpdatedTime: currTime,
      totalBoxCount: dailyStatsObj.completedBoxes,
      approvedBoxCount: dailyStatsObj.approvedBoxes,
      monthlyBoxCount: dailyStatsObj.completedBoxes,
      monthlyApprovedCount: dailyStatsObj.approvedBoxes,
      dailyStats: dailyStatsListTemp,
      monthlyStats: monthlyStatsListTemp,
    }

    userObj.annotationStats = annotationStatObj;
    logger.debug(JSON.stringify(userObj, null, 2));
    this.userRepo.updateUser(userId, userObj);
    this.allUserUpdate(userObj.teamId!);
  }



  /**
   * Use for count and update the approved frame count of the user
   * @param taskId {string} id of the task
   * @param offsetTime time offset of the annotated user
   */
  async approvedCountCalc(taskId: string, offsetTime: number) {
    let taskObj = await this.annotationTaskRepository.findById(taskId);

    let userId = taskObj.assignedAnnotatorId;
    logger.debug('userId is ', userId)

    let userObj = await this.userRepo.findById(userId!);

    let dailyStats = userObj.annotationStats?.dailyStats;
    console.log(dailyStats)
    for (let index in dailyStats!) {
      let firstDay = new Date(dailyStats[index].date.getTime() - offsetTime);
      let secondDay = new Date(dailyStats[index].date.getTime() - offsetTime + 86400 * 1000);
      let params = [
        {
          $match:
            {assignedAnnotatorId: new ObjectId(userId), status: AUDIT_STATUS.ACCEPTED}
        },
        {
          $lookup:
          {
            from: 'AnnotationFrame',
            foreignField: 'taskId',
            localField: '_id',
            as: 'frames'
          }
        },
        {$unwind: {path: '$frames'}},
        {$unwind: "$frames.boxes"},
        {
          $match:
          {
            "frames.boxes.boundaries.createdAt":
            {
              $gte: firstDay,
              $lte: secondDay
            }
          }
        },

        {$count: "count"}
      ]

      let countObj = await this.annotationTaskRepository.aggregate(params);
      if (countObj[0]) {
        dailyStats[index].approvedBoxes = countObj[0].count
        dailyStats[index].unapproved = dailyStats[index].completedBoxes - countObj[0].count;
      }

    }

    userObj.annotationStats!.dailyStats = dailyStats!

    this.userRepo.updateById(userId!, userObj);

  }


  /**
   * Update the AllUser of the site
   * @param teamId {string} id of the team if exists on suer
   */
  async allUserUpdate(teamId: string) {
    let paramsDaily = [
      {
        $match:
        {
          userType: AnnotationUserType.ANNOTATION_USER_TYPE_ANNOTATOR,
          isAll: {$ne: true}
        }
      },
      {$unwind: "$annotationStats.dailyStats"},
      {
        $group: {
          _id: "$annotationStats.dailyStats.date",
          completedBoxes: {$sum: "$annotationStats.dailyStats.completedBoxes"},
          approvedBoxes: {$sum: "$annotationStats.dailyStats.approvedBoxes"},
          unapproved: {$sum: "$annotationStats.dailyStats.unapproved"}
        }
      },
      {$sort: {_id: -1}},
      {$project: {date: "$_id", _id: 0, completedBoxes: 1, approvedBoxes: 1, unapproved: 1}}
    ]

    let paramMonthly = [
      {
        $match:
        {
          userType: AnnotationUserType.ANNOTATION_USER_TYPE_ANNOTATOR,
          isAll: {$ne: true}
        }
      },
      {$unwind: "$annotationStats.monthlyStats"},
      {
        $group: {
          _id: "$annotationStats.monthlyStats.date",
          completedBoxes: {$sum: "$annotationStats.monthlyStats.completedBoxes"},
          approvedBoxes: {$sum: "$annotationStats.monthlyStats.approvedBoxes"},
          unapproved: {$sum: "$annotationStats.monthlyStats.unapproved"}
        }
      },
      {$sort: {_id: -1}},
      {$project: {date: "$_id", _id: 0, completedBoxes: 1, approvedBoxes: 1, unapproved: 1}}
    ]

    let dailyStats: DailyStatsObj[] = await this.userRepo.aggregate(paramsDaily);
    let monthlyStats: MonthlyStatsObj[] = await this.userRepo.aggregate(paramMonthly);

    let userObjList: AnnotationUser[] = await this.userRepo.aggregate([
      {$match: {userType: AnnotationUserType.ANNOTATION_USER_TYPE_ANNOTATOR, isAll: {$ne: true}}},
      {$project: {taskStats: 1, annotationStats: 1}}
    ])
    let inProgressCount = 0
    let approvedCount = 0
    let rejectedCount = 0
    let completedCount = 0
    let totalCount = 0
    let notStartedCount = 0
    let inAuditState = 0

    let totalBoxCount = 0
    let approvedBoxCount = 0
    let monthlyBoxCount = 0
    let monthlyApprovedCount = 0

    for (let element of userObjList) {
      if (element.taskStats && element.annotationStats) {
        inProgressCount += element.taskStats!.inProgressCount
        approvedCount += element.taskStats!.approvedCount
        rejectedCount += element.taskStats!.rejectedCount
        completedCount += element.taskStats!.completedCount
        totalCount += element.taskStats!.totalCount
        notStartedCount += element.taskStats!.notStartedCount
        inAuditState += element.taskStats!.inAuditState

        totalBoxCount += element.annotationStats!.totalBoxCount
        approvedBoxCount += element.annotationStats!.approvedBoxCount
        monthlyBoxCount += element.annotationStats!.monthlyBoxCount
        monthlyApprovedCount += element.annotationStats!.monthlyApprovedCount
      }
    }

    let userObj = await this.userRepo.findOne({where: {email: 'allusers@deepzea.com'}})
    let taskStats: TaskStats = {
      inProgressCount: inProgressCount,
      approvedCount: approvedCount,
      rejectedCount: rejectedCount,
      completedCount: completedCount,
      totalCount: totalCount,
      notStartedCount: notStartedCount,
      inAuditState: inAuditState,
    }

    let annotationStats: AnnotationStats = {
      totalBoxCount: totalBoxCount,
      approvedBoxCount: approvedBoxCount,
      monthlyBoxCount: monthlyBoxCount,
      monthlyApprovedCount: monthlyApprovedCount,
      dailyStats: dailyStats,
      monthlyStats: monthlyStats,
      lastUpdatedTime: new Date()
    }

    userObj!.taskStats = taskStats;
    userObj!.annotationStats = annotationStats!;
    userObj!.userStatPending = false;//
    this.userRepo.updateById(userObj!.id, userObj!);
    if (teamId) {
      logger.debug('team id of team annotator', teamId)
      this.allUserInTeamUpdate(teamId)
    }
  }


  /**
   * Update the AllUser of the site
   * @param teamId {string} id of the team if exists on suer
   */
  async allUserInTeamUpdate(teamId: string) {
    let paramsDaily = [
      {
        $match:
        {
          userType: AnnotationUserType.ANNOTATION_USER_TYPE_ANNOTATOR,
          teamId: new ObjectId(teamId),
          isAll: false
        }
      },
      {$unwind: "$annotationStats.dailyStats"},
      {
        $group: {
          _id: "$annotationStats.dailyStats.date",
          completedBoxes: {$sum: "$annotationStats.dailyStats.completedBoxes"},
          approvedBoxes: {$sum: "$annotationStats.dailyStats.approvedBoxes"},
          unapproved: {$sum: "$annotationStats.dailyStats.unapproved"}
        }
      },
      {$sort: {_id: -1}},
      {$project: {date: "$_id", _id: 0, completedBoxes: 1, approvedBoxes: 1, unapproved: 1}}
    ]

    let paramMonthly = [
      {
        $match:
        {
          userType: AnnotationUserType.ANNOTATION_USER_TYPE_ANNOTATOR,
          teamId: new ObjectId(teamId),
          isAll: false
        }
      },
      {$unwind: "$annotationStats.monthlyStats"},
      {
        $group: {
          _id: "$annotationStats.monthlyStats.date",
          completedBoxes: {$sum: "$annotationStats.monthlyStats.completedBoxes"},
          approvedBoxes: {$sum: "$annotationStats.monthlyStats.approvedBoxes"},
          unapproved: {$sum: "$annotationStats.monthlyStats.unapproved"}
        }
      },
      {$sort: {_id: -1}},
      {$project: {date: "$_id", _id: 0, completedBoxes: 1, approvedBoxes: 1, unapproved: 1}}
    ]

    let dailyStats: DailyStatsObj[] = await this.userRepo.aggregate(paramsDaily);
    let monthlyStats: MonthlyStatsObj[] = await this.userRepo.aggregate(paramMonthly);

    let userObjList: AnnotationUser[] = await this.userRepo.aggregate([
      {
        $match: {
          userType: AnnotationUserType.ANNOTATION_USER_TYPE_ANNOTATOR,
          teamId: new ObjectId(teamId),
          isAll: false
        }
      },
      {$project: {taskStats: 1, annotationStats: 1}}
    ])
    let inProgressCount = 0
    let approvedCount = 0
    let rejectedCount = 0
    let completedCount = 0
    let totalCount = 0
    let notStartedCount = 0
    let inAuditState = 0

    let totalBoxCount = 0
    let approvedBoxCount = 0
    let monthlyBoxCount = 0
    let monthlyApprovedCount = 0

    for (let element of userObjList) {
      if (element.taskStats && element.annotationStats) {
        inProgressCount += element.taskStats!.inProgressCount
        approvedCount += element.taskStats!.approvedCount
        rejectedCount += element.taskStats!.rejectedCount
        completedCount += element.taskStats!.completedCount
        totalCount += element.taskStats!.totalCount
        notStartedCount += element.taskStats!.notStartedCount
        inAuditState += element.taskStats!.inAuditState

        totalBoxCount += element.annotationStats!.totalBoxCount
        approvedBoxCount += element.annotationStats!.approvedBoxCount
        monthlyBoxCount += element.annotationStats!.monthlyBoxCount
        monthlyApprovedCount += element.annotationStats!.monthlyApprovedCount
      }
    }

    let userObj = await this.userRepo.findOne({
      where: {
        teamId: teamId,
        isAll: true
      }
    })
    if (!userObj) {
      userObj = await this.userRepo.create({
        email: `allUser${teamId}.layerx.ai`,
        name: 'All Annotators',
        userType: AnnotationUserType.ANNOTATION_USER_TYPE_ANNOTATOR,
        isAll: true,
        teamId: teamId,
        userStatus: USER_STATUS.ACCEPTED,
        profileImgUrl: 'defaultProfileImage.png',
      })
    }
    let taskStats: TaskStats = {
      inProgressCount: inProgressCount,
      approvedCount: approvedCount,
      rejectedCount: rejectedCount,
      completedCount: completedCount,
      totalCount: totalCount,
      notStartedCount: notStartedCount,
      inAuditState: inAuditState,
    }

    let annotationStats: AnnotationStats = {
      totalBoxCount: totalBoxCount,
      approvedBoxCount: approvedBoxCount,
      monthlyBoxCount: monthlyBoxCount,
      monthlyApprovedCount: monthlyApprovedCount,
      dailyStats: dailyStats,
      monthlyStats: monthlyStats,
      lastUpdatedTime: new Date()
    }

    userObj!.taskStats = taskStats;
    userObj!.annotationStats = annotationStats!;
    userObj!.userStatPending = false;//
    this.userRepo.updateById(userObj!.id, userObj!);
  }

}
export const USER_STATS_UPDATE_SERVICE =
  BindingKey.create<UserStatsUpdateService>('service.UserStatsUpdateService');

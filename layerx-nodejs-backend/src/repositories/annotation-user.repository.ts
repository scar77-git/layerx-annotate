/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 * repository class that use for Service interface that provides strong-typed data access operation in user model
 */
import {Getter, inject} from '@loopback/core';
import {
  DefaultCrudRepository,
  HasOneRepositoryFactory,
  repository
} from '@loopback/repository';
import _ from 'lodash';
import {logger} from '../config';
import {MongoDataSource} from '../datasources';
import {AnnotationUserCredentials} from '../models';
import {
  AnnotationUser,
  AnnotationUserRelations,
  AnnotationUserType,
  DailyStatsObj,
  DashBoardStats,
  MonthlyStatsObj,
  NewUserRequest,
  TaskStats
} from '../models/annotation-user.model';
import {EXPIRE_TIME, MONTHS} from '../settings/time-constants';
import {AnnotationUserCredentialsRepository} from './annotation-user-credentials.repository';

export class AnnotationUserRepository extends DefaultCrudRepository<
  AnnotationUser,
  typeof AnnotationUser.prototype.id,
  AnnotationUserRelations
> {
  readonly userCredentials: HasOneRepositoryFactory<
    AnnotationUserCredentials,
    typeof AnnotationUser.prototype.id
  >;
  constructor(
    
    @inject('datasources.mongo') dataSource: MongoDataSource,
    

    @repository.getter('AnnotationUserCredentialsRepository')
    private credentialsRepositoryGetter: Getter<AnnotationUserCredentialsRepository>,
    @repository(AnnotationUserCredentialsRepository)
    private annotationUserCredentialsRepository: AnnotationUserCredentialsRepository
  ) {
    super(AnnotationUser, dataSource);
    this.userCredentials = this.createHasOneRepositoryFactoryFor(
      'userCredentials',
      credentialsRepositoryGetter,
    );
  }

  async createUser(newUserRequest: NewUserRequest, password: string) {
    const savedUser = await this.create(_.omit(newUserRequest, 'password'));

    await this.userCredentials(savedUser.id).create({
      userId: savedUser.id.toString(),
      password: password,
    });

    return savedUser;
  }

  async createSocialUser(newUserRequest: RequestGoogle, password: string) {
    const savedUser = await this.create(_.omit({...newUserRequest, createdAt: new Date()}, 'password'));

    await this.userCredentials(savedUser.id).create({
      userId: savedUser.id.toString(),
      password: password,
    });

    return savedUser;
  }

  async findCredentials(
    userId: typeof AnnotationUser.prototype.id,
  ): Promise<AnnotationUserCredentials | undefined> {
    try {
      return await this.userCredentials(userId).get();
    } catch (err: any) {
      if (err.code === 'ENTITY_NOT_FOUND') {
        return undefined;
      }
      throw err;
    }
  }




  /**
   * Use for get list of team members from database
   * @param teamId {string} id of the team
   * @returns list of members in that team
   */
  async findTeamMemberList(teamId: string) {
    let memberList = await this.find({
      where: {
        teamId: teamId,
        isAll: false
      },
      fields: {
        id: true,
        email: true,
        userStatus: true,
        userType: true,
        name: true,
        teamId: true,
        teamName: true,
        profileImgUrl: true,
        imageUrl: true,
        inviteUrlCreatedAt: true
      },
      order: ['userType DESC', 'id ASC']
    });
    for (let i in memberList) {
      if (
        memberList[i].userStatus == USER_STATUS.PENDING &&
        (new Date()).getTime() - (memberList[i].inviteUrlCreatedAt ?? new Date()).getTime() > EXPIRE_TIME.ONE_DAY * 1000
      ) {
        memberList[i].userStatus == USER_STATUS.REINVITE
        await this.updateById(memberList[i].id, {userStatus: USER_STATUS.REINVITE})
      }
    }
    return memberList
  }





  /**
   * Use for inserting pending user to database
   * @param teamId {string} id of the team
   * @param userObj {object} email, name and userType
   * @returns status of process
   */
  async createPendingUser(teamId: string, userObj: object, teamName?: string) {

    let user = {...userObj, teamId: teamId, userStatus: 0, inviteUrlCreatedAt: new Date(), teamName: teamName ?? '', createdAt: new Date()};

    return await this.create(user);

  }





  /**
   * Use for remove team member from database
   * @param teamId {string} id of the team
   * @param userId {object} user object
   * @returns status of removing
   */
  async removeUser(teamId: string, userId: string) {
    try {
      await this.deleteById(userId);
      return {result: 'success'};
    } catch {
      return {result: 'error'};
    }
  }




  /**
   * Use for update existing team member
   * @param userId {string} id of the user
   * @param userType {number} user type of the member
   * @param name {string} name of the user
   * @returns Nothing
   */
  async updateMember(
    userId: string,
    userType: number,
    name: string,
    email: string,
    teamName: string,
  ) {
    let userObj = await this.findById(userId);
    userObj.name = name;
    userObj.userType = userType;
    userObj.email = email;
    userObj.teamName = teamName;
    try {
      await this.updateById(userId, userObj);

      logger.debug(`UserId ${userId} update successful`);
      return {result: 'success'};
    } catch {
      logger.debug(`UserId ${userId} update unsuccessful`);
      return {result: 'error'};
    }
  }




  /**
   * Use for signup the pending users after they come by clicking invitation url
   * @param userId {string} pending user id
   * @param password {string} hashed password
   * @returns Created credentials of the user
   */
  async pendingUserSignup(userId: string, password: string, name: string, email: string, teamName: string) {

    let updateObj = {userStatus: USER_STATUS.ACCEPTED, name: name, email: email, teamName: teamName};

    await this.updateById(userId, updateObj);
    let userCredentials = await this.annotationUserCredentialsRepository.findOne({
      where: {userId: userId}
    })
    logger.debug(userCredentials)
    if (userCredentials) {
      await this.annotationUserCredentialsRepository.updateById(userCredentials.id, {
        userId: userId.toString(),
        password: password,
      })
      return
    }
    await this.userCredentials(userId).create({
      userId: userId.toString(),
      password: password,
    })
    return

  }




  /**
   * Use for get the User dash board stats
   * @param userId {string} userId fof the User
   */
  async getDashBoardStats(userId: string) {

    const date = new Date();
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
    let completedForToday = 0;
    let userObj = await this.findById(userId);
    let userCount = await this.aggregate([
      {$match: {userType: AnnotationUserType.ANNOTATION_USER_TYPE_ANNOTATOR}},
      {$count: "count"}
    ])

    if (userObj.userType == AnnotationUserType.ANNOTATION_USER_TYPE_ANNOTATOR) {
      try {
        for (let element of userObj.annotationStats!.dailyStats) {
          if (element.date.toString() == new Date(dayMonthYear).toString()) {
            completedForToday = element.completedBoxes;
          }
        }
        //console.log()
        let dailyTarget = 1500
        if (userObj.email == 'allusers@deepzea.com' && userCount) {
          dailyTarget = dailyTarget * (userCount[0].count - 1)
        }
        let dashBoardStats: DashBoardStats = {
          boundingBoxes: {
            completedForToday: completedForToday,
            dailyTarget: dailyTarget,
            date: `${MONTHS[month - 1]}, ${year}`,
            completedBoxes: userObj.annotationStats!.monthlyBoxCount,
            approvedBoxes: userObj.annotationStats!.monthlyApprovedCount,
          },
          tasks: {
            totalCompleted: userObj.taskStats!.completedCount,
            totalAssigned: userObj.taskStats!.totalCount,
            inProgress: userObj.taskStats!.inProgressCount,
            totalApproved: userObj.taskStats!.approvedCount,
            totalRejected: userObj.taskStats!.rejectedCount,
          },
        };
        
        return dashBoardStats;
      } catch {
        return null
      }
    } else return {result: 'UserType is not annotator'};
  }




  /**
   * Use for update the taskStats of the User
   * @param userId {string} userId fof the User
   * @param taskStatOfUser {object} Calculated taskStats of the user
   */
  async taskDetailsOfUser(userId: string, taskStatOfUser: TaskStats) {
    //logger.debug(`UserId ${userId} updated with ${taskStatOfUser}`);
    this.updateById(userId, {taskStats: taskStatOfUser});
  }




  /**
   * Use for update the existing user document
   * @param userId {string} userId fof the User
   * @param userObj {object} updated user object
   */
  async updateUser(userId: string, userObj: AnnotationUser) {
    //logger.debug(`UserId ${userId} updated with ${userObj}`);
    this.updateById(userId, userObj);
  }




  /**
   * Use for get StatSummery of the User by user id
   * @param userId {string} id of the user
   * @param fromDate {Date} starting date of the query period
   * @param toDate {Date} ending date of the query period
   * @returns dailyStatsList
   */
  async getDashBoardSummery(userId: string, fromDate: Date, toDate: Date, isYear: boolean) {
    logger.debug(userId, fromDate, toDate, `isYear: ${isYear}`);
    let userObj = await this.findById(userId);
    if (userObj.userType == AnnotationUserType.ANNOTATION_USER_TYPE_ANNOTATOR) {
      if (isYear) {
        try {
          let allMonthlyStatsList: MonthlyStatsObj[] =
            userObj.annotationStats!.monthlyStats;

          let monthlyStatsList = allMonthlyStatsList!.filter(element => {
            if (fromDate <= element.date && element.date <= toDate) {
              return element;
            }
          });
          
          let modifiedMonthlyStatsList = monthlyStatsList.map(element => {
            let year = element.date.getUTCFullYear();
            let month = element.date.getUTCMonth();

            let day = `${MONTHS[month]} ${year}`
            return {
              date: day,
              completedBoxes: element.completedBoxes,
              approvedBoxes: element.approvedBoxes,
              unapproved: element.unapproved
            }
          })
          return modifiedMonthlyStatsList;
        } catch {
          return []
        }
      }
      try {
        let allDailyStatsList: DailyStatsObj[] =
          userObj.annotationStats!.dailyStats;
        let dailyStatsList = allDailyStatsList!.filter(element => {
          if (fromDate <= element.date && element.date <= toDate) {
            return element;
          }
        });
        
        let modifiedDailyStatsList = dailyStatsList.map(element => {
          let year = element.date.getUTCFullYear();
          let month = element.date.getUTCMonth();
          let date = element.date.getUTCDate();

          let day = `${MONTHS[month]} ${date}, ${year}`
          return {
            date: day,
            completedBoxes: element.completedBoxes,
            approvedBoxes: element.approvedBoxes,
            unapproved: element.unapproved
          }
        })
        return modifiedDailyStatsList;
      } catch {
        return []
      }
    } else return {result: 'UserType is not annotator'};
  }




  /**
   * Use for get details of the User
   * @param userId {string} id of the user
   * @returns User details of the user
   */
  async findUser(userId: string) {
    return await this.findById(userId);
  }




  /**
   * Use for get user list
   * @param userType {number} type of the user list
   * @returns User list of userType
   */
  async getUserList(userType: number, teamId?: string) {
    if (teamId) {
      return await this.find(
        {
          where: {
            userType: userType,
            teamId: teamId
          },
          fields: {id: true, userType: true, name: true},
          order: ['isAll DESC']
        });
    }
    return await this.find(
      {
        where: {userType: userType},
        fields: {id: true, userType: true, name: true, teamName: true, isAll: true},
        order: ['isAll DESC']
      });
  }


  /**
   * Use for query data from method of aggregate
   * @param params {string[]} parameters for aggregate the database
   * @returns filtered data from database
   */
  public async aggregate(params?: any[]) {
    if (!params) params = [];
    const response = await (this.dataSource.connector as any)
      .collection('AnnotationUser')
      .aggregate(params)
      .get();
    return response;
  }
}

/**
 *
 */
export enum USER_STATUS {
  PENDING = 0,
  ACCEPTED = 1,
  CANCELLED = 2,
  DEACTIVATED = 3,
  REINVITE = 4
}

export interface RequestGoogle {
  email: string;
  name: string;
  userType: number;
  password: string;
  teamId: string;
  userStatus: number;
}

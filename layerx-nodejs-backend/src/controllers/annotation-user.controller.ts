/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 *controller class that use handle the request-response lifecycle for API for the annotation-user model
 */

/**
 * @class annotation  user controller
 * Handle the request related to the user controller
 * @description This controller use for Handle the request related to the user controller eg: profile image changes
 * dash board stats for annotator and admins and annotator list
 * @author kelum,chathushka
 */

import {authenticate, TokenService} from '@loopback/authentication';
import {
  MyUserService, RefreshTokenService, RefreshTokenServiceBindings, TokenServiceBindings, UserServiceBindings
} from '@loopback/authentication-jwt';
import {inject, service} from '@loopback/core';
import {repository} from '@loopback/repository';
import {get, oas, param, post, Request, requestBody, Response, RestBindings} from '@loopback/rest';
import {SecurityBindings, securityId, UserProfile} from '@loopback/security';
import dotenv from 'dotenv';
import multer from 'multer';
import {logger} from '../config';
import {AnnotationUser, AnnotationUserType} from '../models/annotation-user.model';
import {AnnotationUserRepository} from '../repositories';
import {FileStorageService, StorageName} from '../services/file-storage.service';
// import {GoogleLoginService} from '../services/google-login.service';

dotenv.config();



@authenticate('jwt')
export class AnnotationUserController {
  userRepository: any;
  constructor(
    @repository(AnnotationUserRepository)
    private userRepo: AnnotationUserRepository,
    // @service(GoogleLoginService) public googleLoginService: GoogleLoginService,
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public jwtService: TokenService,
    @inject(UserServiceBindings.USER_SERVICE)
    public userService: MyUserService,
    @inject(RefreshTokenServiceBindings.REFRESH_TOKEN_SERVICE)
    public refreshService: RefreshTokenService,
  ) { }






  /**
   * Use for upload the profile image of the user
   * @param userId {string} userId of the user
   * @returns {result: "profile picture updated"}
   */
  @post('/api/user/profileImage/upload/{userId}')
  @oas.response.file()
  async getProfileImageUpload(
    @param.path.string('userId') userId: string,
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

    logger.debug(`profile picture update request for user id ${userId} initiated`)
    const fileStorage = new FileStorageService(StorageName.ProfileImages);
    const storage = multer.memoryStorage();
    const upload = multer({storage});
    try{
      const fileArr = <FileInterface[]>(
        await new Promise<object>((resolve, reject) => {
          upload.any()(<any>request, <any>response, (err: any) => {
            if (err) reject(err);
            else {
              resolve(request!.files!); 
            }
          });
        })
      );

      
      
      const fileName = "defaultProfileImage.png"
      const fileBuffer = fileArr[0].buffer;
      let fileDetails = fileStorage.createSingleFile(
        userId,
        fileName,
        fileBuffer,
        true
      );
      
      let currentDate = new Date().getTime()
      await this.userRepo.updateById(userId, {
        profileImgUrl: `${fileName}`, 
        imageUrl: `${process.env.BASE_URL}/api/user/profileImage/${userId}/${fileName}?${currentDate}`
      })
      logger.debug(`profile picture update request for user id ${userId} success`)
      return {result: "profile picture updated"}
    }catch(error){
      logger.debug(`profile picture update request for user id ${userId} failed`)
      return {result: "profile picture not updated"}
    }
  }




  /**
   * Use for handle the user getDashBoardStats API
   * @param userId {string} id of the user
   * @param currentUserProfile currently logged user details
   * @returns DashBoardStats
   */
  @get('api/user/getDashBoardStats')
  async getDashBoardStats(
    @param.header.number('timeZoneOffset') timeZoneOffset: number,
    @param.query.string('userId') userId: string,
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ) {
    if (!userId) userId = currentUserProfile[securityId];
    let response = await this.userRepo.getDashBoardStats(userId);
    if (!response) {
      response = {
        boundingBoxes: {
          completedForToday: 0,
          dailyTarget: 0,
          date: '',
          completedBoxes: 0,
          approvedBoxes: 0,
        },
        tasks: {
          totalCompleted: 0,
          totalAssigned: 0,
          inProgress: 0,
          totalApproved: 0,
          totalRejected: 0,
        },
      }
    }
    
    return response
  }






  /**
   * Use for handle the user dashBoardStatSummery API
   * @param userId {string} id of the user
   * @param fromDate {Date} starting date of the query period
   * @param toDate {Date} ending date of the query period
   * @param currentUserProfile currently logged user details
   * @returns dailyStatsList
   */
  @get('api/user/getDashBoardSummery')
  async getDashBoardSummery(
    @param.query.string('fromDate') fromDate: string,
    @param.query.string('toDate') toDate: string,
    @param.query.string('userId') userId: string,
    @param.query.boolean('isYear') isYear: boolean,
    @param.header.number('timeZoneOffset') timeZoneOffset: number,
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ) {
    if (!userId) userId = currentUserProfile[securityId];

    let startDate = new Date(fromDate);
    let endDate = new Date(toDate);


    let response = await this.userRepo.getDashBoardSummery(userId, startDate, endDate, isYear);

    return response
  }






  /**
   * Use for handle the api of getting annotator list
   * @param currentUserProfile currently logged user details
   * @returns annotator list
   */
  @get('/api/user/annotators/list')
  async getUserList(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ) {
    const userId = currentUserProfile[securityId];
    const CurrentUser: AnnotationUser = await this.userRepo.findUser(userId);
    let teamId = CurrentUser.teamId

    if (CurrentUser.userType == AnnotationUserType.ANNOTATION_USER_TYPE_SUPER_ADMIN ||
      CurrentUser.userType == AnnotationUserType.ANNOTATION_USER_TYPE_AUDITOR ||
      CurrentUser.userType == AnnotationUserType.ANNOTATION_USER_TYPE_TEAM_ADMIN
    ) {
      let annotatorList = await this.userRepo.getUserList(AnnotationUserType.ANNOTATION_USER_TYPE_ANNOTATOR, teamId)
      if (CurrentUser.userType == AnnotationUserType.ANNOTATION_USER_TYPE_SUPER_ADMIN) {
        for (let index in annotatorList) {
          if (annotatorList[index].isAll && annotatorList[index].teamName) {
            annotatorList[index].name = annotatorList[index].name + ' ' + annotatorList[index].teamName!
          }
        }
      }
      return annotatorList
    } else {
      return {result: 'Invalid User Type'}
    }
  }





  /**
   * Use for get dash board stats for annotators by user
   * @param userId {string} id of the user
   * @returns DashBoardStats of selected user
   */
  @get('api/user/a/getDashBoardStats')
  async getAdminDashBoard(
    @param.query.string('userId') userId: string
  ) {
    let response = await this.userRepo.getDashBoardStats(userId);
    return response;
  }





  /**
   * Use for get dash board summery for annotators by user
   * @param fromDate {Date} starting date of the query period
   * @param toDate {Date} ending date of the query period
   * @param userId {string} id of the user
   * @returns DashBoardSummery of selected user
   */
  @get('api/user/a/getDashBoardSummery')
  async getAdminDashBoardSummery(
    @param.query.string('fromDate') fromDate: string,
    @param.query.string('toDate') toDate: string,
    @param.query.string('userId') userId: string,
    @param.query.boolean('isYear') isYear: boolean,
  ) {
    let startDate = new Date(fromDate);
    let endDate = new Date(toDate);
    let response = await this.userRepo.getDashBoardSummery(userId, startDate, endDate, isYear);
    return response;
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

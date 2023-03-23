/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 *Controller that client needs to access first to get authentication before accessing other API endpoints
 */

/**
 * @class AuthController
 * Handle authentication functions for a user
 * @description Controller that client needs to access first to get authentication before accessing other API endpoints
 * validate invitation, setup password for new user, signup, login
 * @author Kelum, chathushka
 */
import {TokenService} from '@loopback/authentication';
import {
  Credentials,
  MyUserService,
  RefreshTokenService,
  RefreshTokenServiceBindings,
  TokenServiceBindings,
  User,
  UserServiceBindings
} from '@loopback/authentication-jwt';
import {inject, service} from '@loopback/core';
import {repository} from '@loopback/repository';
import {
  getModelSchemaRef, HttpErrors, param, post,
  requestBody,
  SchemaObject
} from '@loopback/rest';
import {SecurityBindings, UserProfile} from '@loopback/security';
import {genSalt, hash} from 'bcryptjs';
import dotenv from 'dotenv';
import {logger} from '../config';
import {
  AnnotationLoginResult,
  AnnotationRefreshResult,
  AnnotationUser,
  AnnotationUserType,
  NewUserRequest
} from '../models/annotation-user.model';
import {AnnotationUserRepository, USER_STATUS} from '../repositories';
import {AnnotationUserService} from '../services/annotation-user.service';
// import {GoogleLoginService} from '../services/google-login.service';
import {EXPIRE_TIME} from '../settings/time-constants';
var jwt = require('jsonwebtoken');
dotenv.config();

//Defines the format of Login request
const CredentialsSchema: SchemaObject = {
  type: 'object',
  required: ['email', 'password', 'name'],
  properties: {
    email: {
      type: 'string',
      format: 'email',
    },
    password: {
      type: 'string',
      minLength: 8,
    },
  },
};

export const CredentialsRequestBody = {
  description: 'The input of login function',
  required: true,
  content: {
    'application/json': {schema: CredentialsSchema},
  },
};

// Describes the type of grant object taken in by method "refresh"
type RefreshGrant = {
  refreshToken: string;
};

// Describes the schema of grant object
const RefreshGrantSchema: SchemaObject = {
  type: 'object',
  required: ['refreshToken'],
  properties: {
    refreshToken: {
      type: 'string',
    },
  },
};

// Describes the request body of grant object
const RefreshGrantRequestBody = {
  description: 'Reissuing Acess Token',
  required: true,
  content: {
    'application/json': {schema: RefreshGrantSchema},
  },
};

//Auth Controller class definition

export class AuthController {
  constructor(
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public jwtService: TokenService,
    @inject(UserServiceBindings.USER_SERVICE)
    public userService: MyUserService,
    @inject(RefreshTokenServiceBindings.REFRESH_TOKEN_SERVICE)
    public refreshService: RefreshTokenService,
    @inject(SecurityBindings.USER, {optional: true})
    public user: UserProfile,
    @repository(AnnotationUserRepository)
    protected userRepository: AnnotationUserRepository,
    // @service(GoogleLoginService) public googleLoginService: GoogleLoginService,
    @repository(AnnotationUserRepository)
    private userRepo: AnnotationUserRepository,
    @service(AnnotationUserService)
    private annotationUserService: AnnotationUserService,

  ) { }

  /**
   * Expose Login end point to Annotation tool frontend
   * Authenticate user and return the JWT token / refresh token pair to use in subsequent requests
   * @param credentials - Object including email and password (format: { "email": "email_address", "password": "password" })
   * @returns 401 if fails, token and user object if authentication successful
   */
  @post('/users/login', {
    responses: {
      '200': {
        description: 'Token',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                token: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
  })
  async login(
    @requestBody(CredentialsRequestBody) credentials: Credentials,
  ) {
    // ensure the user exists, and the password is correct
    const user = await this.userService.verifyCredentials(credentials);
    // convert a User object into a UserProfile object (reduced set of properties)
    const userProfile = this.userService.convertToUserProfile(user);

    // create a JSON Web Token based on the user profile
    const accessToken = await this.jwtService.generateToken(userProfile);
    //Create refresh token too
    const tokens = await this.refreshService.generateToken(
      userProfile,
      accessToken,
    );

    //Get annotation user object from our Database
    const annotationUser = await this.userRepository.findById(user.id);

    if (annotationUser.isUserDeactivated) return {result: 'User is Deactivated'}
    if (annotationUser.userStatus == USER_STATUS.PENDING) {
      //let nameList = userDetails.name.split(' ')
      let text = annotationUser.name![0].toUpperCase()
      //let count = 0
      // for(let word of nameList){
      //   if(count < 2){
      //     text += word[0].toUpperCase()
      //   }
      //   count +=1
      // }
      await this.annotationUserService.profileImageCreate(text, user.id)
    }

    await this.userRepo.updateById(user.id, {
      userStatus: USER_STATUS.ACCEPTED,
      name: annotationUser.name
    })

    return <AnnotationLoginResult>{
      token: accessToken,
      refreshToken: tokens.refreshToken,
      expireTime: tokens.expiresIn,
      user: {
        email: annotationUser.email,
        userId: annotationUser.id,
        name: annotationUser.name,
        userType: annotationUser.userType || AnnotationUserType.ANNOTATION_USER_TYPE_ANNOTATOR,
        teamId: annotationUser.teamId || '',
        teamName: annotationUser.teamName || '',
        isFirstTime: false,
        profileImgUrl: annotationUser.profileImgUrl || 'defaultProfileImage.png',
        imageUrl: annotationUser.imageUrl || `${process.env.BASE_URL}/api/user/profileImage/${annotationUser.id}/defaultProfileImage.png`
      },
    };
  }


  
  /**
   * Endpoint to refresh the authentication token which was generated in login function
   * Required by frontend when jwt access token is expired, to get a new token
   * @param refreshGrant
   * @returns
   */
  @post('/users/refresh-token')
  async refresh(
    @requestBody(RefreshGrantRequestBody) refreshGrant: RefreshGrant,
  ): Promise<AnnotationRefreshResult> {
    return {
      token: (await this.refreshService.refreshToken(refreshGrant.refreshToken))
        .accessToken,
    };
  }

  /**
   * Endpoint to create a user account in the system
   * Creates a record in AnnotationUser collection
   * @param newUserRequest Object with user name, email and password
   * @returns Created user object
   */
  @post('/users/signup', {
    responses: {
      '200': {
        description: 'User',
        content: {
          'application/json': {
            schema: {
              'x-ts-type': User,
            },
          },
        },
      },
    },
  })
  async signUp(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(NewUserRequest, {
            title: 'NewUser',
          }),
        },
      },
    })
    newUserRequest: NewUserRequest,
  ): Promise<User> {
    const password = await hash(newUserRequest.password, await genSalt());

    return await this.userRepository.createUser(newUserRequest, password);
  }




}


/**
 * Interface for User Object
 */
export interface returnUser {
  userId: string,
  email: string,
  name?: string,
  userType: number,
  teamId: string,
  //teamName: string;
}

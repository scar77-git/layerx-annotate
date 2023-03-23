/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 *AWSCloud service handle the request to the AWS cloud
 */

/**
 * @class AWSCloud service
 * purpose of AWSCloud service for handle AWS services to
 * @description AWSCloud service handle the request to the AWS cloud
 * @author chathushka
 */

import {BindingKey, /* inject, */ BindingScope, injectable} from '@loopback/core';
import * as AWS from 'aws-sdk';
import {logger} from '../config';
import {AnnotationUserMessages} from '../settings/annotation.user.messages';
// import {S3} from 'aws-sdk';
import {AwsConfiguration} from '../settings/aws.configuration';

const AWS_ACCESS_KEY = AwsConfiguration.AWS_ACCESS_KEY
const AWS_SECRET_KEY = AwsConfiguration.AWS_SECRET_KEY
const AWS_REGION = AwsConfiguration.AWS_REGION
const AWS_BUCKET_NAME = AwsConfiguration.AWS_BUCKET_NAME

@injectable({scope: BindingScope.TRANSIENT})
export class AwsCloudService {
  constructor(

  ) { }
  /**
   * Use for Initialize the s3Bucket
   * @returns initialized s3Bucket
   */
  async initAWS() {
    const s3Bucket = new AWS.S3({
      accessKeyId: AWS_ACCESS_KEY,
      secretAccessKey: AWS_SECRET_KEY,
      signatureVersion: 'v4',
      region: AWS_REGION,
    });
    return s3Bucket
  }


  /**
  * Use for generate AWS url for access annotation video
  * @param key {string} key of the amazon media file
  * @param expires expire time in seconds
   * @returns AWS url with expire settings
  */
  async generateAWSVideoUrl(key: string, expires = 86400) {
    const s3Bucket = this.initAWS()
    const params = {
      Bucket: AWS_BUCKET_NAME,
      Expires: expires,
      Key: key
    };
    return (await s3Bucket)
      .getSignedUrlPromise('getObject', params)
      .then((res: any) => res)
      .catch((err: any) => err)
  }

  /**
 * delete videos of a project
 * @param projectId {string} project id
 * @returns
 */
  async emptyS3Directory(projectId: string) {
    let currentData: any;
    AWS.config.update({accessKeyId: AWS_ACCESS_KEY, secretAccessKey: AWS_SECRET_KEY, region: AWS_REGION});
    var s3 = new AWS.S3();

    var params: any = {
      Bucket: AWS_BUCKET_NAME,
      Prefix: `contents/${projectId}/`
    }

    return s3.listObjects(params).promise().then(async data => {
      if (data.Contents!.length == 0) {
        return {
          isSuccess: true,
          result: AnnotationUserMessages.PROJECT_VIDEO_NOT_FOUND
        };
      }

      currentData = data;
      params = {Bucket: AWS_BUCKET_NAME};
      params.Delete = {Objects: []};

      currentData.Contents.forEach((content: {Key: any;}) => {
        params.Delete.Objects.push({Key: content.Key});
      });
      try {
        let response = await s3.deleteObjects(params).promise();
        return {
          isSuccess: true,
          result: AnnotationUserMessages.VIDEO_DELETE_SUCCESS
        }
      } catch (error) {
        logger.debug(error);
        return {
          isSuccess: false,
          result: AnnotationUserMessages.VIDEO_DELETE_FAIL
        }
      }
    });
  }
  
  /**
   * clear s3 documents
   * @param id {string} mongo db id
   * @param foldername {string} folder name
   * @returns 
   */
  async clearS3Content(id: string, foldername: string) {
    let currentData: any;
    AWS.config.update({accessKeyId: AWS_ACCESS_KEY, secretAccessKey: AWS_SECRET_KEY, region: AWS_REGION});
    var s3 = new AWS.S3();

    var params: any = {
      Bucket: AWS_BUCKET_NAME,
      Prefix: `${foldername}/${id}/`
    }

    return s3.listObjects(params).promise().then(async data => {
      if (data.Contents!.length == 0) {
        return {
          isSuccess: true,
          result: AnnotationUserMessages.PROJECT_VIDEO_NOT_FOUND
        };
      }

      currentData = data;

      console.log(currentData.Contents.length);
      params = {Bucket: AWS_BUCKET_NAME};
      params.Delete = {Objects: []};

      currentData.Contents.forEach((content: {Key: any;}) => {
        params.Delete.Objects.push({Key: content.Key});
      });

      let response = await s3.deleteObjects(params).promise();
    }).then(() => {
      if (currentData == !undefined && Array.isArray(currentData.Contents)) {
        if (currentData.Contents.length > 0) {
          this.clearS3Content(id, foldername);
        }

      } else {
        return true;
      }
    });
  }
}
export const AWS_CLOUD_SERVICE = BindingKey.create<AwsCloudService>(
  'service.awsCloudService',
);

export enum S3Folders {
  CONTENT = "contents",
  DATA_SET = "dataset"
}

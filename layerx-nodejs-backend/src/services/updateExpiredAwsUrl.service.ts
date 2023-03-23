/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 * use to update expired aws URL using a cron job
 */

/**
 * @class update expired AWS url service
 * use to update expired aws URL using a cron job
 * @description use to update expired aws URL using a cron job
 * @author chamath
 */

import {Application, bind, BindingKey, BindingScope, CoreBindings, inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {logger} from '../config';
import {AnnotationFrameRepository} from '../repositories';
import {awsExpirationDays, expiredAwsLimit} from '../settings/constants';
import {AwsCloudService, AWS_CLOUD_SERVICE} from './aws-cloud.service';
var CronJob = require('cron').CronJob;
import {ObjectId} from 'mongodb';

@bind({scope: BindingScope.TRANSIENT})
export class UpdateExpiredAwsUrlService {
  constructor(
    @inject(CoreBindings.APPLICATION_INSTANCE) private app: Application,
    @repository('AnnotationFrameRepository') private annotationFrameRepository: AnnotationFrameRepository,
    @inject(AWS_CLOUD_SERVICE) private awsCloudService: AwsCloudService,
  ) {
    this.awsUrlCronJob();
  }

  /**
   * cron job to update expired AWS URLs
   */
  async awsUrlCronJob() {
    try {
      const job = new CronJob({
        cronTime: '0 */1 * * *', //FIre at every one hour
        context: this,
        timeZone: 'America/Winnipeg',
        onTick: async () => {
          await this.updateExpiredAwsUrl();
        },
        start: true, // Start the job immediately
      });
    } catch (err) {
      console.log(err);
    }
  }
  /**
   * Aggregate expired AWS url up to 10,000
   * @returns
   */
  async updateExpiredAwsUrl() {
    let params: any[] = [];
    let expireDate = new Date(new Date().getTime() + (awsExpirationDays * 24 * 60 * 60 * 1000));


    params = [
      {
        $match: {
          datasetVersions: {
            $exists: true, $not: {$size: 0}
          }, $and: [{
            imageUrl: {
              $exists: true
            }
          }, {
            thumbnailUrl: {
              $exists: true
            }
          }],
          $or: [{
            awsExpiredDate:
              {$exists: false}
          }, {awsExpiredDate: {$lte: new Date(expireDate)}},
          {
            awsThumbnailExpiredDate:
              {$exists: false}
          }, {awsThumbnailExpiredDate: {$lte: new Date(expireDate)}},]
        }
      }, {$limit: expiredAwsLimit}
    ];
    let awsExpiredFrames: any[] = await this.annotationFrameRepository.aggregate(params);

    logger.info(`number of aws expired frames: ${awsExpiredFrames.length}`)
    for (let frame of awsExpiredFrames) {
      let expiredDate = new Date(new Date().getTime() + (7 * 24 * 60 * 60 * 1000));

      /***
       * generate image url
       */
      let imageUrl = await this.awsCloudService.generateAWSVideoUrl(frame.imageUrl, 604800);

      /***
       * generate thumbnail url
       */
      let thumbnailUrl = await await this.awsCloudService.generateAWSVideoUrl(frame.thumbnailUrl, 604800);

      /**
       * update frame with image urls and expiration date
       */

      // to update aws url of augmented images
      for(let augData of frame.datasetVersions){
        if(augData.augmentationImages){
          for (const [key, val] of Object.entries(augData.augmentationImages)){
            let augTypeData:any = val
            if(augTypeData.thumbnailUrl || augTypeData.imageUrl){
              if (augTypeData.thumbnailUrl) augData.augmentationImages[key].awsThumbnailUrl = await this.awsCloudService.generateAWSVideoUrl(augTypeData.thumbnailUrl, 604800);
              if (augTypeData.imageUrl) augData.augmentationImages[key].awsImageUrl = await this.awsCloudService.generateAWSVideoUrl(augTypeData.imageUrl, 604800);
              augData.augmentationImages[key].awsThumbnailExpiredDate = expiredDate;
            }
          }
          let findParam = {
            _id: frame._id,
          "datasetVersions.versionId": new ObjectId(augData.versionId)
          }
          let updateData = {"datasetVersions.$.augmentationImages": augData.augmentationImages};
          this.annotationFrameRepository.updateMany(findParam, updateData)
        }
      }

      await this.annotationFrameRepository.updateById(frame._id?.toString(), {
        awsUrl: imageUrl,
        awsThumbnailUr: thumbnailUrl,
        awsExpiredDate: expiredDate,
        awsThumbnailExpiredDate: expiredDate
      });

    }
    return;
  }


}
export const UPDATE_EXPIRED_AWS_URL_SERVICE = BindingKey.create<UpdateExpiredAwsUrlService>('service.updateExpiredAwsUrl');


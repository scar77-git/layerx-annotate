/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 * service to run cron job for project stats update
 */

/**
 * @class project stats cron job service
 * service to run cron job for project stats update
 * @description service to run cron job for project stats update
 * @author chamath
 */

import {Application, bind, BindingKey, BindingScope, CoreBindings, inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import dotenv from 'dotenv';
import {logger} from '../config';
import {AnnotationFrameRepository} from '../repositories';
import {ProjectStatsUpdateService, PROJECT_STATS_UPDATE_SERVICE} from './project-stats-update.service';
var CronJob = require('cron').CronJob;
dotenv.config();

@bind({scope: BindingScope.TRANSIENT})
export class ProjectStatsCronJobService {
  constructor(
    @inject(CoreBindings.APPLICATION_INSTANCE) private app: Application,
    @repository('AnnotationFrameRepository') private annotationFrameRepository: AnnotationFrameRepository,
    @inject(PROJECT_STATS_UPDATE_SERVICE) private projectStatsUpdate: ProjectStatsUpdateService,
  ) {
    this.projectStatUpdateCronJob();
  }

  /**
    * cron job to update project stats
   **/
  async projectStatUpdateCronJob() {
    try {
      const job = new CronJob({
        cronTime: '*/5 * * * *', //FIre at every 5 minute
        context: this,
        timeZone: 'America/Winnipeg',
        onTick: async () => {
          await this.projectStatsUpdate.aggregateProjectToUpdate();
        },
        start: true, // Start the job immediately
      });

    } catch (err) {
      console.log(err);
    }
  }



  /**
     * cron job for load testing
    **/
  async loadTestCronJob() {
    let testingMode = process.env.TESTING_MODE ?? "false";
    if (testingMode == "true") {
      try {
        const job = new CronJob({
          cronTime: '*/15 * * * * *', //FIre at every 15 seconds
          context: this,
          timeZone: 'America/Winnipeg',
          onTick: async () => {
            logger.debug("start load test");
          },
          start: true, // Start the job immediately
        });

      } catch (err) {
        console.log(err);
      }
    }

  }

}
export const PROJECT_STATS_CRON_JOB_SERVICE = BindingKey.create<ProjectStatsCronJobService>('service.projectStatsCronJob');


/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 * update the user stat using a cron job
 */

/**
 * @class user stats cron job service
 *  update the user stat using a cron job
 * @description  update the user stat using a cron job
 * @author chamath
 */

import {Application, bind, BindingKey, BindingScope, CoreBindings, inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {AnnotationFrameRepository} from '../repositories';
import {UserStatsUpdateService, USER_STATS_UPDATE_SERVICE} from './user-stats-update.service';
var CronJob = require('cron').CronJob;

@bind({scope: BindingScope.TRANSIENT})
export class UserStatsCronJobService {
  constructor(
    @inject(CoreBindings.APPLICATION_INSTANCE) private app: Application,
    @repository('AnnotationFrameRepository') private annotationFrameRepository: AnnotationFrameRepository,
    @inject(USER_STATS_UPDATE_SERVICE) private userStatsUpdate: UserStatsUpdateService,
  ) {
    this.userStatUpdateCronJob();
  }

  /**
    * cron job to update user stats
  **/
  async userStatUpdateCronJob() {
    try {
      const job = new CronJob({
        cronTime: '*/5 * * * *', //FIre at every 5 minute
        context: this,
        timeZone: 'America/Winnipeg',
        onTick: async () => {
          await this.userStatsUpdate.aggregateUserToUpdate();
        },
        start: true, // Start the job immediately
      });

    } catch (err) {
      console.log(err);
    }
  }

}
export const USER_STATS_CRON_JOB_SERVICE = BindingKey.create<UserStatsCronJobService>('service.userStatsCronJob');


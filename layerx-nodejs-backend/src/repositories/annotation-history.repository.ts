/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 *repository class that use for handling annotation activity log
 */

/**
 * @class AnnotationHistoryRepository
 * purpose of annotation history repository is to update activity log of annotations
 * It makes troubleshooting of data added by annotators by easily querying by task / user id
 * @description repository class that use for handling annotation activity log
 * @author Kelum
 */

import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {MongoDataSource} from '../datasources';
import {AnnotationHistory, AnnotationHistoryRelations} from '../models';

export class AnnotationHistoryRepository extends DefaultCrudRepository<
  AnnotationHistory,
  typeof AnnotationHistory.prototype.id,
  AnnotationHistoryRelations
> {
  constructor(@inject('datasources.mongo') dataSource: MongoDataSource) {
    super(AnnotationHistory, dataSource);
  }

  /**
   * Method to add an entry to activity log
   * @param userId - id of annotating user
   * @param taskId - task id
   * @param action - type of activity as string
   * @param data - data added / updated
   */
  addToHistory(userId: string, taskId: string, action: string, data: any) {
    this.create({
      userId: userId,
      taskId: taskId,
      action: action,
      dateTime: new Date(),
      data: data,
    });
  }
}

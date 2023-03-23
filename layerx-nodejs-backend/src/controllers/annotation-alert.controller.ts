/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 * controller class that use handle the request-response nodejs alerts
 */

/**
 * @class Annotation Alert Controller
 * Use for Handle check request of alerts
 * @description Use for Handle check request of the nodejs and mongodb to check active or not
 * @author chathushka
 */

import {service} from '@loopback/core';
import {get} from '@loopback/rest';
import {AnnotationProjectRepository} from '../repositories/annotation-project.repository';


export class AnnotationAlertController {
  constructor(
    @service(AnnotationProjectRepository) private annotationProjectRepository: AnnotationProjectRepository
  ) { }

  /**
   * Use for check the node js up or down. If it is up respond ok and else nothing
   * @returns ok or nothing
   */
  @get('/heartbeat/check')
  async heartbeatCheck() {
    return 'ok'
  }

  /**
   * Use for check the database up or down. If it is up respond ok and else nothing
   * @returns ok or nothing
   */
  @get('/check/database/status')
  async checkDatabaseStatus() {
    /**
     * check database down or not
     */
    try {
      await this.annotationProjectRepository.findOne()
      return 'ok'
    } catch {
      return 'error'
    }

  }

}

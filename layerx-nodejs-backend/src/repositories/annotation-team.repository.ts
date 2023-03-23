/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 * repository class that use for Service interface that provides strong-typed data access operation in annotation team model
 */

/**
 * @class AnnotationTeamRepository
 * purpose of Team repository is to query and create annotation team
 * @description repository class that use for Service interface that provides strong-typed data access operation in annotation team model
 * @author chathushka
 */

import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {MongoDataSource} from '../datasources';
import {AnnotationTeam, AnnotationTeamRelations} from '../models';

export class AnnotationTeamRepository extends DefaultCrudRepository<
  AnnotationTeam,
  typeof AnnotationTeam.prototype.id,
  AnnotationTeamRelations
> {
  constructor(
    @inject('datasources.mongo') dataSource: MongoDataSource,
  ) {
    super(AnnotationTeam, dataSource);
  }
  async createTeam(companyId: string, adminId: string, members: string[], projects: string[], teamName: string) {
    let teamObj = {
      companyId: companyId,
      adminId: adminId,
      members: members,
      projects: projects,
      teamName: teamName
    }
    this.create(teamObj)
  }


  /**
   * Edit the initially created team with team name
   * @param teamId {string} team id
   * @param teamName {string} team name
   */
  async editTeamNameOfNewUser(teamId: string, teamName: string) {
    await this.updateById(teamId, {
      teamName: teamName
    })
  }
}

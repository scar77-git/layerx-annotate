/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 *repository class that use for Service interface that provides strong-typed data access operation in project model
 */

/**
 * @class AnnotationProjectRepository
 * purpose of project repository is to query and create project data
 * @description repository class that use for Service interface that provides strong-typed data access operation in project model
 * @author chathushka
 */

import {Getter, inject} from '@loopback/core';
import {
  BelongsToAccessor,
  DefaultCrudRepository,
  HasManyRepositoryFactory,
  repository
} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {ObjectId} from 'mongodb';
import {MongoDataSource} from '../datasources';
import {
  AnnotationProject,
  AnnotationProjectRelations,
  AnnotationTask,
  AnnotationTeam, AttributesDataSet,
  Company,
  LabelInfo,
  ProjectStats
} from '../models';
import {AnnotationUserMessages} from '../settings/annotation.user.messages';
import {AnnotationTaskRepository} from './annotation-task.repository';
import {AnnotationTeamRepository} from './annotation-team.repository';
import {CompanyRepository} from './company.repository';

export class AnnotationProjectRepository extends DefaultCrudRepository<
  AnnotationProject,
  typeof AnnotationProject.prototype.id,
  AnnotationProjectRelations
> {
  public readonly annotationTasks: HasManyRepositoryFactory<
    AnnotationTask,
    typeof AnnotationProject.prototype.id
  >;

  public readonly company: BelongsToAccessor<
    Company,
    typeof AnnotationProject.prototype.id
  >;

  public readonly team: BelongsToAccessor<
    AnnotationTeam,
    typeof AnnotationProject.prototype.id
  >;

  constructor(
    @inject('datasources.mongo') dataSource: MongoDataSource,
    @repository.getter('AnnotationTaskRepository')
    protected annotationTaskRepositoryGetter: Getter<AnnotationTaskRepository>,
    @repository.getter('CompanyRepository')
    protected companyRepositoryGetter: Getter<CompanyRepository>,
    @repository.getter('AnnotationTeamRepository')
    protected annotationTeamRepositoryGetter: Getter<AnnotationTeamRepository>,
  ) {
    super(AnnotationProject, dataSource);
    this.team = this.createBelongsToAccessorFor(
      'team',
      annotationTeamRepositoryGetter,
    );
    this.registerInclusionResolver('team', this.team.inclusionResolver);
    this.company = this.createBelongsToAccessorFor(
      'company',
      companyRepositoryGetter,
    );
    this.registerInclusionResolver('company', this.company.inclusionResolver);
    this.annotationTasks = this.createHasManyRepositoryFactoryFor(
      'annotationTasks',
      annotationTaskRepositoryGetter,
    );
    this.registerInclusionResolver(
      'annotationTasks',
      this.annotationTasks.inclusionResolver,
    );
  }

  /**
   * Get project details for project id
   * @param id {string} id of the project
   * @returns details of the project belongs above id
   */

  async findProjectById(id: string) {
    //logger.debug(`find project ${id} success`);
    return await this.findById(id);
  }

  /**
   * Get project list for a user only project ID and Project name
   * @param teamId {string} teamId of the projects which needed
   * @returns only projectID, project name and project content type video,image,audio
   */
  async findProjectListOfUser(teamId?: string) {
    let projectList: AnnotationProject[];
    if (teamId) {
      // projectList = await this.find({
      //   where: {teamId: teamId},
      //   fields: {id: true, name: true, contentType: true, statsSummary: true},
      // });
      let param = [
        {
          $match: {
            teamId: new ObjectId(teamId),
            name: {$exists: true}
          }

        },
        {$lookup: {from: 'AnnotationTask', localField: '_id', foreignField: 'projectId', as: 'tasks'}},
        {$project: {id: "$_id", _id: 0, name: 1, contentType: 1, totalTaskCount: {$size: '$tasks'}}}
      ]
      projectList = await this.aggregate(param)

    } else {
      // projectList = await this.find({
      //   fields: {id: true, name: true, contentType: true, statsSummary: true},
      // });
      let param = [
        {
          $match: {
            name: {$exists: true}
          }
        },
        {$lookup: {from: 'AnnotationTask', localField: '_id', foreignField: 'projectId', as: 'tasks'}},
        {$project: {id: "$_id", _id: 0, name: 1, contentType: 1, totalTaskCount: {$size: '$tasks'}}}
      ]
      projectList = await this.aggregate(param)

    }

    return projectList;
  }
  /**
   * Use for send project object for project id
   * @param id {string} project id
   * @returns relevant project object
   */
  async findProjectObj(id: string) {
    return await this.findById(id);
  }

  /**
   * Use for update stat summery field of the project
   * @param projectId {string} id of the project
   * @param statsSummary {ProjectStats} new project stat summery as object
   */
  async updateStatSummery(projectId: string, statsSummary: ProjectStats) {
    try {
      this.updateById(projectId, {
        statsSummary: statsSummary,
        updatedAt: new Date(),
        projectsSummaryPending: false
      });
    } catch (error) {
      return error;
    }
  }

  async findLabelList(projectList: string[]) {
    let projectIdList = projectList.map(Element => new ObjectId(Element));

    const params = [
      {
        $match: {
          _id: {$in: projectIdList},
        },
      },
      {$unwind: '$labels'},
      {
        $project: {
          label: '$labels.label',
          index: '$labels.index',
          key: '$labels.key',
          attributes: '$labels.attributes',
          _id: 0,
        },
      },
      {$addFields: {selected: false}}
    ];

    let labelList: {
      label: string;
      index: number;
      key: string;
      attributes: AttributesDataSet[];
      selected: boolean;
    }[] = await this.aggregate(
      params,
    );

    return labelList;
  }

  /**
   * Use for return project stat fields
   * @param projectId {string} id of the project
   * @returns project stat fields
   */
  async projectOverviewStats(projectId: string) {
    let projectOverviewStats = await this.findOne({
      where: {id: projectId},
      fields: {projectStats: true, statsSummary: true},
    });

    if (
      projectOverviewStats &&
      projectOverviewStats.projectStats &&
      projectOverviewStats.statsSummary
    ) {
      let objCount = 0;
      for (let element of projectOverviewStats.projectStats) {
        objCount += element.totalObjects;
      }
      projectOverviewStats.statsSummary.totalAnnotatedCount = objCount;
    }
    return projectOverviewStats;
  }





  /**
   * Use for send the annotated stats for the chart
   * @param projectId {string} id of the project
   * @param range {number} indication of the time range for data
   * @returns data time array
   */
  async getAnnotationSummery(projectId: string, range: number) {
    let data = await this.findById(projectId);
    if (range == RANGE.THIRTY_DAYS) {
      if (
        data.annotatedOverTimeStats &&
        data.annotatedOverTimeStats.length > RangeValue.thirtyDays
      ) {
        return data.annotatedOverTimeStats?.slice(0, RangeValue.thirtyDays);
      } else {
        return data.annotatedOverTimeStats;
      }
    }
    if (range == RANGE.NINETY_DAYS) {
      if (
        data.annotatedOverTimeStats &&
        data.annotatedOverTimeStats.length > RangeValue.NinetyDays
      ) {
        return data.annotatedOverTimeStats?.slice(0, RangeValue.NinetyDays);
      } else {
        return data.annotatedOverTimeStats;
      }
    }

    if (range == RANGE.ONE_YEAR) {
      if (
        data.annotatedOverTimeMonthlyStats &&
        data.annotatedOverTimeMonthlyStats.length > RangeValue.OneYear
      ) {
        return data.annotatedOverTimeMonthlyStats?.slice(0, RangeValue.OneYear);
      } else {
        return data.annotatedOverTimeMonthlyStats;
      }
    }

    if (range == RANGE.ALL) {
      if (
        data.annotatedOverTimeMonthlyStats &&
        data.annotatedOverTimeMonthlyStats.length > RangeValue.OneYear
      ) {
        return data.annotatedOverTimeMonthlyStats;
      } else {
        return data.annotatedOverTimeMonthlyStats;
      }
    }

    return data.annotatedOverTimeStats;
  }





  /**
   * Use for create the empty project only with id
   * @returns empty project details with only id
   */
  async projectInitialCreate(userId: string, teamId: string) {
    try {
      if (teamId) {
        return await this.create({
          createdAt: new Date(),
          createdBy: userId,
          updatedAt: new Date(),
          teamId: teamId
        });
      } else {
        return await this.create({
          createdAt: new Date(),
          createdBy: userId,
          updatedAt: new Date(),
        });
      }

    } catch (e) {
      throw new HttpErrors[500](AnnotationUserMessages.PROJECT_ID_CREATE_FAIL);
    }
  }





  /**
   * Use for delete the initially created project
   * @param projectId {string} id of the project
   * @returns deleted object or error message
   */
  async projectInitialDelete(projectId: string) {
    try {
      await this.deleteById(projectId);
      return {result: AnnotationUserMessages.PROJECT_DELETE_SUCCESS};
    } catch {
      return {result: AnnotationUserMessages.PROJECT_DELETE_NOT_FOUND};
    }
  }






  /**
   * Use for update the project details
   * @param projectId {string} id of the project which is going to update
   * @param updateOvj {object} updating object
   * @returns updated project details
   */
  async updateProject(projectId: string, updateOvj: object) {
    return await this.updateById(projectId, updateOvj);
  }


  /**
   * Use for get the uploaded file list details
   * @param projectId {string} id of the project
   * @returns uploaded file list details
   */
  async getProjectFileList(projectId: string) {
    return await this.findOne(
      {
        where: {id: projectId},
        //fields: {uploadFileList: true}
      }
    )
  }


  /**
   *
   * @param projectId
   * @param labelKey
   * @param label
   * @returns
   */
  async createLabel(projectId: string, labelKey: string, label: LabelInfo) {
    let projObj = await this.findById(projectId);
    if (!(projObj.labels)) {
      projObj.labels = [label]
    }
    for (let i in projObj.labels) {
      if (projObj.labels[i].key == labelKey) {
        projObj.labels[i] = label

        return await this.updateById(projectId, projObj)
      }
    }
    projObj.labels.push(label)
    return await this.updateById(projectId, projObj)
  }



  /**
   * Use for filter a one document object
   * @param projectId {string} id of the project
   * @returns filtered object
   */
  async findOneDocument(filter: object) {
    // return await this.findOne(filter)
    let projectDetails = await this.findOne(filter);
    let labels = projectDetails?.labels;
    // let isEditable: boolean = true;

    if (labels) {
      for (let label of labels) {
        if (label.count && label.count > 0) label.isEditable = false;
        else label.isEditable = true;
      }
    }
    return labels;


  }


  /**
   * Use for delete the label from the project id
   * @param projectId {string} id of the project
   * @param labelKey {string} key of the label
   * @returns updated object
   */
  async deleteLabel(projectId: string, labelKey: string) {
    let projObj = await this.findById(projectId);
    if (!projObj) return {result: "Invalid projectId"}
    if (!projObj.labels) return {result: "No labels yet"}

    let tempObjList: LabelInfo[] = []
    for (let obj of projObj.labels) {
      //if(!obj.isAbleDelete){}
      if (obj.key != labelKey) {
        tempObjList.push(obj)
      } else {
        if (obj.count == 0 || !obj.count) {
          obj.isAbleDelete = true
        } else {
          obj.isAbleDelete = false
        }
        if (!obj.isAbleDelete) {
          tempObjList.push(obj)
        }
      }
    }
    projObj.labels = tempObjList
    return await this.updateById(projectId, projObj);
  }





  async getDocumentList(projectId: string) {
    let projectObj = await this.findOne({
      where: {id: projectId}
    })
    if (!projectObj) return {result: "projectId invalid"}
    if (projectObj.documentations) {
      return projectObj.documentations
    }
    return []
  }

  /**
   * Get project list when data set editing
   * @param usedProjects already used projects of data set version
   * @param teamId {string} teamId of the projects which needed
   * @returns project list containing isSelected flag
   */
  async userProjectList(usedProjects: any[], teamId?: string) {
    let _usedProjects = usedProjects.map(projectId => {
      return (projectId.toString());
    });
    let projectList: AnnotationProject[];
    if (teamId) {
      let param = [
        {
          $match: {
            teamId: new ObjectId(teamId),
            name: {$exists: true, "$ne": null},

          }

        },
        {$lookup: {from: 'AnnotationTask', localField: '_id', foreignField: 'projectId', as: 'tasks'}},
        {$project: {id: "$_id", _id: 0, name: 1, contentType: 1}}
      ]
      projectList = await this.aggregate(param)

    } else {

      let param = [
        {
          $match: {
            name: {$exists: true, "$ne": null},
          }
        },
        {$lookup: {from: 'AnnotationTask', localField: '_id', foreignField: 'projectId', as: 'tasks'}},
        {$project: {id: "$_id", _id: 0, name: 1, contentType: 1, }}
      ]
      projectList = await this.aggregate(param)

    }
    let _projectList = projectList.map(project => {
      let _project: Project = {
        id: project.id!,
        name: project.name!,
        contentType: project.contentType!
      }
      if (_usedProjects.includes(project.id?.toString())) _project.checked = true;
      else _project.checked = false;
      return _project;
    })

    return _projectList;
  }


  /**
   * Use for query data from method of aggregate
   * @param params {string[]} parameters for aggregate the database
   * @returns filtered data from database
   */
  public async aggregate(params?: any[]) {
    if (!params) params = [];
    const response = await (this.dataSource.connector as any)
      .collection('AnnotationProject')
      .aggregate(params)
      .get();
    return response;
  }
}

export enum RANGE {
  THIRTY_DAYS = 1,
  NINETY_DAYS = 2,
  ONE_YEAR = 3,
  ALL = 4,
}

export enum RangeValue {
  thirtyDays = 30,
  NinetyDays = 90,
  OneYear = 12,
}

export interface Project {
  id: string;
  name: string;
  contentType: number;
  checked?: boolean;
}

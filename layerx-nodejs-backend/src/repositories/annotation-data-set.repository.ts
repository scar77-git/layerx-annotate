/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 *repository class that use for Service interface that provides strong-typed data access operation in annotationDataSet model
 */

/**
 * @class annotationDataSetRepository
 * purpose of task repository is to query and create Annotation Data Set Meta data
 * @description repository class that use for Service interface that provides strong-typed data access operation in annotationDataSet model
 * @author chathushka
 */

import {inject} from '@loopback/core';
import {DefaultCrudRepository, repository} from '@loopback/repository';
import {ObjectId} from 'mongodb';
import {logger} from '../config';
import {MongoDataSource} from '../datasources';
import {
  AnnotationDataSetGroup,
  annotationDataSetRelations, DataSetMeta,
  DataSetStat,
  DataSetStatsModel,
  DataSetSubLabelElementModel,
  GridClassAttributes
} from '../models';
import {SubLabelCount} from '../services/project-stats-update.service';
import {AnnotationFrameRepository} from './annotation-frame.repository';
import {AnnotationProjectRepository} from './annotation-project.repository';
import {AnnotationTaskRepository} from './annotation-task.repository';

export class AnnotationDataSetRepository extends DefaultCrudRepository<
  AnnotationDataSetGroup,
  typeof AnnotationDataSetGroup.prototype.id,
  annotationDataSetRelations
> {
  constructor(
    @inject('datasources.mongo') dataSource: MongoDataSource,
    @repository(AnnotationProjectRepository)
    public annotationProjectRepository: AnnotationProjectRepository,
    @repository(AnnotationFrameRepository)
    public annotationFrameRepository: AnnotationFrameRepository,
    @repository(AnnotationTaskRepository)
    public annotationTaskRepository: AnnotationTaskRepository,
  ) {
    super(AnnotationDataSetGroup, dataSource);
  }

  /**
   * Use for create the DataSetMeat object in database (Details about the dataSET)
   * @param projectList {string[]} projectId list included in the dataSet
   * @param dataSetName {string} name of the dataSet
   * @param createdBy {string} name of the user who created it
   * @returns Created object
   */
  async createDataSetEssential(
    projectList: string[],
    dataSetName: string,
    createdBy: string,
  ) {

    /**
     * Use for find the,
     * (taskStatus = completed and auditStatus = accepted)
     * task list of dataSet projects
     */
    let taskListObj = await this.annotationTaskRepository.taskListOfDataSet(
      projectList,
    );

    if (taskListObj.length != 0) {
      let taskList: string[] = await taskListObj.map((element: {_id: any}) => {
        return element._id!;
      });
      /**
       * Find label list of the projects
       */
      let labelList = await this.annotationProjectRepository.findLabelList(
        projectList,
      );
      let labels: {[key: string]: number} = {};
      labelList.forEach(element => {
        labels[element.label] = element.index;
      });
      let labelListNew: GridClassAttributes[] = []
      for (let obj of labelList) {
        let isInclude = false
        for (let objNew of labelListNew) {
          if (obj.label == objNew.label) isInclude = true
        }
        if (!isInclude) labelListNew.push(obj)
      }
      for (let i in labelListNew) {
        for (let j in labelListNew[i].attributes) {
          labelListNew[i].attributes[j].selected = false;
          //let l = 0;
          labelListNew[i].attributes[j].values = labelListNew[i].attributes[j].values.map(obj => {
            return {
              valueName: obj.valueName,
              imgURL: obj.imgURL,
              selected: false,
              annotatedCount: obj.annotatedCount,
              description: obj.description,
              isDefault: obj.isDefault,
              imgFile: obj.imgFile
            }
          })
        }
      }
      let gridClassAttributes = labelListNew
      /**
       * create dataSetMeta object before entering database
       */
      let dataSetMeta: DataSetMeta = {
        name: dataSetName,
        labels: labels,
        createdBy: createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
        projects: projectList,
        taskList: taskList,
        gridClassAttributes: gridClassAttributes,
      }
      /**
       * Create essential dataSetMeta details
       * essential - this is done because of speedup the request of dataSet creation.
       * Here create DataSetMeta with essential details for send python server request
       */
      let dataSetDetails = await this.create(dataSetMeta);

      /**
       * Update with non - essential dataSetMeta details
       */
      await this.createCompletedDataSet(projectList, dataSetDetails.id, taskList);

      return await this.findById(dataSetDetails.id); // dataSetDetails to send back to the client
    }
  }





  /**
   * Use for complete and update the dataSet fields
   * This function runs in background after creating dataSet for add other fields to created DataSet Document
   * @param projectList {string[]} projectId list of the created dataSet
   * @param dataSetId {string} id of the dataSet
   */
  async createCompletedDataSet(
    projectList: string[],
    dataSetId: string,
    taskList: string[],
  ) {

    let taskIdList = taskList.map(id => new ObjectId(id))
    let projectIdtList = projectList.map(id => new ObjectId(id))

    let paramsSubLabel = [
      {
        $match:
          {_id: {$in: taskIdList}}
      },
      {
        $project:
        {
          labelCounts: 1,
          _id: 0
        }
      },
      {$unwind: "$labelCounts.labelList"},
      {
        $project:
        {
          label: "$labelCounts.labelList",
          _id: 0
        }
      },
      {$unwind: "$label.attributes"},
      {
        $group:
        {
          _id:
          {
            label: "$label.label",
            subLabel: "$label.attributes.value"
          },
          count: {
            $sum: "$label.attributes.count"
          }
        }
      },
      {
        $project:
        {
          label: "$_id.label",
          subLabel: "$_id.subLabel",
          count: 1,
          _id: 0
        }
      }
    ]

    let subLabelCountList: SubLabelCount[] = await this.annotationTaskRepository.findAllTaskOfProject(paramsSubLabel);
    logger.debug(subLabelCountList);

    let paramsForLabel = [
      {$match: {_id: {$in: projectIdtList}}},
      {$unwind: "$labels"},
      {$project: {"label": "$labels.label", _id: 0, "labels.attributes.key": 1}},
      {$project: {attributes: "$labels.attributes", label: 1}}
    ]

    let projectLabelList = await this.annotationProjectRepository.aggregate(paramsForLabel)
    logger.debug('project Label list: ', projectLabelList);

    let projectLabelListString: string[] = []
    let projectAttributeList: {
      label: string,
      attributes:
      {
        key: string
      }[]
    }[] = []
    for (let labelObj of projectLabelList) {
      if (!projectLabelListString.includes(labelObj.label)) {
        projectLabelListString.push(labelObj.label)
        projectAttributeList.push(labelObj)
      }
    }
    logger.debug('projectAttributeList Label list: ', projectAttributeList);


    /**
     * Calculate function for dataSetStats like label and attribute counts.
     */

    let labelAttributeList: DataSetStat[] = await this.annotationFrameRepository.findDataSetStats(taskList);

    for (let index in labelAttributeList) {

      labelAttributeList[index].label.push(labelAttributeList[index].mainLabel)
      for (let obj of projectAttributeList) {
        if (obj.label == labelAttributeList[index].mainLabel) {

          for (let attribute of obj.attributes) {
            if (labelAttributeList[index].attributes[attribute.key]) {
              labelAttributeList[index].label.push(labelAttributeList[index].attributes[attribute.key])
            }
          }
        }
      }



    }


    let dataSetStats: DataSetStatsModel[] = []
    for (let labelObj of projectLabelListString) {
      let tempObj: DataSetStatsModel = {
        labelName: '',
        totalObjects: 0,
        percentage: 0,
        subLabels: []
      }
      tempObj.labelName = labelObj
      let count = 0
      let tempSubLabelObjList: DataSetSubLabelElementModel[] = []

      for (let index in subLabelCountList) {
        if (labelObj == subLabelCountList[index].label) {
          let tempSubLabelObj: DataSetSubLabelElementModel = {
            labelName: '',
            objectCount: 0
          }
          tempSubLabelObj.labelName = subLabelCountList[index].subLabel
          tempSubLabelObj.objectCount = subLabelCountList[index].count

          tempSubLabelObjList.push(tempSubLabelObj)
        }
      }
      for (let obj of labelAttributeList) {
        if (obj.mainLabel == labelObj) {
          count += obj.count
        }
      }
      tempObj.totalObjects = count
      tempObj.subLabels = tempSubLabelObjList


      dataSetStats.push(tempObj)

    }
    let totalCount = 0
    for (let item of dataSetStats) {
      totalCount += item.totalObjects
    }

    for (let index in dataSetStats) {

      let percentageLabel = Math.ceil(dataSetStats[index].totalObjects / totalCount * 100 * 10) / 10
      if (percentageLabel > 0.1) {
        percentageLabel = Math.round(dataSetStats[index].totalObjects / totalCount * 100 * 10) / 10
      }
      dataSetStats[index].percentage = percentageLabel
      for (let j in dataSetStats[index].subLabels) {
        let percentageAttribute = Math.ceil(dataSetStats[index].subLabels[j].objectCount / dataSetStats[index].totalObjects * 100 * 10) / 10
        if (percentageAttribute > 0.1) {
          percentageAttribute = Math.round(dataSetStats[index].subLabels[j].objectCount / dataSetStats[index].totalObjects * 100 * 10) / 10
        }
        dataSetStats[index].subLabels[j].percentage = percentageAttribute
      }
    }
    let dataSetObj = await this.findOne({
      where: {id: dataSetId},
      fields: {gridClassAttributes: true}
    })
    if (dataSetObj) {
      for (let item of dataSetObj.gridClassAttributes!) {
        for (let index in dataSetStats) {
          if (dataSetStats[index].labelName == item.label) {
            let tempList: DataSetSubLabelElementModel[] = []
            for (let obj of item.attributes) {
              for (let value of obj.values) {
                for (let j in dataSetStats[index].subLabels) {
                  if (value.valueName == dataSetStats[index].subLabels[j].labelName) {
                    tempList.push(dataSetStats[index].subLabels[j])
                  }
                }

              }
            }
            dataSetStats[index].subLabels = tempList
          }

        }

      }
    }
    dataSetStats.sort((a, b) => a.totalObjects < b.totalObjects ? 1 : a.totalObjects > b.totalObjects ? -1 : 0)

    for (let item of dataSetStats) {
      item.totalObjects
    }




    /**
     * find Total count Frame object list for the taskList of dataSet
     */
    let totalFrames =
      await this.annotationFrameRepository.getTotalFramesOfTaskList(taskList);
    logger.debug('total frame count of dataSet: ', totalFrames);

    /**
     * find Total Box object list for the taskList of dataSet
     */
    let totalBoxes =
      await this.annotationFrameRepository.getTotalBoxesOfTaskList(taskList);
    logger.debug('total box count of dataSet: ', totalBoxes);

    /**
     * Create the updating object for fill the empty fields of dataSet
     */
    let dataSetMeta: DataSetMeta = {
      labelAttributeList: labelAttributeList,
      augmentations: [],
      dataSetAttributeList: dataSetStats,
      totalFrames: totalFrames[0].count,
      totalBoxes: totalBoxes[0].count,
      statsSummary: {
        totalFrames: totalFrames[0].count,
        totalBoxes: totalBoxes[0].count
      }
    }
    /**
     * Update the dataSet document with dataSetId
     */
    return await this.updateById(dataSetId, dataSetMeta);
  }







  /**
   * Use for query the dataSet list
   * @returns dataSetMeta list
   */
  async getDataSetList(teamId?: string) {
    /**
     * find and returns the dataSet list of the user
     */
    let dataSetList
    if (!teamId) {
      dataSetList = await this.find(
        {
          fields: {id: true, createdAt: true, createdBy: true, name: true, projects: true}
        }
      );
    } else {
      dataSetList = await this.find(
        {
          where: {teamId: teamId},
          fields: {id: true, createdAt: true, createdBy: true, name: true, projects: true}
        }
      );
    }

    return dataSetList

  }






  /**
   * Use for edit the dataSetMeta of the dataSet
   * @param dataSetMetaId {string} dataSetMeta id
   * @param editObj {object} details for edit the document fields
   * @returns
   */
  async editDataSetMeta(dataSetMetaId: string, editObj: DataSetMeta) {
    try {
      /**
       * update the dataSet by id with new values
       */
      //await this.updateById(dataSetMetaId, editObj);


      return {result: 'updating success'};
    } catch (error) {
      return {result: error};
    }
  }






  /**
   * Use for delete the dataSetMeta of the dataSet
   * @param dataSetName
   * @param dataSetId {string} dataSetMeta id
   */
  async deleteDataSetMeta(dataSetName: string, dataSetId: string) {
    /**
    * delete the dataSet by id
    */
    let deleteObj = await this.findOne({where: {name: dataSetName}});

    if (deleteObj instanceof AnnotationDataSetGroup) {
      await this.deleteById(deleteObj.id);
      return {result: 'deleting success'};
    }
    return {result: 'dataSet name invalid'};
  }





  /**
   * Use for find the dataSet stats
   * @param dataSetId {string} id of the dataSet
   * @returns dataSet stat object
   */
  async getDataSetOverViewStats(dataSetId: string) {
    /**
     * Query the dataSet stats
     */
    const statObj = await this.findById(dataSetId, {
      fields: {
        dataSetAttributeList: true,
        statsSummary: true
        //totalFrames: true,
        //totalBoxes: true
      }
    })
    logger.debug('Query the dataSet stats finished');
    statObj.statsSummary?.totalBoxes
    let returnObj = {
      totalBoxes: statObj.statsSummary?.totalBoxes,
      totalFrames: statObj.statsSummary?.totalFrames,
      dataSetStats: statObj.dataSetAttributeList
    }



    return returnObj;
  }

  /**
   * Use for query the dataSet labels
   * @param dataSetId {string} id of the dataSet
   * @returns list of the dataSet labels objects
   */
  async getLabelList(dataSetId: string) {
    /**
     * Query the dataSet labels
     */
    const statObj = await this.findById(dataSetId, {
      fields: {
        labelAttributeList: true,
        totalFrames: true,
        totalBoxes: true,
      },
    });
    return statObj;
  }






  /**
   * Use for Update the LabelList with users selection
   * @param dataSetId {string} id of the dataSet
   * @param updatedLabelList users updated label list
   * @returns list of updated labels and counts
   */
  async updateLabelList(dataSetId: string, updatedLabelList: DataSetStat[]) {
    /**
     * use for count the new frame count
     */
    let newObjectCount = 0;
    for (let i in updatedLabelList) {
      if (updatedLabelList[i].isEnabled == true) {
        newObjectCount += updatedLabelList[i].count;
      }
    }

    let updatedObj: DataSetMeta = {
      labelAttributeList: updatedLabelList,
      //totalBoxes: newObjectCount
    };

    /**
     * update the database with selected labels
     */
    try {
      this.updateById(dataSetId, updatedObj);
      logger.debug(`label list of dataSetId ${dataSetId} updated`);
    } catch (error) {
      logger.debug(`label list of dataSetId ${dataSetId} failed`);
    }

    updatedObj.totalBoxes = newObjectCount;
    return updatedObj;
  }






  /**
   * Use for get dataSet Meta info from database
   * @param dataSetId {string} id of the dataSet
   * @returns dataSet details object
   */
  async getDataSetMeta(dataSetId: string) {
    return await this.findById(dataSetId);
  }

  /**
   * Use for get dataSet boxes with paging, Filters will be included
   * @param dataSetId {string} id of the dataSet
   * @param pageIndex {number} page index number
   * @param pageSize {number} pagesize is less than 10,000
   * @returns dataSet box list for relevant page index and number
   */
  async getDataSet(dataSetId: string, pageIndex: number, pageSize: number) {
    if (pageSize > 10000) {
      return {result: 'page size must be less than 10,000'};
    }
    const dataSetMeatInfo: AnnotationDataSetGroup = await this.findById(
      dataSetId,
    );

    if (!dataSetMeatInfo) {
      return {result: `cannot find dataSet of dataSetId: ${dataSetId}`};
    }

    let taskListString: string[] = dataSetMeatInfo.taskList!;
    let taskList: ObjectId[] = taskListString.map(element => {
      return new ObjectId(element);
    });

    return await this.annotationFrameRepository.getDataSetFrameBoxes(
      taskList,
      pageIndex,
      pageSize,
    );
  }


  /**
   * remove data set version id from data set group, when version is deleting
   * @param dataSetVersionId
   */
  async removeDataSetVersionsFromDataSetGroup(dataSetVersionId: string) {

    let _dataSetVersionId = new ObjectId(dataSetVersionId);
    let params = {"datasetVersions": _dataSetVersionId};

    /**
     * remove data set version from data set group
     */
    await this.updateManyRemoveFromList(params,
      {
        datasetVersions: _dataSetVersionId
      }
    )

  }





  //---------------------------------------------------
  //aggregates
  /**
   * Use for query data from method of aggregate
   * @param params {string[]} parameters for aggregate the database
   * @returns filtered data from database
   */
  public async aggregate(params?: any[]) {
    if (!params) params = [];
    const response = await (this.dataSource.connector as any)
      .collection('AnnotationDataSetGroup')
      .aggregate(params)
      .get();
    return response;
  }






  /**
   * MongoDB direct updateMany in AnnotationFrame
   * @param params {object} filter Object
   * @param data {object} updating data
   * @returns response
   */
  public async updateManyPushToList(params: any, data: any) {
    if (!params || !data) return
    const response = await (this.dataSource.connector as any)
      .collection('AnnotationDataSetGroup')
      .updateMany(params, {$push: data})
    logger.debug('MongoDB frame updateMany modified count:', response.modifiedCount)
    return response;
  }

  /**
 * remove element form array
 * @param params {object} filter Object
 * @param data {object} updating data
 * @returns response
 */
  public async updateManyRemoveFromList(params: any, data: any) {
    if (!params || !data) return
    const response = await (this.dataSource.connector as any)
      .collection('AnnotationDataSetGroup')
      .updateMany(params, {$pull: data})
    logger.debug('MongoDB data set group updateMany modified count(versions removed):', response.modifiedCount)
    return response;
  }
}

/**
 * interface for dataSetStats sending object
 */
export interface dataSetStatSend {
  dataSetStats: object[];
  totalFrames: number;
  totalBoxes: number;
  labelAttributeCount: object[];
}

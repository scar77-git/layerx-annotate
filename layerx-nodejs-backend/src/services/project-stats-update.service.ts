/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 *update the projectStatOverTime field in project model
 */

/**
 * @class Project stats Update service
 * purpose of this service is to update the stats of the project when save the project data and change of status
 * @description update the projectStatOverTime field in project model
 * @author chathushka
 */

import { /* inject, */ BindingKey, BindingScope, injectable} from '@loopback/core';
import {repository} from '@loopback/repository';
import {ObjectId} from 'mongodb';
import {logger} from '../config';
import {AnnotationProject, AttributeLabelList, ProjectStatsModel, SubLabelElementModel} from '../models';
import {AnnotationFrameRepository, AnnotationProjectRepository, AnnotationTaskRepository} from '../repositories';
import {projectStatUpdateMinutes} from '../settings/constants';

@injectable({scope: BindingScope.TRANSIENT})
export class ProjectStatsUpdateService {
  constructor(
    @repository(AnnotationTaskRepository)
    public annotationTaskRepository: AnnotationTaskRepository,
    @repository(AnnotationProjectRepository)
    public annotationProjectRepository: AnnotationProjectRepository,
    @repository(AnnotationFrameRepository)
    public annotationFrameRepository: AnnotationFrameRepository,
  ) { }

  /**
   * Aggregate project aren't updated withing 4 minutes
   */
  async aggregateProjectToUpdate() {
    let params: any[] = [];
    let currentTime = new Date();
    params = [
      {
        $match: {
          $or: [{
            projectStatsUpdateDate: {$lte: new Date(new Date().getTime() - (projectStatUpdateMinutes * 60 * 1000))}, projectStatPending: true
          },

          {"statsSummary.lastUpdatedTime": {$lte: new Date(new Date().getTime() - (projectStatUpdateMinutes * 60 * 1000))}, projectsSummaryPending: true}
          ]

        }
      }
    ]
    let projectsArray: any[] = await this.annotationProjectRepository.aggregate(params);
    logger.info(`number of projects to update ${projectsArray.length}`)
    for (let project of projectsArray) {
      await this.calcAttributeStatsProject(project._id);
      let taskList = await this.annotationTaskRepository.find({
        where: {projectId: project._id},
      });
      await this.annotationTaskRepository.updateProjectStats(taskList, project._id);
    }
  }

  /**
   * Use for update Task Completed OverTime
   * @param projectId {string} project id fore updateTaskCompletedOverTime
   */
  async updateTaskCompletedOverTime(projectId: string) {
    /**
     * find task list of project only taskId and completedAt
     */
    let params = [
      {$match: {projectId: new ObjectId(projectId), completedAt: {$exists: true}}},
      {$project: {completedAt: 1, status: 1}}
    ]
    let taskList = await this.annotationTaskRepository.findAllTaskOfProject(params);
    console.log(taskList[0]);
  }


  /**
   * Use for calculate the Attribute counts of the task
   * @param taskId {string} id of the task
   */
  async calcAttributeStatsTask(taskId: string) {

    /**
     * find the project id by using taskId
     */
    const projectId = (await this.annotationTaskRepository.findProjectBelongsTaskId(taskId))?.projectId;
    await this.annotationProjectRepository.updateById(projectId, {projectStatPending: true})

    /**
     * find the details of the project
     */
    const projectDetails: AnnotationProject = await this.annotationProjectRepository.findProjectById(projectId!);

    /**
     * Calculation code for attribute counts in task
     */
    let labelList = [];
    for (let label of projectDetails.labels!) {

      let subLabelList: AttributeLabelList[] = []
      let labelObj = {label: label, attributes: subLabelList}
      for (let attributeKey of label.attributes) {
        let params = [
          {$match: {taskId: new ObjectId(taskId), "isUserAnnotated": true}},
          {$unwind: "$boxes"},
          {
            $group:
            {
              _id: {
                label: `$boxes.boundaries.label`,
                attribute: `$boxes.attributeValues.${attributeKey.key}`
              },
              count: {$sum: 1}
            }
          },
          {$match: {"_id.label": label.label}},
          {$project: {value: "$_id.attribute", _id: false, count: true}}
        ]
        let subLabelCount = await this.annotationFrameRepository.aggregate(params);
        subLabelCount.forEach((element: AttributeLabelList) => {
          if (element.value) labelObj.attributes.push(element);
        });
        logger.debug(subLabelCount)
      }

      labelList.push(labelObj)
    }

    /**
     * find the task by id
     */
    let taskObj = await this.annotationTaskRepository.findById(taskId);

    for (let index in taskObj.labelCounts!.labelList) {
      for (let labels of labelList) {
        if (taskObj.labelCounts!.labelList[index].label == labels.label.label) {
          taskObj.labelCounts!.labelList[index].attributes = labels.attributes
        }
      }
    }

    /**
     * Update the task document with new attribute counts
     */
    await this.annotationTaskRepository.updateById(taskId, taskObj);
    /**
     * call the update project attribute function
     */
    this.calcAttributeStatsProject(projectId as string);
  }




  /**
   * Use for update the Attribute and label counts of the
   *  project
   * @param projectId {string} id of the project
   */
  async calcAttributeStatsProject(projectId: string) {

    /**
     * Find the project details by project id
     */
    let projObj = await this.annotationProjectRepository.findById(projectId)
    logger.debug("project id is :", projectId)

    const currTime = new Date();
    //project stat update once in every 4 minutes
    if (projObj.projectStatsUpdateDate instanceof Date &&
      projObj.projectStatsUpdateDate.getTime() > currTime.getTime() - projectStatUpdateMinutes * 60 * 1000) {
      logger.debug(

        ' last updated project on ' +
        projObj.projectStatsUpdateDate,
      );
      return;
    }

    let params = [
      {$match: {projectId: new ObjectId(projectId)}},
      {$project: {labelCounts: 1, _id: 0}},
      {$unwind: "$labelCounts.labelList"},
      {$project: {label: "$labelCounts.labelList", _id: 0}}
    ]
    /**
     * Find the all tasks of the project
     */
    let taskAttributeStatsList: AttributeStatsTask[] = await this.annotationTaskRepository.findAllTaskOfProject(params);

    /**
     * update the label count of the project
     */
    for (let j in projObj.labels!) {
      projObj.labels[j].count = 0
      for (let i in taskAttributeStatsList) {
        if (projObj.labels[j].label == taskAttributeStatsList[i].label.label) {
          projObj.labels[j].count! += taskAttributeStatsList[i].label.count
        }
      }
      if (projObj.labels[j].count != 0) {
        projObj.labels[j].isAbleDelete = false
      }
      if (projObj.labels[j].count == 0) {
        projObj.labels[j].isAbleDelete = true
      }
    }
    /**
     * code for calculate attribute counts in project
     */
    let paramsSubLabel = [
      {
        $match:
          {projectId: new ObjectId(projectId)}
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
    let labelList: string[] = []
    for (let element of projObj.labels!) {
      if (!labelList.includes(element.label)) {
        labelList.push(element.label);
      }
    }

    let statList: ProjectStatsModel[] = []
    let index = 0;
    for (let label of labelList) {
      let count = 0
      let subLabel: SubLabelElementModel[] = []
      //let index1 = 0;
      for (let element of subLabelCountList) {
        if (element.label == label) {
          count += element.count
          subLabel.push(
            {
              labelName: element.subLabel,
              objectCount: element.count
            })
        }
        //index1 += 1
      }
      let paramsProjectSubLabels = [
        {
          $match:
            {_id: new ObjectId(projectId)}
        },
        {$unwind: "$labels"},
        {
          $match:
            {"labels.label": `${label}`}
        },
        {$unwind: "$labels.attributes"},
        {$unwind: "$labels.attributes.values"},
        {
          $project:
          {
            subLabel: "$labels.attributes.values.valueName",
            _id: false
          }
        }
      ]
      let projectSubLabelList = await this.annotationProjectRepository.aggregate(paramsProjectSubLabels);

      let tempList = []
      for (let elementProj of projectSubLabelList) {
        for (let elementTemp of subLabel)
          if (elementProj.subLabel == elementTemp.labelName) {
            tempList.push(elementTemp);
          }
      }

      let paramsLabelCalc = [
        {$match: {projectId: new ObjectId(projectId)}},
        {$project: {"labelCounts": 1}},
        {$unwind: "$labelCounts.labelList"},
        {$match: {"labelCounts.labelList.label": label}},
        {$group: {_id: "$labelCounts.labelList.label", count: {$sum: "$labelCounts.labelList.count"}}}
      ]

      //HOT fix : stop updating label count to avoid performance issue
      //let labelCountObj = await this.annotationTaskRepository.aggregate(paramsLabelCalc)

      let labelCount = 0
      //if (labelCountObj[0]) labelCount = labelCountObj[0].count

      statList.push({labelName: label, totalObjects: labelCount, subLabels: tempList})
      index += 1
    }
    //logger.debug('statList is: ',statList[0]);
    projObj.projectStats = statList;
    /////////////////////////////////////////////////////////////////////////////////////////
    projObj.projectStatsUpdateDate = currTime;
    projObj.projectStatPending = false;
    /////////////////////////////////////////////////////////////////////////////

    /**
     * update the calculated project attribute counts
     */
    await this.annotationProjectRepository.updateById(projectId, projObj);

  }


  /**
   * Use for calculate the annotated boxes over time
   * @param taskId {string} id of the updated frame belong task
   * @returns Nothing
   */
  async calcAnnotatedOverTime(projectId: string, timeOffSet: Date = new Date()) {
    /**
     * find the details of the project
     */
    const projectDetails: AnnotationProject = await this.annotationProjectRepository.findProjectById(projectId!);
    ////////////////////////////////




    //////////////////////////////////
    let params = [
      {$match: {projectId: new ObjectId(projectId)}},
      {$project: {_id: 1}}
    ]
    let taskList = await this.annotationTaskRepository.findAllTaskOfProject(params);

    let taskIdList = taskList.map((element: any) => new ObjectId(element._id))
    //console.log(taskIdList)

    const date = timeOffSet;
    let today = date.getUTCDate();
    let month = date.getUTCMonth() + 1;
    let year = date.getUTCFullYear();

    let todayString;
    if (today < 10) {
      todayString = '0' + today;
    } else todayString = today;
    let monthString;
    if (month < 10) {
      monthString = '0' + month;
    } else monthString = month;
    logger.debug('today is: ', todayString, monthString, year);

    let dayMonthYear = `${year}-${monthString}-${todayString}`;
    let monthYear = `${year}-${monthString}`;
    //console.log(dayMonthYear)
    let param = [
      {
        $match:
        {
          "taskId":
            {$in: taskIdList},
          "isUserAnnotated": true,
          //"boxes.boundaries.createdAt": {$gte: new Date(dayMonthYear)}
          "annotatedAt": {$gte: new Date(dayMonthYear)}
        }
      },
      {
        $project:
        {
          boxes: 1,
          annotatedAt: 1
        }
      },
      {$unwind: "$boxes"},
      {$count: "count"}
    ]

    let countObj = await this.annotationFrameRepository.aggregate(param);
    let annotatedSummeryObj = {
      date: dayMonthYear,
      count: 0
    }
    if (countObj[0]) {
      //logger.debug('count is: ', countObj[0].count);;

      annotatedSummeryObj = {
        date: dayMonthYear,
        count: countObj[0].count
      }
    }

    if (!projectDetails.annotatedOverTimeStats) projectDetails.annotatedOverTimeStats = [annotatedSummeryObj]
    else {
      for (let index in projectDetails.annotatedOverTimeStats) {
        if (projectDetails.annotatedOverTimeStats[index].date == dayMonthYear) {
          projectDetails.annotatedOverTimeStats[index] = annotatedSummeryObj;
          this.calcAnnotatedMonthlyOverTime(projectId!, taskIdList, monthYear, projectDetails)
          return
        }
      }
      projectDetails.annotatedOverTimeStats.unshift(annotatedSummeryObj);
    }
    this.calcAnnotatedMonthlyOverTime(projectId!, taskIdList, monthYear, projectDetails)



  }


  /**
   * Use for update the monthly annotated count over the time
   * @param projectId {string} id of the project
   * @param taskIdList {ObjectId{]}} list of the id of task of relevant project
   * @param monthYear {string} month and year as string
   * @param projectDetails {object} project document details
   * @returns nothing
   */
  async calcAnnotatedMonthlyOverTime(
    projectId: string,
    taskIdList: ObjectId[],
    monthYear: string,
    projectDetails: AnnotationProject) {

    let paramForMonth = [
      {
        $match:
        {
          "taskId":
            {$in: taskIdList},
          "isUserAnnotated": true,
          "annotatedAt": {$gte: new Date(monthYear)}
        }
      },
      {
        $project:
        {
          boxes: 1,
          annotatedAt: 1
        }
      },
      {$unwind: "$boxes"},
      {$count: "count"}
    ]

    let countMonthObj = await this.annotationFrameRepository.aggregate(paramForMonth);

    let annotatedMonthSummeryObj = {
      date: monthYear,
      count: 0
    }

    if (countMonthObj[0]) {
      //logger.debug('count is: ', countMonthObj[0].count);

      annotatedMonthSummeryObj = {
        date: monthYear,
        count: countMonthObj[0].count
      }
    }
    if (!(projectDetails.annotatedOverTimeMonthlyStats)) projectDetails.annotatedOverTimeMonthlyStats = [annotatedMonthSummeryObj]
    else {
      for (let index in projectDetails.annotatedOverTimeMonthlyStats!) {

        if (projectDetails.annotatedOverTimeMonthlyStats[index].date == monthYear) {
          projectDetails.annotatedOverTimeMonthlyStats[index] = annotatedMonthSummeryObj;
          this.annotationProjectRepository.updateById(projectId, projectDetails);
          return
        }
      }
      projectDetails.annotatedOverTimeMonthlyStats!.unshift(annotatedMonthSummeryObj);
    }
    this.annotationProjectRepository.updateById(projectId, projectDetails);
  }



  /**
   * Use for get the date list for the given period before the given date
   * @param lengthDiff {number} needed date amount
   * @param lastDate {string} date for reference
   * @returns date list
   */
  async getDateList(lengthDiff: number, lastDate: string) {
    let dateList = [];
    let date = new Date(lastDate);
    let time = date.getTime()
    for (let i = 0; i < lengthDiff; i++) {
      time += (-86400 * 1000)
      dateList.push(new Date(time));
    }
    return dateList;
  }



  /**
   * Use for get the month list for the given period before the given date
   * @param lengthDiff {number} needed month amount
   * @param lastDate {string} date for reference
   * @returns month list
   */
  async getMonthList(lengthDiff: number, lastDate: string) {
    let dateList = [];
    let date = new Date(lastDate);
    let time = date.getTime()
    for (let i = 0; i < lengthDiff; i++) {
      time += (-86400 * 1000 * 28)
      dateList.push(new Date(time));
    }
    return dateList;
  }

}
export const PROJECT_STATS_UPDATE_SERVICE =
  BindingKey.create<ProjectStatsUpdateService>('service.projectStatsUpdateService');



export interface AttributeStatsTask {
  label:
  {
    label: string,
    color: string,
    count: number,
    attributes:
    {
      count: number,
      value: string
    }[]
  }
}
export interface SubLabelCount {
  count: number,
  label: string,
  subLabel: string
}

export interface SubLabelElement {
  labelName: string,
  objectCount: number
}





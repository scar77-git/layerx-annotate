/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 *repository class that use handle the request-response lifecycle for API for the annotation-frame model
 */

/**
 * @class AnnotationFrameRepository
 * purpose of frame repository is performing crud operations
 * @description repository class that use handle the request-response lifecycle for API for the AnnotationFrame model
 * @author chathushka
 */
import {Getter, inject} from '@loopback/core';
import {
  BelongsToAccessor,
  DefaultCrudRepository,
  repository
} from '@loopback/repository';
import fs from 'fs-extra';
import {ObjectId} from 'mongodb';
import path from 'path';
import {logger} from '../config';
import {MongoDataSource} from '../datasources';
import {
  AnnotationData, AnnotationFrame,
  AnnotationFrameRelations,
  AnnotationModel,
  AnnotationTask, CommentBox, SVGTransformFactor
} from '../models';
import {sanitizeRegexp as sanitizeBeforeRegexp} from '../tools';
import {AnnotationTaskRepository} from './annotation-task.repository';
import {AnnotationUserRepository} from './annotation-user.repository';
const Axios = require('axios')
const sharp = require('sharp');

export class AnnotationFrameRepository extends DefaultCrudRepository<
  AnnotationFrame,
  typeof AnnotationFrame.prototype.id,
  AnnotationFrameRelations
> {
  public readonly taskFrame: BelongsToAccessor<
    AnnotationTask,
    typeof AnnotationFrame.prototype.id
  >;

  constructor(
    @inject('datasources.mongo') dataSource: MongoDataSource,
    @repository.getter('AnnotationTaskRepository')
    protected annotationTaskRepositoryGetter: Getter<AnnotationTaskRepository>,
    @repository(AnnotationTaskRepository)
    public annotationTaskRepository: AnnotationTaskRepository,
    @repository(AnnotationUserRepository)
    private userRepo: AnnotationUserRepository,
  ) {
    super(AnnotationFrame, dataSource);
    this.taskFrame = this.createBelongsToAccessorFor(
      'taskFrame',
      annotationTaskRepositoryGetter,
    );
    this.registerInclusionResolver(
      'taskFrame',
      this.taskFrame.inclusionResolver,
    );
  }



  /**
   * Use for find the frame list for given task
   * @param taskId {string} task id which is has many frames
   * @param xyFactor {number} SVG transform factor to convert image coordinates to SVG
   * @returns it returns the list of frame annotated data
   */
  async getFrameList(taskId: string, xyFactor: SVGTransformFactor) {
    //logger.debug('frame list db query start');
    const frames = await this.find({
      where: {taskId: taskId},
      order: ['frameId ASC'],
      fields: {
        datasetVersions: false,
        awsExpiredDate: false,
        imageUrl: false,
        thumbnailUrl: false,
        awsThumbnailExpiredDate: false,
        awsThumbnailUr: false
      }
    });
    //logger.debug('frame list db query end and process start');
    frames.forEach(frame => {
      if (frame.boxes) {
        frame.boxes.forEach(box => {
          if (box.boundaries) {
            box.boundaries.x *= xyFactor.xFactor;
            box.boundaries.y *= xyFactor.yFactor;
            box.boundaries.w *= xyFactor.xFactor;
            box.boundaries.h *= xyFactor.yFactor;
          }
        });
      }
    });
    //logger.debug('frame list process end');
    return frames;
  }


  async getEntireList(){
    const frames = await this.find();
    return frames;
  }






  /**
   * Use for update annotated data frame
   * @param taskId {string} task id of the frame
   * @param frameId {number} frame id of the frame
   * @param annotatedData {object} annotated data
   * @param xyFactor {object} X and Y transform factors to convert SVG coordinates to Image coordinates
   * @returns result success or error
   */
  async updateFrame(
    taskId: string,
    frameId: number,
    annotationBoxes: AnnotationData[],
    commentBoxes: CommentBox[],
    isEmpty: boolean,
    userLog: string[],
    xyFactor: SVGTransformFactor,
    userId: string,
  ) {
    let oldFrame = await this.findOne({
      where: {and: [{taskId: taskId}, {frameId: frameId}]},
    });

    //Transform coordinates
    // if (annotationBoxes) {
    //   annotationBoxes.forEach(box => {
    //     if (box.boundaries) {
    //       box.boundaries.x /= xyFactor.xFactor;
    //       box.boundaries.y /= xyFactor.yFactor;
    //       box.boundaries.w /= xyFactor.xFactor;
    //       box.boundaries.h /= xyFactor.yFactor;
    //     }
    //   });
    // }

    logger.debug(
      'Updating frame ' +
      frameId +
      ' of task ' +
      taskId +
      ': transformed object: ',
    );
    //logger.debug(annotationBoxes);
    //let annotatorId = (await this.annotationTaskRepository.findById(taskId)).assignedAnnotatorId

    for (let index in annotationBoxes) {
      if (annotationBoxes[index].boundaries.annotatorId) {
        annotationBoxes[index].boundaries.annotatorId = new ObjectId(annotationBoxes[index].boundaries.annotatorId);
      }
      if (annotationBoxes[index].boundaries.createdAt) {
        annotationBoxes[index].boundaries.createdAt = new Date(annotationBoxes[index].boundaries.createdAt)
      }

    }

    let annotatedData: AnnotationModel = {
      taskId: taskId,
      frameId: frameId,
      boxes: annotationBoxes,
      commentBoxes: commentBoxes,
      isEmpty: isEmpty,
      userLog: userLog,
      isUserAnnotated: true,
    };
    if (annotatedData.boxes.length == 0) {
      annotatedData.isUserAnnotated = false;
    }

    let status = {result: 'error'};

    if (!oldFrame?.updatedAt) annotatedData.annotatedAt = new Date();

    try {
      if (oldFrame) {
        annotatedData.updatedAt = new Date();
        await this.updateById(oldFrame.id, annotatedData);

        status = {result: 'updating success'};
      } else {

        annotatedData.createdAt = new Date();
        annotatedData.updatedAt = new Date();
        await this.createFrame(annotatedData);

        status = {result: 'creating success'};
      }

      let maxId = 0;
      annotationBoxes.forEach(box => {
        if (box.boundaries.id > maxId) {
          maxId = box.boundaries.id;
        }
      });
      logger.debug('maxId' + maxId);

      let params = [
        {$match: {taskId: new ObjectId(taskId), isUserAnnotated: true}},
        {$unwind: '$boxes'},
        {$group: {_id: '$boxes.boundaries.label', count: {$sum: 1}}},
        {$project: {label: '$_id', count: 1, _id: 0}},
      ];

      let labelList: labelList[] = await this.aggregate(params);


      let frames = await this.find({
        where: {and: [{taskId: taskId}, {isUserAnnotated: true}]},
      });
      let framesCount = frames.length;
      this.annotationTaskRepository.updateTaskFrameCreate(
        taskId,
        framesCount,
        labelList,
        maxId,
      );



      return status;
    } catch (error) {
      return error;
    }
  }

  /**
   * Use for create new annotated data frame
   * @param annotatedData {object}
   * @returns the status of creation
   */
  async createFrame(annotatedData: object) {
    try {
      await this.create(annotatedData);
      return {result: 'success'};
    } catch {
      return {result: 'error'};
    }
  }





  /**
   * Use for update the status of the frame in database
   * @param taskId {string} task id of the frame which belongs to
   * @param frameId {number} frame id of the frame
   * @param status {number} status of the frame
   * @returns result of update (success or failed)
   */
  async updateStatus(taskId: string, frameId: number, status: number) {
    try {
      //let oldFrame: frame
      let oldFrame = await this.findOne({
        where: {and: [{taskId: taskId}, {frameId: frameId}]},
      });
      oldFrame!.status = status;
      this.updateById(oldFrame?.id, oldFrame!);
      return {result: 'success'};
    } catch {
      return {result: 'error'};
    }
  }







  /**
   * get data for developers by filtering task list and labels
   * @param projectId {string} projectId
   * @param taskList {string[]} list of task Ids to filter
   * @param labels {string[]} list of labels to filter
   * @param pageSize {number} page size
   * @param pageIndex {number} page index
   */
  async getData(
    projectId: string,
    taskList: string[],
    labels: string,
    pageSize: number = 5,
    pageIndex: number,
  ) {
    let labelsArray: any[] = [];

    if (typeof labels == 'string' && labels != '') {
      {
        labelsArray = labels.split(',').map(i => i);
      }
    }
    let taskListArray: any[] = [];


    taskListArray = taskList.map(i => new ObjectId(i));

    logger.debug(labelsArray)
    try {
      if (pageSize < 10000) {
        if (taskList) {

          let params = [
            {$match: {taskId: {$in: taskListArray}}},
            {$unwind: '$boxes'},
            {$match: {'boxes.boundaries.label': {$in: labelsArray}}},
            {$skip: pageIndex * pageSize},
            {$limit: pageSize},
          ];

          let result = await this.aggregate(params);
          return result;
        } else {
          let params = [
            {$match: {taskId: {$in: taskListArray}}},
            {$unwind: '$boxes'},
            {$match: {'boxes.boundaries.label': {$in: labelsArray}}},
            {$project: {'boxes.boundaries.label': {$in: labelsArray}}},
            {$skip: pageIndex * pageSize},
            {$limit: pageSize},
          ];
          let result = await this.aggregate(params);
          return result;
        }
      } else {
        logger.debug(
          `page size must be below 10,000 for develop request on projectId ${projectId}`,
        );
        return {result: 'page size must be below 10,000'};
      }
    } catch {
      logger.debug(
        `Failed to find annotated data on request projectId ${projectId}`,
      );
      return {result: 'Failed to find annotated data on request'};
    }
  }








  /**
   * Use for count the dataSet stats at the starting of the dataSet
   * @param taskList {string[]} taskList of the dataSet
   * @returns dataSet stats
   */
  async findDataSetStats(taskList: string[], projectLabelList?: any) {

    let returnList: any = []

    let taskIdList = taskList.map(Element => new ObjectId(Element));
    for (let labelObj of projectLabelList) {


      let sortList: any = {}
      let groupObj: any = {}
      let projectObj: any = {}
      sortList[`mainLabel`] = 1
      let reverseArray = labelObj.attributes

      for (let i in reverseArray) {

        if (reverseArray[i].key) {
          sortList[`attributes.${reverseArray[i].key}`] = 1
          groupObj[`${reverseArray[i].key}`] = `$boxes.boundaries.attributeValues.${reverseArray[i].key}`
          projectObj[`attributes.${reverseArray[i].key}`] = `$_id.${reverseArray[i].key}`
        }


      }

      logger.debug("sorting element: ", sortList)
      let params = [
        {
          $match: {
            taskId: {$in: taskIdList},
          },
        },
        {$unwind: '$boxes'},
        {
          $project: {'boxes.boundaries.attributeValues.autoLable_confidance': 0},
        },
        {$match: {'boxes.boundaries.label': `${labelObj.label}`}},
        {
          $group: {
            _id: {
              label: '$boxes.boundaries.label',
              ...groupObj
            },
            count: {$sum: 1},
          },
        },
        {
          $project: {
            mainLabel: '$_id.label',
            ...projectObj,

            count: 1,
            label: [],
            _id: 0,
          },
        },
        {
          $addFields: {isEnabled: true},
        },
        {$sort: sortList}
      ];

      let dataSetStats = await this.aggregate(params);

      for (let obj of dataSetStats) {
        if (!obj.attributes) {
          obj.attributes = {}
        }
        returnList.push(obj)
      }
    }
    return returnList;
  }

  /**
   *
   * @param taskList
   * @returns
   */
  async getTotalFramesOfTaskList(taskList: string[]) {
    let taskIdList = taskList.map(Element => new ObjectId(Element));

    let params = [
      {
        $match: {
          taskId: {$in: taskIdList},
        },
      },
      {$count: 'count'},
    ];
    return await this.aggregate(params);
  }

  /**
   *
   * @param taskList
   * @returns
   */
  async getTotalBoxesOfTaskList(taskList: string[]) {
    let taskIdList = taskList.map(Element => new ObjectId(Element));

    let params = [
      {
        $match: {
          taskId: {$in: taskIdList},
        },
      },
      {$unwind: '$boxes'},
      {$count: 'count'},
    ];
    return await this.aggregate(params);
  }

  async getDataSetFrameBoxes(
    taskList: ObjectId[],
    pageIndex: number,
    pageSize: number,
  ) {
    let params = [
      {$match: {taskId: {$in: taskList}}},
      {$sort: {_id: 1}},
      {$project: {boxes: true, _id: false, taskId: true, frameId: true}},
      {$unwind: '$boxes'},
      {$skip: pageIndex * pageSize},
      {$limit: pageSize},
    ];
    return await this.aggregate(params);
  }

  /**
   * use for get list of comments for given task id
   * @param frameId {string} id of the frame
   * @returns list of comments for given frame id
   */
  async getFrameComments(taskId: string) {
    let params = [
      {$match: {taskId: new ObjectId(taskId)}},
      {$project: {comments: '$commentBoxes', frameId: '$frameId'}},
      {$unwind: {path: '$comments'}},
      {
        $project: {
          comments: '$comments',
          frameId: '$frameId',
          commentBoxId: '$comments.id',
        },
      },
      {$unwind: {path: '$comments.commentList'}},
      {
        $project: {
          comments: '$comments.commentList',
          frameId: '$frameId',
          isResolved: '$comments.isResolved',
          commentBoxId: '$commentBoxId',
        },
      },
      {
        $project: {
          userId: {
            $toObjectId: '$comments.userId',
          },
          comments: '$comments',
          frameId: '$frameId',
          isResolved: '$isResolved',
          commentBoxId: '$commentBoxId',
        },
      },
      {
        $lookup: {
          from: 'AnnotationUser',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $project: {
          profileImg: {$arrayElemAt: ['$user.imageUrl', 0]},
          //comments:"$comments",
          frameId: '$frameId',
          name: '$comments.userName',
          commentText: '$comments.commentText',
          date: '$comments.commentedDate',
          //profileImg: "$profileImg[0]",
          frameNo: '$frameId',
          commentBoxNo: {$ifNull: ['$commentBoxId', '1']},
          isResolved: '$isResolved',
        },
      },
    ];

    let frameData = await this.aggregate(params);

    // let comments = await frameData.foreach(
    //   async (element: any, index: number) => {
    //     return {
    //       name: element.comments.userName,
    //       commentText: element.comments.commentText,
    //       date: element.comments.commentedDate,
    //       profileImg: element.profileImg[0],
    //       frameNo: element.frameId,
    //       commentBoxNo: index,
    //       test: 'testText',
    //     };
    //   },
    // );

    return frameData;

    // return await new Promise((mainResolve) => {
    // })
    // let frameData: any = await this.findOne({
    //   where: {and: [{taskId: taskId}, {frameId: frameId}]},
    // });
    // console.log(JSON.stringify(frameData));
    // if (frameData && frameData.commentBoxes) {
    //   let commentList = frameData.commentBoxes[0].commentList;

    //   let comments = await commentList.map(
    //     async (element: any, index: number) => {
    //       //return await new Promise(resolve => {
    //       //this.userRepo.findById(element.userId).then(userData => {
    //       //let profileImg = userData.profileImgUrl;
    //       let profileImg = 'test';
    //       console.log(JSON.stringify(element) + '\n' + index);
    //       let returnObject = {
    //         name: element.userName,
    //         commentText: element.commentText,
    //         date: element.commentedDate,
    //         profileImg: profileImg,
    //         frameNo: frameData.frameId,
    //         commentBoxNo: index,
    //         test: 'testText',
    //       };
    //       console.log(JSON.stringify(returnObject));
    //       return returnObject;
    //       //});
    //       //});
    //     },
    //   );
    //   return comments;
    // } else return [];
  }

  /**
   * Use to get box count pf the user
   * @param userId {string}user Id
   * @param dayMonthYear (Date)
   * @returns box count
   */
  async getBoxCountOfUser(
    userId: string,
    dayMonthYear: string,
  ) {
    let param = [
      {
        $match:
        {
          "boxes.boundaries.annotatorId": new ObjectId(userId),
          "boxes.boundaries.createdAt": {$gte: new Date(dayMonthYear)}
        }
      },
      {$unwind: "$boxes"},
      {$match: {"boxes.boundaries.createdAt": {$gte: new Date(dayMonthYear)}}},
      {$count: "count"}
    ]
    return await this.aggregate(param)
  }

  /**
    * Get filter data grid
    * @param pageIndex page number
    * @param pageSize size of the page
    * @param searchKey search key
    * @param labelObj label object
    * @param taskList task Id list
    * @returns annotated data object(it contain image Url and, text data)
  */
  async filterDataGrid(
    pageIndex: number,
    pageSize: number,
    searchKey: string,
    labelObj: LabelObj[],
    taskList: string[],
    split: number[],
    dataSetVersionId: string
  ) {

    let _pageSize = pageSize || 10;
    let _pageIndex = pageIndex || 0;
    let param: any[] = [];
    let countParam: any[] = [];

    //convert task ID to Object Id
    let _taskList = taskList.map(taskId => {
      return new ObjectId(taskId);
    });

    param = [
      {
        $match: {
          taskId: {$in: _taskList},

          awsExpiredDate: {
            $gte: new Date()
          }, awsThumbnailExpiredDate: {
            $gte: new Date()
          },
        }
      },
      {
        $addFields: {
          "datasetVersions": {
            $filter:
            {
              input: "$datasetVersions",
              as: "datasetVersion",
              cond: {$eq: ["$$datasetVersion.versionId", new ObjectId(dataSetVersionId)]}
            }
          }
        }
      }

    ];

    countParam = [{
      $match: {
        taskId: {$in: _taskList},
      },


    },
    {
      $addFields: {
        "datasetVersions": {
          $filter:
          {
            input: "$datasetVersions",
            as: "datasetVersion",
            cond: {$eq: ["$$datasetVersion.versionId", new ObjectId(dataSetVersionId)]}
          }
        }
      }
    }
    ]

    if (split.length > 0) {
      countParam = [...countParam,

      {
        $addFields: {
          "splitVersions": {
            $filter: {
              input: "$datasetVersions",
              as: "datasetVersion",
              cond:
                {$in: ["$$datasetVersion.datasetType", split]}
            }
          }
        }
      },

      {
        $addFields: {
          versionArrLength: {
            $size: '$splitVersions',
          },
        },
      }, {$match: {versionArrLength: {$ne: 0}}},


      ];

      param = [...param,

      {
        $addFields: {
          "splitVersions": {
            $filter: {
              input: "$datasetVersions",
              as: "datasetVersion",
              cond:
                {$in: ["$$datasetVersion.datasetType", split]}

            }
          }
        }
      },

      {
        $addFields: {
          versionArrLength: {
            $size: '$splitVersions',
          },
        },
      },
      {$match: {versionArrLength: {$ne: 0}}},


      ]
    }

    //if search key is entered
    if (searchKey) {
      const _searchKey = sanitizeBeforeRegexp(searchKey);
      const searchExp = new RegExp(_searchKey, 'i');

      param = [...param,
      {
        $match:
          {boxes: {$elemMatch: {"boundaries.label": searchExp}}}
      }];

      countParam = [...countParam,
      {
        $match:
          {boxes: {$elemMatch: {"boundaries.label": searchExp}}}
      }];

    }

    //If search key is not entered
    else if (labelObj && labelObj.length > 0) {
      let LabelOrCondition: any[] = [];

      labelObj.map(label => {
        let andCondition: any[] = [];

        andCondition.push({$eq: ["$$box.boundaries.label", label.labelKey]})

        let attributeAndCondition: any = {}

        for (let attributeKey of label.attributes) {
          let attributeValueArray: any[] = [];

          //add attribute values in to an array
          for (let attributeKeyKeyValue of attributeKey.values) {
            attributeValueArray.push(attributeKeyKeyValue.valueName);
          }

          attributeAndCondition = {$in: [`$$box.attributeValues.${attributeKey.key}`, attributeValueArray]}

          if (attributeValueArray.length > 0) {
            andCondition.push(attributeAndCondition)
          }

        }


        LabelOrCondition.push({$and: andCondition});

      });

      param = [...param, {
        $addFields: {
          "annoBoxes": {
            $filter: {
              input: "$boxes",
              as: "box",
              cond:
              {
                $or: LabelOrCondition
              }

            }
          }
        }
      }, {
        $addFields: {
          boxLength: {
            $size: '$annoBoxes',
          },
        },
      }, {$match: {boxLength: {$ne: 0}}},
      ]

      countParam = [...countParam, {
        $addFields: {
          "annoBoxes": {
            $filter: {
              input: "$boxes",
              as: "box",
              cond:
              {
                $or: LabelOrCondition
              }

            }
          }
        }
      },
      {
        $addFields: {
          boxLength: {
            $size: '$annoBoxes',
          },
        },
      },
      {$match: {boxLength: {$ne: 0}}},

      ];
    }

    countParam = [...countParam,

    {$addFields: {"dsVersion": {$first: "$datasetVersions"}}},
    {$addFields: {"augCount": {$size: {$ifNull: [{$objectToArray: "$dsVersion.augmentationImages"}, []]}}}},
    {$addFields: {"allItemCount": {$add: ["$augCount", 1]}}},
    {"$group": {"_id": 1, "frameCount": {$sum: "$allItemCount"}}}

      // {$count: "frameCount"}
    ]

    param = [
      ...param,

      {
        $project: {
          augImgUrls: "$datasetVersions",
          awsUrl: "$awsThumbnailUr",
          awsThumbnailUr: 1,
        }
      }
      ,
      {
        $skip: _pageSize * _pageIndex,
      },
      {$limit: _pageSize}
    ];

    let filteredImages = await this.aggregate(param);

    let filteredImagesExport: any = []

    for (let frame of filteredImages) {
      let mainImageItem = {
        _id: frame._id,
        awsUrl: frame.awsUrl
      }
      filteredImagesExport.push(mainImageItem)
      for (let augversion of frame.augImgUrls) {
        if (augversion.versionId == dataSetVersionId && augversion.augmentationImages) {

          for (const [key, val] of Object.entries(augversion.augmentationImages)) {
            let augTypeData: any = val
            if (augTypeData.awsThumbnailUrl) {
              let augImageItem = {
                _id: `${frame._id}_${dataSetVersionId}_${key}_augmentation`,
                awsUrl: augTypeData.awsThumbnailUrl
              }
              filteredImagesExport.push(augImageItem)
            }
          }
        }
      }
    }


    let frameCount: any[] = [];

    frameCount = await this.aggregate(countParam)
    console.log(frameCount)
    // logger.debug(`param`, param);
    // logger.debug(`countParam`, countParam);
    logger.debug(`no of images ${filteredImagesExport.length}`);
    let _frameCount = frameCount.length > 0 ? frameCount[0].frameCount : 0;

    let imageCount = filteredImagesExport.length || 0;

    return {
      frameCount: _frameCount,
      frameArray: filteredImagesExport,
      imageCount: imageCount
    };
  }


  /**
  *calculate split data sets
  * @param taskList task list relevant to data set version
  * @param dataSetVersionId {string} dataset versionId
  * @returns split data set stats
  */
  async calculateSplitDataSet(taskList: string[], dataSetVersionId: string) {
    let params: any[] = [];
    let _taskList = taskList.map(taskId => {
      return new ObjectId(taskId);
    });

    params = [
      /*{$match: {taskId: {$in: _taskList}}},*/ {$unwind: "$datasetVersions"}, {$match: {"datasetVersions.versionId": new ObjectId(dataSetVersionId)}},
      {
        $group: {
          _id: "$datasetVersions.datasetType",
          "imageCount": {$sum: 1},
          "objectCount": {$sum: {$size: "$boxes"}},
        }
      }
    ]
    let _count = await this.aggregate(params);

    let count: any[] = [];
    let totalObjects: number = 0;
    for (let countObject of _count) {
      let id = countObject._id;

      if (!isNaN(id) && id != null) {
        totalObjects += countObject.objectCount;
        count.push(
          {
            type: id,
            imageCount: countObject.imageCount,
            objectCount: countObject.objectCount
          })
      }
    }

    for (let index in count) {
      let percentage = count[index].objectCount * 100 / totalObjects;
      count[index].percentage = percentage;
    }

    return count;
  }

  /**
   * Image resize in data grid preview
   * @param frameId {string} frame Id
   * @returns image preview details
   */
  async dataGridImagePreview(frameId: string) {
    let statsParams: any = [];
    let objectParams: any = [];
    let totalObject: number = 0;

    let isAugmentation = false;
    let dsVersionId: any = null
    let augType: any = null

    if (frameId.endsWith('_augmentation')) {
      isAugmentation = true;
      let frameData = frameId.split("_");
      frameId = frameData[0];
      dsVersionId = frameData[1];
      augType = frameData[2]
    }

    statsParams = [
      {$match: {_id: new ObjectId(frameId)}},
      {$unwind: "$boxes"},
      {
        $group: {
          _id: {
            "labelName": "$boxes.boundaries.label",
            "color": "$boxes.boundaries.color"
          },
          "objectCount": {$sum: 1},
        }
      }
    ];
    let _labelStatsObject: LabelStatsObject[] = await this.aggregate(statsParams);

    let labelStatsObject = _labelStatsObject.map(label => {
      totalObject += label.objectCount;
      return {
        labelName: label._id?.labelName,
        objectCount: label.objectCount,
        color: label._id?.color,
      }
    });

    objectParams = [
      {$match: {_id: new ObjectId(frameId)}},
      {$lookup: {from: 'AnnotationTask', localField: 'taskId', foreignField: '_id', as: 'task'}},
      {
        $addFields: {
          task: {
            $arrayElemAt: ['$task', 0]
          }
        }
      },
      {$lookup: {from: 'AnnotationProject', localField: 'task.projectId', foreignField: '_id', as: 'project'}},
      {
        $addFields: {
          project: {
            $arrayElemAt: ['$project', 0]
          },
        }

      },
      {
        $addFields: {
          projectName: "$project.name",
          videoResolutionWidth: "$task.videoResolutionWidth",
          videoResolutionHeight: "$task.videoResolutionHeight",
        }

      },


    ];

    if (isAugmentation) {
      objectParams = [
        ...objectParams,
        {$unwind: "$datasetVersions"},
        {$match: {"datasetVersions.versionId": new ObjectId(dsVersionId)}},
        {$project: {_id: 0, frameId: 1, videoResolutionWidth: 1, videoResolutionHeight: 1, taskId: 1, "boxes.boundaries": 1, projectName: 1, "awsUrl": `$datasetVersions.augmentationImages.${augType}.awsImageUrl`, "awsThumbnailUr": `$datasetVersions.augmentationImages.${augType}.awsThumbnailUrl`}}
      ]
    }
    else {
      objectParams = [
        ...objectParams,
        {$project: {_id: 0, frameId: 1, videoResolutionWidth: 1, videoResolutionHeight: 1, taskId: 1, "boxes.boundaries": 1, projectName: 1, "awsUrl": 1, "awsThumbnailUr": 1}}
      ]
    }


    let _objectDetails: LabelObject[] = await this.aggregate(objectParams);

    let objectDetails = _objectDetails[0];

    if (objectDetails) {

      objectDetails.originalImageUrl = objectDetails.awsUrl!;
      objectDetails.awsUrl = objectDetails.awsThumbnailUr;

      delete objectDetails.awsThumbnailUr;

      objectDetails = {
        ...objectDetails,
        labelStatsObject: {
          totalObjects: totalObject,
          labelStats: labelStatsObject
        }
      }

      return objectDetails;
    }
  }

  /**
   * delete images from server and update frame
   * @param inputFile {string} file path
   */
  async deleteImageFromServer(inputFile: string, frameId: string) {
    if (fs.existsSync(inputFile)) fs.unlink(inputFile);
    this.updateById(frameId,
      {
        resized: true,
        resizedDate: new Date()
      })
  }
  /**
   * Download images in to server from s3 bucket
   * @param url {string}aws url
   * @param id {string} frame Id
   */
  async downloadImage(url: string, id: string) {
    const savePath = path.join(__dirname, "../../tempImagePreview");
    if (!fs.existsSync(savePath)) fs.mkdirpSync(savePath);
    const _path = path.join(savePath, `/${id}.jpg`);
    const writer = fs.createWriteStream(_path);

    const response = await Axios({
      url,
      method: 'GET',
      responseType: 'stream'
    })
    await response.data.pipe(writer)

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve)
      writer.on('error', reject)
    })
  }

  /**
   * delete excess images in server
   * @param excessValue {number} excess images
   */
  async deleteExcessImages(excessValue: number) {
    let params = [
      {
        $match: {resized: true}
      }, {$sort: {resizedDate: 1}}, {$limit: excessValue}, {$project: {_id: 1}}
    ];

    let frameIdList: {_id: string}[] = await this.aggregate(params);
    if (frameIdList.length > 0) {
      let _frameIdList: any[] = [];
      for (let frameId of frameIdList) {
        let inputFile = path.join(__dirname, "../../imagePreview", `/${frameId._id.toString()}.jpg`);
        if (fs.existsSync(inputFile)) fs.unlink(inputFile);
        _frameIdList.push(frameId._id)
      }

      this.updateAll({resized: false}, {id: {inq: _frameIdList}})
    }

  }

  /**
   *Remove data set version from frame
   * @param dataSetVersionId {string} data set version Id
   */
  async removeDataSetVersionsFromFrame(dataSetVersionId: string) {

    let _dataSetVersionId = new ObjectId(dataSetVersionId);
    let params = {"datasetVersions.versionId": _dataSetVersionId};

    /**
     * remove data set version details from frames
     */
    await this.updateManyRemoveFromList(params,
      {
        datasetVersions: {versionId: _dataSetVersionId}
      }
    )
  }


  /**
   * Use for get the json form frame data of the task
   * @param taskId
   * @returns
   */
  async getFrameDataOfTask(taskId: string) {
    let frameData = await this.aggregate([
      {$match: {taskId: new ObjectId(taskId)}},
      {$project: {taskId: 1, frameId: 1, boxes: 1}}
    ])
    return frameData
  }

  /**
   * Use for query data from method of aggregate
   * @param params {string[]} parameters for aggregate the database
   * @returns filtered data from database
   */
  public async aggregate(params?: any[]) {
    if (!params) params = [];
    const response = await (this.dataSource.connector as any)
      .collection('AnnotationFrame')
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
  public async updateMany(params: any, data: any, type?: number) {
    if (!params || !data) return
    const response = await (this.dataSource.connector as any)
      .collection('AnnotationFrame')
      .updateMany(params, {$set: data})
    logger.debug('MongoDB frames updateMany modified count(set):', response.modifiedCount);

    if (type) logger.debug('data Set type(frames): ', type);

    return response;
  }


  /**
   * MongoDB direct updateMany in AnnotationFrame
   * @param params {object} filter Object
   * @param data {object} updating data
   * @returns response
   */
  public async updateManyPushToList(params: any, data: any, type?: number) {
    if (!params || !data) return
    const response = await (this.dataSource.connector as any)
      .collection('AnnotationFrame')
      .updateMany(params, {$push: data})
    logger.debug('MongoDB frame updateMany modified count(push):', response.modifiedCount);
    if (type) {
      logger.debug('data Set type(frame): ', type);
    }


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
      .collection('AnnotationFrame')
      .updateMany(params, {$pull: data})
    logger.debug('MongoDB frame updateMany modified count(versions removed):', response.modifiedCount)
    return response;
  }

  /**
   * update label of boxes
   * @param params {object} filter Object
   * @param data {object} updating data
   * @param arrayFilter {object} field to be replaced
   * @returns  label updated frame count
   */
  public async updateLabelInFrame(params: any, data: any, arrayFilter: any) {
    if (!params || !data) return
    const response = await (this.dataSource.connector as any)
      .collection('AnnotationFrame')
      .updateMany(params, {$set: data}, {arrayFilters: [arrayFilter]})
    logger.debug('Label update frame Count:', response.modifiedCount)
    logger.debug('Label update frame Count:', response.modifiedCount)
    return response;
  }
}

// interface frame{
//   _id: string;
//   frameId: number;
//   status: number;
//   boxes: object[];
//   taskId: string;
// }

export interface labelList {
  label: string;
  count: number;
}

export interface LabelObj {
  labelKey: string;
  attributes: Attributes[];

}

export interface Attributes {
  key: string;
  values: AttributeValue[],

}
export interface AttributeValue {
  valueName: string;
}

export interface SplitDataPercentage {
  trainingSetPercentage: number;
  validationSetPercentage: number;
  testingSetPercentage: number;
}

export interface TaskArray {
  _id: string;
  objectsCount: number;
}

export interface TaskIdArray {
  type: number;
  idArray: string[];
}

export interface LabelObject {
  frameId: number;
  boxes: AnnotationData[];
  taskId: string;
  projectName: string;
  labelStatsObject: {
    totalObjects: number;
    labelStats: LabelStatsObject[];
  }
  awsUrl?: string;
  _id?: string;
  originalImageUrl?: string;
  awsThumbnailUr?: string;
}

export interface LabelStatsObject {
  _id?: {
    labelName?: string;
    color: string;
  };
  objectCount: number;
}

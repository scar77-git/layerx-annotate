/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 *perform CRUD operations in Annotation dataSet version model
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
import {
  AnnotationDataSetRepository,
  AnnotationFrameRepository,
  AnnotationProjectRepository,
  AnnotationTaskRepository
} from '.';
import {logger} from '../config';
import {MongoDataSource} from '../datasources';
import {
  AnnotationDataSetGroup,
  AnnotationDatasetVersion,
  AnnotationDatasetVersionRelations,
  DataSetStat,
  DataSetStatsModel,
  DataSetSubLabelElementModel,
  DatasetType,
  DataSetVersionMeta,
  GridClassAttributes,
  InitialDataSetType,
  SplitCount,
  SplitVideoArray,
  VersionType
} from '../models';
import {
  AwsCloudService,
  AWS_CLOUD_SERVICE
} from '../services/aws-cloud.service';
import {SubLabelCount} from '../services/project-stats-update.service';
import {awsExpirationDays} from '../settings/constants';

export class AnnotationDatasetVersionRepository extends DefaultCrudRepository<
  AnnotationDatasetVersion,
  typeof AnnotationDatasetVersion.prototype.versionId,
  AnnotationDatasetVersionRelations
> {
  constructor(
    @inject('datasources.mongo') dataSource: MongoDataSource,
    @inject(AWS_CLOUD_SERVICE) private awsCloudService: AwsCloudService,
    @repository(AnnotationDataSetRepository)
    public datasetRepository: AnnotationDataSetRepository,
    @repository(AnnotationTaskRepository)
    public annotationTaskRepository: AnnotationTaskRepository,
    @repository(AnnotationProjectRepository)
    public annotationProjectRepository: AnnotationProjectRepository,
    @repository(AnnotationFrameRepository)
    public annotationFrameRepository: AnnotationFrameRepository,
    @repository(AnnotationDataSetRepository)
    public annotationDataSetRepository: AnnotationDataSetRepository,
  ) {
    super(AnnotationDatasetVersion, dataSource);
  }
  //--------

  /**
   * test
   * use for get authorized s3 url of a given augmentation image
   * @param augmentationImage
   */
  async convertAugmentationDataUrls(imageData: any) {

    if (imageData.imageUrl) {
      imageData.imageUrl = await this.awsCloudService.generateAWSVideoUrl(
        imageData.imageUrl,
      );

    }
    if (imageData.textFiles && imageData.textFiles.YOLO)
      imageData.textFiles.YOLO = await this.awsCloudService.generateAWSVideoUrl(
        imageData.textFiles.YOLO,
      );
    if (imageData.textFiles && imageData.textFiles.RCNA)
      imageData.textFiles.RCNA = await this.awsCloudService.generateAWSVideoUrl(
        imageData.textFiles.RCNA,
      );

    if (imageData.textData && imageData.textData.YOLO)
      imageData.textData.YOLO = await this.awsCloudService.generateAWSVideoUrl(
        imageData.textData.YOLO,
      );

    return imageData;
  }

  /**
   * test
   * use for get data of all frames for given version
   * @param versionNo
   * @returns list of frames
   */
  async getDatasetVersion(
    groupName: string,
    pageNo: number,
    pageSize?: number,
    versionNo?: string,
  ) {
    console.log(`Page No: ${pageNo}, page size: ${pageSize}`);
    let pagingSize = (pageSize || 100) * 1;
    let skip = (pageNo - 1) * pagingSize;
    let versionQuery: any = [];
    if (versionNo) {
      versionQuery.push({$addFields: {latestVersion: versionNo}});
    } else {

      versionNo = '1.0.1';
    }

    let params = [
      {$match: {name: groupName}},
      {$unwind: {path: '$datasetVersions'}},
      //version finder
      // ...versionQuery,
      {
        $lookup: {
          from: 'AnnotationDatasetVersion',
          localField: 'datasetVersions',
          foreignField: '_id',
          as: 'annotationVersion',
        },
      },
      {$unwind: {path: '$annotationVersion'}},
      {$match: {'annotationVersion.versionNo': versionNo}},
      {$addFields: {latestVersion: '$annotationVersion._id'}},
      {$unwind: {path: '$annotationVersion.taskList'}},
      {
        $lookup: {
          from: 'AnnotationFrame',
          localField: 'annotationVersion.taskList',
          foreignField: 'taskId',
          as: 'annotationFrame',
        },
      },
      {$unwind: {path: '$annotationFrame'}},
      {$unwind: {path: '$annotationFrame.datasetVersions'}},
      {
        $match: {
          $expr: {
            $eq: [
              '$annotationFrame.datasetVersions.versionId',
              '$latestVersion',
            ],
          },
        },
      },
      {
        $project: {
          groupUniqueName: '$name',
          groupName: '$groupName',
          versionNo: '$annotationVersion.versionNo',
          taskId: '$annotationFrame.taskId',
          frameId: '$annotationFrame.frameId',
          versionData: '$annotationFrame.datasetVersions',
          imageUrl: '$annotationFrame.imageUrl',
          //annotatedData: '$annotationFrame.annotatedData',
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: pagingSize,
      },
    ];
    console.log(JSON.stringify(params, null, 2));

    let datasetFrames = await this.datasetRepository.aggregate(params);
    // console.log(JSON.stringify(datasetFrames, null, 2));

    //let responseFrameData: AugmentationFrameDataInfo[] = [];
    let frameDataItem: AugmentationFrameDataInfo = {};

    for (let j = 0; j < datasetFrames.length; j++) {
      let frame = datasetFrames[j];
      //let imagePathData: any = JSON.parse(JSON.stringify(frame.annotatedData));
      let imagePathData = frame.imageUrl;
      if (j == 0) {
        //set data in the 1st frame as metadata
        frameDataItem = {
          identifier: `${frame.groupUniqueName}_${frame.versionNo}`,
          groupUniqueName: frame.groupUniqueName,
          groupName: frame.groupName,
          versionNo: frame.versionNo,
          taskId: frame.taskId,
          resourceArray: [], //to manage versioning by local tool
        };
        if (datasetFrames.length < pagingSize) {
          frameDataItem.nextPage = false;
        } else {
          frameDataItem.nextPage = true;
        }
      }


      let augmentedFormattedTextYolo = null;

      let augmentedFormattedImageUrl =
        await this.awsCloudService.generateAWSVideoUrl(frame.imageUrl);
      if (frame.versionData.textFiles && frame.versionData.textFiles.YOLO) {
        augmentedFormattedTextYolo =
          await this.awsCloudService.generateAWSVideoUrl(
            frame.versionData.textFiles.YOLO,
          );
      } else {
        continue;
      }

      //push all resources and paths to easily access by local tool
      let imageIdentifier = imagePathData.replace(/\//g, '_');
      let textIdentifier = imageIdentifier.replace('.jpg', '.txt');
      frameDataItem.resourceArray?.push({
        path: imagePathData,
        imageUrl: augmentedFormattedImageUrl,
        imageIdentifier: imageIdentifier,
        textUrl: augmentedFormattedTextYolo,
        textIdentifier: textIdentifier,
      });



      if (frame.versionData.augmentationImages) {
        // get augmentation images if exists
        for await (const [key, value] of Object.entries(
          frame.versionData.augmentationImages,
        )) {
          let augmentedImgTxt: any = value;
          let pathData: any = JSON.parse(JSON.stringify(value));


          let authAugImageUrl = null;
          let authAugTextUrl = null;
          if (augmentedImgTxt.imageUrl && augmentedImgTxt.textFiles) {
            console.log(`getting augmentation ${key}`);
            authAugImageUrl = await this.awsCloudService.generateAWSVideoUrl(
              augmentedImgTxt.imageUrl,
            );
            authAugTextUrl = await this.awsCloudService.generateAWSVideoUrl(
              augmentedImgTxt.textFiles,
            );
          } else {
            continue;
          }

          //frameDataItem.augmentationImage[key] = authenticatedAugData;
          //--------------

          //push all resources and paths to easily access by local tool
          let imageIdentifier = pathData.imageUrl.replace(/\//g, '_');
          let textIdentifier = imageIdentifier.replace('jpg', 'txt');
          frameDataItem.resourceArray?.push({
            path: pathData.imageUrl,
            imageUrl: authAugImageUrl,
            imageIdentifier: imageIdentifier,
            textUrl: authAugTextUrl,
            textIdentifier: textIdentifier,
          });
        }
      }

      // for (let i = 0; i < frame.versionData.augmentationImages.length; i++) {
      //   let authenticatedAugData = await this.convertAugmentationDataUrls(
      //     frame.versionData.augmentationImages[i],
      //   );
      //   frameDataItem.augmentationImage?.push(authenticatedAugData);
      // }
      //await responseFrameData.push(frameDataItem);
    }

    // await datasetFrames.forEach(async (frame: any) => {
    //   // let frameDataItem: AugmentationFrameDataInfo = {
    //   //   groupName: frame.groupName,
    //   //   versionNo: frame.versionNo,
    //   //   taskId: frame.taskId,
    //   //   frameId: frame.frameId,
    //   //   augmentationImage: [],
    //   // };
    //   // for (let i=0; i<(frame.data.augmentationImages.length);i++){
    //   //   let authenticatedAugData = await this.convertAugmentationDataUrls(
    //   //     frame.data.augmentationImages[i],
    //   //   );
    //   //   frameDataItem.augmentationImage?.push(authenticatedAugData);
    //   // }
    //   // // await frame.data.augmentationImages.forEach(async (imageData: any) => {
    //   // //   let authenticatedAugData = await this.convertAugmentationDataUrls(
    //   // //     imageData,
    //   // //   );
    //   // //  await frameDataItem.augmentationImage?.push(authenticatedAugData);
    //   // //});
    //   // await responseFrameData.push(frameDataItem);
    // });

    //return responseFrameData;
    return frameDataItem;
  }

  //create download message (synctool command)--------------
  /**
   * get synctool sync command
   * @param groupname, versionNo., token
   * @returns command to download relavant dataset version from synctool
   */
  async getSynctoolCommand(versionId: string, token: string) {
    // console.log(ObjectId.isValid(versionId));
    let versionObjId: ObjectId = new ObjectId(versionId);
    // console.log(versionObjId);
    let params = [
      {$match: {_id: versionObjId}},
      {
        $lookup: {
          from: 'AnnotationDataSetGroup',
          localField: 'dataSetGroupId',
          foreignField: '_id',
          as: 'dataSetGroupData',
        },
      },
      {$addFields: {dsgroup: {$first: '$dataSetGroupData'}}},
      {
        $project: {
          groupName: '$dsgroup.name',
          versionNo: '$versionNo',
        },
      },
    ];
    //console.log(JSON.stringify(params, null, 2));
    // console.log(params);
    let versionInfoData = await this.aggregate(params);
    let versionInfo = versionInfoData[0];
    // console.log(versionInfo);
    let command = `python3 sync.py "${versionInfo.groupName}" ${versionInfo.versionNo} ${token}`;
    return command;
  }
  //--------------------------

  /**
   * get dataset - export tab - list of available format types
   * @param versionId
   * @returns available format types per version
   */
  async getExportFormatsList(versionId: string, token: string) {
    let exportFormatsData = await this.findById(versionId);
    if (!exportFormatsData) return {message: 'versionId invalid'};
    //console.log(JSON.stringify(exportFormatsData.exportFormats, null, 2));
    let exportFormatsArr: any[] = [];

    let synctoolCommand = await this.getSynctoolCommand(versionId, token);
    let toolDownloadName = "sync.py"
    let toolDownloadLink = process.env.BASE_URL + '/sync-tool/' + toolDownloadName;

    if (exportFormatsData && exportFormatsData.exportFormats) {
      for await (const [key, value] of Object.entries(
        exportFormatsData.exportFormats,
      )) {
        let exportFormatItemData: any = value;
        let progressStatus: ProgressStatusInfo =
          exportFormatItemData.progress == 100
            ? ProgressStatusInfo.COMPLETE
            : ProgressStatusInfo.GENERATING;
        let exportFormatItem: any = {
          keyName: key,
          name: exportFormatItemData.name,
          fileType: exportFormatItemData.fileType,
          fileCount: exportFormatItemData.fileCount,
          progress: exportFormatItemData.progress,
          progressStatus: progressStatus,
          lastUpdatedAt: exportFormatItemData.lastUpdatedAt,
          synctoolCommand: synctoolCommand,
          toolDownloadLink: toolDownloadLink,
          toolDownloadName: toolDownloadName
        };
        if (exportFormatItemData.progress >= 100) {
          exportFormatItem.sample = await this.getFormatSampleLink(
            versionId,
            key,
          );
        }
        exportFormatsArr.push(exportFormatItem);
      }
    }
    // get all exportFormats from master data
    // let exportFormatsMaster: any =
    //   await this.masterDataRepository.getExportFormats();
    let exportFormatsMaster = {
      YOLO: {
        fileType: 'XML',
        name: 'Yolo',
        category: 'category1',
        sample: 'dataset/1/6136160c5591081d13df95b0/10/10.jpg',
      },
      YOLO_DARK: {
        fileType: 'XML',
        name: 'Yolo Darknet',
        category: 'category2',
        sample: 'dataset/1/6136160c5591081d13df95b0/10/10.jpg',
      },
      YOLO_KERAS: {
        fileType: 'txt',
        name: 'Yolo Keras',
        category: 'category2',
        sample: 'dataset/1/6136160c5591081d13df95b0/10/10.jpg',
      },
    }; //temp*** //get from masterdata instead

    let selectionList: any[] = [];
    let categoryData: any = {};

    for await (let [key, value] of Object.entries(exportFormatsMaster)) {
      let FormatItemData: any = value;
      let isSelected = false;
      // console.log(JSON.stringify(exportFormatsData));
      // console.log(
      //   `${item.type} -\n${JSON.stringify(exportFormatsData.exportFormats[item.type])}`,
      // );
      if (
        exportFormatsData.exportFormats &&
        exportFormatsData.exportFormats[key]
      ) {
        isSelected = true;
      }
      // selectionList.push({
      //   keyName: key,
      //   name: FormatItemData.name,
      //   isSelected: isSelected,
      // });
      if (categoryData[FormatItemData.category]) {
        categoryData[FormatItemData.category].push({
          keyName: key,
          name: FormatItemData.name,
          isSelected: isSelected,
        });
      } else {
        categoryData[FormatItemData.category] = [
          {
            keyName: key,
            name: FormatItemData.name,
            isSelected: isSelected,
          },
        ];
      }
    }

    for await (let [key, value] of Object.entries(categoryData)) {
      // let formatCatData = value;
      let catItem = {
        categoryName: key,
        formats: value,
      };
      selectionList.push(catItem);
    }
    return {
      exportsList: exportFormatsArr,
      selectionList: selectionList,
    };
  }

  /**
   * add dataset formats
   * @param versionId, selected formats
   * requests python server to generate selected formats
   * @returns list of export formats available and status, list of all export formats from masterdata
   */
  async generateDatasetFormats(
    versionId: string,
    formatList: string[],
    token: string,
  ) {
    let versionData = await this.findById(versionId);
    if (!versionData) return {message: 'versionId invalid'};

    let exportFormatsObject: any = versionData.exportFormats || {};
    //get all exportFormats from master data
    // let exportFormatsMaster: any =
    //   await this.masterDataRepository.getExportFormats();
    let exportFormatsMaster: any = {
      YOLO: {
        fileType: 'XML',
        name: 'Yolo',
        category: 'category1',
        sample: 'dataset/1/6136160c5591081d13df95b0/10/10.jpg',
      },
      YOLO_DARK: {
        fileType: 'XML',
        name: 'Yolo Darknet',
        category: 'category2',
        sample: 'dataset/1/6136160c5591081d13df95b0/10/10.jpg',
      },
      YOLO_KERAS: {
        fileType: 'txt',
        name: 'Yolo Keras',
        category: 'category2',
        sample: 'dataset/1/6136160c5591081d13df95b0/10/10.jpg',
      },
    }; //temp*** //get from masterdata instead
    for await (let format of formatList) {
      //-------------------------------------------------------
      // request python  server to generate the format
      //-------------------------------------------------
      //let formatItem = JSON.parse(JSON.stringify(`exportFormats.${format}`));
      //let formatItem = `"exportFormats.${format}"`;
      //console.log(formatItem);
      //let formatItem = exportFormats
      let fromatData = {
        name: exportFormatsMaster[format].name,
        fileType: exportFormatsMaster[format].fileType,
        // fileCount: exportFormatsMaster[format].fileCount,
        sample: exportFormatsMaster[format].sample,
        progress: 0,
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
      };
      exportFormatsObject[format] = fromatData;
      //await this.updateById(versionId, {$set: {[formatItem]: fromatData}});

      //await this.update({versionId:versionId}, {$set:{}})
    }

    //console.log(JSON.stringify(exportFormatsObject, null, 2));
    await this.updateById(versionId, {exportFormats: exportFormatsObject});
    return await this.getExportFormatsList(versionId, token);

    /*
      "exportFormats" : {
        "YOLO" : {
            "name" : "Yolo",
            "fileType" : "XML",
            "fileCount" : 399,
            "progress" : 100,
            "createdAt" : ISODate("2021-11-24T11:18:58.526Z"),
            "lastUpdatedAt" : ISODate("2021-11-24T11:18:58.526Z")
        },
        "YOLO_DARK" : {
            "name" : "Yolo Darknet",
            "fileType" : "XML",
            "fileCount" : 399,
            "progress" : 50,
            "createdAt" : ISODate("2021-11-24T11:18:58.526Z"),
            "lastUpdatedAt" : ISODate("2021-11-24T11:18:58.526Z")
        }
      }
      ---------------------------------------------------------------
      {
        "_id" : ObjectId("618cfc2241553725b09b1dfc"),
        "annotationDatasetGroup" : "sample_group1",
        "versionNo" : "1.0.1",
        "taskList" : [
            ObjectId("614b1ca0fa84a977fcc418b8")
        ],
        "augmentationTypes" : [],
        "exportFormats" : {
            "YOLO" : {
                "name" : "Yolo",
                "fileType" : "XML",
                "fileCount" : 399,
                "progress" : 100,
                "createdAt" : ISODate("2021-11-24T11:18:58.526Z"),
                "lastUpdatedAt" : ISODate("2021-11-24T11:18:58.526Z")
            },
            "YOLO_DARK" : {
                "name" : "Yolo Darknet",
                "fileType" : "XML",
                "fileCount" : 399,
                "progress" : 50,
                "createdAt" : ISODate("2021-11-24T11:18:58.526Z"),
                "lastUpdatedAt" : ISODate("2021-11-24T11:18:58.526Z")
            }
        },
        "labelList" : [],
        "createdAt" : ISODate("2021-11-11T11:18:58.526Z")
      }
    */
  }

  /**
   * get dataset format generation status (progress)
   * @param versionId, format-unique-key
   * @returns progress
   */
  async getFormatGenerationProgress(versionId: string, formatId: string) {
    let versionData = await this.findById(versionId);
    if (!versionData) return {message: 'versionId invalid'};

    if (versionData.exportFormats && versionData.exportFormats[formatId]) {
      let progress = versionData.exportFormats[formatId].progress;
      if (progress >= 100) {
        let sampleLink = await this.getFormatSampleLink(versionId, formatId);
        return {
          progress: progress,
          sample: sampleLink,
        };
      } else {
        return {progress: progress};
      }
    } else {
      return {message: 'format not generated'};
    }
  }

  /**
   * get dataset format sample link
   * @param versionId, format-unique-key
   * @returns sample link
   */
  async getFormatSampleLink(versionId: string, formatId: string) {
    let versionData = await this.findById(versionId);
    if (!versionData) return; //{message: 'versionId invalid'};

    if (versionData.exportFormats && versionData.exportFormats[formatId]) {
      if (
        versionData.exportFormats[formatId].sample_expiration &&
        versionData.exportFormats[formatId].sample_expiration > new Date()
      ) {
        console.log('export sample link valid, ok');
        let samplePath = versionData.exportFormats[formatId].sample_awsurl;
        return samplePath;
      } else {
        console.log('creating aws url for export sample');
        let samplePath = versionData.exportFormats[formatId].sample;
        let expiringDate = new Date(
          new Date().getTime() + awsExpirationDays * 24 * 60 * 60 * 1000,
        );
        let awsURL = await this.awsCloudService.generateAWSVideoUrl(samplePath);
        versionData.exportFormats[formatId].sample_expiration = expiringDate;
        versionData.exportFormats[formatId].sample_awsurl = awsURL;
        this.updateById(versionId, {exportFormats: versionData.exportFormats});
        return awsURL;
      }
    } else {
      //return {message: 'format not generated'};
      return;
    }
  }

  //------------------------------------------------------------------
  //aggregates
  /**
   * Use for query data from method of aggregate
   * @param params {string[]} parameters for aggregate the database
   * @returns filtered data from database
   */
  public async aggregate(params?: any[]) {
    if (!params) params = [];
    const response = await (this.dataSource.connector as any)
      .collection('AnnotationDatasetVersion')
      .aggregate(params)
      .get();
    return response;
  }
  // /**
  //  * Use for query data from method of aggregate
  //  * @param params {string[]} parameters for aggregate the database
  //  * @returns filtered data from database
  //  */
  // public async aggregateDatasetGroup(params?: any[]) {
  //   if (!params) params = [];
  //   const response = await (this.dataSource.connector as any)
  //     .collection('AnnotationFrame')
  //     .aggregate(params)
  //     .get();
  //   return response;
  // }
  //-------------------------------------------------------------------

  /**
   * get enabled augmentation list
   * @param versionId {string} mongo db version Id
   * @param pageIndex {number} page number
   * @param pageSize  {number} size of the page
   */
  async getEnabledAugmentationList(
    versionId: string,
    pageIndex: number,
    pageSize: number,
  ) {
    let versionDetails = await this.findById(versionId);

    if (versionDetails.augmentationTypes) {
      return versionDetails.augmentationTypes;
    }

    else {
      return {
        "IMAGE_LEVEL": [],
        "BOUNDING_BOX_LEVEL": []
      }
    }
  }

  /**
   * Use for query the dataSet labels
   * @param dataSetId {string} id of the dataSet
   * @returns list of the dataSet labels objects
   */
  async getLabelList(dataSetVersionId: string) {
    /**
     * Query the dataSet labels
     */
    const statObj = await this.findById(dataSetVersionId, {
      fields: {
        labelAttributeList: true,

        statsSummary: true,
      },
    });
    let returnObj = {
      labelAttributeList: statObj.labelAttributeList,
      totalFrames: statObj.statsSummary?.totalFrames,
      totalBoxes: statObj.statsSummary?.totalBoxes,
    };
    return returnObj;
  }

  /**
   * Use for find the dataSet stats
   * @param dataSetId {string} id of the dataSet
   * @returns dataSet stat object
   */
  async getDataSetOverViewStats(dataSetVersionId: string) {
    /**
     * Query the dataSet stats
     */
    const statObj = await this.findById(dataSetVersionId, {
      fields: {
        dataSetAttributeList: true,
        statsSummary: true,
      },
    });
    logger.debug('Query the dataSet stats finished');
    // statObj.statsSummary?.totalBoxes;
    let returnObj = {
      totalBoxes: statObj.statsSummary?.totalBoxes,
      totalFrames: statObj.statsSummary?.totalFrames,
      dataSetStats: statObj.dataSetAttributeList,
    };

    return returnObj;
  }

  /**
   * Get augmentation progress
   * @param dataSetVersionId {string} data set version Id
   * @returns augmentation progress
   */
  async getAugmentationProgress(dataSetVersionId: string) {
    let dataVersionDetails = await this.findById(dataSetVersionId);
    let augmentationProgress = dataVersionDetails.augmentationProgress || 0;
    return {
      augmentationProgress: augmentationProgress,
    };
  }

  /**
   * Get split dataset stats related to the data set version
   * @param datasetVersionId {string} data set version Id
   * @returns data set version stat list
   */
  async splitDatasetStats(datasetVersionId: string) {
    let versionDetails = await this.findById(datasetVersionId);
    if (!versionDetails.splitCount) return;

    let splitCountArray = versionDetails.splitCount.map(splitCount => {
      let type: string;
      if (splitCount.type == DatasetType.TESTING) type = 'Testing Set';
      else if (splitCount.type == DatasetType.TRAINING) type = 'Training Set';
      else if (splitCount.type == DatasetType.VALIDATION)
        type = 'Validation Set';

      return {
        type: type!,
        imageCount: splitCount.imageCount,
        objectCount: splitCount.objectCount,
        percentage: Math.round(splitCount.percentage),
      };
    });
    return splitCountArray;
  }


  /**
    * Use for create initial version of the dataSet
    * @param dataSetGroupOrVersion {string} AnnotationDatasetVersionId
    * @param SplitCount split count
    * @param splitTaskList split task list
    * @param createDataSetType whether manual or random
    * @param nextVersionNum data set version number
    * @param splitVideoArray videos broken down to data set types
    * @param update whether create new version or update
    * @param dataSetVersionId {string} data set version Id
    * @returns
    */
  async createInitialVersion(
    dataSetGroupOrVersion: AnnotationDataSetGroup | AnnotationDatasetVersion,
    splitCount: SplitCount[],
    splitTaskList: {
      type: number;
      taskList: string[];
    }[],
    createDataSetType: InitialDataSetType,
    nextVersionNum?: string,
    splitVideoArray?: any,
    update?: boolean,
    dataSetVersionId?: string
  ) {
    //let dataSetGroup = await this.datasetRepository.findById(dataSetId);

    let projectList = dataSetGroupOrVersion.projects;
    let createdBy = dataSetGroupOrVersion.createdBy;
    let dataSetId;
    if (dataSetGroupOrVersion instanceof AnnotationDatasetVersion) {
      dataSetId = dataSetGroupOrVersion.dataSetGroupId;
    }
    else if (dataSetGroupOrVersion instanceof AnnotationDataSetGroup) {
      dataSetId = dataSetGroupOrVersion.id;
    }
    if (!projectList) return {
      success: false,
      versionDetails: null
    };
    /**
     * Use for find the,
     * (taskStatus = completed and auditStatus = accepted)
     * task list of dataSet projects
     */
    let taskListObj: any[] = []; //await this.annotationTaskRepository.taskListOfDataSet(projectList);
    for (let obj of splitTaskList) {
      taskListObj = [...taskListObj, ...obj.taskList];
    }

    if (taskListObj.length != 0) {
      let taskList: string[] = taskListObj;
      /**
       * Find label list of the projects
       */
      let labelList = await this.annotationProjectRepository.findLabelList(
        projectList,
      );

      ///////////////////////////////////// Labels /////////////////////////////////////////////////////////////
      let labels: {[key: string]: number} = {};
      labelList.forEach(element => {
        labels[element.label] = element.index;
      });
      ///////////////////////////////////// Labels /////////////////////////////////////////////////////////////

      /////////////////////////////////////Get unique labels from projects//////////////////////////////////////
      let labelListNew: GridClassAttributes[] = [];
      for (let obj of labelList) {
        let isInclude = false;
        for (let objNew of labelListNew) {
          if (obj.label == objNew.label) isInclude = true;
        }
        if (!isInclude) labelListNew.push(obj);
      }

      for (let i in labelListNew) {
        for (let j in labelListNew[i].attributes) {
          labelListNew[i].attributes[j].selected = false;
          //let l = 0;
          labelListNew[i].attributes[j].values = labelListNew[i].attributes[
            j
          ].values.map(obj => {
            return {
              valueName: obj.valueName,
              imgURL: obj.imgURL,
              selected: false,
              annotatedCount: obj.annotatedCount,
              description: obj.description,
              isDefault: obj.isDefault,
              imgFile: obj.imgFile,
            };
          });
        }
      }
      let gridClassAttributes = labelListNew;
      ///////////////////////////////////Get unique labels from projects///////////////////////////////////////////
      let label: {[key: string]: number} = {};

      for (let i in gridClassAttributes) {
        label[gridClassAttributes[i].label] = Number(i);
      }

      /**
       * create dataSetMeta object before entering database
       */
      let dataSetVersionMeta: DataSetVersionMeta = {
        //labels: labels,
        versionNo: nextVersionNum ?? '1.0.1',
        createdBy: createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
        projects: projectList,
        taskList: taskList,
        splitCount: splitCount,
        gridClassAttributes: gridClassAttributes,
        dataSetGroupId: dataSetId,
        splitTasks: splitTaskList,
        creationType: createDataSetType,
        labels: label,
        isPending: true,
        versionType: (nextVersionNum ? VersionType.EDIT : VersionType.START),
        splitVideoArray: splitVideoArray
      };

      /**
       * Create or update essential dataSetMeta details
       * essential - this is done because of speedup the request of dataSet creation.
       * Here create DataSetMeta with essential details for send python server request
       */

      let dataSetDetails: any;
      if (update && dataSetVersionId) {
        delete dataSetVersionMeta.createdAt;

        await this.updateById(dataSetVersionId, dataSetVersionMeta);
        dataSetDetails = await this.findById(dataSetVersionId);
      }
      else dataSetDetails = await this.create(dataSetVersionMeta);

      if (!dataSetDetails.versionId) {
        logger.error('dataSet versionId Empty')
        return
      }

      let dataSetGroupDetails = await this.annotationDataSetRepository.findById((dataSetId as string))
      let datasetVersionsArray = dataSetGroupDetails.datasetVersions ?? []

      datasetVersionsArray.push(dataSetDetails.versionId)

      await this.annotationDataSetRepository.updateById((dataSetId as string).toString(), {datasetVersions: datasetVersionsArray});

      /**
       * Update with non - essential dataSetMeta details
       */
      await this.createCompletedDataSetVersion(
        projectList,
        dataSetDetails.versionId!,
        taskList,
      );

      let initialVersion = await this.findById(dataSetDetails.versionId); // dataSetDetails to send back to the client
      return {
        success: true,
        versionDetails: initialVersion
      }
    }
  }

  /**
   * Use for complete and update the dataSet fields
   * This function runs in background after creating dataSet for add other fields to created DataSet Document
   * @param projectList {string[]} projectId list of the created dataSet
   * @param dataSetId {string} id of the dataSet
   */
  async createCompletedDataSetVersion(
    projectList: string[],
    dataSetId: string,
    taskList: string[],
  ) {
    ////////////////////////Convert strings to mongodb objectId/////////////////////////////
    let taskIdList = taskList.map(id => new ObjectId(id));
    let projectIdtList = projectList.map(id => new ObjectId(id));
    ////////////////////////Convert strings to mongodb objectId/////////////////////////////

    //attributes count by querying the tasks of project list
    let paramsSubLabel = [
      {
        $match: {_id: {$in: taskIdList}},
      },
      {
        $project: {
          labelCounts: 1,
          _id: 0,
        },
      },
      {$unwind: '$labelCounts.labelList'},
      {
        $project: {
          label: '$labelCounts.labelList',
          _id: 0,
        },
      },
      {$unwind: '$label.attributes'},
      {
        $group: {
          _id: {
            label: '$label.label',
            subLabel: '$label.attributes.value',
          },
          count: {
            $sum: '$label.attributes.count',
          },
        },
      },
      {
        $project: {
          label: '$_id.label',
          subLabel: '$_id.subLabel',
          count: 1,
          _id: 0,
        },
      },
    ];

    let subLabelCountList: SubLabelCount[] =
      await this.annotationTaskRepository.findAllTaskOfProject(paramsSubLabel);
    logger.debug(subLabelCountList);
    //attributes count by querying the tasks of project list

    //get the attributes of projectList
    let paramsForLabel = [
      {$match: {_id: {$in: projectIdtList}}},
      {$unwind: '$labels'},
      {$project: {label: '$labels.label', _id: 0, 'labels.attributes.key': 1}},
      {$project: {attributes: '$labels.attributes', label: 1}},
      //{$group: {_id: "$label", attributes: {$first: "$attributes"}}},
      //{$project: {label: "$_id", attributes: 1, _id: 0}}
    ];

    let projectLabelList = await this.annotationProjectRepository.aggregate(
      paramsForLabel,
    );



    //////////////////////////////////////////////////////////////////////////////////////////////////////////////
    logger.debug(projectLabelList)
    let projectLabelListMerged: any[] = []
    for (let i in projectLabelList) {
      let isLabelInclude = projectLabelListMerged.some(obj => obj.label.includes(projectLabelList[i].label));
      logger.debug(isLabelInclude)
      if (!isLabelInclude) projectLabelListMerged.push(projectLabelList[i])
      if (isLabelInclude) {
        for (let j in projectLabelList) {
          for (let k in projectLabelListMerged) {
            if (projectLabelList[j].label == projectLabelListMerged[k].label) {
              for (let l in projectLabelList[j].attributes) {
                let isAttributeInclude = projectLabelListMerged[k].attributes.some((attributeObj: {key: string | any[];}) => attributeObj.key.includes(projectLabelList[j].attributes[l].key));
                if (!isAttributeInclude) projectLabelListMerged[k].attributes.push({key: projectLabelList[j].attributes[l].key})
              }

            }
          }
        }
      }
    }
    logger.debug('project Label list: ', projectLabelListMerged);
    logger.debug('project Label list: ', projectLabelList);
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////




    let projectLabelListString: string[] = [];
    let projectAttributeList: {
      label: string;
      attributes: {
        key: string;
      }[];
    }[] = [];
    for (let labelObj of projectLabelListMerged) {
      if (!projectLabelListString.includes(labelObj.label)) {
        projectLabelListString.push(labelObj.label);
        projectAttributeList.push(labelObj);
      }
    }
    logger.debug('projectAttributeList Label list: ', projectAttributeList);
    //get the attributes of projectList

    /**
     * Calculate function for dataSetStats like label and attribute counts.
     */
    //logger.debug(taskList);
    let labelAttributeList: any[] =
      await this.annotationFrameRepository.findDataSetStats(taskList, projectLabelListMerged);

    for (let index in labelAttributeList) {
      labelAttributeList[index].label.push(labelAttributeList[index].mainLabel);
      await this.addAttributeCount(
        projectAttributeList,
        labelAttributeList,
        index,
      );
    }
    //console.log(labelAttributeList)

    let dataSetStats: DataSetStatsModel[] = [];
    for (let labelObj of projectLabelListString) {
      let tempObj: DataSetStatsModel = {
        labelName: '',
        totalObjects: 0,
        percentage: 0,
        subLabels: [],
      };
      tempObj.labelName = labelObj;
      let count = 0;
      let tempSubLabelObjList: DataSetSubLabelElementModel[] = [];

      for (let index in subLabelCountList) {
        if (labelObj == subLabelCountList[index].label) {
          let tempSubLabelObj: DataSetSubLabelElementModel = {
            labelName: '',
            objectCount: 0,
          };
          tempSubLabelObj.labelName = subLabelCountList[index].subLabel;
          tempSubLabelObj.objectCount = subLabelCountList[index].count;
          //count += subLabelCountList[index].count
          tempSubLabelObjList.push(tempSubLabelObj);
        }
      }
      for (let obj of labelAttributeList) {
        if (obj.mainLabel == labelObj) {
          count += obj.count;
        }
      }
      tempObj.totalObjects = count;
      tempObj.subLabels = tempSubLabelObjList;

      //let totalCount = 0
      dataSetStats.push(tempObj);
    }
    let totalCount = 0;
    for (let item of dataSetStats) {
      totalCount += item.totalObjects;
    }

    for (let index in dataSetStats) {
      //dataSetStats[index].percentage = Number((dataSetStats[index].totalObjects/totalCount*100).toFixed(1))
      let percentageLabel =
        Math.ceil((dataSetStats[index].totalObjects / totalCount) * 100 * 10) /
        10;
      if (percentageLabel > 0.1) {
        percentageLabel =
          Math.round(
            (dataSetStats[index].totalObjects / totalCount) * 100 * 10,
          ) / 10;
      }
      dataSetStats[index].percentage = percentageLabel;
      for (let j in dataSetStats[index].subLabels) {
        let percentageAttribute =
          Math.ceil(
            (dataSetStats[index].subLabels[j].objectCount /
              dataSetStats[index].totalObjects) *
            100 *
            10,
          ) / 10;
        if (percentageAttribute > 0.1) {
          percentageAttribute =
            Math.round(
              (dataSetStats[index].subLabels[j].objectCount /
                dataSetStats[index].totalObjects) *
              100 *
              10,
            ) / 10;
        }
        dataSetStats[index].subLabels[j].percentage = percentageAttribute;
      }
    }
    let dataSetObj = await this.findOne({
      where: {versionId: dataSetId},
      fields: {gridClassAttributes: true},
    });
    if (dataSetObj) {
      for (let item of dataSetObj.gridClassAttributes!) {
        await this.getDataSetStats(dataSetStats, item);
      }
    }
    dataSetStats.sort((a, b) =>
      a.totalObjects < b.totalObjects
        ? 1
        : a.totalObjects > b.totalObjects
          ? -1
          : 0,
    );
    //dataSetStats.((a, b) => a.totalObjects > b.totalObjects ? a : b);
    for (let item of dataSetStats) {
      item.totalObjects;
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
    let dataSetMeta: DataSetVersionMeta = {
      labelAttributeList: labelAttributeList,
      augmentations: [],
      dataSetAttributeList: dataSetStats,
      totalFrames: totalFrames[0].count,
      totalBoxes: totalBoxes[0].count,
      statsSummary: {
        totalFrames: totalFrames[0].count,
        totalBoxes: totalBoxes[0].count,
      },
    };
    /**
     * Update the dataSet document with dataSetId
     */
    return await this.updateById(dataSetId, dataSetMeta);
  }

  /**
   * Use for count and push the attribute to the labelAttributeList list
   * @param projectAttributeList {object}[] label list of the project
   * @param labelAttributeList {object}[] attribute list of the dataSet
   * @param index {string} for loop index
   */
  async addAttributeCount(
    projectAttributeList: {
      label: string;
      attributes: {
        key: string;
      }[];
    }[],
    labelAttributeList: DataSetStat[],
    index: any,
  ) {
    for (let obj of projectAttributeList) {
      if (obj.label == labelAttributeList[index].mainLabel) {
        //let tempList: string[] = []
        //if(obj.attributes instanceof Object){}
        //logger.debug(JSON.stringify(obj.attributes))
        for (let attribute of obj.attributes) {
          if (labelAttributeList[index].attributes[attribute.key]) {
            labelAttributeList[index].label.push(
              labelAttributeList[index].attributes[attribute.key],
            );
          }
        }
      }
    }
  }

  /**
   * use for calculate and append data set stats
   * @param dataSetStats {object} data set stats of dataSet version
   * @param item {string} for loop item
   */
  async getDataSetStats(
    dataSetStats: DataSetStatsModel[],
    item: GridClassAttributes,
  ) {
    for (let index in dataSetStats) {
      if (dataSetStats[index].labelName == item.label) {
        let tempList: DataSetSubLabelElementModel[] = [];
        //await this.attributeCount(dataSetStats, item, index, tempList)
        for (let obj of item.attributes) {
          for (let value of obj.values) {
            for (let j in dataSetStats[index].subLabels) {
              if (
                value.valueName == dataSetStats[index].subLabels[j].labelName
              ) {
                tempList.push(dataSetStats[index].subLabels[j]);
              }
            }
          }
        }
        dataSetStats[index].subLabels = tempList;
      }
    }
  }

  /**
   * use for calculate and append data set stats
   * @param dataSetStats {object} data set stats of dataSet version
   * @param item {string} for loop item
   * @param index {string} for loop index
   * @param tempList {DataSetSubLabelElementModel}[]
   */
  async attributeCount(
    dataSetStats: DataSetStatsModel[],
    item: GridClassAttributes,
    index: any,
    tempList: DataSetSubLabelElementModel[],
  ) {
    for (let obj of item.attributes) {
      for (let value of obj.values) {
        for (let j in dataSetStats[index].subLabels) {
          if (value.valueName == dataSetStats[index].subLabels[j].labelName) {
            tempList.push(dataSetStats[index].subLabels[j]);
          }
        }
      }
    }
  }

  /**
   * delete augmentation of an version
   * @param versionId {string} versionId
   * @param augmentationId {string} augmentation id
   */
  async deleteAugmentation(versionId: string, augmentationId: string) {
    let versionDetails = await this.findById(versionId);
    let imageLevelAugmentation = versionDetails.augmentationTypes?.IMAGE_LEVEL!;
    let boundingBoxLevelAugmentation =
      versionDetails.augmentationTypes?.BOUNDING_BOX_LEVEL;
    let boundingBoxSearch = true;
    let imageIndex = 0;
    let boundingIndex = 0;

    if (imageLevelAugmentation && boundingBoxLevelAugmentation) {
      for (let augmentation of imageLevelAugmentation) {
        if (augmentation.id == augmentationId) {
          imageLevelAugmentation.splice(imageIndex, 1);
          boundingBoxSearch = false;
          break;
        }
        imageIndex += 1;
      }

      if (boundingBoxSearch) {
        for (let augmentation of boundingBoxLevelAugmentation) {
          if (augmentation.id == augmentationId) {
            boundingBoxLevelAugmentation.splice(boundingIndex, 1);
            break;
          }
          boundingIndex += 1;
        }
      }

      let augmentationTypes = {
        IMAGE_LEVEL: imageLevelAugmentation,
        BOUNDING_BOX_LEVEL: boundingBoxLevelAugmentation,
      };
      logger.debug(JSON.stringify(augmentationTypes));
      return await this.updateById(versionId, {
        augmentationTypes: augmentationTypes,
      });
    }
  }



  /**
   * delete data set version
   * @param versionId {string} dataset version id
   * @returns success,deleteDataSetGroup(flag),dataSetGroupId
   */
  async deleteDataSetVersion(versionId: string) {
    let deleteDataSetGroup: boolean = false;
    let dataSetVersionDetails = await this.findById(versionId);
    let dataSetGroupId = dataSetVersionDetails.dataSetGroupId!;
    let param: any[] = [
      {$match: {dataSetGroupId: new ObjectId(dataSetGroupId)}},
      {$count: 'dataSetVersionsCount'},
    ];

    let _dataSetVersionCount: DataSetVersionCount[] = await this.aggregate(
      param,
    );
    let dataSetVersionCount = _dataSetVersionCount.pop();

    if (dataSetVersionCount?.dataSetVersionsCount == 1)
      deleteDataSetGroup = true;
    try {
      await this.deleteById(versionId);
      return {
        success: true,
        deleteDataSetGroup: deleteDataSetGroup,
        dataSetGroupId: dataSetGroupId,
      };
    } catch (error) {
      logger.debug(
        'Delete failed for version id: ',
        versionId,
        'error: ',
        error,
      );
      return {
        success: false,
        deleteDataSetGroup: deleteDataSetGroup,
        dataSetGroupId: dataSetGroupId,
      };
    }
  }



  /**
  * Get data set version details when editing
  * @param versionId {string} data set version Id
  * @returns data set version details
  */
  async getVersionDetailInEdit(versionId: string) {
    let param: any = [{
      $match: {_id: new ObjectId(versionId)}
    },
    {
      $project: {
        "splitVideoArray": 1,
        "creationType": 1, "splitCount": 1,

      }
    }
    ];

    let versionDetails: VersionEditDetails[] = await this.aggregate(param);
    if (versionDetails) return versionDetails.pop();
    else return;
  }





  /**
   * Get selected task list of a video in data set version edit
   * @param videoId {string} video id
   * @param dataSetVersionId {string} data set version id
   * @param dataSetType {number} data set type that video belongs
   * @returns whether all tasks are selected, selected task list
   */
  async getTaskListSavedInDataSetVersion(videoId: string, dataSetVersionId: string, dataSetType: InitialDataSetType) {
    let datasetVersionDetails = await this.findById(dataSetVersionId);
    let videoIdArray: VideoIdArray = datasetVersionDetails.splitVideoArray[dataSetType - 1];
    let videoDetails: VideoArray;
    let allTasksSelected: boolean;

    for (const [key, value] of Object.entries(videoIdArray.videoList)) {
      if (value._id.toString() == videoId) {
        videoDetails = value;
        break;
      }
    }


    if (videoDetails!.selectTaskCount == videoDetails!.taskCount) {
      allTasksSelected = true;
      return {
        allTasksSelected: allTasksSelected
      }
    }
    else {
      allTasksSelected = false;
      return {
        allTasksSelected: allTasksSelected,
        taskList: videoDetails!.taskList
      }
    }
  }






  ////////////

  /**
   * Use for get dataSet boxes with paging, Filters will be included
   * @param dataSetId {string} id of the dataSet
   * @param pageIndex {number} page index number
   * @param pageSize {number} pagesize is less than 10,000
   * @returns dataSet box list for relevant page index and number
   */
  async getDataSet(dataSetVersionId: string, pageIndex: number, pageSize: number) {
    if (pageSize > 10000) {
      return {result: 'page size must be less than 10,000'};
    }
    const dataSetMeatInfo = await this.findById(
      dataSetVersionId,
    );

    if (!dataSetMeatInfo) {
      return {result: `cannot find dataSet of dataSetId: ${dataSetVersionId}`};
    }
    if (!dataSetMeatInfo.taskList) return {success: false}

    let taskListString: string[] = dataSetMeatInfo.taskList;
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
   * delete field of data set version document
   * @param params {object} filter Object
 * @param data {object} updating data
   * @returns unset count
   */
  public async deleteFields(params: any, data: any) {
    if (!params || !data) return;
    const response = await (this.dataSource.connector as any)
      .collection('AnnotationDatasetVersion')
      .updateMany(params, {$unset: data});
    logger.debug(
      'MongoDB dataSet version updateMany modified count:',
      response.modifiedCount,
    );
    return response;
  }


  /**
   * Find distinct projects in data set version belong to a data set
   * @param field {string} field to be searched
   * @param filter filter object
   * @returns  distinct project list
   */
  public async findDistinctProjects(field: string, filter: any) {
    if (!field || !filter) return
    const response = await (this.dataSource.connector as any)
      .collection('AnnotationDatasetVersion')
      .distinct(field, filter)
    return response;
  }
}

export interface AugmentationFrameDataInfo {
  identifier?: string;
  groupUniqueName?: string;
  groupName?: string;
  versionNo?: string;
  taskId?: string;
  frameId?: 1;
  annotatedData?: any;
  // augmentationImage?: AugmentationImageInfo[];
  augmentationImage?: any;
  resourceArray?: {
    path?: string;
    imageUrl?: string;
    imageIdentifier?: string;
    textUrl?: string;
    textIdentifier?: string;
  }[];
  nextPage?: boolean;
}

export enum ProgressStatusInfo {
  COMPLETE = 1,
  GENERATING = 2,
}

export interface DataSetVersionCount {
  dataSetVersionsCount: number;
}

export interface VersionEditDetails {
  _id: string;
  splitVideoArray: SplitVideoArray[];
  creationType: InitialDataSetType;
  splitCount: SplitCount[];
}

export interface VideoArray {
  _id: string;
  selectTaskCount: number;
  taskCount: number;
  taskList?: any;
}

export interface VideoIdArray {
  type: number;
  videoList: VideoArray[];
}

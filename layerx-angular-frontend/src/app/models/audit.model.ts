/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { bool } from "aws-sdk/clients/signer";
import { zip } from "rxjs";
import { CommentBox } from "./comment-box.model";
import { ShapeType } from "./shape.model";

export class Audit {
  id!: number;
  toolSet: Array<toolItem>;
  isPlay: boolean;
  videoDuration: any;
  currentTime: any;
  frameTime: any;
  totalFrames: number;
  fps: number;
  currentFrame: number;
  skipFrameCount: number;
  mediaPlayerFpsCount: number;
  frameData: Array<frameItem>;
  labelsList: Array<any>;
  subLabels: Array<any>;
  createdAt: Date;
  updatedAt: Date;
  selectedTaskId: string;
  taskStatus!: number;
  auditStatus!: number;
  status!: number;
  videoUrl: string;
  selectLabelState: string;
  selectedFrameId!: number;
  selectedBoxes: Array<any>;
  selectedCommentBoxes: Array<CommentBox>;
  isSelectedFrameEmpty: boolean = true;
  frameRate: number;
  auditedDateStr: string;
  videoWidth!: number;
  videoHeight!: number;
  canvasWidth!: number;
  canvasHeight!: number;
  maxId!: number;
  selectedUser!: any;
  selectedUserType!: number;
  selectedUserId!: string;
  defaultAttributeValue: string;
  userLog: Array<any>;
  previousTask!: string;
  nextTask!: string;
  totalComments!: number

  constructor() {
    this.toolSet = [
      {
        id: 1,
        name: 'mouse-pointer',
        iconName: 'icon-mouse-pointer',
        label: 'Select',
        isSelected: false,
        shapeType: ShapeType.pointer
      },
      // {
      //   id: 2,
      //   name: 'rotate-anti-clock',
      //   iconName: 'icon-rotate-anti-clock',
      //   label: 'rotate',
      //   isSelected: false,
      //   shapeType:ShapeType.notSelected
      // },
      // {
      //   id: 3,
      //   name: 'rotate-clock',
      //   iconName: 'icon-rotate-clock',
      //   label: 'rotate',
      //   isSelected: false,
      //   shapeType:ShapeType.notSelected
      // },
      {
        id: 4,
        name: 'annotate',
        iconName: 'icon-annotate',
        label: 'Annotate',
        isSelected: false,
        shapeType: ShapeType.rectangle
      },
      {
        id: 5,
        name: 'pan',
        iconName: 'icon-pan',
        label: 'Pan',
        isSelected: false,
        shapeType: ShapeType.pan
      },
      {
        id: 6,
        name: 'zoom-in',
        iconName: 'icon-zoom-in',
        label: 'Zoom In \xa0\xa0 [ + ]',
        isSelected: false,
        shapeType: ShapeType.zoomIn
      },
      {
        id: 7,
        name: 'zoom-out',
        iconName: 'icon-zoom-out',
        label: 'Zoom Out \xa0\xa0 [ - ]',
        isSelected: false,
        shapeType: ShapeType.zoomOut
      },
      {
        id: 8,
        name: 'comment',
        iconName: 'icon-pin-com',
        label: 'Comment',
        isSelected: false,
        shapeType: ShapeType.comment
      },
      {
        id: 9,
        name: 'hide-annotations',
        iconName: 'icon-box-hide',
        label: 'Hide Annotations',
        isSelected: false,
        shapeType: ShapeType.hideAnnotations
      },
    ];
    this.isPlay = false;
    this.videoDuration = '00:00:00';
    this.currentTime = '00:00:00';
    this.frameTime = '000:00:00';
    this.totalFrames = 0;
    this.fps = 4;
    this.currentFrame = 0;
    this.skipFrameCount = 1;
    this.mediaPlayerFpsCount = 1;
    this.frameData = [];
    this.labelsList = [];
    this.subLabels = [];
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.selectedTaskId = '';
    this.videoUrl = '';
    this.selectLabelState = '';
    this.selectedBoxes = [];
    this.selectedCommentBoxes = [];
    this.frameRate = 0;
    this.auditedDateStr = '';
    this.defaultAttributeValue = '';
    this.userLog = [];
  }

  generateFramesArray(totalFrames: number, startFrame: number) {
    let totalFramesCount = totalFrames;
    for (let i = startFrame; i < totalFramesCount; i++) {
      let frameObj = {
        frameId: i + 1,
        boxes: [],
        commentBoxes: [],
        isEmpty: true,
        userLog: []
      };
      this.frameData.push(frameObj);
    }
  }

  generateFramesArrayByExisting(
    totalFrames: number,
    existingFrames: Array<any>
  ) {

    let totalFramesCount = totalFrames;
    for (let i = 0; i < totalFramesCount; i++) {
      let existingItem = existingFrames.find((x) => x.frameId == i + 1);
      if (existingItem) {
        if (!existingItem.commentBoxes) {
          existingItem.commentBoxes = [];
        }

        if (existingItem.userLog == null) {
          existingItem.userLog = [];
        }
        this.frameData[i] = existingItem;
      } else {
        let frameObj = {
          frameId: i + 1,
          boxes: [],
          commentBoxes: [],
          isEmpty: true,
          userLog: []
        };
        this.frameData[i] = frameObj;
      }
    }
  }

  /**
   * Method to filter frame data according to label filter
   * @param labelFilter label filter object
   */
  filterFrames(labelFilter: any, showAllFrameData: boolean): void {

    if (labelFilter) {
      for (let frameOri of this.frameData) {

        for (let boxOri of frameOri.boxes) {
          let isLabelOk = false;
          let isAttributeOk = false;
          // Label filtering
          if (boxOri?.boundaries) {
            let boxLabel = boxOri?.boundaries?.label;

            for (let flterLabelObj of labelFilter) {
              if (flterLabelObj.checked == true) {
                let labelStr = flterLabelObj.label;
                if (labelStr == boxLabel) {
                  isLabelOk = true;
                  isAttributeOk = true;
                  let attributeFilteringSet = [];
                  for (let filterAttrObj of flterLabelObj.attributes) {
                    if (filterAttrObj.checked == true) {
                      isAttributeOk = false;
                      let attrKey = filterAttrObj.key;

                      if (boxOri?.attributeValues[attrKey]) {
                        isAttributeOk = true;
                        let attributeValues = filterAttrObj?.values.filter((x: any) => x.checked == true).map((y: any) => y.valueName);
                        
                        if (attributeValues.length > 0) {
                          isAttributeOk = false;
                          let attrValue = boxOri?.attributeValues[attrKey];
                          let isValue = attributeValues.find((x:any)=>x==attrValue);
                          
                          if(isValue){
                            isAttributeOk = true;
                          }
                        } 

                      }                    
                    attributeFilteringSet.push(isAttributeOk);
                    } 
                  }
                  let ishasAttributeOk = attributeFilteringSet.find( (x:boolean) => x==true);
                  if(ishasAttributeOk){
                    isAttributeOk = true;
                  }
                }
              }

            }
          }
          if (showAllFrameData) {
            boxOri.boundaries.isHide = false;
          } else {
            if (isLabelOk && isAttributeOk) {
              boxOri.boundaries.isHide = false;
            } else {
              boxOri.boundaries.isHide = true;
            }
          }
        }

      }

    }

  }
}


export interface toolItem {
  id: number;
  name: string;
  iconName: string;
  label: string;
  isSelected: boolean;
  shapeType?: string
}

export interface frameItem {
  frameId: number;
  boxes: Array<FrameBox>;
  commentBoxes: Array<CommentBox>;
  isEmpty: boolean;
  userLog: Array<string>;
}
export interface FrameBoxBoundaries {
  x: number;
  y: number;
  w: number;
  h: number;
  geometry?: string;
  type: string;
  label: string;
}

export interface FrameBox {
  id: number;
  boundaries: any;
  attributeValues: any;
  isHide?: boolean;
}
export class ShapeStatus {
  public static completed = 'completed';
  public static pending = 'pending';
  public static drawed = 'drawed';
}
export class ShapeLabel {
  public static pending = 'pending';
  public static empty = '';
}

export class TaskStatus {
  public static pending = 0;
  public static accepted = 1;
  public static rejected = 2;
  public static fixed = 3;
  public static fixing = 4;
  public static completed = 5;
}

export class AuditStatus {
  public static notStarted = 0;
  public static inProgress = 1;
  public static completed = 2;
}

export class ToolTypeIndex {
  public static notSelected = 0;
  public static mousePointer = 1;
  public static rotateAntiClock = 2;
  public static rotateClock = 3;
  public static annotate = 4;
  public static pan = 5;
  public static zoomIn = 6;
  public static zoomOut = 7;
  public static comment = 8;
  public static hideAnnotations = 9;
}
export class ToolLabels {
  public static showAnnotation = 'Show Annotations';
  public static hideAnnotation = 'Hide Annotations'
}

export interface PropertyChangeDetection {
  isEnabled: boolean;
  params: any;
}


export class ChangeTaskError {
  public static nextFrameError = 'Can’t go to Next task without completing current task.'
}

export class ChangeTaskErrorCode {
  public static noError = 0;
  public static nextFrame = 1;
  public static prevFrame = 2;
}

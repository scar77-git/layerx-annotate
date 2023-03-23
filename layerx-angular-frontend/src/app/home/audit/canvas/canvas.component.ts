/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { findIndex, takeUntil } from 'rxjs/operators';
import { Audit, ShapeLabel, ShapeStatus } from 'src/app/models/audit.model';
import { Canvas } from 'src/app/models/canvas.model';
import { CommentBox } from 'src/app/models/comment-box.model';
import { Shape, ShapeType } from 'src/app/models/shape.model';
import { SelectedLabelItem } from 'src/app/models/sub-label.model';
import { CommentDataService } from 'src/app/services/data/comment-data.service';
import { UserDataService } from 'src/app/services/user-data.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-canvas',
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.scss'],
})
export class CanvasComponent implements OnInit {
  @Output() pushPositions = new EventEmitter<any>();
  @Output() onDrawEnd = new EventEmitter<any>();
  @Output() onDrawDelete = new EventEmitter<any>();
  @Output() pushLabels = new EventEmitter<any>();
  @Output() pushLabel = new EventEmitter<String>();
  @Output() pushSelectedBox = new EventEmitter<{
    index: number;
    shape: Shape;
  }>();
  @Output() changeShapeType = new EventEmitter<string>();
  @Output() saveCurrentFrameData = new EventEmitter();
  @Output() frameUpdateStatus = new EventEmitter<boolean>();
  @Output() dragSvgCoordinates = new EventEmitter<{
    onDrag: boolean;
    coords: Array<number>;
  }>();
  @Output() zoomIn = new EventEmitter<any>();
  @Output() zoomOut = new EventEmitter<any>();

  @Input() shapesToDraw: Array<Shape> = [];
  @Input() currentShape!: Subject<Shape>;
  @Input() currentFrame!: number;
  @Input() shape = '';
  @Input() screenZoom = 1;
  @Input() selectedTaskData!: any;
  @Input() toggleLabels!: boolean;
  @Input() showAnnotations!: boolean;
  @Input() isPlay!: boolean;
  readonly constantShapeTypes = ShapeType;
  private ngUnsubscribe = new Subject();

  audit: Audit;
  canvas: Canvas;
  showMenu: boolean;
  startDraw: boolean;
  label: string;
  labelX: string;
  labelY: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
  status: string;
  createdShape: Shape = new Shape();
  shapeType = ShapeType.rectangle;
  selectedTaskId: string;
  loading: boolean;
  labelList: Array<any>;
  completeItem: boolean;
  initX: number;
  initY: number;
  initW: number;
  initH: number;
  lastEditedBox: number;
  moveBox: boolean;
  id: number;
  maxId: number;
  newBox: boolean;
  selectedCircle: number;
  minSize: number;
  canvasWidth: number;
  canvasHeight: number;
  currentPositionX: number;
  currentPositionY: number;
  videoWidth: number;
  videoHeight: number;
  strokeMultiplier: number;
  viewBox = '0 0 1920 1080';
  labelPositionX: number;
  labelPositionY: number;
  showLabelId: number;
  email = '';
  commentBoxes: Array<CommentBox>;
  popUpCommentBox: boolean;
  selectedCommentBoxIndex: number;
  selectedAttributeIndex!: number;
  // screenZoom: number;
  tempCommentBox: CommentBox; // For temparally dev purpose
  showCommentDots: boolean;
  isRightClicked: boolean;
  boxData: Array<any>;
  updateBoxId: number;
  attributes: Array<any> = [];
  attributesCount: Array<number> = [];
  dragSvg: boolean;
  commentBoxId: number;
  userType: number;
  // isFrameUpdated: boolean;

  USER_TYPE_ANNOTATOR = environment.USER_TYPE_ANNOTATOR;

  constructor(
    private _activatedRoute: ActivatedRoute,
    private _userDataService: UserDataService,
    private _commentDataService: CommentDataService
  ) {
    this.audit = new Audit();
    this.canvas = new Canvas();
    this.showMenu = false;
    this.loading = false;
    this.startDraw = false;
    this.label = '';
    this.labelX = '100px';
    this.labelY = '100px';
    this.posX = 0;
    this.posY = 0;
    this.width = 0;
    this.height = 0;
    this.status = ShapeStatus.completed;
    this.labelList = [];
    this.selectedTaskId = '';
    this.completeItem = true;
    this.initX = 0;
    this.initY = 0;
    this.initW = 0;
    this.initH = 0;
    this.lastEditedBox = -1;
    this.moveBox = false;
    this.id = 1;
    this.maxId = 0;
    this.newBox = false;
    this.selectedCircle = 0;
    this.minSize = 4;
    this.canvasWidth = 0;
    this.canvasHeight = 0;
    this.currentPositionX = 0;
    this.currentPositionY = 0;
    this.videoWidth = 1920;
    this.videoHeight = 1080;
    this.strokeMultiplier = 1;
    this.labelPositionX = 0;
    this.labelPositionY = 0;
    this.showLabelId = -1;
    this.commentBoxes = [];
    this.popUpCommentBox = false;
    this.screenZoom = 2;
    this.selectedCommentBoxIndex = -1;
    this.tempCommentBox = {
      id: 1,
      isResolved: true,
      createdBy: this._userDataService.getUserDetails().userId,
      commentBoxTop: 0,
      commentBoxLeft: 0,
      commentList: [],
    };
    this.showCommentDots = true;
    this.isRightClicked = false;
    this.boxData = [];
    this.updateBoxId = -1;
    this.dragSvg = false;
    this.commentBoxId = 1;
    this.userType = this._userDataService.getUserDetails().userType;
  }

  ngOnInit(): void {
    this._activatedRoute.queryParams.subscribe((params) => {
      this.selectedTaskId = params['taskId'];
    });
    this.canvasWidth = this.selectedTaskData.canvasWidth;
    this.canvasHeight = this.selectedTaskData.canvasHeight;
    this.viewBox =
      '0 0 ' +
      this.selectedTaskData.videoWidth +
      ' ' +
      this.selectedTaskData.videoHeight;
    this.videoWidth = this.selectedTaskData.videoWidth;
    this.videoHeight = this.selectedTaskData.videoHeight;

    this.getSelectedFrameCommentBoxes();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.currentFrame) {
      this.currentFrame = changes.currentFrame.currentValue;
    }
    if (this.selectedTaskId) {
      this.calcStrokeMultiplier();
    }

    this.resetCommentData();
    this.calcAttributes();
  }

  resetCommentData() {
    this.popUpCommentBox = false;
    this.tempCommentBox = new CommentBox();
  }

  /**set box label attributes */
  calcAttributes(){
    if(this.shapesToDraw.length > 0){
      let keys = [];
      for(let i = 0; i < this.shapesToDraw.length ; i++){
        let keyIndex = this.selectedTaskData.labelsList.findIndex((x: { label: any; }) => x.label == this.shapesToDraw[i].label);
        let key = []
        if(keyIndex >= 0){
          let length = this.selectedTaskData.labelsList[keyIndex].attributes.length
          for(let j = 0; j < length; j++){
            key[j] = this.selectedTaskData.labelsList[keyIndex].attributes[j].key
          }
        }
        keys[i] = key;
        this.attributes[i] = []

        for(let k = 0; k < keys[i].length; k++){
          this.attributes[i][k] = this.shapesToDraw[i].attributeValues[keys[i][k]];
        }
        this.attributesCount[i] = Object.keys(this.shapesToDraw[i].attributeValues).length
      }
    }
  }

  /**
   * Save current frame
   */
  saveCurrentFrame() {
    this.deleteZeroCommentCommentBox(this.selectedCommentBoxIndex);
    this.saveCurrentFrameData.emit();
    this._commentDataService.setRefreshComments(true);
  }

  /**
   * Delete Zero comment comment box
   */
  deleteZeroCommentCommentBox(boxIndex:number) {
    if (boxIndex > -1) {
      let commentBox = this.commentBoxes[boxIndex];
      if (commentBox.commentList && commentBox.commentList.length == 0) {
        this.commentBoxes.splice(boxIndex, 1);
        this.popUpCommentBox = false;
        this.selectedCommentBoxIndex = -1;
      }
    }
  }

  /**
   * Get Selected commentdata for current frame
   */
  getSelectedFrameCommentBoxes(): void {
    this._commentDataService
      .getSelectedFrameCommentBoxes()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((data: CommentBox[]) => {
        this.calcStrokeMultiplier();
        this.commentBoxes = data;
      });
  }

  /**
   * calculate stroke size based on screen size
   */
  calcStrokeMultiplier() {
    if (this.canvasWidth > 0) {
      this.strokeMultiplier =
        (this.canvasWidth / this.videoWidth) * this.screenZoom;
    }
  }
  setPosition(num: Array<number>) {
    this.pushPositions.emit(num);
  }

  setLabels(newLabel: string, previousLabel?: string) {
    this.pushLabels.emit({new: newLabel, previous: previousLabel});
  }

  setLabel(lbl: String) {
    this.pushLabel.emit(lbl);
  }

  /**
   * get initial mouse click position
   * @param evt 
   */
  startDrawing(evt: MouseEvent) {
    this.selectedCommentBoxIndex = -1;
    this.popUpCommentBox = false;
    // this.id = this.shapesToDraw.length + 1;

    this.currentPositionX =
      evt.offsetX / (this.canvasWidth / this.videoWidth) / this.screenZoom;
    this.currentPositionY =
      evt.offsetY / (this.canvasWidth / this.videoWidth) / this.screenZoom;
    this.showMenu = false;
    this.canvas.showLabelMenu = false;
    let lastShape = this.shapesToDraw[this.shapesToDraw.length - 1];
    let selectedShape = this.shapesToDraw[this.lastEditedBox];

    if (
      selectedShape &&
      !this.newBox &&
      this.selectedCircle == 0 &&
      selectedShape.x < this.currentPositionX &&
      this.currentPositionX < selectedShape.x + selectedShape.w &&
      selectedShape.y < this.currentPositionY &&
      this.currentPositionY < selectedShape.y + selectedShape.h
    ) {
      this.moveBox = true;
      this.initX = this.currentPositionX - selectedShape.x;
      this.initY = this.currentPositionY - selectedShape.y;
    }

    if (lastShape && lastShape.id && !this.moveBox) {
      const ids = this.shapesToDraw.map(i => i.id);
      const lastId = ids.reduce((element, max) => element > max ? element : max, 0)
      this.id = lastId + 1;
    }
    if (
      lastShape &&
      lastShape.label == ShapeLabel.empty &&
      !this.moveBox &&
      this.selectedCircle == 0
    ) {
      this.shapesToDraw.splice(-1);
      this.id = this.id - 1;
    }

    if (this.shapeType == ShapeType.comment) {

      this.newCommentBox(
        false,
        this.currentPositionX,
        this.currentPositionY,
        false
      );
    }


    if (
      this.shapeType == ShapeType.rectangle &&
      !this.moveBox &&
      this.selectedCircle == 0
    ) {
      this.createdShape = {
        id: this.id,
        type: this.shapeType,
        x: this.currentPositionX,
        y: this.currentPositionY,
        w: 0,
        h: 0,
        label: ShapeLabel.empty,
        key: ShapeLabel.empty,
        color: '#fff400',
        status: ShapeStatus.pending,
        isPermanent: false,
        attributeValues: {},
      };

      this.initX = this.currentPositionX;
      this.initY = this.currentPositionY;
      this.status = ShapeStatus.pending;
      this.shapesToDraw.push(this.createdShape);
      this.startDraw = true;
    }
    if (this.shapeType == ShapeType.pan) {
      this.dragSvg = true;
      this.initX = this.currentPositionX;
      this.initY = this.currentPositionY;
      this.dragSvgCoordinates.emit({onDrag:false, coords:[]})
    }
    if (this.shapeType == ShapeType.zoomIn){
      this.initX = this.currentPositionX;
      this.initY = this.currentPositionY;
      this.zoomIn.emit([this.initX, this.initY])
    }
    if (this.shapeType == ShapeType.zoomOut){
      this.zoomOut.emit()
    }
  }

  /**
   * get mouse positions when moving
   * @param evt 
   */
  keepDrawing(evt: MouseEvent) {
    this.shapeType = this.shape;
    this.currentPositionX =
      evt.offsetX / (this.canvasWidth / this.videoWidth) / this.screenZoom;
    this.currentPositionY =
      evt.offsetY / (this.canvasWidth / this.videoWidth) / this.screenZoom;
    if (this.shapeType == ShapeType.rectangle && this.startDraw) {
      this.showCommentDots = false;
      this.createdShape.w = Math.abs(this.currentPositionX - this.initX);
      this.createdShape.h = Math.abs(this.currentPositionY - this.initY);
      if (this.currentPositionX - this.initX < 0) {
        this.createdShape.x = this.currentPositionX;
      }
      if (this.currentPositionY - this.initY < 0) {
        this.createdShape.y = this.currentPositionY;
      }
      if (this.createdShape.label == ShapeLabel.empty) {
        this.posX = Math.ceil(this.createdShape.x);
        this.posY = Math.ceil(this.createdShape.y);
        this.height = Math.ceil(this.createdShape.h);
        this.width = Math.ceil(this.createdShape.w);
        this.setPosition([this.posX, this.posY, this.height, this.width, this.id]);
        this.boxData[0] = false;
      }
    }

    if(this.dragSvg){
      this.dragSvgCoordinates.emit({onDrag:true, coords:[this.initX,this.initY,this.currentPositionX,this.currentPositionY]})
    }

    if (this.moveBox) {
      this.shapesToDraw[this.lastEditedBox].x =
        this.currentPositionX - this.initX;
      this.shapesToDraw[this.lastEditedBox].y =
        this.currentPositionY - this.initY;
    }
    if (this.moveBox || this.selectedCircle != 0) {
      this.setPosition([
        Math.ceil(this.shapesToDraw[this.lastEditedBox].x),
        Math.ceil(this.shapesToDraw[this.lastEditedBox].y),
        Math.ceil(this.shapesToDraw[this.lastEditedBox].h),
        Math.ceil(this.shapesToDraw[this.lastEditedBox].w),
      ]);
      this.showCommentDots = false;
    }
    if (this.selectedCircle == 1 && !this.moveBox) {
      let x = this.shapesToDraw[this.lastEditedBox].x;
      let width = this.shapesToDraw[this.lastEditedBox].w;
      let y = this.shapesToDraw[this.lastEditedBox].y;
      let height = this.shapesToDraw[this.lastEditedBox].h;
      if (width > this.minSize) {
        this.shapesToDraw[this.lastEditedBox].x = this.currentPositionX;
      }
      if (height > this.minSize) {
        this.shapesToDraw[this.lastEditedBox].y = this.currentPositionY;
      }
      this.shapesToDraw[this.lastEditedBox].w = Math.max(
        width - this.currentPositionX + x,
        this.minSize
      );
      this.shapesToDraw[this.lastEditedBox].h = Math.max(
        height - this.currentPositionY + y,
        this.minSize
      );
    }
    if (this.selectedCircle == 2 && !this.moveBox) {
      let y = this.shapesToDraw[this.lastEditedBox].y;
      let height = this.shapesToDraw[this.lastEditedBox].h;
      this.shapesToDraw[this.lastEditedBox].w = Math.max(
        this.currentPositionX - this.shapesToDraw[this.lastEditedBox].x,
        this.minSize
      );
      if (height > this.minSize) {
        this.shapesToDraw[this.lastEditedBox].y = this.currentPositionY;
      }
      this.shapesToDraw[this.lastEditedBox].h = Math.max(
        height - this.currentPositionY + y,
        this.minSize
      );
    }

    if (this.selectedCircle == 3 && !this.moveBox) {
      let x = this.shapesToDraw[this.lastEditedBox].x;
      let width = this.shapesToDraw[this.lastEditedBox].w;
      this.shapesToDraw[this.lastEditedBox].h = Math.max(
        this.currentPositionY - this.shapesToDraw[this.lastEditedBox].y,
        this.minSize
      );
      if (width > this.minSize) {
        this.shapesToDraw[this.lastEditedBox].x = this.currentPositionX;
      }
      this.shapesToDraw[this.lastEditedBox].w = Math.max(
        width - this.currentPositionX + x,
        this.minSize
      );
    }

    if (this.selectedCircle == 4 && !this.moveBox) {
      this.shapesToDraw[this.lastEditedBox].w = Math.max(
        this.currentPositionX - this.shapesToDraw[this.lastEditedBox].x,
        this.minSize
      );
      this.shapesToDraw[this.lastEditedBox].h = Math.max(
        this.currentPositionY - this.shapesToDraw[this.lastEditedBox].y,
        this.minSize
      );
    }
  }

  /**
   * get mouse release position
   * @param evt 
   */
  stopDrawing(evt: MouseEvent) {
    if(this.moveBox || this.selectedCircle != 0){
      this.frameUpdated();
    }
    this.showCommentDots = true;
    this.startDraw = false;
    this.status = ShapeStatus.completed;
    if (this.shapesToDraw[this.lastEditedBox] && !this.selectedCircle && !this.isRightClicked) {
      this.shapesToDraw[this.lastEditedBox].status = ShapeStatus.pending;
    }

    if (
      (this.createdShape.h <= this.minSize ||
        this.createdShape.w <= this.minSize) &&
      !this.moveBox &&
      !this.selectedCircle
    ) {
      if(!this.isRightClicked){
        this.lastEditedBox = -1;
      }
      if (this.shapeType == ShapeType.rectangle) {
        this.shapesToDraw.splice(-1);
        this.onDrawEnd.emit(null)
      }
      if (this.shapeType == ShapeType.pointer) {
        this.onDrawEnd.emit(null)
      }
      if (this.id > 1) {
        this.id = this.id - 1;
      }
      this.newBox = true;
    } else if (this.createdShape) {
      this.createdShape.status = ShapeStatus.drawed;
      this.newBox = false;
      if (this.moveBox || this.selectedCircle != 0) {
        this.popupPosition(
          this.shapesToDraw[this.lastEditedBox].x,
          this.shapesToDraw[this.lastEditedBox].w,
          this.shapesToDraw[this.lastEditedBox].y,
          this.shapesToDraw[this.lastEditedBox].h
        );
      } else if (
        this.selectedCircle == 0 &&
        this.shapeType == ShapeType.rectangle
      ) {
        this.lastEditedBox = this.shapesToDraw.length - 1;
        this.popupPosition(
          this.createdShape.x,
          this.createdShape.w,
          this.createdShape.y,
          this.createdShape.h
        );
      }
      if (
        this.shapesToDraw.length > 0 &&
        this.lastEditedBox >= 0 &&
        this.shapesToDraw[this.lastEditedBox].label == ShapeLabel.empty
      ) {        
        this.showMenu = true;
        this.canvas.showLabelMenu = true;
        this.status = ShapeStatus.pending;
      }
      this.createdShape = {
        id: 0,
        type: this.shapeType,
        x: 0,
        y: 0,
        w: 0,
        h: 0,
        label: ShapeLabel.empty,
        key: ShapeLabel.empty,
        color: '',
        status: '',
        isPermanent: false,
        attributeValues: {},
      };
      this.label = '';
      this.canvas.selectedLabelId = 9;
    }
    this.selectedCircle = 0;
    this.moveBox = false;
    this.dragSvg = false;

    this.isRightClicked = false;
    /**test whether box moved or resized */

  }

  /**
   * calculate label selection popup location
   * @param x box x coordinate
   * @param w box width
   * @param y box y coordinate
   * @param h box heigh
   */
  popupPosition(x: number, w: number, y: number, h: number) {
    if (
      x + w <
      (this.canvasWidth - 415 / this.screenZoom) /
      (this.canvasWidth / this.videoWidth)
    ) {
      this.labelX =
        (x + w + 32) * (this.canvasWidth / this.videoWidth) * this.screenZoom +
        'px';
    } else {
      this.labelX =
        x * (this.canvasWidth / this.videoWidth) * this.screenZoom - 432 + 'px';
    }
    if (y < (this.canvasHeight - 318) / (this.canvasWidth / this.videoWidth)) {
      this.labelY =
        y * (this.canvasWidth / this.videoWidth) * this.screenZoom + 'px';
    } else {
      let labelY =
        (y + h) * (this.canvasWidth / this.videoWidth) * this.screenZoom - 260;
      if (labelY < 0) {
        labelY = 10;
      }
      this.labelY = labelY + 'px';
    }
  }

  /**
   * add selected label to shape
   * @param labelObj 
   * @param index 
   */
  addLabel(labelObj: SelectedLabelItem, index: number) {
    this.shapesToDraw[this.shapesToDraw.length - 1].label = labelObj.label;
    this.shapesToDraw[this.shapesToDraw.length - 1].key = labelObj.key;
    this.shapesToDraw[this.shapesToDraw.length - 1].attributeValues = labelObj.attributeValues;
    this.shapesToDraw[this.shapesToDraw.length - 1].status =
      ShapeStatus.completed;
    this.shapesToDraw[this.shapesToDraw.length - 1].isPermanent = true;
    this.label = labelObj.label;
    this.canvas.selectedLabelId = index;
    this.close();
    this.status = ShapeStatus.completed;
    this.setLabel(labelObj.label);
    this.setLabels(labelObj.label);
    this.completeItem = true;
    this.shapesToDraw[this.shapesToDraw.length - 1].color = labelObj.color;
    this.moveBox = false;
    this.newBox = true;
    this.lastEditedBox = -1;
    let lastItem = this.shapesToDraw[this.shapesToDraw.length - 1];

    let key = this.selectedTaskData.labelsList.findIndex((x: { label: string; }) => x.label == lastItem.label);
    let isAnnotateEnable = this.selectedTaskData.labelsList[key].isAnnotationEnabled
    if(!lastItem.createdAt && this.userType == this.USER_TYPE_ANNOTATOR && isAnnotateEnable){
      lastItem.createdAt = new Date();
      lastItem.annotatorId = this._userDataService.getUserDetails().userId;
    }
    this.onDrawEnd.emit(lastItem);
  }

  updateLabel(labelObj: SelectedLabelItem, index: number){
    if(this.shapesToDraw[index].label != labelObj.label) {
      this.setLabels(labelObj.label,this.shapesToDraw[index].label);
    }
    this.shapesToDraw[index].color = labelObj.color;
    this.shapesToDraw[index].label = labelObj.label;
    this.shapesToDraw[index].key = labelObj.key;
    this.shapesToDraw[index].attributeValues = labelObj.attributeValues;
    this.shapesToDraw[index].status =
      ShapeStatus.completed;
    this.shapesToDraw[index].isPermanent = true;
    this.label = labelObj.label;
    this.close();
    this.status = ShapeStatus.completed;
    let lastItem = this.shapesToDraw[index];
    let key = this.selectedTaskData.labelsList.findIndex((x: { label: string; }) => x.label == lastItem.label);
    let isAnnotateEnable = this.selectedTaskData.labelsList[key].isAnnotationEnabled
    if(!lastItem.createdAt && this.userType == this.USER_TYPE_ANNOTATOR && isAnnotateEnable){
      lastItem.createdAt = new Date();
      lastItem.annotatorId = this._userDataService.getUserDetails().userId;
    }
    this.onDrawEnd.emit(lastItem);

    this.frameUpdated()
  }



  /**
   * get label value and attribute values from sub label component
   * @param labelData - selected label data
   */
  sendLabel(labelData:SelectedLabelItem){
    this.addLabel(labelData, 0);
    this.frameUpdated();
  }

  /**
   * get label selection popup close event
   * @param closeStatus 
   */
  getCloseEvent(closeStatus:boolean){
    this.close();
    
  }
  /**
   * get label selection update event
   * @param labelData updated label data
   */
  getUpdateEvent(labelData:SelectedLabelItem){
    this.updateLabel(labelData, this.updateBoxId);
  }

  close() {
    this.calcAttributes();
    if (this.shapesToDraw[this.shapesToDraw.length - 1].label == '') {
      this.shapesToDraw.splice(-1);
      this.status = ShapeStatus.completed;
    }
    this.canvas.showLabelMenu = false;
    this.showMenu = false;

    if(this.shapesToDraw[this.lastEditedBox]){
      this.shapesToDraw[this.lastEditedBox].status = ShapeStatus.completed
    }
  }

  /**
   * load selected box data
   * @param index shape array index
   * @param shape shape data
   */
  selectBox(index: number, shape: Shape) {
    if((this.shapeType == ShapeType.rectangle && !this.shapesToDraw[index].isPermanent) || this.shapeType == ShapeType.pointer){
      this.shapesToDraw[index].status = ShapeStatus.drawed;

      this.lastEditedBox = index;
      this.newBox = false;
      if(shape.label){
        this.onDrawEnd.emit(shape);
      }
      this.pushSelectedBox.emit({ index: index, shape: shape });
    }
    
  }

  /**open label menu when right click on boxes*/
  openMenu(index: number, event:any) {
    /** to unselect last selected box */
    if(this.lastEditedBox != -1){
      this.shapesToDraw[this.lastEditedBox].status = ShapeStatus.completed
    }
    /** select clicked box and popup menu */
    this.isRightClicked = true;
    this.shapesToDraw[index].status = ShapeStatus.drawed;
    this.lastEditedBox = index;
    this.newBox = false;

    let shape = this.shapesToDraw[index];
    this.popupPosition(shape.x, shape.w, shape.y, shape.h);
    this.boxData[0] = true;
    this.boxData[1] = shape;
    this.boxData[2] = index;
    this.canvas.showLabelMenu = true;
    this.label = shape.label
    this.updateBoxId = index;

    return false;
  }

  rectMove(event: any) {
  }

  /**
   * get event when click on box resize circle
   * @param id circle id (1,2,3,4)
   */
  clickCircle(id: number) {
    this.selectedCircle = id;
    this.moveBox = false;
  }

  mouseLeave(evt: MouseEvent) {
    if (this.startDraw) {
      this.stopDrawing(evt);
    }
  }
  mouseEnter(evt: MouseEvent){
    this.calcAttributes();
    this.frameUpdated()
  }

  /**
   * show label popup on hover
   * @param id shape array index
   */
  showLabel(id: number) {
    this.showLabelId = id;
  }

  /**
   * create new comment
   * @param resolved resolved status
   * @param x comment box position x
   * @param y comment box position y
   * @param isPermanent true = save on database / false = skip save
   */
  newCommentBox(resolved: boolean, x: number, y: number, isPermanent: boolean) {
    const ids = this.commentBoxes.map(i => i.id);
    const lastId = ids.reduce((element, max) => element > max ? element : max, 0) + 1;
    this.tempCommentBox = new CommentBox();
    this.tempCommentBox.id = lastId;
    this.tempCommentBox.isResolved = resolved;
    this.tempCommentBox.commentBoxTop = x;
    this.tempCommentBox.commentBoxLeft = y;
    this.tempCommentBox.isPermanent = isPermanent;
    this.popUpCommentBox = true;


    this.labelY =
      (y - 30) *
      (this.canvasWidth / this.videoWidth)
      +
      'px';

    this.labelX =
      (x + 70) *
      (this.canvasWidth / this.videoWidth)
      +
      'px';

    if (
      x >
      (this.canvasWidth - 460 / this.screenZoom) /
      (this.canvasWidth / this.videoWidth)
    ) {
      this.labelX = x * (this.canvasWidth / this.videoWidth) - 450 + 'px';
    }
    if (y > (this.canvasHeight - 195 / this.screenZoom) / (this.canvasWidth / this.videoWidth)) {
      this.labelY = (y * (this.canvasWidth / this.videoWidth) - 190 - 80) + 'px'
    }
  }

  /**
   *
   * @param newComment new comment
   */
  sendComment(newComment: CommentBox) {
    this.popUpCommentBox = false;
    let newCommentTemp = JSON.stringify(newComment);
    let newCommentObj = JSON.parse(newCommentTemp);
    if (!newCommentObj.isPermanent) {
      newCommentObj.isPermanent = true;
      this.commentBoxes.push(newCommentObj);
    } else {
      this.commentBoxes[this.selectedCommentBoxIndex] = newCommentObj;
    }
    this.tempCommentBox = new CommentBox();
    if (this.shapeType == ShapeType.comment) {
      this.shapeType = ShapeType.notSelected;
      this.changeShapeType.emit(this.shapeType);
    }
    this._commentDataService.setSelectedFrameCommentBoxes(this.commentBoxes);
  }
  cancelComment(){
    this.popUpCommentBox = false;
  }

  /**
   * open selected comment box
   * @param index comment box id
   */
  setSelectedCommentBox(index: number) {
    this.selectedCommentBoxIndex = index;
    if (
      this.selectedCommentBoxIndex > -1 &&
      this.commentBoxes[this.selectedCommentBoxIndex]
    ) {
      let selectedCommentBox = this.commentBoxes[this.selectedCommentBoxIndex];
      this.popUpCommentBox = true;
      this.labelX =
        (selectedCommentBox.commentBoxTop - 30) *
          (this.canvasWidth / this.videoWidth) +
        'px';
      this.labelY =
        (selectedCommentBox.commentBoxLeft + 60) *
          (this.canvasWidth / this.videoWidth) +
        'px';

      let y = selectedCommentBox.commentBoxLeft;
      let x = selectedCommentBox.commentBoxTop;
      let noOfComments = this.commentBoxes[index].commentList.length;

      this.labelY = (y - 30) * (this.canvasWidth / this.videoWidth) + 'px';

      this.labelX = (x + 70) * (this.canvasWidth / this.videoWidth) + 'px';

      if (x >
        (this.canvasWidth - 460 / this.screenZoom) /
        (this.canvasWidth / this.videoWidth)) {
        this.labelX = (x * (this.canvasWidth / this.videoWidth) - 450) + 'px'
      }
      if (y > (this.canvasHeight - 255 / this.screenZoom) / (this.canvasWidth / this.videoWidth)) {
        this.labelY = (y * (this.canvasWidth / this.videoWidth) * this.screenZoom - 355) + 'px'
        if (noOfComments >= 2) {
          this.labelY = (y * (this.canvasWidth / this.videoWidth) * this.screenZoom - 390) + 'px'
        }
      }
    }
  }

  /** check for new updates on boxes */
  frameUpdated(){
    this.frameUpdateStatus.emit(true)
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}


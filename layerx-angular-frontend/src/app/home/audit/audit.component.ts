/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

/**
 * @class: AuditComponent
 * purpose of this module is view annotation view
 * @description:implements all the logics annotation tool view
 * @author: Isuru Avishka
 */

import {
  Component,
  ElementRef,
  HostListener,
  KeyValueDiffer,
  KeyValueDiffers,
  NgZone,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  BehaviorSubject,
  fromEvent,
  interval,
  Observable,
  Subject,
  Subscription,
} from 'rxjs';
import {
  Audit,
  AuditStatus,
  ChangeTaskError,
  FrameBox,
  PropertyChangeDetection,
  ShapeStatus,
  TaskStatus,
  ToolLabels,
  ToolTypeIndex,
} from 'src/app/models/audit.model';
import { Shape, ShapeType } from 'src/app/models/shape.model';
import { Task } from 'src/app/models/task.model';
import { AnnotationTaskService } from 'src/app/services/annotation-task.service';
import { ShapeService } from 'src/app/services/shape.service';
import { environment } from 'src/environments/environment';
import { MatDialog } from '@angular/material/dialog';
import { ErrorDialogComponent } from 'src/app/components/modals/error-dialog/error-dialog.component';
import { CommentBox } from 'src/app/models/comment-box.model';
import { CommentDataService } from 'src/app/services/data/comment-data.service';
import { UserDataService } from 'src/app/services/user-data.service';
import { takeUntil } from 'rxjs/operators';
import { CustomModalComponent } from 'src/app/components/modals/custom-modal/custom-modal.component';
import {
  ButtonTypes,
  convertClassToObject,
  TaskButtonStatus,
} from 'src/app/models/task-button-status.model';
import { AuditDataService } from 'src/app/services/data/audit-data.service';
import { FramePropertyService } from 'src/app/services/data/frame-property.service';
import { Location } from '@angular/common';
import { FrameFilterService } from 'src/app/services/data/frame-filter.service';
import { SidebarDataService } from 'src/app/services/data/sidebar-data.service';
import { FrameSideBarTabs } from 'src/app/shared/constants/frame';

declare var VideoFrame: any;
declare var FrameRates: any;

@Component({
  selector: 'app-audit',
  templateUrl: './audit.component.html',
  styleUrls: ['./audit.component.scss'],
})
export class AuditComponent implements OnInit {
  @ViewChild('videoPlayerEl')
  elementVideoPlayer!: ElementRef;
  @ViewChild('panel', { read: ElementRef })
  public panel!: ElementRef<any>;

  audit: Audit;
  private auditDiffer: KeyValueDiffer<string, any>;
  task: Task;
  buttonTypes: any = null;

  taskButtonsStatus: TaskButtonStatus;
  selectedToolItem: number;
  videoElement: any;
  scrubBarWidth: number;
  leftPosition: number;
  frameDivOpacity: number;
  element!: any;
  videoEl: any;
  backwardEvent: string;
  screenWidth: number;
  screenHeight: number;
  sidebarWidth: number;
  sidebarHeight: number;
  videoFrameWidth: number;
  videoFrameHeight: number;
  loadSVG: boolean;
  isShowOptions: boolean;

  shapes!: Array<Shape>;
  private shapesDiffer: KeyValueDiffer<string, any>;
  selectedLabel: String;
  saved: boolean;
  currentShape = new BehaviorSubject<Shape>(null!);
  loading: boolean;
  shapeType: string;
  selectedBoxIndex: number;
  selectedBoxId: number;
  s3Bucket!: any;
  videoLoadingSpinner: boolean;
  items = ['', '', '', ''];
  private itemDiffer: KeyValueDiffer<string, any>;
  frameGenerateStartFrom: number;
  videoMargin: number;
  selectedCommentBoxIndex!: number;
  isVideoBuffering: boolean;
  labelObject: any;
  private labelObjectDiffer: KeyValueDiffer<string, any>;
  screenZoom: number;
  isClickedLabel: boolean; // detect if user click label drop down
  isShowBoxes: boolean;
  changeStatusButtonEnable: boolean;
  offlineEvent!: Observable<Event>;
  onlineEvent!: Observable<Event>;
  subscriptions: Subscription[] = [];
  isAppOnline: boolean;
  displayLabels: boolean;
  emptyFrames!: Array<number>;
  completedFrames!: Array<number>;
  commentedFrames!: Array<number>;
  notCompletedFrames!: Array<number>;
  isAutoSave: boolean;
  subscription!: Subscription;
  autoSaving: boolean;
  svgScrollInitX: number = -1;
  svgScrollInitY: number = -1;
  showSkipFrameBox: boolean;
  showMissingFrameBox: boolean;
  isCompleteFrame: boolean;
  auditFrameID: number = -1;
  auditedFrames!: number[];
  annotatedFrames!: number[];
  maxFrame: number = 1;
  seekWidth!: number;
  showAnnottaions: boolean = true;
  displayToolTip: number;
  hovered!: number;
  changeTaskError: boolean = false;
  changeTaskErrorMsg: string = '';
  showAllFrameData: boolean = true;
  currentFrame: number;
  time1: any;
  time2: any;

  USER_TYPE_ANNOTATOR = environment.USER_TYPE_ANNOTATOR;
  USER_TYPE_AUDITOR = environment.USER_TYPE_AUDITOR;
  USER_TYPE_ADMIN = environment.USER_TYPE_ADMIN;
  TASK_PENDING = TaskStatus.pending;
  TASK_COMPLETED = TaskStatus.completed;
  TASK_REJECTED = TaskStatus.rejected;
  TASK_ACCEPTED = TaskStatus.accepted;
  TASK_FIXED = TaskStatus.fixed;
  TASK_FIXING = TaskStatus.fixing;
  TASK_NOT_STARTED = AuditStatus.notStarted;
  TASK_IN_PROGRESS = AuditStatus.inProgress;
  TASK_TASK_COMPLETED = AuditStatus.completed;

  public key!: string;
  private ngUnsubscribe = new Subject();
  readonly ARROW_KEY_LEFT = 37;
  readonly ARROW_KEY_RIGHT = 39;
  readonly ARROW_KEY_UP = 38;
  readonly ARROW_KEY_DOWN = 40;
  readonly PLUS_KEY = 187;
  readonly MINUS_KEY = 189;

  constructor(
    private zone: NgZone,
    public shapeService: ShapeService,
    private _annotationService: AnnotationTaskService,
    private _activatedRoute: ActivatedRoute,
    public _dialog: MatDialog,
    private differs: KeyValueDiffers,
    private _commentDataService: CommentDataService,
    private _userDataService: UserDataService,
    private _auditDataService: AuditDataService,
    private _framePropertyService: FramePropertyService,
    private _frameFilterService: FrameFilterService,
    private location: Location,
    private _sidebarDataService: SidebarDataService
  ) {
    this.isAppOnline = true;
    this.audit = new Audit();
    this.auditDiffer = this.differs.find(this.audit).create();
    this.shapes = [];
    this.shapesDiffer = this.differs.find(this.shapes).create();
    this.itemDiffer = this.differs.find(this.items).create();
    this.task = new Task();
    this.taskButtonsStatus = new TaskButtonStatus();
    this.selectedToolItem = 1;
    this.scrubBarWidth = 1;
    this.leftPosition = 0;
    this.frameDivOpacity = 0;
    this.backwardEvent = 'unset';
    this.screenWidth = 1380;
    this.screenHeight = 800;
    this.sidebarWidth = 308;
    this.sidebarHeight = 148;
    this.videoFrameWidth = 1380;
    this.videoFrameHeight = 760;
    this.loadSVG = false;
    this.isShowOptions = false;
    this.selectedLabel = '';
    this.saved = false;
    this.loading = false;
    this.shapeType = 'pointer';
    this.selectedBoxIndex = -1;
    this.videoLoadingSpinner = false;
    this.frameGenerateStartFrom = 0;
    this.videoMargin = 0;
    this.isVideoBuffering = false;
    this.labelObject = {};
    this.labelObjectDiffer = this.differs.find(this.labelObject).create();
    this.screenZoom = 1;
    this.isClickedLabel = false;
    this.isShowBoxes = true;
    this.changeStatusButtonEnable = true;
    this.selectedBoxId = 0;
    this.displayLabels = false;
    this.buttonTypes = convertClassToObject(ButtonTypes);
    this.isAutoSave = false;
    this.autoSaving = false;
    this.showSkipFrameBox = false;
    this.showMissingFrameBox = false;
    this.isCompleteFrame = true;
    this.displayToolTip = 0;
    this.currentFrame = 1;
  }

  ngOnInit(): void {
    this.handleAppConnectivityChanges();
    this.audit.selectedUserType =
      this._userDataService.getUserDetails().userType;
    this.audit.selectedUserId = this._userDataService.getUserDetails().userId;
    this._activatedRoute.queryParams.subscribe((params) => {
      this.audit.selectedTaskId = params['taskId'];
      this.getSelectedTaskDetails();
      this._commentDataService.setSelectedTaskId(this.audit.selectedTaskId);
    });
    this.shapes = this.shapeService.getShapes();
    this.videoEl = VideoFrame();
    this.screenWidth = window.innerWidth;
    this.screenHeight = window.innerHeight;
    this.videoFrameWidth = this.screenWidth - this.sidebarWidth;
    this.videoFrameHeight = this.screenHeight - this.sidebarHeight;
    this.getSelectedFrameCommentBoxes();
    this.detectFramePropertyChanges();
    this.detectFilterPropertyChanges();
    this.detectFilterPropertySelectAllChanges();
    this.getSelectedFrameID();
    /**auto save */
    const source = interval(7000);
    this.subscription = source.subscribe((val) => {
      if (this.isAutoSave == true && this.isAppOnline) {
        this.isEmptyFrame();
        this.save();
        this.isAutoSave = false;
      }
    });

    if (this.audit.selectedUserType != this.USER_TYPE_ANNOTATOR) {
      this.auditedFrames = [];
      const timer = interval(1000);

      this.subscription = timer.subscribe((val) => {
        if (this.auditedFrames.length == 0) {
          this.auditedFrames = new Array<number>(this.audit.totalFrames).fill(
            0
          );
        }

        if (
          this.audit.isPlay == false &&
          this.auditFrameID == this.audit.mediaPlayerFpsCount
        ) {
          this.auditedFrames[this.audit.mediaPlayerFpsCount - 1] = 1;
        }
        this.auditFrameID = this.audit.mediaPlayerFpsCount;
      });
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  ngDoCheck(): void {
    const auditChanges = this.auditDiffer.diff(this.audit);
    if (auditChanges) {
      this._auditDataService.setAuditInstance(this.audit);
    }
    const shapesChanges = this.shapesDiffer.diff(this.shapes);
    if (shapesChanges) {
      this._framePropertyService.setShapes(this.shapes);
    }

    const itemChanges = this.itemDiffer.diff(this.items);
    if (itemChanges) {
      this._framePropertyService.setItems(this.items);
    }

    const labelObjectChanges = this.labelObjectDiffer.diff(this.labelObject);
    if (labelObjectChanges) {
      this._framePropertyService.setLabelObject(this.labelObject);
    }
    // Need to check diff
    this._framePropertyService.setSelectedBoxIndex(this.selectedBoxIndex);
    this._framePropertyService.setSelectedLabel(this.selectedLabel);
    this._framePropertyService.setSelectedBoxId(this.selectedBoxId);
    this._framePropertyService.setSaved(this.saved);
  }

  /**
   * Monitor selected box id  data
   */
  getSelectedFrameID(): void {
    this._commentDataService
      .getSelectedFrameId()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((selectedFrameId: number) => {
        if (selectedFrameId !== 0) {
          this.audit.currentFrame = selectedFrameId;
          this.navigateToSelectedFrame();
        }
      });
  }

  /**
   * navigate task to given frame number
   */
  navigateToSelectedFrame() {
    this.showSkipFrameBox = false;
    if (this.audit.currentFrame) {
      let frameDifference =
        this.audit.currentFrame - this.audit.mediaPlayerFpsCount;
      this.audit.mediaPlayerFpsCount = this.audit.currentFrame;

      if (frameDifference > 0) {
        this.videoEl.seekForward(this.audit.skipFrameCount * frameDifference);
      } else if (
        frameDifference <
        this.audit.currentFrame - this.audit.mediaPlayerFpsCount
      ) {
        this.videoEl.seekBackward(
          this.audit.skipFrameCount * (frameDifference * -1)
        );
      }
      if (this.audit.mediaPlayerFpsCount > 0) {
        this.setCurrentFrame(this.audit.mediaPlayerFpsCount - 1);
        this.audit.isPlay = false;
      }
    }
  }

  /**
   * previous/next task
   */
  previousTask() {
    if (this.audit.previousTask) {
      this.location.replaceState('/audit?taskId=' + this.audit.previousTask);
      window.location.reload();
    }
  }
  nextTask() {
    if (this.audit.nextTask) {
      if (this.audit.status > 1) {
        this.location.replaceState('/audit?taskId=' + this.audit.nextTask);
        window.location.reload();
      }
    }
  }
  nextTaskError(hideErr?: number) {
    if (this.audit.status < 2) {
      this.changeTaskErrorMsg = ChangeTaskError.nextFrameError;
      this.changeTaskError = true;
    }
    if (hideErr) {
      this.changeTaskError = false;
    }
  }

  /**
   * handle skipFrame box
   */
  skipFrameBoxClose() {
    this.showSkipFrameBox = false;
  }

  skipFrameBoxSubmit() {
    this.showSkipFrameBox = false;
    this.seekForward(true);
  }

  /**
   * handle missing frame box
   */
  missingFrameBoxClose() {
    this.showMissingFrameBox = false;
  }
  missingFrameBoxSubmit() {
    this.showMissingFrameBox = false;
    this.showOptionList(true);
  }
  /**
   * create event listers for handle online and offline status
   */
  private handleAppConnectivityChanges(): void {
    this.onlineEvent = fromEvent(window, 'online');
    this.offlineEvent = fromEvent(window, 'offline');

    this.subscriptions.push(
      this.onlineEvent.subscribe((e) => {
        // handle online mode
        this.isAppOnline = true;
      })
    );

    this.subscriptions.push(
      this.offlineEvent.subscribe((e) => {
        // handle offline mode
        this.isAppOnline = false;
        this.onError(
          'Connection Problem',
          'Please check internet connection',
          'connection'
        );
      })
    );
  }

  /**
   * Get Selected commentdata for current frame
   */
  getSelectedFrameCommentBoxes(): void {
    this._commentDataService
      .getSelectedFrameCommentBoxes()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((data: CommentBox[]) => {
        if (this.audit.frameData && this.audit.mediaPlayerFpsCount) {
          if (this.audit.frameData[this.audit.mediaPlayerFpsCount - 1])
            this.audit.frameData[
              this.audit.mediaPlayerFpsCount - 1
            ].commentBoxes = data;
        }
      });
  }

  /**
   * Detect frame filter change from filter tab in side
   */
  detectFilterPropertySelectAllChanges(): void {
    this._frameFilterService
      .getLabelFiltersAll()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((showAllLabels: boolean) => {
        this.showAllFrameData = showAllLabels;
      });
  }

  /**
   * Detect frame filter change from filter tab in side
   */
  detectFilterPropertyChanges(): void {
    this._frameFilterService
      .getLabelFilters()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((label: any) => {
        if (label) {
          this.audit.filterFrames(label, this.showAllFrameData);
          this.syncFrameDataToShapes(this.audit.mediaPlayerFpsCount - 1);
        }
      });
  }

  /**
   * Detect functionalities in filter property tab and execute functions
   */
  detectFramePropertyChanges() {
    //deleteSelectedShape
    this._framePropertyService
      .getDeleteSelectedShapeEnable()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((change: PropertyChangeDetection) => {
        if (change.isEnabled) {
          this.deleteSelectedShape();
          this._framePropertyService.setDeleteSelectedShapeEnable({
            isEnabled: false,
            params: null,
          });
        }
      });

    //onClicklabel

    this._framePropertyService
      .getOnClicklabelEnable()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((change: PropertyChangeDetection) => {
        if (change.isEnabled) {
          this.onClicklabel();
          this._framePropertyService.setOnClicklabelEnable({
            isEnabled: false,
            params: null,
          });
        }
      });

    //onClicklabel
    this._framePropertyService
      .getOnClicklabelEnable()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((change: PropertyChangeDetection) => {
        if (change.isEnabled) {
          this.onClicklabel();
          this._framePropertyService.setOnClicklabelEnable({
            isEnabled: false,
            params: null,
          });
        }
      });

    //getSelectedBox
    this._framePropertyService
      .getSelectedBoxLabelMethodEnable()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((change: PropertyChangeDetection) => {
        if (change.isEnabled) {
          let event = change?.params?.event;
          this.getSelectedBox(event);
          this._framePropertyService.setSelectedBoxLabelMethodEnable({
            isEnabled: false,
            params: null,
          });
        }
      });

    //getSelectedBox
    this._framePropertyService
      .getOnChangeLabelEnable()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((change: PropertyChangeDetection) => {
        if (change.isEnabled) {
          let event = change?.params?.event;
          let subLabelKey = change?.params?.subLabelKey;
          this.onChangeLabel(event, subLabelKey);
          this._framePropertyService.setOnChangeLabelEnable({
            isEnabled: false,
            params: null,
          });
        }
      });
  }

  /**
   * calculate video player size based on screen size
   */
  calcVideoSize() {
    let videoAspect = this.audit.videoWidth / this.audit.videoHeight;
    let canvasAspect = this.videoFrameWidth / this.videoFrameHeight;
    let initialHeight = this.videoFrameHeight;
    if (videoAspect > canvasAspect) {
      this.videoFrameHeight =
        (this.videoFrameWidth / this.audit.videoWidth) * this.audit.videoHeight;
    } else {
      this.videoFrameHeight -= 15;
      this.videoFrameWidth =
        (this.videoFrameHeight / this.audit.videoHeight) *
        this.audit.videoWidth;
    }
    this.videoMargin = (initialHeight - this.videoFrameHeight) / 2;
    this.audit.canvasWidth = this.videoFrameWidth;
    this.audit.canvasHeight = this.videoFrameHeight;
  }

  /**
   * check whether frame data updated for auto save
   * @param status 
   */
  isFrameUpdated(status: boolean) {
    this.isAutoSave = true;
  }

  getPosition(newItem: any) {
    this.items = newItem;
    this.selectedLabel = '';
    this.selectedBoxIndex = this.shapes.length - 1;
    this.saved = false;
    this.selectedBoxId = newItem[4];
  }
  getLabels(lbl: any) {
    let index = this.labelObject.labelList.findIndex(
      (x: { label: String }) => x.label == lbl.new
    );
    this.labelObject.labelList[index].count += 1;
    this.labelObject.totalCount += 1;
    
    if(lbl.previous != undefined){
      let previousIndex = this.labelObject.labelList.findIndex(
        (x: { label: String }) => x.label == lbl.previous
      );
      this.labelObject.labelList[previousIndex].count -= 1;
    }
  }
  getLabel(selectedLabelName: String) {
    this.selectedLabel = selectedLabelName;

    this.getSelectedLabel({ target: { value: this.selectedLabel } });
  }

  /**
   * get selected box details
   * @param event 
   */
  getSelectedBox(event: any) {
    if (event.shape) {
      this.selectedBoxIndex = event.index;
      this.shapes[this.selectedBoxIndex] = event.shape;
      this.selectedLabel = event.shape.label;

      let cord: Shape = event.shape;
      this.items = [
        Math.ceil(cord.x) + '',
        Math.ceil(cord.y) + '',
        Math.ceil(cord.h) + '',
        Math.ceil(cord.w) + '',
      ];
      this.selectedBoxId = event.shape.id;
      this.getLabel(this.selectedLabel);
    }
    let shape = this.shapes[this.selectedBoxIndex];

    let key = this.audit.labelsList.findIndex(
      (x: { label: string }) => x.label == shape.label
    );
    let isAnnotateEnable = this.audit.labelsList[key].isAnnotationEnabled;
    if (
      !shape.createdAt &&
      this.audit.selectedUserType == this.USER_TYPE_ANNOTATOR &&
      isAnnotateEnable
    ) {
      shape.createdAt = new Date();
      shape.annotatorId = this.audit.selectedUserId;
    }

    this._sidebarDataService.setSelectedTab(FrameSideBarTabs?.annotations?.key);
  }

  /**
   * active tool item from left side tool bar when click on item.
   * @param selectedToolItem - selected tool item id
   */
  selectToolItem(tool: any) {
    let selectedToolItem = tool.id;
    if (
      !(
        selectedToolItem == ToolTypeIndex.rotateAntiClock ||
        selectedToolItem == ToolTypeIndex.rotateClock ||
        selectedToolItem == ToolTypeIndex.hideAnnotations
      )
    ) {
      this.selectedToolItem = selectedToolItem;
    }
    if (selectedToolItem == ToolTypeIndex.mousePointer) {
      // setType("line");
      this.shapeType = tool.shapeType;
    }
    if (selectedToolItem == ToolTypeIndex.annotate) {
      // setType("line");
      this.shapeType = tool.shapeType;
    }
    if (selectedToolItem == ToolTypeIndex.pan) {
      // setType("line");
      this.shapeType = tool.shapeType;
    }
    if (selectedToolItem == ToolTypeIndex.comment) {
      // setType("line");
      this.shapeType = tool.shapeType;
    }
    // }

    if (selectedToolItem == ToolTypeIndex.zoomIn) {
      // setType("line");
      this.shapeType = tool.shapeType;
      // this.zoomIn();
    }
    if (selectedToolItem == ToolTypeIndex.zoomOut) {
      // setType("line");
      this.shapeType = tool.shapeType;
      let scroll = this.panel.nativeElement;
    }
    if (selectedToolItem == ToolTypeIndex.hideAnnotations) {
      // setType("line");
      let index = this.audit.toolSet.findIndex(
        (x: { name: String }) => x.name == 'hide-annotations'
      );
      if (this.showAnnottaions) {
        this.audit.toolSet[index].label = ToolLabels.showAnnotation;
        this.audit.toolSet[index].isSelected = true;
      } else {
        this.audit.toolSet[index].label = ToolLabels.hideAnnotation;
        this.audit.toolSet[index].isSelected = false;
      }
      this.hideAnnotations();
    }
  }
  /**
   * hover tool item
   * */
  hoverToolItem(id: number) {
    this.displayToolTip = id;
  }
  /**
   * zoom in and zoom out
   */

  zoomIn(evt: any) {
    let x = evt[0];
    let y = evt[1];
    let scroll = this.panel.nativeElement;
    let width = this.audit.videoWidth;
    let height = this.audit.videoHeight;
    let scrollLeft = 0;
    let scrollTop = 0;

    scrollLeft =
      ((x - (width * 0.25) / this.screenZoom) / (width / 2)) *
      scroll.scrollWidth;
    scrollTop =
      ((y - (height * 0.25) / this.screenZoom) / (height / 2)) *
      scroll.scrollHeight;

    if (x < width * 0.25) {
      scrollLeft = 0;
    }
    if (x > width * 0.75) {
    }
    if (y < height * 0.25) {
      scrollTop = 0;
    }
    if (y > height * 0.75) {
      scrollTop = scroll.scrollHeight;
    }
    if (this.screenZoom <= 2) {
      this.screenZoom *= 2;
      this.audit.userLog.push(`Zoom in clicked`);
      setTimeout(() => {
        scroll.scrollTop = scrollTop;
        scroll.scrollLeft = scrollLeft;
      }, 1);
    }
  }
  zoomOut() {
    let scroll = this.panel.nativeElement;
    let scrollLeft = scroll.scrollLeft;
    let scrollTop = scroll.scrollTop;
    if (this.screenZoom >= 2) {
      this.screenZoom /= 2;
      this.audit.userLog.push(`Zoom out clicked`);
      setTimeout(() => {
        scroll.scrollTop = scrollTop / 2;
        scroll.scrollLeft = scrollLeft / 2;
      }, 1);
    }
  }

  /**
   * get coordinates for pan tool
   * @param evt 
   */
  panCoordinates(evt: any) {
    let ele = this.panel.nativeElement;
    let x = evt.coords[0];
    let y = evt.coords[1];
    let offsetX = evt.coords[2];
    let offsetY = evt.coords[3];
    if (!evt.onDrag) {
      this.svgScrollInitX = ele.scrollLeft;
      this.svgScrollInitY = ele.scrollTop;
    }
    if (evt.onDrag) {
      let left = this.svgScrollInitX;
      let top = this.svgScrollInitY;

      const dx = -x + offsetX;
      const dy = -y + offsetY;

      ele.scrollTop = top - dy / 2;
      ele.scrollLeft = left - dx / 2;
    }
  }

  hideAnnotations() {
    this.showAnnottaions = !this.showAnnottaions;
  }
  /**
   * In case of change shape type from other component
   * @param shapeType
   */
  onChangeShapeType(shapeType: string) {
    if (shapeType == ShapeType.notSelected) {
      this.shapeType = shapeType;
      this.selectedToolItem = ToolTypeIndex.notSelected;
    } else {
      let tool = this.audit.toolSet.find((x) => x.shapeType == shapeType);
      if (tool?.shapeType) {
        this.shapeType = tool.shapeType;
        this.selectedToolItem = tool.id;
      }
    }
  }

  /**
   * play or pause video
   */
  playPause() {
    if (this.audit.isPlay) {
      this.audit.isPlay = false;
      this.videoElement.pause();
    } else {
      this.audit.isPlay = true;
      this.videoElement.play();
    }
  }
  playVideo() {
    let frame = this.videoEl.get();
    if (frame >= this.audit.totalFrames - 1) {
      this.videoElement.pause();
      this.videoEl.seekTo(this.audit.totalFrames);
      this.audit.mediaPlayerFpsCount = this.audit.totalFrames;
      frame = this.audit.totalFrames - 1;
      this.audit.isPlay = false;
    }
    this.shapes = [];
    if (this.audit.frameData[frame]) {
      for (let box of this.audit.frameData[frame].boxes) {
        if (box) {
          box.boundaries.status = ShapeStatus.completed;
          this.shapes.push(box.boundaries);
        }
      }
    }
  }
  

  /**
   * when playing video get current timestamp and return
   * with HH:MM:SS format
   */
  setCurrentTime() {
    this.audit.mediaPlayerFpsCount = this.videoEl.get() + 1;
    let frameTime = 1 / this.audit.frameRate;
    let totalSeconds = this.videoElement.currentTime + frameTime;
    let date = new Date(null!);
    date.setSeconds(totalSeconds);
    this.audit.currentTime = date.toISOString().substr(11, 8);
    this.animateScrubBar();
  }

  /**
   *
   * @param item last Drew item from canvas
   */
  addDrewItem(item: any) {
    if (item) {
      let boxCount = this.shapes.length;
      let lastBox = this.shapes[boxCount - 1];
      if (!item.isPermanent) {
        this.isClickedLabel = true;
      }

      let isExists = this.audit.frameData[
        this.audit.mediaPlayerFpsCount - 1
      ].boxes.find((x) => x.id == lastBox.id);
      let existIndex = this.audit.frameData[
        this.audit.mediaPlayerFpsCount - 1
      ].boxes.findIndex((x) => x.id == lastBox.id);
      if (!isExists) {
        lastBox = this.shapes[boxCount - 1];
        let drewItem: FrameBox = {
          id: lastBox.id,
          boundaries: item,
          attributeValues: {},
        };

        this.audit.frameData[this.audit.mediaPlayerFpsCount - 1].boxes.push(
          drewItem
        );

        this.selectedBoxIndex = boxCount - 1;
      } else {
        this.selectedBoxIndex = existIndex;
      }
      this.setLabelsWhenLoad();
      this.audit.userLog.push(
        `Bounding box drew/moved/selected box id ${item.id} label ${
          item.label
        } attributeValues ${JSON.stringify(
          item.attributeValues
        )} coordinates x - ${item.x}, y - ${item.y}`
      );
    } else {
      this.selectedBoxIndex = -1;
    }
    //Runs when box drawing finished and box selected

  }

  setLabelsWhenLoad() {
    let shape = this.shapes[this.selectedBoxIndex];
    if (shape.label) {
      this.getLabel(shape.label);
    }
  }
  resetSelectedItems() {
    this.selectedBoxIndex = -1;
  }

  /**
   * Delete shape bu index id
   * @param id
   */
  deleteShape(id: number) {
    if (id > -1) {
      this.shapes.splice(id, 1);
      this.audit.userLog.push(`Box deleted - box id ${id}`);
    }
    this.resetSelectedItems();
    this.syncShapesDataToFrames();
  }

  /**
   * Delete seleted shape
   */
  deleteSelectedShape() {
    if (this.selectedBoxIndex > -1) {
      this.deleteShape(this.selectedBoxIndex);
      let index = this.labelObject.labelList.findIndex(
        (x: { label: String }) => x.label == this.selectedLabel
      );
      this.labelObject.labelList[index].count -= 1;
      this.labelObject.totalCount -= 1;

      this.save();
    }
  }

  /**
   *
   * Edit selected shape
   */
  editSelectedShape() {
    this.saved = false;
  }
  /**
   *
   * @param id Shape index
   */
  changeFrameBoxData(id: number) {
    let box = this.shapes[id];
    if (box) {
      // box.status = ShapeStatus.completed;
      let drewItem: FrameBox = {
        id: box.id,
        boundaries: box,
        attributeValues: box.attributeValues,
      };
      this.audit.frameData[this.audit.mediaPlayerFpsCount - 1].boxes[id] =
        drewItem;
    }
  }

  syncShapesDataToFrames() {
    if (this.audit.frameData[this.audit.mediaPlayerFpsCount - 1]) {
      this.audit.frameData[this.audit.mediaPlayerFpsCount - 1].boxes = [];
      for (let i = 0; i < this.shapes.length; i++) {
        this.changeFrameBoxData(i);
      }
    }
  }

  /**
   * Sync frame data with current frame's shapes array
   */
  syncFrameDataToShapes(frameIndex: number) {
    this.shapes = [];
    if (this.audit.frameData[frameIndex]) {
      for (let box of this.audit.frameData[frameIndex].boxes) {
        if (box) {
          box.boundaries.status = ShapeStatus.completed;
          this.shapes.push(box.boundaries);
        }
      }
    }
  }

  /**
   * get total duration of loaded video and return
   * with HH:MM:SS format
   */
  getVideoDuration() {
    let totalSeconds = this.videoElement.duration;
    let date = new Date(null!);
    date.setSeconds(totalSeconds);
    this.audit.videoDuration = date.toISOString().substr(11, 8);
    this.getInitialTime();
  }

  /**
   * get video initial time when loading
   */
  getInitialTime() {
    let frameTime = 1 / this.audit.frameRate;
    let time = new Date(null!);
    time.setSeconds(frameTime);
    this.audit.currentTime = time.toISOString().substr(11, 8);

    let timer;

    timer = setInterval(() => {
      if (this.audit.isPlay) {
        this.playVideo();
      }
    }, Math.ceil(10));
  }

  /**
   * when playing video show the progress of video
   */
  animateScrubBar() {
    let currentFrame = this.audit.mediaPlayerFpsCount;
    this.scrubBarWidth = (currentFrame / this.audit.totalFrames) * 100;
    if (this.audit.mediaPlayerFpsCount > 0 && !this.audit.isPlay) {
      this.setCurrentFrame(this.audit.mediaPlayerFpsCount - 1);
    }
  }

  /**
   * add event listener to mouse move event
   * @param event - mouse move down event
   */
  onMouseMove(event: Event) {
    this.element = event.target;
    this.zone.runOutsideAngular(() => {
      window.document.addEventListener('mousemove', this.mouseMove.bind(this));
    });
  }

  /**
   * get the current video frame
   * get total width of media bar
   * set position to frame count div
   * @param event - mouse move event
   */
  mouseMove(event: any) {
    event.preventDefault();
    let offsetX = event.offsetX;

    if (event.target.viewportElement) {
      let clientWidth = event.target.viewportElement.clientWidth;
      this.audit.currentFrame = Math.ceil(
        (offsetX * this.audit.totalFrames) / clientWidth
      );
      this.leftPosition = Math.floor((offsetX / clientWidth) * 100);
    }
  }

  onMouseEnter() {
    this.frameDivOpacity = 1;
  }

  /**
   * when mouse leave from scg element set frame count div opacity to 0
   */
  leaveEvent() {
    this.frameDivOpacity = 0;
  }

  checkAnnotated(isEmpty?: boolean) {
    let isEmptyFrame = this.audit.isSelectedFrameEmpty;
    if (this.audit.selectedUserType == this.USER_TYPE_ANNOTATOR) {
      this.isEmptyFrame();
      isEmptyFrame = this.audit.isSelectedFrameEmpty;
      if (isEmpty) {
        isEmptyFrame = false;
        this.showSkipFrameBox = false;
        this.audit.isSelectedFrameEmpty = false;
      }
    }
    return isEmptyFrame;
  }

  /**
   * forward video by given frame count
   */
  seekForward(isEmpty?: boolean) {
 
    /**
     * for user type =  annotator and admin
     */
    this.showSkipFrameBox = false;
    let isEmptyFrame = this.checkAnnotated(isEmpty);

    if (this.audit.selectedUserType == this.USER_TYPE_ANNOTATOR) {
      if (isEmptyFrame) {
        this.showSkipFrameBox = true;
        this.audit.isSelectedFrameEmpty = true;
      } else {
        this.save();
        if (
          this.audit.mediaPlayerFpsCount > 0 &&
          this.audit.mediaPlayerFpsCount < this.audit.totalFrames
        ) {
          this.videoEl.seekForward(this.audit.skipFrameCount);
          this.audit.mediaPlayerFpsCount = this.audit.mediaPlayerFpsCount + 1;
        }
      }
    }

    if (this.audit.selectedUserType != this.USER_TYPE_ANNOTATOR) {
      this.save();
      if (
        this.audit.mediaPlayerFpsCount > 0 &&
        this.audit.mediaPlayerFpsCount < this.audit.totalFrames
      ) {
        this.videoEl.seekForward(this.audit.skipFrameCount);
        this.audit.mediaPlayerFpsCount = this.audit.mediaPlayerFpsCount + 1;
      }
    }
    this.audit.userLog = [];
  }

  /**
   * Add host listener  to listen key board key event
   * @param event - keyboard event
   */
  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (
      event.keyCode == this.ARROW_KEY_RIGHT || 
      event.keyCode == this.ARROW_KEY_LEFT ||
      event.keyCode == this.ARROW_KEY_UP ||
      event.keyCode == this.ARROW_KEY_DOWN
      ) {
      event.preventDefault();
    }
    this.handleEvent(event);
  }

  /**
   * According entered key run function
   * @param event - key board event
   */
  handleEvent(event: KeyboardEvent) {
    if (event.keyCode == this.ARROW_KEY_RIGHT) {
      if (this.audit.mediaPlayerFpsCount <= this.audit.totalFrames && !this.audit.isPlay) {
        this.seekForward();
      }
    } else if (event.keyCode == this.ARROW_KEY_LEFT  && !this.audit.isPlay) {

      if (this.audit.mediaPlayerFpsCount !== 1) {
        this.seekBackward();
      }
    } else if (event.keyCode == this.PLUS_KEY) {
      let index = this.audit.toolSet.findIndex(
        (x) => x.id === ToolTypeIndex.zoomIn
      );
      this.selectToolItem(this.audit.toolSet[index]);
    } else if (event.keyCode == this.MINUS_KEY) {
      let index = this.audit.toolSet.findIndex(
        (x) => x.id === ToolTypeIndex.zoomOut
      );
      this.selectToolItem(this.audit.toolSet[index]);
    }
  }

  videoControlByKeys(event: any) {
  }

  /**
   * backward video by given frame count
   */
  seekBackward() {
    this.showSkipFrameBox = false;
    this.isEmptyFrame();
    this.save();
    if (this.audit.mediaPlayerFpsCount > 1) {
      this.videoEl.seekBackward(this.audit.skipFrameCount);
      this.audit.mediaPlayerFpsCount = this.audit.mediaPlayerFpsCount - 1;
    }
  }

  /**
   *
   * @param frameId Set current frame
   */
  setCurrentFrame(frameId: number) {
    if (frameId !== this.audit.totalFrames && this.audit.frameData[frameId]) {
      let currentFrameBoxes = this.audit.frameData[frameId].boxes;
      if (!currentFrameBoxes) {
        currentFrameBoxes = [];
      }
      let currentFrameCommentBoxes = this.audit.frameData[frameId].commentBoxes;

      this._commentDataService.setSelectedFrameCommentBoxes(
        currentFrameCommentBoxes
      );

      this.audit.selectLabelState = '';

      this.resetSelectedItems();
      this.syncFrameDataToShapes(frameId);
    } else {
      this.audit.isPlay = false;
    }
    if (this.audit.frameData[this.audit.mediaPlayerFpsCount - 1]) {
      this.audit.userLog =
        this.audit.frameData[this.audit.mediaPlayerFpsCount - 1].userLog;
    }
  }

  loadStarted(event: any) {
    this.isVideoBuffering = true;
  }

  videoLoaded(event: any) {
    if (event) {
      this.isVideoBuffering = false;
      this.setVideoProperties();
    }
  }

  setVideoProperties() {
    this.videoElement = document.getElementById('videoPlayer');
    this.getVideoDuration();
    this.videoEl = VideoFrame({
      id: 'videoPlayer',
      frameRate: this.audit.frameRate,
    });
  }

  /**
   * open change status popup
   * @param bool 
   */
  showOptionList(bool?: boolean) {
    let changeStatus = this.checkAnnotated(false);
    if (
      changeStatus &&
      this.audit.selectedUserType == this.USER_TYPE_ANNOTATOR &&
      this.audit.mediaPlayerFpsCount == this.audit.totalFrames
    ) {
      this.showSkipFrameBox = true;
    } else {
      if (this.audit.selectedUserType != this.USER_TYPE_ANNOTATOR) {
        this.isCompleteFrame =
          this.auditedFrames.filter((x) => x === 1).length ==
          this.audit.totalFrames;
      }
      if (this.audit.selectedUserType == this.USER_TYPE_ANNOTATOR) {
        this.isCompleteFrame =
          this.annotatedFrames.length == this.audit.totalFrames;
      }
      if (bool) {
        this.isCompleteFrame = true;
      }
      if (this.isCompleteFrame) {
        this.isShowOptions = true;
      } else {
        this.isShowOptions = false;
        this.showMissingFrameBox = true;
      }
    }
  }

  /**
   * change state of showSearchResults
   * when click on out side hide div
   */
  onClickedOutside() {
  }

  /**
   * check whether current frame is empty or not
   */
  isEmptyFrame() {
    if (
      this.audit.frameData[this.audit.mediaPlayerFpsCount - 1] &&
      this.audit.frameData[this.audit.mediaPlayerFpsCount - 1].boxes.length ==
        0 &&
      this.audit.frameData[this.audit.mediaPlayerFpsCount - 1].isEmpty
    ) {
      this.audit.isSelectedFrameEmpty = true;
    } else {
      this.audit.isSelectedFrameEmpty = false;
    }
  }

  /**
   * save frame data
   */
  save() {
    let selectedFrame =
      this.audit.frameData[this.audit.mediaPlayerFpsCount - 1];
    if (this.isAppOnline) {
      if (!this.audit.isPlay && selectedFrame) {
        this.audit.selectedFrameId = selectedFrame.frameId;
        this.audit.selectedBoxes = selectedFrame.boxes;
        this.audit.selectedCommentBoxes = selectedFrame.commentBoxes;
        selectedFrame.isEmpty = this.audit.isSelectedFrameEmpty;

        if (this.audit.selectedBoxes || this.audit.selectedCommentBoxes) {
          this.audit.userLog.push(
            `Box data saved total boxes - ${this.audit.selectedBoxes.length}`
          );
          this.saveSelectedFrameData();
        }
        this.calculateBoxCounts(this.audit.frameData);
      }
    } else {
      this.onError(
        'Connection Problem',
        'Please check internet connection',
        'connection'
      );
    }
  }

  /**
   * To detect user click on label drop down
   */
  onClicklabel() {
    this.isClickedLabel = true;
  }

  getSelectedLabel(event: any) {
    const selectedLabel = event.target.value;
    let selectedLabelObj = this.audit.labelsList.find(
      (label) => label.label == selectedLabel
    );
    this.audit.userLog.push(
      `Select label ${selectedLabel} Box index ${[this.selectedBoxIndex]}`
    );
    if (selectedLabelObj) {
      this.audit.subLabels = selectedLabelObj.attributes;
      this.changeFrameBoxData(this.selectedBoxIndex);
    }
  }

  onChangeLabel(event: any, subLabelKey: string) {
    if (event && event.target && event.target.value) {
      let shape = this.shapes[this.selectedBoxIndex];

      let key = this.audit.labelsList.findIndex(
        (x: { label: string }) => x.label == shape.label
      );
      let isAnnotateEnable = this.audit.labelsList[key].isAnnotationEnabled;
      if (
        !shape.createdAt &&
        this.audit.selectedUserType == this.USER_TYPE_ANNOTATOR &&
        isAnnotateEnable
      ) {
        shape.createdAt = new Date();
        shape.annotatorId = this.audit.selectedUserId;
      }
      let sublabelValue = event.target.value;
      if (!this.shapes[this.selectedBoxIndex].attributeValues) {
        this.shapes[this.selectedBoxIndex].attributeValues = {};
      }
      this.shapes[this.selectedBoxIndex].attributeValues[subLabelKey] =
        sublabelValue;
      this.audit.userLog.push(
        `Select attributes ${sublabelValue} Box index ${[
          this.selectedBoxIndex,
        ]}`
      );
    }

  }

  getSelectedTaskDetails() {
    this.loading = true;
    this.isShowBoxes = true;
    this._annotationService
      .getSelectedTaskDetails(this.audit.selectedTaskId)
      .subscribe(
        (response) => {
          this.audit.previousTask = response.previousTask;
          this.audit.nextTask = response.nextTask;
          this.audit.status = response.status;
          this.audit.createdAt = response.createdAt;
          this.audit.updatedAt = response.updatedAt;
          this.audit.videoUrl = response.videoUrl;
          this.audit.skipFrameCount = 1;
          this.audit.videoWidth = response.videoResolutionWidth;
          this.audit.videoHeight = response.videoResolutionHeight;
          this.audit.frameRate = response.frameRate;
          this.audit.maxId = response.maxId;
          this.disableChangeStatusButton();
          if (this.audit.videoWidth) {
            this.calcVideoSize();
          }
          this.audit.totalFrames = response.frameCount;
          this.audit.labelsList = response.labels;
          this.audit.totalComments = response.totalComments;
          this.labelObject = response.labelCounts;
          this.getTaskFrameList();
          this.loading = false;
          this.getScrubBarValues();
        },
        (error) => {
          this.onError('Error', 'Invalid Task ID');
        }
      );
  }

  getScrubBarValues() {
    this.scrubBarWidth = 100 / this.audit.totalFrames;
    this.seekWidth = 100 / this.audit.totalFrames;
  }

  saveSelectedFrameData() {
    this.autoSaving = true;
    this._annotationService
      .saveFrameData(
        this.audit.selectedTaskId,
        this.audit.selectedFrameId,
        this.audit.selectedBoxes,
        this.audit.selectedCommentBoxes,
        this.audit.userLog,
        this.audit.isSelectedFrameEmpty
      )
      .subscribe(
        (response) => {
          this.autoSaving = false;
          this.audit.userLog = [];
        },
        (error) => {
          this.onError('Error', error.error.error.message);
          this.autoSaving = false;
        }
      );
  }

  getTaskFrameList() {
    this._annotationService.getFrameData(this.audit.selectedTaskId).subscribe(
      (response) => {
        if (response) {
          this.audit.generateFramesArrayByExisting(
            this.audit.totalFrames,
            response
          );
          this.audit.filterFrames([], this.showAllFrameData);
          this.syncFrameDataToShapes(this.audit.mediaPlayerFpsCount - 1);
          this._commentDataService.setSelectedFrameCommentBoxes(
            this.audit.frameData[this.audit.mediaPlayerFpsCount - 1]
              .commentBoxes
          );
        }

        this.loading = false;
        this.calculateBoxCounts(response);
        this.initializeBoxCounts();
      },
      (error) => {
        this.onError('Error', error.error.error.message);
        this.loading = false;
      }
    );
  }
  initializeBoxCounts() {
    this.completedFrames = [];
  }

  calculateBoxCounts(frames: any) {
    this.maxFrame = Math.max(this.maxFrame, this.audit.mediaPlayerFpsCount);
    this.emptyFrames = [];
    this.commentedFrames = [];
    this.completedFrames = [];
    this.annotatedFrames = [];

    for (let i = 0; i < this.maxFrame; i++) {
      if (frames[i].isEmpty == true) {
        this.emptyFrames.push(((i + 1) * 100) / this.audit.totalFrames);
      }

      if (frames[i].isEmpty == false) {
        this.completedFrames.push(((i + 1) * 100) / this.audit.totalFrames);
      }
      if (this.auditedFrames && this.auditedFrames[i] == 0) {
        this.auditedFrames[i] = 2;
      }
    }
    for (let i = 0; i < this.audit.totalFrames; i++) {
      if (frames[i].commentBoxes.length > 0) {
        this.commentedFrames.push(((i + 1) * 100) / this.audit.totalFrames);
      }
      if (frames[i].isEmpty == false) {
        this.annotatedFrames.push(i + 1);
      }
    }
  }

  setTaskStatus(status: number) {
    this._annotationService
      .setTaskStatus(this.audit.selectedTaskId, status)
      .subscribe(
        (response) => {
          this.audit.status = response.status;
          this.task.taskStatus[this.audit.status].statusName =
            this.task.taskStatus[response.status].statusName;
          this.task.taskStatus[this.audit.status].colorHex =
            this.task.taskStatus[response.status].colorHex;
          this.closeStatusModal();
          this.disableChangeStatusButton();
          this.audit.userLog.push(`Task status changed status - ${status}`);
          this.save();
        },
        (error) => {
          this.loading = false;
          this.onError('Error', error.error.error.message);
        }
      );
  }

  closeStatusModal() {
    this.isShowOptions = false;
  }

  onError(header: string, description: string, error?: string) {
    const dialogRef = this._dialog.open(ErrorDialogComponent, {
      disableClose: true,
      width: '460px',
      data: { header: header, description: description, error: error },
    });

    dialogRef.afterClosed().subscribe((result) => {
    });
  }

  onRetry(header: string, description: string, btnText: string) {
    const dialogRef = this._dialog.open(CustomModalComponent, {
      disableClose: true,
      width: '650px',
      data: { header: header, description: description, buttonText: btnText },
    });

    dialogRef.afterClosed().subscribe((result) => {
      window.location.reload();
    });
  }

  /**
   *
   * @param save Select frame from seek bar
   */
  selectFrameFromCursor(save: boolean) {
    this.showSkipFrameBox = false;

    if (save) {
      this.isEmptyFrame();
      this.save();
      this.audit.isSelectedFrameEmpty = true;
    }
    if (this.audit.currentFrame) {
      let frameDifference =
        this.audit.currentFrame - this.audit.mediaPlayerFpsCount;
      this.audit.mediaPlayerFpsCount = this.audit.currentFrame;

      if (frameDifference > 0) {
        this.videoEl.seekForward(this.audit.skipFrameCount * frameDifference);
      } else {
        this.videoEl.seekBackward(
          this.audit.skipFrameCount * (frameDifference * -1)
        );
      }
      if (this.audit.mediaPlayerFpsCount > 0) {
        this.setCurrentFrame(this.audit.mediaPlayerFpsCount - 1);
        this.audit.isPlay = false;
      }
    }
    this.calculateBoxCounts(this.audit.frameData);
  }

  canPlayVideo(event: any) {
    this.isVideoBuffering = false;
  }

  videoSeeking(event: any) {
    this.isVideoBuffering = true;
  }
  videoSeeked(event: any) {
    this.isVideoBuffering = false;
  }

  videoError(event: any) {
    if (event.type == 'error') {
      this.onRetry('Error', 'Video loading failed!', 'Retry');
      this.isVideoBuffering = false;
      this.isShowBoxes = false;
    }
  }

  /**toggle labels */
  toggleLabels() {
    this.displayLabels = !this.displayLabels;
  }

  /**
   * disable Change Status button according user type and task status
   */
  disableChangeStatusButton() {
    let button =
      this.taskButtonsStatus.buttonTypesForStatusAndUsers[this.audit.status][
        this.audit.selectedUserType
      ][0];
    if (this.buttonTypes[button].statusCode == null)
      this.changeStatusButtonEnable = false;
  }
}

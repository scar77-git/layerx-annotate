/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

/**
 * @class: TasksComponent
 * purpose of this module is view task list
 * @description:implements all the logics related to task list view
 * @author: Isuru Avishka
 */
import { Component, OnInit, Renderer2 } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { pairwise, takeUntil } from 'rxjs/operators';
import {
  scrollProperties,
  statusFiltersList,
  Task,
} from 'src/app/models/task.model';
import { AnnotationTaskService } from 'src/app/services/annotation-task.service';
import { SidebarDataService } from 'src/app/services/data/sidebar-data.service';
import { ProjectDataService } from 'src/app/services/project-data.service';
import { ProjectService } from 'src/app/services/project.service';
import { SharedService } from 'src/app/services/shared.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss'],
})
export class TasksComponent implements OnInit {
  selectedProject: any;
  selectedTaskId: string;
  loading: boolean;
  filterObj: any;
  selectedProjectId: string;
  taskList: Array<any>;
  taskObj: Task;
  currentPageIndex: any;
  projectProgress: number;
  isProjectPending: boolean;
  isProjectUploading: boolean;
  isEnableProgressBar:boolean;
  subscription!: Subscription;
  progressInstance!: any;
  isTasksLoaded: boolean;
  isShowProjectEmptyView!: boolean;
  isTaskCreateProcessing!: boolean;
  statusFiltersList = statusFiltersList; //to assign the statuses to the filter drop down
  statuses: Array<any>; //to send status filter array list to backend
  isStatusFilter: boolean; // to check whether the status filter is open or not
  videos: Array<any>; //to send video filter array list to backend
  isVideoFilter: boolean; // to check whether the status filter is open or not
  searchKeyword: string; //to assign search string
  menuBtnClicked: boolean; // to close the filters when clicked outside
  enableDownloadJsonBtn:boolean;
  CONTENT_TYPE_VIDEO: number = 1;
  CONTENT_TYPE_IMAGE: number = 2;

  USER_TYPE_ANNOTATOR = environment.USER_TYPE_ANNOTATOR;
  USER_TYPE_AUDITOR = environment.USER_TYPE_AUDITOR;
  USER_TYPE_ADMIN = environment.USER_TYPE_ADMIN;

  SCROLL_DISTANCE = scrollProperties.scrollDistance;
  SCROLL_THROTTLE = scrollProperties.throttle;

  private ngUnsubscribe = new Subject();

  constructor(
    public router: Router,
    private projectsService: ProjectService,
    public route: ActivatedRoute,
    private sharedService: SharedService,
    private _projectDataService: ProjectDataService,
    private renderer: Renderer2,
    private _sidebarDataService: SidebarDataService,
    private _taskService: AnnotationTaskService
  ) {
    this.taskObj = new Task();
    this.selectedTaskId = '';
    this.loading = false;
    this.selectedProject = {};
    this.selectedProjectId = '';
    this.taskList = [];
    this.currentPageIndex = null;
    this.projectProgress = -1;
    this.isProjectPending = false;
    this.isProjectUploading = false;
    this.isEnableProgressBar = true;
    this.filterObj = {};
    this.statuses = [];
    this.isStatusFilter = false;
    this.videos = [];
    this.isVideoFilter = false;
    this.menuBtnClicked = false;
    this.searchKeyword = '';
    this.isTasksLoaded = false;
    this.enableDownloadJsonBtn = true;
    this.renderer.listen('window', 'click', (e: Event) => {
      if (!this.menuBtnClicked) {
        this.outSideClick();
      }
      this.menuBtnClicked = false;
    });

    this.subscription = this.sharedService.changeEmitted$.subscribe((projectId) => {
      this.isEnableProgressBar = true;
      this.selectedProjectId = projectId;
      this.taskObj.taskList = {
        list: [],
        pageIndex: 0,
        pageSize: this.taskObj.NO_OF_RECORDS,
      };
      this.getInitialInfo();
      this.getTaskList(true);
      this.getVideoList();
      this.clearAllFilters();
    });
  }

  ngOnInit(): void {
    this.getInitialInfo();
    this.getProjectFilterDataStatus();
    this.subscription = this.sharedService.projectListStatus.subscribe(
      (status) => {

        if (status) {
          this.setDataOnRouteChange();
          this.taskObj.taskList.list = [];
        }
      }
    );

    this.getProjectListLength();
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
    if(this.subscription){
      this.subscription.unsubscribe();
    }
    if (this.progressInstance) {
      clearInterval(this.progressInstance);
    }
  }

  getProjectFilterDataStatus(){
    this._projectDataService
      .getProjectFilterDataStatus()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((isResetFilter: boolean) => {
        if(isResetFilter){
          this.taskObj.taskList.pageIndex = 0;
        }
      });
  }

  getProjectListLength() {
    this._sidebarDataService
      .getProjectListLength()
      .pipe(pairwise())
      .subscribe(([previousValue, currentValue]) => {
        if (currentValue === 0) {
          this.isShowProjectEmptyView = true;
        } else {
          this.isShowProjectEmptyView = false;
        }
      });
  }

  openStatusFilter() {
    this.isStatusFilter = !this.isStatusFilter;
    this.isVideoFilter = false;
  }

  openVideoFilter() {
    this.isVideoFilter = !this.isVideoFilter;
    this.isStatusFilter = false;
  }

  clearAllFilters() {
    this.searchKeyword = '';
    this.statuses = [];
    this.videos = [];
    this.taskObj.taskList.list = [];
    this.statusFiltersList.map((status) => {
      status.isSelected = false;
    });
    this.getVideoList();
    this.getTaskList(true);
  }

  preventCloseOnClick() {
    this.menuBtnClicked = true;
  }

  outSideClick() {
    this.isStatusFilter = false;
    this.isVideoFilter = false;
  }

  getSelectedProjectId(){
    let selectedProject = this._projectDataService.getProjectDetails();
    if (selectedProject !== null) {
      return selectedProject.id
    }
  }

  getProjectProcessingProgress() {    
    let selectedProjectId = this.getSelectedProjectId();    
    if (this.isEnableProgressBar && selectedProjectId) {
      this.projectsService
        .getProjectProcessingProgress(selectedProjectId)
        .subscribe(
          (response) => {
            this.projectProgress = response.progress;
            this.isProjectPending = response.isPending;
            this.isProjectUploading = response.isUploading;
            this.getTaskList(false);

            if (!this.isProjectPending && !this.isProjectUploading) {
              this.isEnableProgressBar = false;
              clearInterval(this.progressInstance);
            }
          },
          (error) => {
          }
        );
    } else {
      clearInterval(this.progressInstance);
    }
  }

  setDataOnRouteChange() {
    let project = this._projectDataService.getProjectDetails();
    if (project) {
      this.selectedProjectId = project.id;
      this.getTaskList(true);
      this.getVideoList();
    }
  }

  getInitialInfo() {
    this.selectedProject = JSON.parse(
      localStorage.getItem('selectedProject') || '{}'
    );
    this.taskObj.selectedUser = JSON.parse(
      localStorage.getItem('currentUser') || '{}'
    );
    if (this.selectedProject) {
      this.selectedProjectId = this.selectedProject.id;
      this.taskObj.totalTasks = this.selectedProject.totalTaskCount;

      this.getProjectProcessingProgress();
      this.progressInstance = setInterval(() => {
        this.getProjectProcessingProgress();
      }, 60000);

    }
    if (this.taskObj.selectedUser) {
      this.taskObj.selectedUserType = this.taskObj.selectedUser.userType;
    }
  }

  /**
   * set task id to variable and handle collapse view of table
   * @param selectedId - selected task id
   */
  collapseView(selectedId: string) {
    if (selectedId === this.selectedTaskId) {
      this.selectedTaskId = '';
    } else {
      this.selectedTaskId = selectedId;
    }
  }

  /**
   * generate route url string to open audit tab in new tab
   */
  openAuditResponse() {
    const hostName = location.hostname;
    let fullUrl = '';

    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/audit'], {
        queryParams: { taskId: this.selectedTaskId },
      })
    );

    if (hostName == 'localhost') {
      fullUrl = 'http://localhost:4200' + url;
    } else {
      fullUrl = environment.clientUrl + url;
    }

    window.open(fullUrl, '_blank');
  }

  /**
   * get video list to the filter for the selected project
   */
  getVideoList() {
    this.loading = true;
    this.projectsService.getVideoList(this.selectedProjectId).subscribe(
      (response) => {
        this.loading = false;
        this.taskObj.videoList = response;
      },
      (error) => {
        this.loading = false;
      }
    );
  }

  /**
   * get task list from back-end and assign list to tasklist[]
   */

  getTaskList(loading: boolean) {
    this.loading = loading;
    this.isTasksLoaded = false;
    this.sharedService.setRefreshTaskList(true);
    let filter = {
      statusArray: this.statuses,
      videos: this.videos,
      search: this.searchKeyword,
    };
    if (this.searchKeyword) this.taskObj.taskList.list = [];
    this.projectsService
      .getProjectTaskList(
        this.selectedProjectId,
        this.taskObj.taskList.pageIndex,
        this.taskObj.taskList.pageSize,
        filter
      )
      .subscribe(
        (response) => {
          this.loading = false;
          this.sharedService.setRefreshTaskList(false);
          this.taskList = response.taskList;
          this.taskObj.totalTasks = response.taskCount;
          this.currentPageIndex = this.taskObj.taskList.pageIndex;
          this.taskObj.taskList.list = this.taskObj.taskList.list.concat(
            response.taskList
          );
          this.taskObj.taskList.list = this.taskObj.taskList.list.filter(
            (task, index, self) =>
              index === self.findIndex((t) => t.id === task.id)
          );
          this.isTasksLoaded = true;

          if (this.projectProgress == 100) {
            clearInterval(this.progressInstance);
            this.setTotalTaskCount();
          }
        },
        (error) => {
          this.loading = false;
          this.sharedService.setRefreshTaskList(false);
        }
      );
  }

  setTotalTaskCount() {
    let selectedProject = this._projectDataService.getProjectDetails();
    selectedProject.totalTaskCount = this.taskObj.totalTasks;
    this._projectDataService.setProjectDetails(selectedProject);
  }

  /**
   * get the task list filtered by status
   */
  addStatusFilter() {
    this.statuses = [];

    for (let i = 0; i < this.statusFiltersList.length; i++) {
      if (this.statusFiltersList[i].isSelected)
        this.statuses.push(this.statusFiltersList[i].status);
    }
    this.isStatusFilter = false;
    this.taskObj.taskList.list = [];
    this.taskObj.taskList.pageIndex = 0;
    this.getTaskList(true);
  }

  /**
   * get the task list filtered by video clips
   */
  addVideoFilter() {
    this.videos = [];

    for (let i = 0; i < this.taskObj.videoList.length; i++) {
      if (this.taskObj.videoList[i].isSelected)
        this.videos.push(this.taskObj.videoList[i].id);
    }
    this.isVideoFilter = false;
    this.taskObj.taskList.list = [];
    this.taskObj.taskList.pageIndex = 0;
    this.getTaskList(true);
  }

  /**
   * to run when search is cleared
   */
  isSearchCleared() {
    if (this.searchKeyword.length == 0) this.clearAllFilters();
  }

  /**
   * handle pagination of task list
   * runs when click seemore button
   * each time increment page size bn 10
   */
  fetchMoreTasks() {
    this.taskObj.nextPage();
    this.getTaskList(false);
  }

  onScrollDown() {
    if (this.taskObj.taskList.list.length >= this.taskObj.NO_OF_RECORDS ) {
      this.fetchMoreTasks();
    }

  }

  downloadJson(taskId: string) {
    this.enableDownloadJsonBtn = false;
    this._taskService.downloadJson(taskId).subscribe(
      (response) => {
        const data = JSON.stringify(response);
        // Create a Blob object
        const blob = new Blob([data], { type: 'application/json' });
        // Create an object URL
        const url = URL.createObjectURL(blob);
        // Download file
        this.download(url, `${taskId}.json`);
        // Release the object URL
        URL.revokeObjectURL(url);
      },
      (error) => {
      }
    );
  }

  download(path: string, filename: string) {
    // Create a new link
    const anchor = document.createElement('a');
    anchor.href = path;
    anchor.download = filename;
    // Append to the DOM
    document.body.appendChild(anchor);
    // Trigger `click` event
    anchor.click();
    // Remove element from DOM
    document.body.removeChild(anchor);
    this.enableDownloadJsonBtn = true;
  }
}

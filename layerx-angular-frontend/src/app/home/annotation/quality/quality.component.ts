/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

/**
 * @class: QualityComponent
 * purpose of this module is view quality of the tasks
 * @description:implements all the logics related to quality view
 * @author: Pasan Nethsara
 */

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { contentTypes, Task, taskTypes } from 'src/app/models/task.model';
import { ProjectDataService } from 'src/app/services/project-data.service';
import { ProjectService } from 'src/app/services/project.service';
import { QualityService } from 'src/app/services/quality.service';
import { SharedService } from 'src/app/services/shared.service';
import { environment } from 'src/environments/environment';
import { convertClassToObject } from 'src/app/models/task-button-status.model';
import { Quality } from 'src/app/models/quality';

@Component({
  selector: 'app-quality',
  templateUrl: './quality.component.html',
  styleUrls: ['./quality.component.scss'],
})
export class QualityComponent implements OnInit {
  loading: boolean;
  statLoading: boolean;
  qualityObj: Quality; //assign quality model
  taskObj: Task; //assign task model
  selectedProjectId: string; // assign selected project id
  selectedProject: any; //assign selected project
  currentPageIndex: any; // assign current page index
  filterObj: Array<any>; //assign filter values
  selectedTaskId: string; //assign selected task id
  buttonTypes: any; //assign button types in table

  CONTENT_TYPE_VIDEO: number = contentTypes.video;
  CONTENT_TYPE_IMAGE: number = contentTypes.image;

  USER_TYPE_ANNOTATOR = environment.USER_TYPE_ANNOTATOR;
  USER_TYPE_AUDITOR = environment.USER_TYPE_AUDITOR;
  USER_TYPE_ADMIN = environment.USER_TYPE_ADMIN;

  constructor(
    private sharedService: SharedService,
    private _projectDataService: ProjectDataService,
    private _qualityService: QualityService,
    private _projectsService: ProjectService,
    public router: Router
  ) {
    this.loading = false;
    this.statLoading = false;
    this.taskObj = new Task();
    this.qualityObj = new Quality();
    this.selectedProjectId = '';
    this.selectedProject = '';
    this.currentPageIndex = null;
    this.selectedTaskId = '';
    this.filterObj = [];

    this.buttonTypes = convertClassToObject(taskTypes);
    this.filterObj.push(taskTypes.rejected);
    this.taskObj.filter.status = this.buttonTypes.rejected;

    this.sharedService.changeEmitted$.subscribe((projectId) => {
      this.selectedProjectId = projectId;
      this.taskObj.taskList = {
        list: [],
        pageIndex: 0,
        pageSize: this.taskObj.NO_OF_RECORDS,
      };
      this.getQualityStats();
      this.getTaskList(true);
    });
  }

  ngOnInit(): void {
    this.getInitialInfo();
    this.setDataOnRouteChange();
  }

  setDataOnRouteChange() {
    let projectId = this._projectDataService.getProjectDetails().id;
    if (projectId) {
      this.selectedProjectId = projectId;
      this.getQualityStats();
      this.getTaskList(true);
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
   * Load tasks based on the selected task type
   */
  loadTasks(type: number) {
    this.filterObj = [];

    if (type == taskTypes.fixed) {
      this.filterObj.push(taskTypes.fixed);
      this.taskObj.filter.status = this.buttonTypes.fixed;
    } else if (type == taskTypes.accepted) {
      this.filterObj.push(taskTypes.accepted);
      this.taskObj.filter.status = this.buttonTypes.accepted;
    } else {
      this.filterObj.push(taskTypes.rejected);
      this.taskObj.filter.status = this.buttonTypes.rejected;
    }

    this.getTaskList(true);
  }

  /**
   * get quality stats of the project
   */
  getQualityStats() {
    this.statLoading = true;
    this._qualityService.getQualityStats(this.selectedProjectId).subscribe(
      (response) => {
        this.statLoading = false;
        this.qualityObj.qualityStats = response;
      },
      (error) => {
        this.statLoading = false;
      }
    );
  }

  /**
   * get task list from back-end and assign list to tasklist[]
   */
  getTaskList(loading: boolean) {
    this.loading = loading;
    let filter = {
      statusArray: this.filterObj,
      videos: [],
      search: '',
    };
    this._projectsService
      .getProjectTaskList(
        this.selectedProjectId,
        this.taskObj.taskList.pageIndex,
        this.taskObj.taskList.pageSize,
        filter
      )
      .subscribe(
        (response) => {
          this.loading = false;
          this.currentPageIndex = this.taskObj.taskList.pageIndex;
          this.taskObj.taskList.list = response.taskList;
        },
        (error) => {
          this.loading = false;
        }
      );
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
}

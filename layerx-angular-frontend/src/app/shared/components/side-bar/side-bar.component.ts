/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

/**
 * @class: SideBarComponent
 * purpose of this module is view side bar of app
 * @description:implements all the logics sidebar
 * @author: Isuru Avishka
 */
import {
  Component,
  ElementRef,
  EventEmitter,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ConfirmModalComponent } from 'src/app/components/modals/confirm-modal/confirm-modal.component';
import { ErrorDialogComponent } from 'src/app/components/modals/error-dialog/error-dialog.component';
import { ContentType, UIType } from 'src/app/models/project.model';
import { convertClassToObject } from 'src/app/models/task-button-status.model';
import { SidebarDataService } from 'src/app/services/data/sidebar-data.service';
import { ProjectDataService } from 'src/app/services/project-data.service';
import { ProjectService } from 'src/app/services/project.service';
import { SharedService } from 'src/app/services/shared.service';
import { UserDataService } from 'src/app/services/user-data.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-side-bar',
  templateUrl: './side-bar.component.html',
  styleUrls: ['./side-bar.component.scss'],
})
export class SideBarComponent implements OnInit {
  @ViewChild('scrollWrapperProjects')
  private projectScrollContainer!: ElementRef;
  @Output() setProject = new EventEmitter<any>();
  projectList: Array<any>;
  selectedId: string;
  loading: boolean;
  sideBarActive: String;
  showRightSubMenu: boolean;
  showDataSetMenu: boolean;
  currentUserType: number;
  isShowCreateButton: boolean;
  subscription!: Subscription;
  projectTypes: any;
  dataStatus: boolean;
  isCreateButtonClicked: boolean;
  taskLoading: boolean;
  searchKey: string;
  searchedList: Array<any>;
  isDisableProjectSelect: boolean;

  USER_TYPE_ANNOTATOR = environment.USER_TYPE_ANNOTATOR;
  USER_TYPE_AUDITOR = environment.USER_TYPE_AUDITOR;
  USER_TYPE_ADMIN = environment.USER_TYPE_ADMIN;
  USER_TYPE_TEAM_ADMIN = environment.USER_TYPE_TEAM_ADMIN;
  USER_TYPE_QA = environment.USER_TYPE_QA;

  constructor(
    private _router: Router,
    private _userDataService: UserDataService,
    private _projectsService: ProjectService,
    private _projectDataService: ProjectDataService,
    private _dataService: SharedService,
    public _dialog: MatDialog,
    public _sidebarDataService: SidebarDataService
  ) {
    this.currentUserType = this._userDataService.getUserDetails().userType;
    this.sideBarActive = '';
    this.showRightSubMenu = true;
    this.showDataSetMenu = false;
    this.projectList = [];
    this.selectedId = '';
    this.loading = true;
    this.dataStatus = false;
    this.isShowCreateButton = false;
    this.isCreateButtonClicked = false;
    this.projectTypes = convertClassToObject(ContentType);
    this.taskLoading = false;
    this.searchKey = '';
    this.searchedList = [];
    this.isDisableProjectSelect = false;
  }

  ngOnInit(): void {
    this.getProjectList();
    this.getCurrentRoute();
    this.showHideCreateProjectButton();
    this.subscription = this._dataService.projectListStatus.subscribe(
      (status) => (this.dataStatus = status)
    );
    this.subscription = this._projectDataService.isNewProjectCreated.subscribe(
      (status) => {
        if (status) {
          this.getProjectList();
        }
      }
    );
    this.subscription = this._dataService.taskListStatus.subscribe((status) => {
      this.taskLoading = status;
    });
  }

  /**
   * set selected project and send it to child component
   * @param project - selected project
   */
  setSelectedProject(project: any) {
    let selectedProject = project;
    this.selectedId = selectedProject.id;
    this.setProject.emit(selectedProject);
    this._projectDataService.setProjectDetails(selectedProject);
    if (this._router.url.includes('/annotation'))
      this._router.navigate(['/annotation/tasks']);
    else if (this._router.url.includes('/dataset'))
      this._router.navigate(['/dataset/overview']);
  }

  /**
   * Disable click events for side menu items when project create/edit
   */
  disableSideBarMenuItem(){
    if (this._router.url.includes('/create-project')) {
      this.isDisableProjectSelect = true;
    } 
  }

  /**
   * get project list from API
   */
  getProjectList() {
    this.loading = true;
    this._projectsService.getProjectList().subscribe(
      (response) => {
        (response);

        this.projectList = response;
        this.searchedList = response;
        this._sidebarDataService.setProjectListLength(response.length);
        if (this.projectList.length > 0) {
          this.activeSelectedProject();
        }
        this.disableSideBarMenuItem();
        this.loading = false;
        this._dataService.setProjectDataStaus(true);
      },
      (error) => {
        this.loading = false;
      }
    );
  }

  /**
   * filter project list based on search key
   */
  searchProjects() {
    this.searchedList = [];
    if (
      this.searchKey == null ||
      this.searchKey == '' ||
      this.searchKey == undefined
    ) {
      this.searchedList = this.projectList;
    } else {
      for (let i = 0; i < this.projectList.length; i++) {
        if ( 
          this.projectList[i].name != null &&
          this.projectList[i].name
            .toString()
            .toLowerCase()
            .search(this.searchKey.toString().toLowerCase()) >= 0
        ) {
          this.searchedList.push(this.projectList[i]);
        }
      }
    }
  }

  /**
   * Called after retrieving project list
   * Pass data to child component after project selects
   */
  activeSelectedProject() {
    const isNewProject = sessionStorage.getItem('isNewProject');
    let selectedProject = this._projectDataService.getProjectDetails();

    const projectIndex = this.findProject();

    if (selectedProject) {
      this.selectedId = selectedProject.id;
    } else {
      if (isNewProject == 'false' || isNewProject == null)
        this._projectDataService.setProjectDetails(
          this.projectList[projectIndex]
        );
    }

    if (
      selectedProject == null &&
      (isNewProject == 'false' || isNewProject == null)
    ) {
      if (projectIndex !== -1) {
        this.selectedId = this.projectList[projectIndex].id;
        this.setProject.emit(this.projectList[projectIndex]);
        this._projectDataService.setProjectDetails(
          this.projectList[projectIndex]
        );
      }
    }

    this.scrollToBottom(selectedProject);
  }

  /**
   * Shoe project creation button according user types
   */
  showHideCreateProjectButton() {
    if (
      this.currentUserType == this.USER_TYPE_ANNOTATOR ||
      this.currentUserType == this.USER_TYPE_QA
    ) {
      this.isShowCreateButton = false;
    } else {
      this.isShowCreateButton = true;
    }
  }

  /**
   * get current route and active side bar detail view
   */
  getCurrentRoute() {
    if (
      this._router.url.includes('/annotation') ||
      this._router.url.includes('/create-project')
    ) {
      this.showRightSubMenu = true;
    } else {
      this.showRightSubMenu = false;
    }
    if (
      this._router.url.includes('/process-data-set') ||
      this._router.url.includes('/dataset')
    ) {
      this.showDataSetMenu = true;
    }
  }

  unselectProject() {
    if (this._router.url.includes('/create-project')) {
      this.selectedId = '';
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  /**
   * navigate to create project page
   */
  navigateToCreateProject() {
    this._projectsService.createProjectId().subscribe(
      (response) => {
        if (response) {
          this.selectedId = '';
          this.isCreateButtonClicked = true;
          this._projectDataService.clearProjectDetails();
          sessionStorage.setItem('isNewProject', 'true');
          this._router.navigate(['/create-project'], {
            queryParams: { projectId: response.id, editProject: UIType.create },
          });
        }
      },
      (error) => {
        this.loading = false;
      }
    );
  }

  /**
   * navigate to edit project details page
   * @param projectId - selected projectId
   */
  editProject(projectId: string) {
    this._router.navigate(['/create-project'], {
      queryParams: { projectId: projectId, editProject: UIType.edit },
    });
  }

  /**
   * navigate to add project files page
   * @param projectId - selected projectId
   */
  addProjectFiles(projectId: string) {
    this._router.navigate(['/create-project'], {
      queryParams: { projectId: projectId, editProject: UIType.addFiles },
    });
  }

  /**
   * Delete selected project
   * @param projectId - selected project id
   */
  deleteProject(projectId: string) {
    this._projectsService.deleteProjectById(projectId).subscribe(
      (response) => {
        if (response) {
          this._projectDataService.clearProjectDetails();
          const projectIndex = this.findProject();
          this._projectDataService.setProjectDetails(
            this.projectList[projectIndex]
          );
          this.getProjectList();
          this._projectDataService.setProjectFilterDataStatus(true);
          this._router.navigate(['/annotation/tasks']);
        }
      },
      (error) => {
        this.loading = false;
        this.onError('Error', error.error.error.message);
      }
    );
  }

  /**
   * return index of selected project
   * @returns - selected project index
   */
  findProject() {
    return this.projectList.findIndex(
      (project) => project.name !== null && project.name !== undefined
    );
  }

  /**
   * Prompt confirmation view for user
   * @param projectId - selected project id
   */
  onConfirm(projectId: string) {
    const dialogRef = this._dialog.open(ConfirmModalComponent, {
      disableClose: true,
      width: '500px',
      data: {
        header: 'Delete Project',
        description: 'Do you need to remove project?',
        status: false,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result == true) {
        this.deleteProject(projectId);
      }
    });
  }

  /**
   * Gets index of selected project and focus side menu to active item
   * @param selectedProject - selected project details object
   */
  scrollToBottom(selectedProject: any): void {
    let selectedProjectName = '';
    let scrollPositionValue = 0;
    let itemHeight = 50;
    if (selectedProject !== undefined && selectedProject !== null) {
      selectedProjectName = selectedProject.name;
      let selectedProjectIndex = this.projectList.findIndex(
        (project) => project.name === selectedProjectName
      );
      scrollPositionValue = itemHeight * selectedProjectIndex;
      setTimeout(() => {
        if(this.projectScrollContainer){
          this.projectScrollContainer.nativeElement?.scrollTo(0,scrollPositionValue);
        }
      }, 500);
    }
  }

  onError(header: string, description: string, error?: string) {
    const dialogRef = this._dialog.open(ErrorDialogComponent, {
      disableClose: true,
      width: '460px',
      data: { header: header, description: description, error: error },
    });

    dialogRef.afterClosed().subscribe((result) => {
      ('The dialog was closed');
    });
  }
}

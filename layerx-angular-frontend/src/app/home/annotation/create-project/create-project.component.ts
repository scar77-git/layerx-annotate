/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

/**
 * @class: CreateProjectComponent
 * purpose of this module is view project creation view
 * @description:implements all the functionalities related to project creation/Edit
 * @author: Isuru Avishka
 */
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { LoadingBarService } from '@ngx-loading-bar/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';

import { GoogleLoginProvider, SocialAuthService } from 'angularx-social-login';
import { GoogleApiService } from 'src/app/services/google-api.service';
import { SharedService } from 'src/app/services/shared.service';
import {
  ContentType,
  FileStatus,
  Project,
  UIType,
} from 'src/app/models/project.model';
import { ProjectService } from 'src/app/services/project.service';
import { ProjectDataService } from 'src/app/services/project-data.service';
import { UserDataService } from 'src/app/services/user-data.service';
import { fromEvent, interval, Observable, Subscription } from 'rxjs';
import { ErrorDialogComponent } from 'src/app/components/modals/error-dialog/error-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { HttpEvent, HttpEventType } from '@angular/common/http';
import { AnnotationTaskService } from 'src/app/services/annotation-task.service';

@Component({
  selector: 'app-create-project',
  templateUrl: './create-project.component.html',
  styleUrls: ['./create-project.component.scss'],
})
export class CreateProjectComponent implements OnInit {
  projectObj: Project;
  stage: String;
  projectType: any;
  projectFileStatus: any;
  projectName: String;
  projectNameError: Boolean;
  uiType: any;
  loading: boolean;
  isFilesUploaded: boolean;
  isProjectCreated: boolean;
  fileNames: Array<any>;
  subscription!: Subscription;
  uploadProgress: number;
  startChunk: number;
  uploadServiceCounter: number;
  noOfChunks: number;
  chunkCounter: number = 0;
  //break into 5 MB chunks fat minimum
  chunkSize: number = 6000000;
  videoId: string = '';
  playerUrl: string = '';
  chunkEnd!: number;
  selectedFile!: File;
  isFileSelected: boolean;
  offlineEvent!: Observable<Event>;
  onlineEvent!: Observable<Event>;
  subscriptions: Subscription[] = [];
  currentChunk!: number;
  fileIndex!: number;
  files: any;
  filesAmount!: number;
  pendingUpload!: boolean;
  constructor(
    private loadingBar: LoadingBarService,
    public _router: Router,
    private _authService: SocialAuthService,
    private _googleApiService: GoogleApiService,
    private _location: Location,
    public _sharedService: SharedService,
    private _activatedRoute: ActivatedRoute,
    private _projectsService: ProjectService,
    private _projectDataService: ProjectDataService,
    private _ref: ChangeDetectorRef,
    private __userDataService: UserDataService,
    public _dialog: MatDialog,
    private _taskService: AnnotationTaskService
  ) {
    this.projectObj = new Project();
    this.stage = UIType.create;
    this._activatedRoute.queryParams.subscribe((params) => {
      if (params) {
        this.projectObj.createdProjectId = params['projectId'];
        this.stage = params['editProject'];
        this.getProjectDataAccordingUiType();
        this.clearSelectedFiles();
      }
    });
    this.loading = false;
    this.uploadProgress = 0;
    this.startChunk = 0;
    this.uploadServiceCounter = 1;
    this.noOfChunks = 0;
    this.isFileSelected = false;
    this.isFilesUploaded = true;
    this.isProjectCreated = true;
    this.projectName = '';
    this.projectNameError = false;
    this.fileNames = [];
    this.uiType = this._sharedService.convertClassToObject(UIType);
    this.projectType = this._sharedService.convertClassToObject(ContentType);
    this.projectFileStatus =
      this._sharedService.convertClassToObject(FileStatus);
  }

  ngOnInit(): void {
    this.handleAppConnectivityChanges();
    this._authService.authState.subscribe((user) => {
      localStorage.setItem('gUser', JSON.stringify(user));
    });

    const source = interval(1000);
    this.subscription = source.subscribe((val) => {
      if (
        this.pendingUpload == false &&
        this.fileIndex < this.filesAmount - 1
      ) {
        this.chunkCounter = 0;
        this.fileIndex++;
        this.uploadSingleFile();
      }
    });
  }

  ngOnDestroy(): void {
  }

  ngAfterViewInit() {
    this.loadingBar.start();
  }

  clearSelectedFiles() {
    if (this.stage == UIType.create) {
      this.projectObj.projectName = '';
      this.projectObj.projectFps = 4;
      this.projectObj.fileList = [];
      this.fileNames = [];
    }
  }

  /**
   * refresh selected projected data
   */
  getProjectDataAccordingUiType() {
    if (this.stage !== UIType.create) {
      this.getSelectedProjectDetails();
    }
  }

  /**
   * open google picker and get selected file/ file list
   */
  openGoogleDrivePicker(): void {
    let self = this;
    this._googleApiService.open((data: any) => {

      if (data.action === 'picked') {
        let oauthAccessToken = this._googleApiService.getUserOAuthData();
        this.projectObj.accessToken = oauthAccessToken;
        this.setFiles(data.docs);
        this.projectObj.fileList = data.docs;
        self._ref.detectChanges();
        this.refreshFileListOnAddFile();
      }
    });
  }

  /**
   * When user in edit screen get project data
   */
  refreshFileListOnAddFile() {
    if (this.stage == UIType.edit) {
      this.getSelectedProjectDetails();
    }
  }

  /**
   * generate fileName[] to display selected files
   * @param fileList selected fileList
   */
  setFiles(fileList: Array<any>) {
    this.fileNames = [];
    this.projectObj.fileList = fileList;
    this.projectObj.fileList.map((file) => {
      this.fileNames.push(file.name);
    });
  }

  //set project type on dropdown: video or image
  setType(projectType: number) {
    this.projectObj.projectType = projectType;
  }

  //set frame rate on dropdown: 5, 10, 15
  setFps(fps: number) {
    this.projectObj.projectFps = fps;
  }

  onChange() {
    if (this.projectObj.projectName.length > 0) {
      this.projectNameError = false;
    }
  }

  /**
   * when user press cancel delete the created project and navigate back
   */
  cancelCreateProject() {
    this._projectsService
      .initialDeleteProjectById(this.projectObj.createdProjectId)
      .subscribe(
        (response) => {
          if (response) {
            sessionStorage.setItem('isNewProject', 'false');
            this._location.back();
          }
        },
        (error) => {
          this.loading = false;
          this.onError('Error', error.error.error.message);
        }
      );
  }

  /**
   * get data of selected project
   */
  getSelectedProjectDetails() {
    this._projectsService
      .getSelectedProjectDetails(this.projectObj.createdProjectId)
      .subscribe(
        (response) => {
          this.projectObj.projectName = response.name;
          this.projectObj.projectType = response.contentType;
          this.projectObj.projectFps = response.requiredFPS;
          this.projectObj.recentFiles = response.uploadFileList;
          
        },
        (error) => {
          this.loading = false;
        }
      );
  }

  getSelectedProjectFiles() {
    this._projectsService
      .getSelectedProjectFiles('6169649d16cb1d23102571c1')
      .subscribe(
        (response) => {
          this.projectObj.recentFiles = response;
        },
        (error) => {
          this.loading = false;
        }
      );
  }

  /**
   * navigate back to last location
   */
  navigateBack() {
    this._location.back();
  }

  googleSignIn() {
    this._authService.signIn(GoogleLoginProvider.PROVIDER_ID);
  }

  /**
   * create project and save project data
   */
  saveProjectData() {
    if (this.projectObj.projectName == '' && this.projectObj.fileList) {
      this.projectNameError = true;
    } else {
      this.loading = true;
      sessionStorage.setItem('isNewProject', 'false');
      this._projectsService.createProject(this.projectObj).subscribe(
        (response) => {
          this._taskService.setTaskProgressStatus(true);
          this._projectDataService.setProjectDetails(response);
          this.loading = false;
          if (this.stage == UIType.create) {
            this.stage = UIType.success;
          } else {
            this._location.back();
          }
          this.projectObj.fileList = [];
          this._projectDataService.setNewProjectStatus(true);
        },
        (error) => {
          this.fileNames = [];
          this.onError('Error', error.error.error.message);
          this.loading = false;
        }
      );
    }
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

  /**
   * navigate to task list ui
   */
  navigateToTaskList() {
    this._router.navigate([`/annotation/labels`]);
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
        this.resumeUpload();
      })
    );

    this.subscriptions.push(
      this.offlineEvent.subscribe((e) => {
        // handle offline mode
        this.uploadServiceCounter--;

        this.onError(
          'Connection Problem',
          'Please check internet connection',
          'connection'
        );
      })
    );
  }

  /**
   * select files from file browser and calculate chunks
   * @param event - input event
   */
  uploadDocument(event: any) {
    this.files = event.target.files;
    this.filesAmount = this.files.length;
    this.fileIndex = 0;
    this.uploadSingleFile();
    for (let i = 0; i < this.files.length; i++) {
      this.fileNames.push(this.files[i].name);
    }
  }

  uploadSingleFile() {
    this.pendingUpload = true;
    this.selectedFile = this.files[this.fileIndex];
    this.noOfChunks = Math.ceil(this.selectedFile.size / this.chunkSize);
    let start = 0;
    this.chunkCounter = 0;
    this.chunkEnd = start + this.chunkSize;

    if (this.noOfChunks > 0) {
      this.isFileSelected = true;
      this.createChunk(start);
    }
  }
  /**
   * breaks up the video into a 'chunk' for upload
   * append chunk file to form data
   * @param start - start chunk range number
   */
  createChunk(start: number) {

    this.chunkCounter++;
    this.chunkEnd = Math.min(start + this.chunkSize, this.selectedFile.size);
    const chunk = this.selectedFile.slice(start, this.chunkEnd);
    const fileName = this.selectedFile.name;
    const chunkForm = new FormData();
    chunkForm.append('file', chunk);
    chunkForm.append('fileName', fileName);
    chunkForm.append('chunkIndex', this.chunkCounter.toString());
    chunkForm.append('frameRate', this.projectObj.projectFps.toString());
    chunkForm.append('fileSize', this.selectedFile.size.toString());
    chunkForm.append('totalChunks', this.noOfChunks.toString());
    this.uploadChunk(chunkForm, start, this.chunkEnd);
  }

  /**
   * set byterange header
   * call upload ecd point function
   * @param chunkForm - formdata
   * @param start - start chunk range number
   * @param chunkEnd -  end chunk range number
   */
  uploadChunk(chunkForm: FormData, start: number, chunkEnd: number) {
    this.uploadFileFromDisk(chunkForm, start);
    var blobEnd = chunkEnd - 1;
    var contentRange =
      'bytes ' + start + '-' + blobEnd + '/' + this.selectedFile.size;
  }

  /**
   * call back-end api to upload file
   * calculate uploading chunk progress
   * @param formData - filedata
   * @param start - start chunk range number
   */
  uploadFileFromDisk(formData: FormData, start: number) {
    this.startChunk = start;
    this.currentChunk = start - this.chunkSize;
    this._projectsService
      .uploadFilesFromDisk(formData, this.projectObj.createdProjectId)
      .subscribe(
        (event: HttpEvent<any>) => {
          switch (event.type) {
            case HttpEventType.Sent:
              this.uploadServiceCounter++;
              break;

            case HttpEventType.UploadProgress:
              this.uploadProgress = Math.round(
                (event.loaded / event.total!) * 100
              );

              if (this.uploadProgress == 100) {
                if (this.chunkCounter == this.noOfChunks) {
                  this.pendingUpload = false;
                }
              }
              break;

            case HttpEventType.Response:
              if (event.body && event.body.success == true) {
                this.uploadNextChunk(start);
              }
              if (event.body && event.body.success == false) {
                this.onError('Error', event.body.error);
              }
          }
        },
        (error) => {
          this.onError('Error', error.error.error.message);
        }
      );
  }

  resumeUpload() {
    this.chunkCounter--;
    this.uploadNextChunk(this.currentChunk);
  }

  /**
   * update chunk start range and call createChunk() method if there are more chunks
   * @param startFrom - start chunk range number
   */
  uploadNextChunk(startFrom: number) {
    startFrom += this.chunkSize;
    if (startFrom < this.selectedFile.size) this.createChunk(startFrom);
  }
}

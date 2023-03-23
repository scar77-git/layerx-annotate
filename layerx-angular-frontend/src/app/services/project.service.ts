/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

/**
 * @class: ProjectService
 * purpose of this module is communicate with backend API
 * @description:implements all the api calls related to project
 * @author: Isuru Avishka
 */
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { Project } from '../models/project.model';
import { ProjectDataService } from './project-data.service';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  authToken: string;
  constructor(private http: HttpClient, private _projectDataService:ProjectDataService) {
    this.authToken = JSON.parse(localStorage.getItem('authToken') || '{}');
  }

  getProjectList() {
    return this.http.get<any>(`${environment.apiUrl}/api/projects/list`);
  }

  getVideoList(projectId: string) {
    let id = JSON.parse(JSON.stringify(projectId));
    return this.http.get<any>(
      `${environment.apiUrl}/api/tasks/videoList/${id}`
    );
  }
  getProjectTaskList(
    projectId: string,
    pageIndex: number,
    pageSize: number,
    filterObj: any
  ) {
    let filter = JSON.stringify(filterObj);
    return this.http
      .post<any>(
        `${environment.apiUrl}/api/tasks/list?projectId=${projectId}&pageSize=${pageSize}&pageIndex=${pageIndex}`,
        {
          statusArray: filterObj.statusArray,
          videos: filterObj.videos,
          search: filterObj.search,
        }
      )
      .pipe(
        map(
          (res) => {
            return res;
          },
          (error: any) => {
            return error;
          }
        )
      );
  }

  getSelectedProjectDetails(projectId: string) {
    return this.http.get<any>(
      `${environment.apiUrl}/api/projects/${projectId}`
    );
  }

  createProjectId() {
    return this.http.get<any>(
      `${environment.apiUrl}/api/projects/initial/create`
    );
  }

  initialDeleteProjectById(projectId: string) {
    return this.http
      .post<any>(
        `${environment.apiUrl}/api/projects/initial/delete/${projectId}`,
        {}
      )
      .pipe(
        map(
          (res) => {
            return res;
          },
          (error: any) => {
            return error;
          }
        )
      );
  }

  deleteProjectById(projectId: string) {
    return this.http
      .post<any>(
        `${environment.apiUrl}/api/projects/delete/${projectId}`,
        {}
      )
      .pipe(
        map(
          (res) => {
            return res;
          },
          (error: any) => {
            return error;
          }
        )
      );
  }

  createProject(project: Project) {
    return this.http
      .post<any>(
        `${environment.apiUrl}/api/projects/create/${project.createdProjectId}`,
        {
          name: project.projectName,
          fps: project.projectFps,
          type: project.projectType,
          sources: project.fileList,
          token: project.accessToken,
        }
      )
      .pipe(
        map(
          (res) => {
            return res;
          },
          (error: any) => {
            return error;
          }
        )
      );
  }

  getSelectedProjectFiles(projectId: string) {
    return this.http.get<any>(
      `${environment.apiUrl}/api/projects/${projectId}/file/list`
    );
  }

  getProjectProcessingProgress(projectId:string) {
    return this.http.get<any>(
      `${environment.apiUrl}/api/projects/${projectId}/contents/processProgress`
    );
  }

  uploadFilesFromDisk(formData: any, projectId: string) {
    return this.http
      .post(`${environment.apiUrl}/api/upload/files/${projectId}`, formData, {
        reportProgress: true,
        observe: 'events',
      })
      .pipe(catchError(this.errorMgmt));
  }

  errorMgmt(error: HttpErrorResponse) {
    let errorMessage = '';
    if (error.error instanceof ErrorEvent) {
      // Get client-side error
      errorMessage = error.error.message;
    } else {
      // Get server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    return throwError(errorMessage);
  }
}

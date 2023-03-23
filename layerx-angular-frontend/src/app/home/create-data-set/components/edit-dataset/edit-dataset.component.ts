/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { asNativeElements, Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ErrorDialogComponent } from 'src/app/components/modals/error-dialog/error-dialog.component';
import { NewVersionConfirmationComponent } from 'src/app/components/modals/new-version-confirmation/new-version-confirmation.component';
import { DatasetService } from 'src/app/services/dataset.service';
import { ProjectService } from 'src/app/services/project.service';

@Component({
  selector: 'app-edit-dataset',
  templateUrl: './edit-dataset.component.html',
  styleUrls: ['./edit-dataset.component.scss']
})
export class EditDatasetComponent implements OnInit {
  projects: any; //to assign projects
  selectedProjects: any;
  checkedCount: number;
  datasetName: string; // to assign dataset name
  datasetNameError: boolean; // to assign error for dataset name
  selectedVersion: string;
  
  NEW_VERSION = 'new';
  UPDATE_VERSION = 'update';

  constructor(
    public _router: Router,
    private _projectsService: ProjectService,
    private _dataSetService: DatasetService,
    public _dialog: MatDialog,
  ) { 
    this.checkedCount = 0;
    this.datasetName = '';
    this.datasetNameError = false;
    this.projects = [];
    this.selectedVersion = '';
    // this.getProjectList();
    this.getSelectedVersionId();

  }

  ngOnInit(): void {
    this.getVersionEditDetails(this.selectedVersion)
  }
  getSelectedVersionId() {
    let versionId = this._dataSetService.getSelectedDatasetVersion();

    if(versionId){
      this.selectedVersion = versionId;
    }
  }
  addProjects(initialLoad?: boolean) {
    this.selectedProjects = JSON.parse(JSON.stringify(this.projects));
    for (let i = 0; i < this.selectedProjects.length; i++) {
      if (this.selectedProjects[i].checked) {
        this.checkedCount++;
      }
    }
    if(!initialLoad){
      (document.getElementById('dropDownVideoList') as HTMLFormElement).click();
    }
  }
  removeProject(index: number) {
    this.projects[index].checked = false;
    this.selectedProjects[index].checked = false;
    this.checkedCount--;
  }

  onSubmit(isNewVersion: boolean) {
    this.datasetNameError = false;
    let projectIdList = [];
    for (let i = 0; i < this.selectedProjects.length; i++) {
      if (this.selectedProjects[i].checked)
        projectIdList.push(this.selectedProjects[i].id);
    }

    this._dataSetService
      .editDataset(projectIdList, this.selectedVersion, isNewVersion)
      .subscribe(
        (response) => {
          this._dataSetService.setEditDataset();
          this._dataSetService.setSelectedDatasetVersion(response.versionId)
          this._router.navigate([`/process-data-set/rebalance`]);
        },
        (error) => {
          this.onError('Error', error.error.error.message);
        }
      );
  }

  /**
   * get project list from API
   */
  getProjectList() {
    this._projectsService.getProjectList().subscribe(
      (response) => {
        for(let i=0; i<response.length; i++){
          if(response[i].name){
            this.projects.push(response[i]);
          }
        }
      },
      (error) => {
        this.onError('Error', error.error.error.message);
      }
    );  
  }

  getVersionEditDetails(versionId: string) {
    this._dataSetService.getVersionEditDetails(versionId).subscribe(
      (response) => {
        for(let i=0; i<response.projects.length; i++){
          if(response.projects[i].name){
            this.projects.push(response.projects[i]);
          }
        }
        this.datasetName = response.dataSetName;
        this.addProjects(true);
        this._dataSetService.setEditType(response.creationType)

      },
      (error) => {
        this.onError('Error', error.error.error.message);
      }
    ); 
  }

  isNewVersion() {
    const dialogRef = this._dialog.open(NewVersionConfirmationComponent, {
      disableClose: true,
      width: '550px',
      data: {
        header: 'Update labels',
        description: 'Do you want to create new version or update existing?',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        if (result == this.UPDATE_VERSION) {
          this.onSubmit(false)
          this._dataSetService.setIsNewVersion('false')
        }
        if (result == this.NEW_VERSION) {
          this.onSubmit(true)
          this._dataSetService.setIsNewVersion('true')
        }
      }
    });
  }

  /**
   * back to previous window
   */
  close() {
    window.history.back();
  }

  onError(header:string, errorMsg: string) {
    const dialogRef = this._dialog.open(ErrorDialogComponent, {
      disableClose: true,
      width: '650px',
      data: { header: header, description: errorMsg },
    });

    dialogRef.afterClosed().subscribe((result) => {

    });
  } 
}

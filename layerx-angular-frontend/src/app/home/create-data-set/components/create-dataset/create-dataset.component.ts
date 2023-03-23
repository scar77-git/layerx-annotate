/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { asNativeElements, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DatasetService } from 'src/app/services/dataset.service';
import { ProjectService } from 'src/app/services/project.service';

@Component({
  selector: 'app-create-dataset',
  templateUrl: './create-dataset.component.html',
  styleUrls: ['./create-dataset.component.scss'],
})
export class CreateDatasetComponent implements OnInit {
  projects: any; //to assign projects
  selectedProjects: any;
  checkedCount: number;
  datasetName: string; // to assign dataset name
  datasetNameError: boolean; // to assign error for dataset name

  constructor(
    public _router: Router,
    private _projectsService: ProjectService,
    private _dataSetService: DatasetService
  ) {
    this.checkedCount = 0;
    this.datasetName = '';
    this.datasetNameError = false;
    this.getProjectList();
  }

  ngOnInit(): void {
    this.projects = [
    ];
  }

  
  addProjects() {
    this.selectedProjects = JSON.parse(JSON.stringify(this.projects));
    for (let i = 0; i < this.selectedProjects.length; i++) {
      if (this.selectedProjects[i].checked) {
        this.checkedCount++;
      }
    }
    (document.getElementById('dropDownVideoList') as HTMLFormElement).click();
  }
  removeProject(index: number) {
    this.projects[index].checked = false;
    this.selectedProjects[index].checked = false;
    this.checkedCount--;
  }

  onSubmit() {
    if (!this.datasetName) this.datasetNameError = true;
    else {
      this.datasetNameError = false;
      let projectIdList = [];
      for (let i = 0; i < this.selectedProjects.length; i++) {
        if (this.selectedProjects[i].checked)
          projectIdList.push(this.selectedProjects[i].id);
      }

      this._dataSetService
        .createDataset(projectIdList, this.datasetName)
        .subscribe(
          (response) => {
            this._dataSetService.setCreatedDataSetId(response.id)
            this._router.navigate([`/process-data-set/rebalance`]);
          },
          (error) => {
          }
        );
    }
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
      }
    );
    
  }

  /**
   * back to previous window
   */
  close() {
    window.history.back();
  }
}

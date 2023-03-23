/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DatasetService } from 'src/app/services/dataset.service';
import { ProjectService } from 'src/app/services/project.service';

@Component({
  selector: 'app-dataset-create',
  templateUrl: './dataset-create.component.html',
  styleUrls: ['./dataset-create.component.scss'],
})
export class DatasetCreateComponent implements OnInit {
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
      //   { name: 'GOAI_videoplayback', checked: true },
      //   { name: 'Stanford Vision Lab', checked: false },
      //   { name: 'Stanford Vision_image processing', checked: false },
      //   { name: 'SETI_video playback', checked: true },
      //   { name: 'Long text annotation', checked: true },
    ];
  }
  addProjects() {
    this.selectedProjects = JSON.parse(JSON.stringify(this.projects));
    for (let i = 0; i < this.selectedProjects.length; i++) {
      if (this.selectedProjects[i].checked) {
        this.checkedCount++;
      }
    }
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
            localStorage.setItem(
              'createdDatasetId',
              JSON.stringify(response.id)
            );
            this._router.navigate([`/dataset-rebalance`]);
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
        this.projects = response.map((item: any) => ({
          ...item,
          checked: false,
        }));
      },
      (error) => {
        // this.alert('Error', error.error.error.message);
      }
    );
  }
}

/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

/**
 * @class: AnnotationComponent
 * purpose of this module is view taabs view of annotation page
 * @description:implements all the logics related annotation view
 * @author: Isuru Avishka
 */
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SidebarDataService } from 'src/app/services/data/sidebar-data.service';
import { ProjectDataService } from 'src/app/services/project-data.service';
import { SharedService } from 'src/app/services/shared.service';

@Component({
  selector: 'app-annotation',
  templateUrl: './annotation.component.html',
  styleUrls: ['./annotation.component.scss'],
})
export class AnnotationComponent implements OnInit {
  activeRoute: string;
  selectedProjectName: any;
  selectedProject: any;
  subscription!: Subscription;

  constructor(
    public _router: Router,
    public _sharedService: SharedService,
    private _projectDataService: ProjectDataService,
  ) {
    this.activeRoute = '';
  }

  ngOnInit(): void {
    this.subscription = this._sharedService.projectListStatus.subscribe(
      (status) => {
        if (status) {
          this.getListStatus();
        }
      }
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  /**
   * Emitted from side bar component after retrieve project list.
   * Get selected project and add project data to local storage and pass data to task component
   * @param project - selected project item
   */
  getSelectedProject(project: any) {
    this.selectedProject = project;
    this.selectedProjectName = project.name;
    if (this.selectedProject) {
      localStorage.setItem(
        'selectedProject',
        JSON.stringify(this.selectedProject)
      );
      this._sharedService.emitChange(this.selectedProject.id);
    }
  }

  getListStatus() {
    let selectedProject = this._projectDataService.getProjectDetails();
    if (selectedProject) {
      this.selectedProjectName = selectedProject.name;
    }
  }

  /**
   * navigate to page which pass by route parameter
   * @param routeName - route name
   */
  navigateTo(routeName: any) {
    this._router.navigate([`/annotation/${routeName}`]);
  }
}

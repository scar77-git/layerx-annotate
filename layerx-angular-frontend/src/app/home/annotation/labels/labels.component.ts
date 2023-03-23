/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import {
  Component,
  ElementRef,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { ProjectDataService } from 'src/app/services/project-data.service';
import { Subscription } from 'rxjs';
import { SharedService } from 'src/app/services/shared.service';
import { MatDialog } from '@angular/material/dialog';
import { NewLabelComponent } from '../../../components/modals/new-label/new-label.component';
import { AddLabelService } from 'src/app/services/add-label.service';
import { ConfirmModalComponent } from 'src/app/components/modals/confirm-modal/confirm-modal.component';
import { SelectedScreen } from 'src/app/models/label.model';
import { ErrorDialogComponent } from 'src/app/components/modals/error-dialog/error-dialog.component';

@Component({
  selector: 'app-labels',
  templateUrl: './labels.component.html',
  styleUrls: ['./labels.component.scss'],
})
export class LabelsComponent implements OnInit {
  @ViewChildren('content') private divList!: QueryList<ElementRef>;
  selectedProjectId: any;
  selectedProject: any;
  subscription!: Subscription;
  labels: any;
  height: string = '100%';
  selectedClass!: number;
  selectedAttribute!: number;
  selectedValue!: number;
  labelObj: any;
  tempObj: any;
  imageObj: Array<any> = [];
  selectedLabelKey!: string;
  selectedScreen!: number;
  borderHeight!: number;
  fileToUpload: any;
  imageUrl: any;
  addCss: boolean = false;

  SCREEN_CLASS_ONLY = SelectedScreen.classOnly;
  SCREEN_CLASS_ATTRIBUTES = SelectedScreen.classWithAttributes;

  constructor(
    private _projectDataService: ProjectDataService,
    private sharedService: SharedService,
    private _addLabelService: AddLabelService,
    public _dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.getInitialInfo();
    document.documentElement.style.setProperty('--height', '50%');

    this.subscription = this.sharedService.projectListStatus.subscribe(
      (status) => {
        if (status) {
          this.setDataOnRouteChange();
        }
      }
    );
  }
  setDataOnRouteChange() {
    let project = this._projectDataService.getProjectDetails();
    if (project) {
      this.selectedProjectId = project.id;
      this.getLabelList(true);
    }
  }

  /**
   * get project id from local storage
   */
  getInitialInfo() {
    this.selectedProject = JSON.parse(
      localStorage.getItem('selectedProject') || '{}'
    );

    if (this.selectedProject) {
      this.selectedProjectId = this.selectedProject.id;
    }
  }

  getLabelList(loading: boolean) {
    this._addLabelService.getProjectLabelList(this.selectedProjectId).subscribe(
      (response) => {
        this.labels = response;
      },
      (error) => {
      }
    );
  }

  expandClass(classId: number) {
    this.selectedClass = classId;
    this.selectedAttribute = -1;
    this.selectedValue = -1;
  }
  collapseClass() {
    this.selectedClass = -1;
  }
  expandValue(attributeId: number, valueId: number) {
    this.selectedAttribute = attributeId;
    this.selectedValue = valueId;
    setTimeout(() => {
      const contentList = this.divList.toArray();
      let contentIndex = contentList.findIndex(
        (element) => element.nativeElement.offsetHeight > 0
      );
      this.borderHeight =
        contentList[contentIndex].nativeElement.offsetHeight + 10;
    }, 1);
  }

  collapseValue() {
    this.selectedAttribute = -1;
    this.selectedValue = -1;
  }

  /**
   * show label add success box after timeout
   */
  labelAddSuccess() {
    let x = document.getElementById('alertBox');
    x!.className = 'show';
    setTimeout(function () {
      x!.className = x!.className.replace('show', '');
    }, 3000);
  }

  newLabel() {
    const dialogRef = this._dialog.open(NewLabelComponent, {
      disableClose: true,
      width: '1020px',
      data: { labels:this.labels ,selectedLabel: [], editLabel: false },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.labelObj = result.label;
        this.tempObj = this.labelObj;
        this.selectedScreen = result.selectedScreen;
        let isSaved = result.isSaved;

        if (isSaved) {
          this.createImageData();
          this.removeImages();
          this.saveLabelData();
        }
      }
    });
  }

  editLabel(labelID: number) {
    let selectedLabelKey = this.labels[labelID].key;
    const dialogRef = this._dialog.open(NewLabelComponent, {
      disableClose: true,
      width: '1020px',
      data: { labels:this.labels, selectedLabel: this.labels[labelID], editLabel: true },
    });

    dialogRef.afterClosed().subscribe((result) => {
      this.labelObj = result.label;
      this.tempObj = this.labelObj;
      this.selectedScreen = result.selectedScreen;
      let isSaved = result.isSaved;

      this.createImageData();
      this.removeImages();

      if (isSaved) {
        this.editLabelData(selectedLabelKey);
      }
    });
  }

  /** add image data to labelObject upon uploading an image */
  createImageData() {
    const label = this.labelObj.classAttributesList[0];

    if (label.description) {
      label.attributes = [];
    }
    label.key = label.label.toLocaleLowerCase().trim();
    if (this.selectedScreen == this.SCREEN_CLASS_ONLY) {
      label.type = this.SCREEN_CLASS_ONLY;
      this.imageObj.push({
        type: this.SCREEN_CLASS_ONLY,
        labelKey: label.key,
        attributeKey: null,
        valueName: null,
        imgData: label.imgData,
      });
    }

    if (this.selectedScreen == this.SCREEN_CLASS_ATTRIBUTES) {
      label.type = this.SCREEN_CLASS_ATTRIBUTES;
      for (let i = 0; i < label.attributes.length; i++) {
        label.attributes[i].key = label.attributes[i].label
          .toLocaleLowerCase()
          .trim();
        for (let j = 0; j < label.attributes[i].values.length; j++) {
          let attribute = {
            type: this.SCREEN_CLASS_ATTRIBUTES,
            labelKey: label.key,
            attributeKey: label.attributes[i].key,
            valueName: label.attributes[i].values[j].valueName,
            imgData: label.attributes[i].values[j].imgData,
          };
          if (attribute.imgData && attribute.imgData.name) {
            this.imageObj.push(attribute);
          }
        }
      }
    }
  }

  removeImages() {
    const labelData = JSON.stringify(this.labelObj.classAttributesList[0]);
    const label = JSON.parse(labelData);

    label.imgURL = '';
    for (let i = 0; i < label.attributes.length; i++) {
      for (let j = 0; j < label.attributes[i].values.length; j++) {
        label.attributes[i].values[j].imgURL = '';
        label.attributes[i].values[j].imgData = {};
      }
    }
    this.tempObj = label;
  }

  /**
   * delete label
   * @param index label id
   */
  onConfirm(index: number) {
    const dialogRef = this._dialog.open(ConfirmModalComponent, {
      disableClose: true,
      width: '500px',
      data: {
        header: 'Delete Label',
        description: 'Are you sure?',
        status: false,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result == true) {
        this.deleteLabel(index);
      }
    });
  }

  saveLabelData() {
    this._addLabelService
      .saveNewLabel(this.selectedProjectId, this.tempObj)
      .subscribe(
        (response) => {
          this.labels.push(this.labelObj.classAttributesList[0]);
          this.uploadImages();
          this.labelAddSuccess();
        },
        (error) => {
          this.onError('Error', error.error.error.message);
        }
      );
  }
  editLabelData(selectedLabelKey: string) {
    this._addLabelService
      .editLabel(this.selectedProjectId, selectedLabelKey, this.tempObj)
      .subscribe(
        (response) => {
          this.uploadImages();
        },
        (error) => {
          this.onError('Error', error.error.error.message);
        }
      );
  }
  deleteLabel(index: number) {
    this._addLabelService
      .deleteLabel(this.selectedProjectId, this.labels[index].key)
      .subscribe(
        (response) => {
          this.labels.splice(index, 1);
        },
        (error) => {
          this.onError('Error', error.error.error.message);
        }
      );
  }
  uploadImages() {
    this.imageObj.forEach((el: any, i: any) => {
      this._addLabelService.uploadImages(this.selectedProjectId, el).subscribe(
        (response) => {},
        (error) => {
          this.onError('Error', error.error.error.message);
        }
      );
    });
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
}

/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import {
  AttributeValueItem,
  ClassWithAttributes,
  Label,
  SelectedScreen,
  SelectedModalType
} from 'src/app/models/label.model';
import { AddLabelService } from 'src/app/services/add-label.service';
import { ProjectDataService } from 'src/app/services/project-data.service';
import { ConfirmModalComponent } from '../confirm-modal/confirm-modal.component';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface DialogData {
  selectedLabel: ClassWithAttributes;
  editLabel: boolean;
  labels: any;
}

@Component({
  selector: 'app-new-label',
  templateUrl: './new-label.component.html',
  styleUrls: ['./new-label.component.scss'],
})
export class NewLabelComponent implements OnInit {
  durationInSeconds = 5;
  labelObj: Label;
  selectedLabel: ClassWithAttributes;
  editLabel: boolean;
  selectedScreen: number;
  classAttributes: Label;
  // attributes: Attributes
  // attributes:any = ['att','att'];
  values: any = ['val', 'val'];

  SCREEN_CLASS_ONLY = SelectedScreen.classOnly;
  SCREEN_CLASS_ATTRIBUTES = SelectedScreen.classWithAttributes;
  loadingImage: boolean = false;
  selectedProjectId: any;
  selectedProject: any;
  editKey: string;
  selectedAttribute: number = 0;
  selectedValue: number = 0;
  temp: Label;
  containerWidth: number;
  containerHeight: number;
  tempImg: any;
  base64String: Array<any> = [];
  isSaved: boolean = false;
  expandAttributes: Array<boolean> = [];
  modalType!:number;
  constructor(
    public _dialogRef: MatDialogRef<NewLabelComponent>,
    private _projectDataService: ProjectDataService,
    private _addLabelService: AddLabelService,
    public _dialog: MatDialog,
    private _snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.selectedLabel = data.selectedLabel;
    this.editLabel = data.editLabel;
    this.editKey = data.selectedLabel?.key;
    this.selectedScreen = this.SCREEN_CLASS_ONLY;
    this.classAttributes = new Label();
    this.temp = new Label();
    this.labelObj = new Label();
    this.containerWidth = 355;
    this.containerHeight = 200;
  }

  ngOnInit(): void {
    if (this.editLabel) {
      this.modalType = SelectedModalType.edit;
      this.labelObj.classAttributesList[0] = this.selectedLabel;
      if (this.selectedLabel.type == this.SCREEN_CLASS_ONLY) {
        this.selectedScreen = this.SCREEN_CLASS_ONLY;
      } else {
        this.selectedScreen = this.SCREEN_CLASS_ATTRIBUTES;
        this.expandAttributes = new Array(
          this.labelObj.classAttributesList[0].attributes.length
        ).fill(false);
      }
    } else {
      this.modalType = SelectedModalType.new;
      this.expandAttributes = new Array(1).fill(false);
    }
  }

  close(): void {
    this._dialogRef.close({
      label: this.labelObj,
      selectedScreen: this.selectedScreen,
      isSaved: this.isSaved,
    });
  }

  switchScreen(scr: number) {
    this.selectedScreen = scr;
  }

  addValue(index: number) {
    let valueObj = {
      valueName: '',
      description: '',
      imgFile: '',
      imgURL: '',
    };
    this.labelObj.classAttributesList[0].attributes[index].values.push(
      valueObj
    );
  }
  addAttribute() {
    let attributeObj = {
      label: '',
      key: '',
      values: [
        {
          valueName: '',
          description: '',
          imgURL: '',
        },
      ],
    };
    this.expandAttributes.push(false);
    this.labelObj.classAttributesList[0].attributes.push(attributeObj);
  }
  expandAttribute(index: number) {
    this.expandAttributes[index] = false;
  }
  collapseAttribute(index: number) {
    this.expandAttributes[index] = true;
  }
  deleteAttribute(attributeIndex: number) {
    const dialogRef = this._dialog.open(ConfirmModalComponent, {
      disableClose: true,
      width: '500px',
      data: {
        header: 'Delete Attribute',
        description: 'Are you sure?',
        status: false,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result == true) {
        this.labelObj.classAttributesList[0].attributes.splice(
          attributeIndex,
          1
        );
        this.expandAttributes.splice(attributeIndex, 1);
      }
    });
  }
  deleteValue(attributeIndex: number, valueIndex: number) {
    const dialogRef = this._dialog.open(ConfirmModalComponent, {
      disableClose: true,
      width: '500px',
      data: {
        header: 'Delete Value',
        description: 'Are you sure?',
        status: false,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result == true) {
        this.labelObj.classAttributesList[0].attributes[
          attributeIndex
        ].values.splice(valueIndex, 1);
      }
    });
  }

  onChange(event: any, attributeIndex: number, valueIndex: number) {
    if (attributeIndex >= 0 && valueIndex >= 0) {
      this.selectedAttribute = attributeIndex;
      this.selectedValue = valueIndex;
    }
    const file: File = event.target.files[0];

    if (file) {
      this.tempImg = file;
      const formData = new FormData();
      formData.append('File', file);
      const reader = new FileReader();
      reader.onload = this.handleReader.bind(this);
      reader.readAsBinaryString(file);
    }

    this.resizeImage(file);
  }

  handleReader(event: any) {
    const label = this.labelObj.classAttributesList[0];
    if (this.selectedScreen == this.SCREEN_CLASS_ATTRIBUTES) {
      const value =
        label.attributes[this.selectedAttribute].values[this.selectedValue];

      value.imgData = this.tempImg;
      value.imgURL = 'data:image/png;base64,' + btoa(event.target.result);
    }
    if (this.selectedScreen == this.SCREEN_CLASS_ONLY) {
      label.imgData = this.tempImg;
      label.imgURL = 'data:image/png;base64,' + btoa(event.target.result);
    }
  }

  resizeImage(file: File) {
    let image = new Image();
    image.src = URL.createObjectURL(file);
    image.onload = () => {
      let width = image.width;
      let height = image.height;
      let outputWidth = 0;
      let outputHeight = 0;

      let currentAspect = this.containerWidth / this.containerHeight;
      let aspect = width / height;

      if (currentAspect < aspect) {
        outputWidth = this.containerWidth;
        outputHeight = this.containerWidth / aspect;
      } else {
        outputHeight = this.containerHeight;
        outputWidth = this.containerHeight * aspect;
      }
      if (this.selectedScreen == this.SCREEN_CLASS_ATTRIBUTES) {
        const value =
          this.labelObj.classAttributesList[0].attributes[
            this.selectedAttribute
          ].values[this.selectedValue];
        value.imgHeight = outputHeight;
        value.imgWidth = outputWidth;
      }
    };
  }

  uploadImage(type: number, attributeID?: number, valueID?: number) {
    if(type == this.SCREEN_CLASS_ATTRIBUTES && attributeID != undefined && valueID != undefined){
      let attribute = this.labelObj.classAttributesList[0].attributes[attributeID]
      let value = this.labelObj.classAttributesList[0].attributes[attributeID].values[valueID];
      if(attribute.label == '') {
        attribute.errorMsg = true;
      }
      else if(value.valueName == '') {
        value.errorMsg = true;
      }else{
        document.getElementById('imageUpload' + attributeID + valueID)?.click();
      }
    }
    if (type == this.SCREEN_CLASS_ONLY) {
      document.getElementById('imageUpload')?.click();
    }
  }

  removeAttributeError(attributeID:number) {
    let obj = this.labelObj.classAttributesList[0].attributes[attributeID];
    obj.errorMsg = false;
  }

  removeValueError(attributeID:number, valueID:number) {
    let obj = this.labelObj.classAttributesList[0].attributes[attributeID].values[valueID];
    obj.errorMsg = false;
  }

  save() {
    let labelTextArrNew = this.data.labels?.map((item: any) => {
      return item.label.toLowerCase();
    });
    
    let labelTextArrEdit = JSON.parse(JSON.stringify(labelTextArrNew));
    
    const lastLabelItem = this.labelObj.classAttributesList.slice(-1)[0];
    labelTextArrNew.push(lastLabelItem.label.toLowerCase());

    let editId = this.data.labels.findIndex((t: { label: string; }) => t.label === this.labelObj.classAttributesList[0].label)
    labelTextArrEdit.splice(editId,1)

    labelTextArrEdit.push(lastLabelItem.label.toLowerCase());

    let isDuplicateNew = labelTextArrNew.some(function (item: any, index: number) {
      return labelTextArrNew.indexOf(item) != index;
    });

    let isDuplicateEdit = labelTextArrEdit.some(function (item: any, index: number) {
      return labelTextArrEdit.indexOf(item) != index;
    });

    if (isDuplicateNew && this.modalType == SelectedModalType.new) {
      this.openSnackBar();
    }else if(isDuplicateEdit && this.modalType == SelectedModalType.edit){
      this.openSnackBar();
    }else {
      if(this.selectedScreen == this.SCREEN_CLASS_ONLY){
        this.labelObj.classAttributesList[0].attributes = []
      }
      this.isSaved = true;
      this.close();
    }
    
  }
  openSnackBar() {
    this._snackBar.openFromComponent(ErrorToastComponent, {
      duration: this.durationInSeconds * 800,
    });
  }
}
@Component({
  selector: 'error-toast',
  templateUrl: 'error-toast.html',
  styles: [
    `
    .example-pizza-party {
      color: hotpink;
    }
  `,
  ],
})
export class ErrorToastComponent {}
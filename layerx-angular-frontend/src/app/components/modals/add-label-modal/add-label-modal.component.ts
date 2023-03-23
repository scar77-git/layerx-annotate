/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface DialogData {
  labelList: Array<any>;
}

@Component({
  selector: 'app-add-label-modal',
  templateUrl: './add-label-modal.component.html',
  styleUrls: ['./add-label-modal.component.scss'],
})
export class AddLabelModalComponent implements OnInit {
  labelList: Array<any>;
  searchedList: any;
  searchTxt!: string;

  constructor(
    public _dialogRef: MatDialogRef<AddLabelModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.labelList = JSON.parse(JSON.stringify(data.labelList));
  }

  ngOnInit(): void {
    this.searchedList = this.labelList;
  }

  close(): void {
    this._dialogRef.close();
  }
  add():void {
    this._dialogRef.close(this.labelList);
  }
  formatText(txt: string){
    let text = txt.toString().replace(/,/g, '-')
    return text;
  }
  onSearch() {
    this.searchedList = [];
    if (this.searchTxt == null || this.searchTxt == '') {
      this.searchedList = this.labelList;
    } else {
      
      for (let i = 0; i < this.labelList.length; i++) {
        if (this.labelList[i].label.toString().toLowerCase().search(this.searchTxt.toLowerCase().replace(/-/g, ',')) >= 0) {
          this.searchedList.push(this.labelList[i]);
        }
      }
    }
  }
}

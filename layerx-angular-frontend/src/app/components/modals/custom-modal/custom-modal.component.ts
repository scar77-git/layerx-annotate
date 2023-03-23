/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface DialogData {
  header: string;
  description: string;
  buttonText:string;
}

@Component({
  selector: 'app-custom-modal',
  templateUrl: './custom-modal.component.html',
  styleUrls: ['./custom-modal.component.scss']
})
export class CustomModalComponent implements OnInit {

  header:string;
  description: string;
  buttonText: string;
  constructor(public dialogRef: MatDialogRef<CustomModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData) { 
      this.header = data.header;
      this.description = data.description;
      this.buttonText = data.buttonText;
    }

  ngOnInit(): void {
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

}

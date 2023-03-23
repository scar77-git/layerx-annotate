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
}

@Component({
  selector: 'app-new-version-confirmation',
  templateUrl: './new-version-confirmation.component.html',
  styleUrls: ['./new-version-confirmation.component.scss']
})
export class NewVersionConfirmationComponent implements OnInit {
  header: string;
  description: string;

  constructor(
    public dialogRef: MatDialogRef<NewVersionConfirmationComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) { 
    this.header = data.header;
    this.description = data.description;
  }

  ngOnInit(): void {
  }

  update(): void {
    this.dialogRef.close('update');
  }
  new(): void{
    this.dialogRef.close('new');
  }
  close(){
    this.dialogRef.close();
  }
}

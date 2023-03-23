/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

/**
 * @class: DatasetExportAddFormatComponent
 * purpose of this module is to add formats for dataset generation
 * @description:implements all the logics related to select data formats for export
 * @author: Pasan Nethsara
 */

import { Component, Inject, OnInit } from '@angular/core';
import {
  MatDialog,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { DatasetExportService } from 'src/app/services/dataset-export.service';
import { ErrorDialogComponent } from '../error-dialog/error-dialog.component';

export interface DialogData {
  selectedVersionId: string;
  selectionList: Array<any>;
}

@Component({
  selector: 'app-dataset-export-add-format',
  templateUrl: './dataset-export-add-format.component.html',
  styleUrls: ['./dataset-export-add-format.component.scss'],
})
export class DatasetExportAddFormatComponent implements OnInit {
  selectionList: Array<any>; // to assign the data coming from parent component
  selectedVersionId: string; // to assign the selected version ID coming from parent component
  selectedFormats: Array<string>; // to assign selected format types

  constructor(
    private _datasetExportService: DatasetExportService,
    public _dialogRef: MatDialogRef<DatasetExportAddFormatComponent>,
    public _dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.selectionList = data.selectionList;
    this.selectedVersionId = data.selectedVersionId;
    this.selectedFormats = [];
  }

  ngOnInit(): void {}

  close(): void {
    this._dialogRef.close();
  }

  /**
   * generate datasets to export based on the selected types
   */
  generateDataset() {
    this.selectedFormats = [];

    for (let i = 0; i < this.selectionList.length; i++) {
      for (let j = 0; j < this.selectionList[i].formats.length; j++) {
        if (this.selectionList[i].formats[j].isSelected)
          this.selectedFormats.push(this.selectionList[i].formats[j].keyName);
      }
    }

    this._datasetExportService
      .generateDataset(this.selectedVersionId, this.selectedFormats)
      .subscribe(
        (response) => {
          this.close();
        },
        (error) => {
          this.onError('Error', error.error.error.message);
        }
      );
  }

  onError(header: string, description: string, error?: string) {
    const dialogRef = this._dialog.open(ErrorDialogComponent, {
      disableClose: true,
      width: '460px',
      data: { header: header, description: description, error: error },
    });

    dialogRef.afterClosed().subscribe((result) => {
      this.close();
    });
  }
}

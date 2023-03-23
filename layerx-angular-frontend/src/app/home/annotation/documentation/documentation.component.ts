/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

/**
 * @class: DocumentationComponent
 * purpose of this module is view documents of a project
 * @description:implements all the logics related to documentation
 * @author: Pasan Nethsara
 */

import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PromptMesseges } from 'src/app/constants/prompt-messeges';
import { Documents } from 'src/app/models/documents';
import { DocumentsService } from 'src/app/services/documents.service';
import { ProjectDataService } from 'src/app/services/project-data.service';
import { SharedService } from 'src/app/services/shared.service';
import { environment } from 'src/environments/environment';
import { ErrorDialogComponent } from '../../../components/modals/error-dialog/error-dialog.component';

@Component({
  selector: 'app-documentation',
  templateUrl: './documentation.component.html',
  styleUrls: ['./documentation.component.scss'],
})
export class DocumentationComponent implements OnInit {
  loading: boolean;
  selectedProjectId: string; // assign selected project id
  documentsObj: Documents; //assign document model
  uploading: boolean;

  constructor(
    private sharedService: SharedService,
    private _projectDataService: ProjectDataService,
    private _documentService: DocumentsService,
    private _dialog: MatDialog
  ) {
    this.loading = false;
    this.selectedProjectId = '';
    this.documentsObj = new Documents();
    this.uploading = false;

    this.sharedService.changeEmitted$.subscribe((projectId) => {
      this.selectedProjectId = projectId;
      this.getDocumentList();
    });
  }

  ngOnInit(): void {
    this.setDataOnRouteChange();
  }

  setDataOnRouteChange() {
    let projectId = this._projectDataService.getProjectDetails().id;
    if (projectId) {
      this.selectedProjectId = projectId;
      this.getDocumentList();
    }
  }

  /**
   * to remove file extension from the file name
   */
  getFileName(fileName: string) {
    if (fileName) return fileName.split('.').slice(0, -1).join('.');
    else return false;
  }

  /**
   * download document
   * @param documentId - id of the document
   * @param fileName - filename of the document
   */
  async downloadDocument(documentId: string, fileName: string) {
    let url = `${environment.apiUrl}/api/projects/${this.selectedProjectId}/documents/download/${documentId}`;
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    // Append to the DOM
    document.body.appendChild(anchor);
    // Trigger `click` event
    anchor.click();
    // Remove element from DOM
    document.body.removeChild(anchor);
  }

  /**
   * upload document
   */
  uploadDocument(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.uploading = true;
      const formData = new FormData();
      formData.append('document', file);

      this._documentService
        .uploadDocument(this.selectedProjectId, formData)
        .subscribe(
          (response) => {
            this.uploading = false;
            this.getDocumentList();
          },
          (error) => {
            this.uploading = false;
            this.alertMessage('Error', PromptMesseges.document_upload_failed);
          }
        );

    }
  }

  alertMessage(header: string, description: string) {
    const dialogRef = this._dialog.open(ErrorDialogComponent, {
      disableClose: true,
      width: '460px',
      data: { header: header, description: description },
    });

    dialogRef.afterClosed().subscribe((result) => {
    });
  }

  /**
   * get documents list from back-end and assign list to documentsObj
   */
  getDocumentList() {
    this.loading = true;
    this._documentService.getDocumentList(this.selectedProjectId).subscribe(
      (response) => {
        this.documentsObj.documentList = response;
        this.loading = false;
      },
      (error) => {
        this.loading = false;
      }
    );
  }
}

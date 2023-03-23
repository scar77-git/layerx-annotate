/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { Component, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Audit } from 'src/app/models/audit.model';
import { CommentCard } from 'src/app/models/comment.model';
import { AnnotationTaskService } from 'src/app/services/annotation-task.service';
import { AuditDataService } from 'src/app/services/data/audit-data.service';
import { CommentDataService } from 'src/app/services/data/comment-data.service';

@Component({
  selector: 'app-comment-property',
  templateUrl: './comment-property.component.html',
  styleUrls: ['./comment-property.component.scss'],
})
export class CommentPropertyComponent implements OnInit {
  audit: Audit;
  commentList: Array<CommentCard>;
  selectedTaskId!:string;
  private ngUnsubscribe = new Subject();
  constructor(
    private _commentDataService: CommentDataService,
    private _annotationTaskService: AnnotationTaskService,
    private _auditDataService: AuditDataService
  ) {
    this.audit = new Audit();
    this.commentList = [];
  }

  ngOnInit(): void {
    this.getAuditData();
    this.getSelectedTaskId();
    this.getCommentListRefreshStatus();
  }

  getAuditData(): void {
    this._auditDataService
      .getAuditInstance()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((auditInstance: Audit) => {
        this.audit = auditInstance;
      });
  }

  getSelectedTaskId(): void {
    this._commentDataService
      .getSelectedTaskId()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((selectedTaskId: string) => {
        this.selectedTaskId = selectedTaskId;
        this.getCommentList();
      });
  }

  getCommentListRefreshStatus(){
    this._commentDataService
      .getRefreshComments()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((isRefresh: boolean) => {
          this.getCommentList();
      });
  }

  getCommentList() {
    this._annotationTaskService
      .getCommentList(this.selectedTaskId)
      .subscribe(
        (response) => {
          this.commentList = response;
        },
        (error) => {
        }
      );
  }

  selectComment(commentObj: CommentCard) {
    const selectedFrameId = commentObj.frameId;
    this._commentDataService.setSelectedFrameId(selectedFrameId);
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}

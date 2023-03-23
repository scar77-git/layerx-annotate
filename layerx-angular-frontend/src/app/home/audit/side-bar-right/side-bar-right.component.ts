
/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

/**
 * @class: SideBarComponent
 * purpose of this module is view side bar right view
 * @description:implements all the logics Side bar right
 * @author: Windya Yasas
 */import { Component, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Audit } from 'src/app/models/audit.model';
import { convertClassToObject } from 'src/app/models/task-button-status.model';
import { AuditDataService } from 'src/app/services/data/audit-data.service';
import { SidebarDataService } from 'src/app/services/data/sidebar-data.service';
import { FrameSideBarTabs } from 'src/app/shared/constants/frame';
import { CommentDataService } from 'src/app/services/data/comment-data.service';
import { AnnotationTaskService } from 'src/app/services/annotation-task.service';
import { CommentCard } from 'src/app/models/comment.model';


@Component({
  selector: 'app-side-bar-right',
  templateUrl: './side-bar-right.component.html',
  styleUrls: ['./side-bar-right.component.scss']
})
export class SideBarRightComponent implements OnInit {

  readonly constantFrameSideBarTabs = convertClassToObject(FrameSideBarTabs);
  selectedTab:string = FrameSideBarTabs.annotations.key;
  tabList:Array<any> =[
    FrameSideBarTabs.annotations,
    FrameSideBarTabs.addFilter,
    FrameSideBarTabs.comments
  ]
  selectedTaskId!:string;
  commentList: Array<CommentCard>;
  audit: Audit;
  private ngUnsubscribe = new Subject();

  constructor(
    private _auditDataService: AuditDataService,
    private _sidebarDataService: SidebarDataService,
    private _commentDataService: CommentDataService,
    private _annotationTaskService: AnnotationTaskService,
    ) {
    this.audit = new Audit();
    this.commentList = [];
   }

  ngOnInit(): void {
    this.getAuditData();
    this.getSelectTab();
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

  selectTab(key:string){
    this._sidebarDataService.setSelectedTab(key);

  }

  getSelectTab(): void {
    this._sidebarDataService
      .getSelectedTab()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((selectedTab: string) => {
        this.selectedTab = selectedTab;
      });
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

}

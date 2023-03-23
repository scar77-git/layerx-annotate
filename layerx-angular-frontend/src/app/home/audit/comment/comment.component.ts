/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommentBox } from 'src/app/models/comment-box.model';
import { Comment } from 'src/app/models/comment.model';
import { UserDataService } from 'src/app/services/user-data.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-comment',
  templateUrl: './comment.component.html',
  styleUrls: ['./comment.component.scss'],
})
export class CommentComponent implements OnInit {
  email: string = '';
  shapeType: string = '';
  popUpCommentBox: string = '';
  newComment: Comment;
  currentUserType: number;
  currentUserDetails: any;
  showEditDeleteButtons: boolean;
  userImg: string;

  @Input() commentBox: CommentBox;
  @Output() emitSendComment = new EventEmitter<any>();
  @Output() emitSaveComment = new EventEmitter<any>();
  @Output() emitCancelComment = new EventEmitter<any>();
  constructor(private _userDataService: UserDataService) {
    this.newComment = new Comment();
    this.newComment.userId = this._userDataService.getUserDetails().userId;
    this.newComment.userName = this._userDataService.getUserDetails().name;
    this.currentUserType = this._userDataService.getUserDetails().userType;
    this.showEditDeleteButtons = false;
    this.currentUserDetails = this._userDataService.getUserDetails();
    this.userImg = `${environment.apiUrl}/api/user/profileImage/${this.currentUserDetails.userId}/${this.currentUserDetails.profileImgUrl}`
    this.newComment.imgUrl = this.userImg;
    this.commentBox = new CommentBox();
  }

  ngOnInit(): void {
  }

  ngOnChange() {}

  sendComment() {
    if (this.newComment) {
      this.commentBox.commentList.push(this.newComment);
      this.newComment = new Comment();
      this.emitSendComment.emit(this.commentBox);
      this.emitSaveComment.emit();
    }
  }
  cancelComment() {
    this.emitCancelComment.emit();
  }

  removeComment(index: number) {
    this.commentBox.commentList.splice(index, 1);
    this.emitSaveComment.emit();
  }

  editComment(index: number) {
    this.commentBox.commentList[index].isEditable = true;
    this.commentBox.commentList[index].commentEdit =
      this.commentBox.commentList[index]?.commentText;
  }

  cancelSaveComment(index: number) {
    this.commentBox.commentList[index].isEditable = false;
    this.commentBox.commentList[index].commentEdit = '';
  }

  saveComment(index: number) {
    this.commentBox.commentList[index].isEditable = false;
    this.commentBox.commentList[index].commentText =
      this.commentBox.commentList[index]?.commentEdit;
    this.emitSaveComment.emit();
  }

  /**
   * show comment edit / delete option based on logged in user
   * @param userId logged in userId
   * @returns show/hide edit and delete buttons
   */
  activeEditDeleteButtons(userId: string) {
    if (this.currentUserType == environment.USER_TYPE_ADMIN) {
      this.showEditDeleteButtons = true;
      return this.showEditDeleteButtons;
    } else if (userId == this.newComment.userId) {
      this.showEditDeleteButtons = true;
      return this.showEditDeleteButtons;
    } else {
      this.showEditDeleteButtons = false;
      return this.showEditDeleteButtons;
    }
  }

  ngOnDestroy() {
    this.commentBox = new CommentBox();
  }
}

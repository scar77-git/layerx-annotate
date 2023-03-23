/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

export class Comment {
  id?: string;
  userName!: string;
  userId!: string;
  commentText?: string;
  commentEdit?: string;
  commentedDate!: Date;
  isEditable?: boolean;
  imgUrl?: string;

  constructor() {
    this.userName = '';
    this.userId = '';
    this.commentText = '';
    this.commentedDate = new Date();
    this.isEditable = false;
  }

  //When create comment create new comment box object
  //Create comment component inside audit
}

export interface CommentCard {
  commentBoxNo: number;
  commentText: number;
  date: Date;
  frameId: number;
  frameNo: number;
  name: string;
  profileImg: string;
  isResolved:boolean;
}

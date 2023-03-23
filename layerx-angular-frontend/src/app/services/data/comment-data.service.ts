/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CommentBox } from 'src/app/models/comment-box.model';

@Injectable({
  providedIn: 'root',
})
export class CommentDataService {
  private selectedFrameCommentBoxes: BehaviorSubject<CommentBox[]> =
    new BehaviorSubject<CommentBox[]>([]);
  private selectedFrameId: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  private selectedTaskId : BehaviorSubject<string> = new BehaviorSubject<string>('');
  private isRefreshComments : BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  constructor() {}

  /**
   * set opened tasks id
   * @param selectedFrameId - selectedTaskId
   */
  setSelectedFrameId(selectedFrameId: number) {
    this.selectedFrameId.next(selectedFrameId);
  }

  /**
   * get opened tasks id
   * @returns selectedFrameId
   */
  getSelectedFrameId(): Observable<number> {
    return this.selectedFrameId.asObservable();
  }

    /**
   * set opened tasks id
   * @param selectedTaskId - selectedTaskId
   */
  setSelectedTaskId(selectedTaskId: string) {
    this.selectedTaskId.next(selectedTaskId);
  }
  
  /**
   * set comment refresh status
   * @param selectedTaskId 
   */
  setRefreshComments(isRefresh: boolean){
    this.isRefreshComments.next(isRefresh);
  }
  getRefreshComments(): Observable<boolean>{
    return this.isRefreshComments.asObservable();
  }
  /**
   * get opened tasks id
   * @returns selectedTaskId
   */
  getSelectedTaskId(): Observable<string> {
    return this.selectedTaskId.asObservable();
  }

  setSelectedFrameCommentBoxes(commentBoxes: CommentBox[]) {
    this.selectedFrameCommentBoxes.next(commentBoxes);
  }

  getSelectedFrameCommentBoxes(): Observable<CommentBox[]> {
    return this.selectedFrameCommentBoxes.asObservable();
  }
}

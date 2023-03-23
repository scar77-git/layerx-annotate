/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { environment } from 'src/environments/environment';
import { convertClassToObject, PromptMesseges } from 'src/app/constants/prompt-messeges';

@Component({
  selector: 'app-missing-frames',
  templateUrl: './missing-frames.component.html',
  styleUrls: ['./missing-frames.component.scss']
})
export class MissingFramesComponent implements OnInit {
  
  @Output() boxClose = new EventEmitter<any>();
  @Output() boxSubmit = new EventEmitter<any>();
  @Output() boxOk= new EventEmitter<any>();

  @Input() userType!: number;

  USER_TYPE_ANNOTATOR = environment.USER_TYPE_ANNOTATOR;
  USER_TYPE_AUDITOR = environment.USER_TYPE_AUDITOR;
  USER_TYPE_ADMIN = environment.USER_TYPE_ADMIN;

  const: any = null;

  constructor() {
    this.const = convertClassToObject(PromptMesseges)
  }

  ngOnInit(): void {
  }
  submit(){
      this.boxSubmit.emit(true);
      this.close()
  }
  close(){
    this.boxClose.emit(true);
  }

}

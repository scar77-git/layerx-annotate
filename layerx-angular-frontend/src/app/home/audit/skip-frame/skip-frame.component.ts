/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { convertClassToObject, PromptMesseges } from 'src/app/constants/prompt-messeges';


@Component({
  selector: 'app-skip-frame',
  templateUrl: './skip-frame.component.html',
  styleUrls: ['./skip-frame.component.scss']
})
export class SkipFrameComponent implements OnInit {

  @Output() boxClose = new EventEmitter<any>();
  @Output() boxSubmit = new EventEmitter<any>();
  
  isNoObjects: boolean;
  const: any = null;

  constructor() {
    this.isNoObjects = true;
    this.const = convertClassToObject(PromptMesseges);
  }

  ngOnInit(): void {
    
  }
  submit(){
    if(this.isNoObjects){
      this.boxSubmit.emit(true);
      this.close()
    }
  }
  close(){
    this.boxClose.emit(true);
  }
}

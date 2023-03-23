/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-marked-labels',
  templateUrl: './marked-labels.component.html',
  styleUrls: ['./marked-labels.component.scss']
})

export class MarkedLabelsComponent implements OnInit {
  @Input() labelObject:any;
  constructor() { 
  }
  ngOnInit(): void {
  }
}

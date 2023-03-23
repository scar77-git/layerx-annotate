/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { Injectable } from '@angular/core';
import { Shape } from '../models/shape.model';

@Injectable({
  providedIn: 'root'
})
export class ShapeService {

  constructor() { }

  private shapes:Shape[]=[
  ];
  getShapes(){return this.shapes;}
}

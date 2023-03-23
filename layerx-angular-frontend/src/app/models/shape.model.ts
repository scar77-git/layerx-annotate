/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

export class Shape {
  id: number;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  key: string
  color: string;
  status: string;
  attributeValues: any;
  isPermanent: boolean;
  isHide?:boolean;
  createdAt?: Date;
  annotatorId?: string;

  constructor() {
    this.id = 0;
    this.type = '';
    this.x = 0;
    this.y = 0;
    this.w = 0;
    this.h = 0;
    this.label = '';
    this.key = '',
    this.color = '';
    this.attributeValues = {};
    this.status = '';
    this.isPermanent = false;
    this.isHide = false;
  }
  


}

export class ShapeType {
  public static notSelected = 'notSelected';
  public static comment = 'comment';
  public static rectangle = 'rectangle';
  public static pointer = 'pointer';
  public static pan = 'pan';
  public static hideAnnotations = 'annotations'
  public static zoomIn = 'zoomIn';
  public static zoomOut = 'zoomOut'
}




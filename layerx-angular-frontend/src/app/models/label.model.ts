/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

export class Label {
  classAttributesList: Array<ClassWithAttributes>;
  constructor() {
    this.classAttributesList = [
      {
        label: '',
        key: '',
        description:'',
        imgURL: '',
        isAbleDelete: true,
        isEditable:true,
        attributes: [
          {
            label: '',
            key: '',
            errorMsg: false,
            values: [
              {
                valueName: '',
                description: '',
                imgURL: '',
                errorMsg: false,
              },
            ],
          },
        ],
      },
    ];
  }
}

export interface ClassWithAttributes {
  label: string;
  key: string;
  description: string;
  imgURL: string;
  imgData?: any;
  type?:number;
  isAbleDelete?:boolean;
  isEditable:boolean;
  attributes: Array<attributeItem>;
}

export interface attributeItem {
  label: string;
  key: string;
  errorMsg?: boolean;
  values: Array<AttributeValueItem>;
}

export interface AttributeValueItem {
  valueName: string;
  description: string;
  imgURL: string;
  imgData?: any;
  imgHeight?: number;
  imgWidth?: number;
  errorMsg?: boolean;
}

export class SelectedScreen {
  public static classOnly = 1;
  public static classWithAttributes = 2;
}

export class SelectedModalType {
  public static new = 1;
  public static edit = 2;
}



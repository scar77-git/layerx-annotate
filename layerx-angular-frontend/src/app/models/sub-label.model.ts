/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

export class SubLabel {
  labelMenuStatus: number;
  selectedLabelId!: number;
  labelTexts: Array<string>;
  attributesList: Array<any>;
  selectedAttribute!: string;
  labelItem: SelectedLabelItem;
  constructor() {
    this.labelMenuStatus = LabelMenuStatus.labelView;
    this.labelTexts = [];
    this.attributesList = [];
    this.labelItem = {
      label: '',
      key: '',
      attributeValues: {},
      color: ''
    };
  }
}

export class LabelMenuStatus {
  public static labelView = 0;
  public static subLabelView = 1;
}

export interface LabelItem {
  attributes: Array<any>;
  color: string;
  description: string;
  key: string;
  label: string;
}

export interface AttributeValueItem {
  annotatedCount: number;
  description: string;
  isDefault: boolean;
  valueName: string;
  isSelected: boolean;
}

export interface SelectedLabelItem {
  label: string;
  key: string;
  attributeValues: any;
  color: string;
}

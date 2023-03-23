/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
// import { Canvas } from 'src/app/models/canvas.model';
import {
  AttributeValueItem,
  LabelItem,
  LabelMenuStatus,
  SubLabel,
} from 'src/app/models/sub-label.model';
import { CanvasComponent } from '../canvas/canvas.component';

@Component({
  selector: 'app-sub-label',
  templateUrl: './sub-label.component.html',
  styleUrls: ['./sub-label.component.scss'],
})
export class SubLabelComponent implements OnInit {
  @Input() labelData: Array<LabelItem>;
  @Input() selectedBoxData: Array<any>;
  @Output() emitSendLabelData = new EventEmitter<any>();
  @Output() emitCloseEvent = new EventEmitter<any>();
  @Output() emitUpdateLabelData = new EventEmitter<any>()

  subLabel: SubLabel;
  labelList:Array<any>;
  isUpdate: boolean;
  editView: boolean;
  showSubLabelIndex: number;

  LABEL_VIEW = LabelMenuStatus.labelView;
  SUB_LABEL_VIEW = LabelMenuStatus.subLabelView;

  constructor() {
    this.subLabel = new SubLabel();
    this.labelData = [];
    this.labelList = [];
    this.selectedBoxData = [];
    this.isUpdate = false;
    this.editView = false;
    this.showSubLabelIndex = 0;
  }

  ngOnInit(): void {
    this.loadBoxData();
  }

  /**
   * load selected box data
   */
  loadBoxData(){
    let shape = this.selectedBoxData[1];
    this.isUpdate = this.selectedBoxData[0];
    if(this.labelData.length == 1){
      this.addLabel(this.labelData[0].label,this.labelData[0].key,0);
      this.subLabel.labelMenuStatus = this.SUB_LABEL_VIEW;
    }
    if(this.isUpdate){
      // this.isUpdate = true;
      this.editView = true;
      this.subLabel.labelMenuStatus = this.SUB_LABEL_VIEW;

      let labelIndex = this.labelList.findIndex((x) => x.label == shape.label);
      
      this.addLabel(shape.label,this.labelList[labelIndex].key,labelIndex);
      this.generateLabelAttributes(this.labelList[labelIndex]);

      let size = this.labelList[labelIndex].attributes.length
      
      for(let i = 0;i < size; i++){
        let key = this.labelList[labelIndex].attributes[i].key;
        let item = shape.attributeValues[key]
        
        if(item){
          let keyIndex = this.labelList[labelIndex].attributes[i].values.findIndex((x: { valueName: any; }) => x.valueName == item);
          this.selectAttribute(i,keyIndex,this.subLabel.attributesList[i].values[keyIndex])
        }
        
      }
    }
    this.selectedBoxData = [];
  }
  ngOnChanges(changes: SimpleChanges) {
    
    if (changes.labelData) {
      this.labelData = changes.labelData.currentValue;
      this.labelList = JSON.parse(JSON.stringify(this.labelData));
    }
  }

  /**
   * set id to selectedLabelId
   * set label value and change menu view to attribute view
   * @param labelName - label name
   * @param index - label index
   */
  addLabel(labelName: string, key: string, index: number) {

    this.subLabel.selectedLabelId = index;
    
    this.subLabel.labelItem.label = labelName;
    this.subLabel.labelItem.key = key;
    this.subLabel.labelItem.color = this.labelList[index].color;
    this.subLabel.labelMenuStatus = this.SUB_LABEL_VIEW;
    this.generateLabelAttributes(this.labelList[index]);
  }

  /**
   * generate label and attributes string array
   * active default selected attribute value
   * @param label - selected label object
   */
  generateLabelAttributes(label: LabelItem) {
    const selectedLabelObj = label;
    this.subLabel.attributesList = selectedLabelObj.attributes;
    const labelItems = selectedLabelObj.attributes.length + 1;
    this.subLabel.labelTexts = Array(labelItems).fill('');
    this.subLabel.labelTexts[0] = selectedLabelObj.label;

    for (let i = 0; i < selectedLabelObj.attributes.length; i++) {
      let attributeValue = selectedLabelObj.attributes[i].values.find(
        (value: any) => value.isDefault == true
      );

      if (attributeValue) {
        attributeValue.isSelected = true;
        this.subLabel.labelTexts[i + 1] = attributeValue.valueName;
        this.subLabel.labelItem.attributeValues[
          selectedLabelObj.attributes[i].key
        ] = attributeValue.valueName;
      }
    }


  }


  /**
   * when select attribute set key and value pairs for attributeValues{}
   * set active state for selected attribute
   * @param labelIndex - sublabel index
   * @param attributeIndex - attribute index
   * @param selectedAttribute - selected attribute object
   */
  selectAttribute(
    labelIndex: number,
    attributeIndex: number,
    selectedAttribute: AttributeValueItem
  ) {

    let maxIndex = this.subLabel.attributesList.length - 1;
    if(this.showSubLabelIndex< maxIndex){
      this.showSubLabelIndex++;
    }else{
      this.editView = true;
    }
    
    this.subLabel.labelTexts[labelIndex + 1] = selectedAttribute.valueName;
   
    for (
      let i = 0;
      i < this.subLabel.attributesList[labelIndex].values.length;
      i++
    ) {
      if (i === attributeIndex) {
        selectedAttribute.isSelected = true;
        this.subLabel.labelItem.attributeValues[
          this.subLabel.attributesList[labelIndex].key
        ] = selectedAttribute.valueName;
      } else {
        this.subLabel.attributesList[labelIndex].values[i].isSelected = false;
      }
    }

  }

  /**
   * change label select view back to label list view
   */
  backToLabels() {
    this.subLabel.labelMenuStatus = this.LABEL_VIEW;
  }

  /**
   * send close event to parent component
   */
  close() {
    this.emitCloseEvent.emit(true);
    // canvas
  }

  /**
   * send selected label data parent component
   */
  saveLabelData(){
    this.labelList = [];
    this.emitSendLabelData.emit(this.subLabel.labelItem);
    this.isUpdate = false;
  }
  updateLabelData(){
    this.labelList = [];
    this.emitUpdateLabelData.emit(this.subLabel.labelItem);
    this.isUpdate = false;
  }
}

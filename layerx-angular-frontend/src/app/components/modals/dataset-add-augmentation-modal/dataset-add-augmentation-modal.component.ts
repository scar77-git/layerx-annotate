import { Options } from '@angular-slider/ngx-slider';
import {
  Component,
  ElementRef,
  Inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import {
  augmentationLevels,
  DatasetAugmentation,
} from 'src/app/models/dataset-augmentation';
import { DatasetAugmentationService } from 'src/app/services/dataset-augmentation.service';
import { SharedService } from 'src/app/services/shared.service';
import {
  AugmentationIdName,
  AugmentationIds,
  AugmentationLevels,
  DataAugmentations,
  DataInputTypes,
} from 'src/app/shared/constants/augmentation';
import {
  Augmentation,
  augmentationBoxProperty,
  augmentationData,
  augmentationProperty,
} from 'src/app/shared/models/augmentation';
import _ from 'lodash';

export interface DialogData {
  selectedAugDataSet: augmentationData;
  selectedId: any;
  selectedPanelType: number;
  selectedVersionId: string;
}
@Component({
  selector: 'app-dataset-add-augmentation-modal',
  templateUrl: './dataset-add-augmentation-modal.component.html',
  styleUrls: ['./dataset-add-augmentation-modal.component.scss'],
})
export class DatasetAddAugmentationModalComponent implements OnInit {
  @ViewChild('scrollContent')
  public scrollContent!: ElementRef; // scroll view
  @ViewChild('augImgCon', { static: false }) augImgCon: ElementRef | undefined;
  readonly dataAugmentationConstant: typeof DataAugmentations =
    DataAugmentations;
  readonly augmentationLevelsConstant: typeof AugmentationLevels =
    AugmentationLevels;
  readonly dataInputTypesConstant: typeof DataInputTypes = DataInputTypes;
  datasetAugmentationObj = DatasetAugmentation; // Model used for Dataset Augmentation
  augmentationLevelPanel: string; //to change between augmentation levels
  augmentationsIdList: any; //to assign list of augmentation Ids
  augmentatioData: augmentationData;
  dataAugmentationObj!: any;
  selectedBox: Augmentation;
  value: number = 40;
  highValue: number = 60;
  selectedAugmentationIndex: number; // to assign index of the selected augmentation for auto scroll
  options: Options = {
    floor: 0,
    ceil: 100,
    hidePointerLabels: true,
    hideLimitLabels: true,
  };

  constructor(
    private sharedService: SharedService,
    private _augmentationService: DatasetAugmentationService,
    public _dialogRef: MatDialogRef<DatasetAddAugmentationModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
  ) {
    if (data.selectedPanelType == augmentationLevels.boxLevel)
      this.augmentationLevelPanel = AugmentationLevels.BOUNDING_BOX_LEVEL;
    else this.augmentationLevelPanel = AugmentationLevels.IMAGE_LEVEL;
    this.selectedBox = new Augmentation();
    this.selectedAugmentationIndex = 0;
    this.augmentatioData = {
      IMAGE_LEVEL: [],
      BOUNDING_BOX_LEVEL: [],
    };

  }

  ngOnInit(): void {
    this.dataAugmentationObj = this.sharedService.convertClassToObject(
      this.dataAugmentationConstant
    );
    this.augmentationsIdList =
      this.sharedService.convertClassToObject(AugmentationIdName);

    this.loadAugmentationList();
    if (this.data?.selectedId) {
      // this.selectBox(this.data?.selectedId);
      let selectedAugmentation: any;

      if (
        this.augmentationLevelPanel == AugmentationLevels.BOUNDING_BOX_LEVEL
      ) {
        selectedAugmentation = this.augmentatioData.BOUNDING_BOX_LEVEL.find(
          (x) => x.id == this.data.selectedId
        );
      }

      if (this.augmentationLevelPanel == AugmentationLevels.IMAGE_LEVEL) {
        selectedAugmentation = this.augmentatioData.IMAGE_LEVEL.find(
          (x) => x.id == this.data.selectedId
        );
      }
      this.selectBox(selectedAugmentation);
    }
  }

  ngAfterViewInit() {
    if (this.augmentationLevelPanel == AugmentationLevels.BOUNDING_BOX_LEVEL) {
      this.selectedAugmentationIndex =
        this.data.selectedAugDataSet.BOUNDING_BOX_LEVEL.findIndex(
          (x) => x.id == this.data.selectedId
        );
    }

    if (this.augmentationLevelPanel == AugmentationLevels.IMAGE_LEVEL) {
      this.selectedAugmentationIndex =
        this.data.selectedAugDataSet.IMAGE_LEVEL.findIndex(
          (x) => x.id == this.data.selectedId
        );
    }

    this.scroll(this.selectedAugmentationIndex);
  }

  loadAugmentationList(): void {
    let dastaSelected = this.data.selectedAugDataSet;
    this.augmentatioData.IMAGE_LEVEL = [];
    this.augmentatioData.BOUNDING_BOX_LEVEL = [];

    for (let boxId of AugmentationIds.IMAGE_LEVEL) {
      let augObj = new Augmentation();
      augObj.id = boxId;
      augObj.isSelected = false; // need to process
      augObj.description = ''; // need to process
      let boxData = dastaSelected.IMAGE_LEVEL.find((x) => x.id == augObj.id);
      if (this.dataAugmentationObj?.augmentationItems?.IMAGE_LEVEL[boxId]) {
        if (boxData) {
          augObj.isSelected = true;
          augObj.description = boxData.description;
          augObj.properties = boxData.properties;
        } else {
          let properties = [];
          for (let property of this.dataAugmentationObj?.augmentationItems
            ?.IMAGE_LEVEL[boxId].properties) {
            let propertyObj: augmentationProperty = {
              id: property.id,
              values: [],
            };
            if (property.type == DataInputTypes.RANGE) {
              propertyObj.values[0] = property.defaultValue;
              if (property.isMultiValue == true) {
                propertyObj.values[1] = property.defaultMaxValue;
              }

            }

            if (property.type == DataInputTypes.CHECK_BOX) {
              propertyObj.values[0] = property.defaultValue;;
            }
            properties.push(propertyObj);
          }
          augObj.properties = properties;
        }

        this.augmentatioData.IMAGE_LEVEL.push(augObj);
      }
    }

    for (let boxId of AugmentationIds.BOUNDING_BOX_LEVEL) {
      let augObj = new Augmentation();
      augObj.id = boxId;
      augObj.isSelected = false; // need to process
      augObj.description = ''; // need to process
      let boxData = dastaSelected.BOUNDING_BOX_LEVEL.find(
        (x) => x.id == augObj.id
      );
      if (
        this.dataAugmentationObj?.augmentationItems?.BOUNDING_BOX_LEVEL[boxId]
      ) {
        if (boxData) {
          augObj.isSelected = true;
          augObj.description = boxData.description;
          augObj.properties = boxData.properties;
        } else {
          let properties = [];
          for (let property of this.dataAugmentationObj?.augmentationItems
            ?.BOUNDING_BOX_LEVEL[boxId].properties) {
            let propertyObj: augmentationProperty = {
              id: property.id,
              values: [],
            };
            properties.push(propertyObj);
          }
          augObj.properties = properties;
        }

        this.augmentatioData.BOUNDING_BOX_LEVEL.push(augObj);
      }
    }
  }

  close(data?: any): void {
    this._dialogRef.close(data);
  }

  changeAugmentationLevel(augmentationLevel: AugmentationLevels) {
    this.selectedBox = new Augmentation();
    if (augmentationLevel == AugmentationLevels.BOUNDING_BOX_LEVEL)
      this.augmentationLevelPanel = AugmentationLevels.BOUNDING_BOX_LEVEL;
    else this.augmentationLevelPanel = AugmentationLevels.IMAGE_LEVEL;
  }

  selectBox(augObj: Augmentation): void {
    this.selectedBox = augObj;
    if (
      this.selectedBox.id != this.augmentationsIdList.MOSAIC &&
      this.augmentationLevelPanel == AugmentationLevels.IMAGE_LEVEL
    )
    this.drawProcessedImages();
  }

  /**
   *
   * @param property Get property
   * @returns
   */
  getPropertyValue(propertyId: any): any {
    let propertyModel = this.getPropertyModel(propertyId, this.selectedBox);
    let value = null;
    if (propertyModel) {
      if (this.selectedBox?.properties) {
        let property = this.selectedBox?.properties.find(
          (x: augmentationProperty) => x.id == propertyModel.id
        );

        if (
          property &&
          !(property?.values[0] == null || property?.values[0] == undefined)
        ) {
          if (propertyModel.isMultiValue) {
            value = {
              minValue: property?.values[0],
              highValue: 1,
            };
            if (property?.values[1]) {
              value.highValue = property?.values[1];
            }
          } else {
            value = property?.values[0];
          }
        }
      }
    }

    return value;
  }

  /**
   * On change value
   * @param propertyModel
   * @param changedValue
   */
  changePropertyValue(propertyModel: any, changedValue: any): void {
    const dataAugmentations =
      this.sharedService.convertClassToObject(DataAugmentations);
    let boxModel =
      dataAugmentations.augmentationItems[this.augmentationLevelPanel][
      this.selectedBox.id
      ];

    if (this.selectedBox?.properties) {
      let property = this.selectedBox?.properties.find(
        (x: augmentationProperty) => x.id == propertyModel.id
      );

      if (property && property?.values) {
        if (propertyModel.type == DataInputTypes.CHECK_BOX) {
          let value = property?.values[0];
          if (value) {
            value = !value;
          } else {
            value = true;
          }
          property.values[0] = value;
          this.selectedBox.description;
        } else if (
          propertyModel.type == DataInputTypes.RANGE &&
          !propertyModel.isMultiValue
        ) {
          property.values[0] = changedValue?.value;

          if (propertyModel.inverseProperty) {
            let inversePropertyModel = this.getPropertyModel(
              propertyModel.inverseProperty,
              this.selectedBox
            );
            if (inversePropertyModel) {
              let dChangedValue = {
                value: changedValue?.value * -1,
              };
              this.changePropertyValue(inversePropertyModel, dChangedValue);
            }
          }
        } else if (
          propertyModel.type == DataInputTypes.RANGE &&
          propertyModel.isMultiValue
        ) {
          property.values[0] = changedValue?.value;
          property.values[1] = changedValue?.highValue;

          let inversePropertyModel = this.getPropertyModel(
            propertyModel.inverseProperty,
            this.selectedBox
          );

          if (inversePropertyModel) {
            let dChangedValue = {
              value: changedValue?.highValue,
              highValue: changedValue?.value,
            };

            this.changePropertyValue(inversePropertyModel, dChangedValue);
          }
        }
      }
    }

    this.drawProcessedImages();
    this.generateBoxDescription();
  }

  /**
   * Method to generate box description
   */
  generateBoxDescription(): void {
    const dataAugmentations =
      this.sharedService.convertClassToObject(DataAugmentations);
    let boxModel =
      dataAugmentations.augmentationItems[this.augmentationLevelPanel][
      this.selectedBox.id
      ];
    this.selectedBox.description = `${boxModel.label} to`;
    for (let valueProperty of this.selectedBox.properties) {
      let propertyModel = this.getPropertyModel(
        valueProperty.id,
        this.selectedBox
      );
      if (valueProperty && valueProperty?.values) {
        if (propertyModel.type == DataInputTypes.CHECK_BOX) {
          if (valueProperty.values[0] == true) {
            this.selectedBox.description = `${this.selectedBox.description} ${propertyModel.name ? propertyModel.name : ''
              }`;
          }
        }
        if (propertyModel.type == DataInputTypes.RANGE) {
          if (valueProperty.values[0]) {
            this.selectedBox.description = `${this.selectedBox.description} ${valueProperty.values[0]}${propertyModel.valueType?.label}`;
          }
        }
      }
    }
  }

  /**
   * Get Property model
   * @param propertyId
   * @param selectedBox
   * @returns
   */
  getPropertyModel(propertyId: string, selectedBox: any): any {
    let propertyModel = null;

    if (selectedBox) {
      propertyModel = this.dataAugmentationObj?.augmentationItems[
        this.augmentationLevelPanel
      ][selectedBox.id].properties.find((x: any) => x.id == propertyId);
    }
    return propertyModel;
  }

  /**
   * To get processed boxes need to show
   * @param selectedBox Saved box with values
   * @returns
   */
  getShownProperties(
    selectedBox: Augmentation
  ): Array<augmentationBoxProperty> {
    let returnProperties = [];
    for (let oriProp of this.dataAugmentationObj?.augmentationItems[
      this.augmentationLevelPanel
    ][selectedBox.id]?.properties) {
      if (oriProp.type == DataInputTypes.CHECK_BOX) {
        let selectBoxProperty = selectedBox?.properties?.find(
          (x) => x.id == oriProp.id
        );
        if (selectBoxProperty?.values) {
          if (selectBoxProperty?.values[0] == true) {
            returnProperties.push(oriProp);
          }
        }
      } else {
        if (!oriProp.isHideCanvas) {
          returnProperties.push(oriProp);
        }
      }
    }

    return returnProperties;
  }

  /**
   * Draw processed images according to properties
   */
  drawProcessedImages(): void {
    const dataAugmentations =
      this.sharedService.convertClassToObject(DataAugmentations);
    setTimeout(() => {
      let preProcImg = new Image();
      preProcImg.src = '../../../../assets/img/augmentation/preprocessed.png';
      preProcImg.onload = () => {
        for (let pElement of this.augImgCon?.nativeElement?.children) {
          let canvas = pElement.querySelector('canvas');
          let ctx = canvas.getContext('2d');
          let propertyId = canvas.id;
          if (
            this.augmentationLevelPanel ==
            this.augmentationLevelsConstant.IMAGE_LEVEL
          ) {
            this.processImageLevelAugmentation(
              dataAugmentations,
              ctx,
              preProcImg,
              propertyId
            );
          }
          if (
            this.augmentationLevelPanel ==
            this.augmentationLevelsConstant.BOUNDING_BOX_LEVEL
          ) {
            this.processImageLevelAugmentation(
              dataAugmentations,
              ctx,
              preProcImg,
              propertyId
            );
          }
        }
      };
    }, 300);
  }

  /**
   * Process Image level
   */
  processImageLevelAugmentation(
    dataAugmentations: any,
    ctx: any,
    preProcImg: any,
    propertyId: string
  ): void {
    switch (this.selectedBox?.id) {
      case dataAugmentations?.augmentationItems[this.augmentationLevelPanel]
        .FLIP_IMAGE?.id: {
          this.selectedBox.flipImageProcess(
            ctx,
            this.selectedBox,
            preProcImg,
            propertyId
          );
          break;
        }
      case dataAugmentations?.augmentationItems[this.augmentationLevelPanel]
        .IMAGE_ROTATION?.id: {
          this.selectedBox.imageRotationProcess(
            ctx,
            this.selectedBox,
            preProcImg,
            propertyId
          );
          break;
        }
      case dataAugmentations?.augmentationItems[this.augmentationLevelPanel]
        .IMAGE_BLUR?.id: {
          this.selectedBox.imageBlurProcess(
            ctx,
            this.selectedBox,
            preProcImg,
            propertyId
          );
          break;
        }
      case dataAugmentations?.augmentationItems[this.augmentationLevelPanel]
        .NINETY_ROTATION?.id: {
          this.selectedBox.ninetyRotateProcess(
            ctx,
            this.selectedBox,
            preProcImg,
            propertyId
          );
          break;
        }
      case dataAugmentations?.augmentationItems[this.augmentationLevelPanel]
        .SHEAR?.id: {
          this.selectedBox.shearImageProcess(
            ctx,
            this.selectedBox,
            preProcImg,
            propertyId
          );
          break;
        }
      case dataAugmentations?.augmentationItems[this.augmentationLevelPanel]
        .GRAYSCALE?.id: {
          this.selectedBox.grayscaleProcess(
            ctx,
            this.selectedBox,
            preProcImg,
            propertyId
          );
          break;
        }
      case dataAugmentations?.augmentationItems[this.augmentationLevelPanel]
        .CUTOUT?.id: {
          this.selectedBox.imageCutoutProcess(
            ctx,
            this.selectedBox,
            preProcImg,
            propertyId
          );
          break;
        }
      case dataAugmentations?.augmentationItems[this.augmentationLevelPanel].HUE
        ?.id: {
          this.selectedBox.imageHueProcess(
            ctx,
            this.selectedBox,
            preProcImg,
            propertyId
          );
          break;
        }
      case dataAugmentations?.augmentationItems[this.augmentationLevelPanel]
        .SATURATION?.id: {
          this.selectedBox.imageSaturationProcess(
            ctx,
            this.selectedBox,
            preProcImg,
            propertyId
          );
          break;
        }
      case dataAugmentations?.augmentationItems[this.augmentationLevelPanel]
        .EXPOSURE?.id: {
          this.selectedBox.imageExposureProcess(
            ctx,
            this.selectedBox,
            preProcImg,
            propertyId
          );
          break;
        }
      case dataAugmentations?.augmentationItems[this.augmentationLevelPanel]
        .NOISE?.id: {
          this.selectedBox.imageNoiseProcess(
            ctx,
            this.selectedBox,
            preProcImg,
            propertyId
          );
          break;
        }
      case dataAugmentations?.augmentationItems[this.augmentationLevelPanel]
        .CROP?.id: {
          this.selectedBox.imageCropProcess(
            ctx,
            this.selectedBox,
            preProcImg,
            propertyId
          );
          break;
        }
      case dataAugmentations?.augmentationItems[this.augmentationLevelPanel]
        .BRIGHTNESS?.id: {
          this.selectedBox.imageBrightnessProcess(
            ctx,
            this.selectedBox,
            preProcImg,
            propertyId
          );
          break;
        }

      default: {
        ctx.drawImage(preProcImg, 0, 0);
        break;
      }
    }
  }

  /**
   *
   * @param min
   * @param max
   */
  getMultiRangeOptions(min: number, max: number): Options {
    this.options.floor = min;
    this.options.ceil = max;
    if (min === 0 && max === 0) {
      this.options.step = 0.1;
    }
    return this.options;
  }

  /**
   * to scroll to the selected augmentation position
   * @param index - position of selected augmentation
   */
  scroll(index: number) {
    let scrollHeight: number;
    if (index % 2 == 1) {
      scrollHeight = ((index - 1) * 100) / 2;
    } else {
      scrollHeight = (index * 100) / 2;
    }

    const scrollContentUI: HTMLCanvasElement = this.scrollContent.nativeElement;
    setTimeout(() => {
      scrollContentUI.scroll({
        top: scrollHeight,
        left: 0,
        behavior: 'smooth',
      });
    }, 400);
  }

  /**
   * to save selected augmentations
   */
  saveAugmentations() {
    let selectedAugmentations: augmentationData = {
      IMAGE_LEVEL: [],
      BOUNDING_BOX_LEVEL: [],
    };

    for (let i = 0; i < this.augmentatioData.IMAGE_LEVEL.length; i++) {
      if (this.augmentatioData.IMAGE_LEVEL[i].isSelected)
        selectedAugmentations.IMAGE_LEVEL.push(
          this.augmentatioData.IMAGE_LEVEL[i]
        );
    }

    for (let i = 0; i < this.augmentatioData.BOUNDING_BOX_LEVEL.length; i++) {
      if (this.augmentatioData.BOUNDING_BOX_LEVEL[i].isSelected)
        selectedAugmentations.BOUNDING_BOX_LEVEL.push(
          this.augmentatioData.BOUNDING_BOX_LEVEL[i]
        );
    }
    this.close(selectedAugmentations)

  }

}

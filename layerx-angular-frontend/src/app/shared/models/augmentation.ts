/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { values } from "lodash";
import { DataIdEnums, DataPropertyTypes } from "../constants/augmentation";
import { blur } from '../tools/filters/blur.filter';
import { brightness } from "../tools/filters/brightness.filter";
import { grayscale } from "../tools/filters/grayscale.filter";
import { hueRotate } from "../tools/filters/hue-rotate.filter";
import { saturate } from "../tools/filters/saturate.filter";

export class Augmentation {
  id: string;
  description?: string;
  isSelected?: boolean;
  properties: Array<augmentationProperty>;

  constructor() {
    this.id = '';
    this.description = '';
    this.isSelected = false;
    this.properties = [];
  }

  /**
  * Method to flip image
  * @param ctx
  * @param selectedBox
  * @param preProcImg
  * @param propertyId
  */
  flipImageProcess(
    ctx: any,
    selectedBox: any,
    preProcImg: any,
    propertyId: string
  ): void {
    ctx.resetTransform();
    if (propertyId == DataPropertyTypes.FLIP_HORIZONTAL) {
      ctx.translate(100, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(preProcImg, 0, 0, 100, 100);
    }
    if (propertyId == DataPropertyTypes.FLIP_VERTICAL) {
      ctx.translate(0, 100);
      ctx.scale(1, -1);
      ctx.drawImage(preProcImg, 0, 0, 100, 100);
    }
  }


  /**
   * Method to image rotate
   * @param ctx
   * @param selectedBox
   * @param preProcImg
   * @param propertyId
   */
  imageRotationProcess(
    ctx: any,
    selectedBox: any,
    preProcImg: any,
    propertyId: string
  ): void {
    ctx.resetTransform();
    if (propertyId == DataPropertyTypes.PERCENTAGE_SCALE || `${DataPropertyTypes.PERCENTAGE_SCALE}_${DataIdEnums.DUPLICATE}`) {
      let property = selectedBox?.properties.find(
        (x: augmentationProperty) => x.id == propertyId
      );

      if (property) {
        let value = property.values[0];
        if (value || value == 0) {
          ctx.translate(50, 50);
          ctx.rotate((value * Math.PI) / 360);
          ctx.drawImage(
            preProcImg,
            -preProcImg.width / 2,
            -preProcImg.width / 2
          );
        }
      }
    }
  }


  /**
   * Method to image blur
   * @param ctx
   * @param selectedBox
   * @param preProcImg
   * @param propertyId
   */
  imageBlurProcess(
    ctx: any,
    selectedBox: any,
    preProcImg: any,
    propertyId: string
  ): void {
    ctx.resetTransform();
    if (propertyId == DataPropertyTypes.BLUR || `${DataPropertyTypes.BLUR}_${DataIdEnums.DUPLICATE}`) {
      let property = selectedBox?.properties.find(
        (x: augmentationProperty) => x.id == propertyId
      );

      if (property) {
        let value = property.values[0];
        if (value || value == 0) {
          ctx.drawImage(preProcImg, 0, 0, 100, 100);
          ctx = blur(ctx, value)
        }
      }
    }
  }

  /**
   *
   * @param ctx Method to Ninety rotate
   * @param selectedBox
   * @param preProcImg
   * @param propertyId
   */
  ninetyRotateProcess(
    ctx: any,
    selectedBox: any,
    preProcImg: any,
    propertyId: string
  ): void {
    ctx.resetTransform();
    if (propertyId == DataPropertyTypes.CLOCKWISE) {
      ctx.translate(100, 0);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(preProcImg, 0, 0, 100, 100);
    }
    if (propertyId == DataPropertyTypes.COUNTER_CLOCKWISE) {
      ctx.translate(0, 100);
      ctx.rotate((-90 * Math.PI) / 180);
      ctx.drawImage(preProcImg, 0, 0, 100, 100);
    }
    if (propertyId == DataPropertyTypes.UPSIDE_DOWN) {
      ctx.translate(100, 100);
      ctx.rotate((180 * Math.PI) / 180);
      ctx.drawImage(preProcImg, 0, 0, 100, 100);
    }
  }
  /**
   * Cutout Image
   * @param ctx 
   * @param selectedBox 
   * @param preProcImg 
   * @param propertyId 
   */
  imageCutoutProcess(
    ctx: any,
    selectedBox: any,
    preProcImg: any,
    propertyId: string
  ): void {
    ctx.resetTransform();
    if (DataPropertyTypes.CUTOUT_PERCENTAGE || DataPropertyTypes.CUTOUT_COUNT) {
      let property = selectedBox?.properties.find(
        (x: augmentationProperty) => x.id == propertyId
      );
      let size, count;
      if (propertyId == DataPropertyTypes.CUTOUT_PERCENTAGE) {
        size = selectedBox?.properties.find(
          (x: augmentationProperty) => x.id == DataPropertyTypes.CUTOUT_PERCENTAGE).values
        count = selectedBox?.properties.find(
          (x: augmentationProperty) => x.id == DataPropertyTypes.CUTOUT_COUNT).values
      }
      ctx.drawImage(
        preProcImg, 0, 0, 100, 100
      );
      if (size && count) {
        for (let i = 0; i < count; i++) {
          let x = Math.floor(Math.random() * 100)
          let y = Math.floor(Math.random() * 100)

          ctx.fillRect(x, y, size, size)
        }
      }
    }
  }
  /**
   * Shear Image
   * @param ctx 
   * @param selectedBox 
   * @param preProcImg 
   * @param propertyId 
   */
  shearImageProcess(
    ctx: any,
    selectedBox: any,
    preProcImg: any,
    propertyId: string
  ): void {
    let blackImg = new Image();
    blackImg.src = '../../../../assets/img/augmentation/black.png';
    ctx.resetTransform();
    ctx.globalCompositeOperation = 'copy';
    if (propertyId == DataPropertyTypes.SHEAR_HORIZONTAL || `${DataPropertyTypes.SHEAR_HORIZONTAL}_${DataIdEnums.DUPLICATE}`) {
      let propertyHorizontal = selectedBox?.properties.find(
        (x: augmentationProperty) => x.id == propertyId
      );
      let propertyVertical = null;
      if (propertyId == DataPropertyTypes.SHEAR_HORIZONTAL) {
        propertyVertical = selectedBox?.properties.find(
          (x: augmentationProperty) => x.id == DataPropertyTypes.SHEAR_VERTICAL
        );
      }
      if (propertyId == `${DataPropertyTypes.SHEAR_HORIZONTAL}_${DataIdEnums.DUPLICATE}`) {
        propertyVertical = selectedBox?.properties.find(
          (x: augmentationProperty) => x.id == DataPropertyTypes.SHEAR_VERTICAL
        );
      }

      if (propertyHorizontal && propertyVertical) {
        let valueHorizontal = propertyHorizontal.values[0];
        let valueVertical = propertyVertical.values[0];
        if ((valueHorizontal || valueHorizontal == 0) && (valueVertical || valueVertical == 0)) {
          //ctx.restore();
          ctx.drawImage(blackImg, 0, 0, 100, 100);
          let sx = valueHorizontal / 100;
          // .75 horizontal shearß
          let sy = valueVertical / 100;
          // no vertical shear

          // translate context to center of canvas
          ctx.translate(0, 0);

          // apply custom transform
          ctx.transform(1, sy, sx, 1, 0, 0);

          ctx.fillStyle = 'blue';
          ctx.drawImage(preProcImg, 0, 10, 100, 100);
          //ctx.save();
        }
      }
    }
    if (propertyId == DataPropertyTypes.SHEAR_VERTICAL || `${DataPropertyTypes.SHEAR_VERTICAL}_${DataIdEnums.DUPLICATE}`) {
      let propertyVertical = selectedBox?.properties.find(
        (x: augmentationProperty) => x.id == propertyId
      );
      let propertyHorizontal = null;
      if (propertyId == DataPropertyTypes.SHEAR_VERTICAL) {
        propertyHorizontal = selectedBox?.properties.find(
          (x: augmentationProperty) => x.id == DataPropertyTypes.SHEAR_HORIZONTAL
        );
      }
      if (propertyId == `${DataPropertyTypes.SHEAR_VERTICAL}_${DataIdEnums.DUPLICATE}`) {
        propertyHorizontal = selectedBox?.properties.find(
          (x: augmentationProperty) => x.id == DataPropertyTypes.SHEAR_HORIZONTAL
        );
      }
      if (propertyHorizontal && propertyVertical) {
        let valueHorizontal = propertyHorizontal.values[0];
        let valueVertical = propertyVertical.values[0];
        if ((valueHorizontal || valueHorizontal == 0) && (valueVertical || valueVertical == 0)) {
          ctx.drawImage(blackImg, 0, 0, 100, 100);
          let sx = valueHorizontal / 100;
          // .75 horizontal shearß
          let sy = valueVertical / 100;
          // no vertical shear

          // translate context to center of canvas
          ctx.translate(0, 0);

          // apply custom transform
          ctx.transform(1, sy, sx, 1, 0, 0);
          ctx.drawImage(preProcImg, 0, -10, 100, 100);
          //ctx.save();
        }
      }
    }
  }



  /**
   * Method to gray scale
   * @param ctx
   * @param selectedBox
   * @param preProcImg
   * @param propertyId
   */
  grayscaleProcess(
    ctx: any,
    selectedBox: any,
    preProcImg: any,
    propertyId: string
  ): void {
    ctx.resetTransform();
    if (propertyId == DataPropertyTypes.GRAYSCALE_PERCENTAGE || `${DataPropertyTypes.GRAYSCALE_PERCENTAGE}_${DataIdEnums.DUPLICATE}`) {
      let property = selectedBox?.properties.find(
        (x: augmentationProperty) => x.id == propertyId
      );

      if (property) {
        let value = property.values[0];
        if (value || value == 0) {
          ctx.drawImage(preProcImg, 0, 0, 100, 100);
          ctx = grayscale(ctx, value/100);
        }
      }
    }
  }

  


  /**
   * Method to change hue scale
   * @param ctx 
   * @param selectedBox 
   * @param preProcImg 
   * @param propertyId 
   */
  imageHueProcess(
    ctx: any,
    selectedBox: any,
    preProcImg: any,
    propertyId: string
  ): void {
    ctx.resetTransform();
    if (propertyId == DataPropertyTypes.HUE_DEGREES || `${DataPropertyTypes.HUE_DEGREES}_${DataIdEnums.DUPLICATE}`) {
      let property = selectedBox?.properties.find(
        (x: augmentationProperty) => x.id == propertyId
      );
      if (property) {
        let value = property.values[0];
        if (value || value == 0) {
          ctx.drawImage(preProcImg, 0, 0, 100, 100);
          ctx = hueRotate(ctx, `${value}deg`);
        }
      }
    }
  }



  /**
   * Method to change Exposure scale
   * @param ctx 
   * @param selectedBox 
   * @param preProcImg 
   * @param propertyId 
   */
  imageExposureProcess(
    ctx: any,
    selectedBox: any,
    preProcImg: any,
    propertyId: string
  ): void {
    ctx.resetTransform();
    if (propertyId == DataPropertyTypes.EXPOSURE_DEGREES || `${DataPropertyTypes.EXPOSURE_DEGREES}_${DataIdEnums.DUPLICATE}`) {
      let property = selectedBox?.properties.find(
        (x: augmentationProperty) => x.id == propertyId
      );
      if (property) {
        let value = property.values[0];
        let val = Math.round(value / 100 * 255)
        ctx.drawImage(preProcImg, 0, 0, 100, 100);
        for (let i = 0; i < preProcImg.width; i++) {
          for (let j = 0; j < preProcImg.height; j++) {
            let pixel = ctx.getImageData(i, j, 1, 1).data;
            let r = Math.max(0, Math.min(pixel[0] + val, 255))
            let g = Math.max(0, Math.min(pixel[1] + val, 255))
            let b = Math.max(0, Math.min(pixel[2] + val, 255))

            ctx.fillStyle = this.rgbToHex(r, g, b)
            ctx.fillRect(i, j, 1, 1)

          }
        }
      }
    }
  }


  /**
   * Method to change hue scale
   * @param ctx 
   * @param selectedBox 
   * @param preProcImg 
   * @param propertyId 
   */
  imageSaturationProcess(
    ctx: any,
    selectedBox: any,
    preProcImg: any,
    propertyId: string
  ): void {
    ctx.resetTransform();
    if (propertyId == DataPropertyTypes.SATURATION_DEGREES || `${DataPropertyTypes.SATURATION_DEGREES}_${DataIdEnums.DUPLICATE}`) {
      let property = selectedBox?.properties.find(
        (x: augmentationProperty) => x.id == propertyId
      );
      if (property) {
        let value = property.values[0];
        if (value || value == 0) {
          ctx.drawImage(preProcImg, 0, 0, 100, 100);
          ctx = saturate(ctx, `${100 + value}%`);
        }
      }
    }
  }

  /**
   * Method to image crop
   * @param ctx
   * @param selectedBox
   * @param preProcImg
   * @param propertyId
   */
  imageCropProcess(
    ctx: any,
    selectedBox: any,
    preProcImg: any,
    propertyId: string
  ): void {
    ctx.resetTransform();
    if (propertyId == DataPropertyTypes.CROP_PERCENTAGE || `${DataPropertyTypes.CROP_PERCENTAGE}_${DataIdEnums.DUPLICATE}`) {
      let property = selectedBox?.properties.find(
        (x: augmentationProperty) => x.id == propertyId
      );

      if (property) {
        let value = property.values[0];
        if (value || value == 0) {
          let scale = 1;

          scale = scale + value / 25;
          ctx.translate(50, 50);
          ctx.scale(scale, scale)
          ctx.drawImage(
            preProcImg,
            -preProcImg.width / 2,
            -preProcImg.width / 2
          );
        }
      }
    }
  }

  /**
   * Method to change image Noise
   * @param ctx 
   * @param selectedBox 
   * @param preProcImg 
   * @param propertyId 
   */
  imageNoiseProcess(
    ctx: any,
    selectedBox: any,
    preProcImg: any,
    propertyId: string
  ): void {
    ctx.resetTransform();
    if (propertyId == DataPropertyTypes.NOISE_PERCENTAGE || `${DataPropertyTypes.NOISE_PERCENTAGE}_${DataIdEnums.DUPLICATE}`) {
      let property = selectedBox?.properties.find(
        (x: augmentationProperty) => x.id == propertyId
      );

      if (property) {
        let value = property.values[0];
        if (value || value == 0) {
          let noise = 0;
          let rand;
          noise = noise + value;

          ctx.drawImage(
            preProcImg, 0, 0, 100, 100
          );
          for (let i = 0; i < preProcImg.width; i++) {
            for (let j = 0; j < preProcImg.height; j++) {
              rand = Math.floor(Math.random() * 250)
              if (rand < noise) {
                ctx.fillStyle = 'white'
                ctx.fillRect(i, j, 1, 1)
              }
            }
          }
        }
      }
    }
  }

  /**
 * Method to change image Brightness
 * @param ctx 
 * @param selectedBox 
 * @param preProcImg 
 * @param propertyId 
 */
  imageBrightnessProcess(
    ctx: any,
    selectedBox: any,
    preProcImg: any,
    propertyId: string
  ): void {
    ctx.resetTransform();
    if (propertyId == DataPropertyTypes.BRIGHTNESS_DEGREES || `${DataPropertyTypes.BRIGHTNESS_DEGREES}_${DataIdEnums.DUPLICATE}` || propertyId == DataPropertyTypes.BRIGHTNESS_BRIGHTEN || propertyId == DataPropertyTypes.BRIGHTNESS_DARKEN) {
      let property = selectedBox?.properties.find(
        (x: augmentationProperty) => x.id == propertyId
      );

      if (property) {
        let value = property.values[0];
        if (value || value == 0) {
          value = 100 + value;
          ctx.drawImage(preProcImg, 0, 0, 100, 100);
          ctx = brightness(ctx, `${value}%`);
        }
      }
    }
  }
  componentToHex(c: number) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
  }

  rgbToHex(r: number, g: number, b: number) {
    return "#" + this.componentToHex(r) + this.componentToHex(g) + this.componentToHex(b);
  }

}


export interface augmentationDTO {
  id: string;
  description?: string;
  isSelected?: boolean;
  properties?: Array<augmentationProperty>;
}


export interface augmentationProperty {
  id: string;
  values: Array<any>;
}

export interface augmentationData {
  IMAGE_LEVEL: Array<Augmentation>;
  BOUNDING_BOX_LEVEL: Array<Augmentation>;
}

export interface augmentationBox {
  label: string;
  description: string;
  viewPreprocessedImage: boolean;
  viewOutputImage: boolean;
  properties: Array<augmentationBoxProperty>;
}

export interface augmentationBoxProperty {
  id: string;
  name: string;
  type: string;
  min?: number,
  max?: number,
  inverseProperty?: string,
  valueType?: string,
  isHide?: boolean,
  defaultValue: any,
  defaultMaxValue?: any, // only use for multiselect max value
  labelType: string,
  isHideCanvas?: boolean
}

export class augmentationLevels {
  public static imageLevel = 1;
  public static boxLevel = 2;
}

export class DataValueTypes {
    public static degrees = {
        label: '°',
    };
    public static pixels = {
        label: 'px',
    };
    public static percentage = {
        label: '%',
    };
    public static count = {
        label: '',
    };
}

export class DataInputTypes {
    public static CHECK_BOX = 'CHECK_BOX';
    public static RANGE = 'RANGE';
}

export class canvasPropertyLabelTypes {
    public static NAME = 'NAME';
    public static VALUE = 'VALUE';
    public static MULTI_VALUE = 'MULTI_VALUE';
    public static NONE = 'NONE';

}

export class DataIdEnums {
    public static DUPLICATE = 'DUPLICATE';
}

export class AugmentationLevels {
    public static IMAGE_LEVEL = 'IMAGE_LEVEL';
    public static BOUNDING_BOX_LEVEL = 'BOUNDING_BOX_LEVEL';
}

export class AugmentationIds {
    public static IMAGE_LEVEL = [
        'FLIP_IMAGE',
        'IMAGE_ROTATION',
        'IMAGE_BLUR',
        'NINETY_ROTATION',
        'SHEAR',
        'GRAYSCALE',
        'CUTOUT',
        'MOSAIC',
        'HUE',
        'SATURATION',
        'EXPOSURE',
        'BRIGHTNESS',
        'NOISE',
        'CROP',
    ];
    public static BOUNDING_BOX_LEVEL = [
        'FLIP_BOUNDING_BOX',
        'SHEAR_BOUNDING_BOX',
        'BRIGHTNESS_BOUNDING_BOX',
        'BOUNDING_BOX_ROTATION',
        'BOUNDING_BOX_BLUR',
        'NINETY_ROTATION_BOUNDING_BOX',
        'CROP_BOUNDING_BOX',
        'NOISE_BOUNDING_BOX',
        'EXPOSURE_BOUNDING_BOX',
    ];
}

export class AugmentationIdName {
    public static FLIP_IMAGE = 'FLIP_IMAGE';
    public static IMAGE_ROTATION = 'IMAGE_ROTATION';
    public static IMAGE_BLUR = 'IMAGE_BLUR';
    public static NINETY_ROTATION = 'NINETY_ROTATION';
    public static SHEAR = 'SHEAR';
    public static GRAYSCALE = 'GRAYSCALE';
    public static CUTOUT = 'CUTOUT';
    public static MOSAIC = 'MOSAIC';
    public static HUE = 'HUE';
    public static SATURATION = 'SATURATION';
    public static EXPOSURE = 'EXPOSURE';
    public static BRIGHTNESS = 'BRIGHTNESS';
    public static NOISE = 'NOISE';
    public static CROP = 'CROP';
    public static FLIP_BOUNDING_BOX = 'FLIP_BOUNDING_BOX';
    public static SHEAR_BOUNDING_BOX = 'SHEAR_BOUNDING_BOX';
    public static BRIGHTNESS_BOUNDING_BOX = 'BRIGHTNESS_BOUNDING_BOX';
    public static BOUNDING_BOX_ROTATION = 'BOUNDING_BOX_ROTATION';
    public static BOUNDING_BOX_BLUR = 'BOUNDING_BOX_BLUR';
    public static NINETY_ROTATION_BOUNDING_BOX = 'NINETY_ROTATION_BOUNDING_BOX';
    public static CROP_BOUNDING_BOX = 'CROP_BOUNDING_BOX';
    public static NOISE_BOUNDING_BOX = 'NOISE_BOUNDING_BOX';
    public static EXPOSURE_BOUNDING_BOX = 'EXPOSURE_BOUNDING_BOX';
}

export class DataPropertyTypes {
    public static FLIP_HORIZONTAL = 'FLIP_HORIZONTAL';
    public static FLIP_VERTICAL = 'FLIP_VERTICAL';
    public static PERCENTAGE_SCALE = 'PERCENTAGE_SCALE';
    public static BLUR = 'BLUR';
    public static CLOCKWISE = 'CLOCKWISE';
    public static COUNTER_CLOCKWISE = 'COUNTER_CLOCKWISE';
    public static UPSIDE_DOWN = 'UPSIDE_DOWN';
    public static SHEAR_HORIZONTAL = 'SHEAR_HORIZONTAL';
    public static SHEAR_VERTICAL = 'SHEAR_VERTICAL';
    public static GRAYSCALE_PERCENTAGE = 'GRAYSCALE_PERCENTAGE';
    public static CUTOUT_PERCENTAGE = 'CUTOUT_PERCENTAGE';
    public static CUTOUT_COUNT = 'CUTOUT_COUNT';
    public static HUE_DEGREES = 'HUE_DEGREES';
    public static SATURATION_DEGREES = 'SATURATION_DEGREES';
    public static CROP_PERCENTAGE = "CROP_PERCENTAGE";
    public static NOISE_PERCENTAGE = "NOISE_PERCENTAGE";
    public static BRIGHTNESS_DEGREES = "BRIGHTNESS_DEGREES";
    public static BRIGHTNESS_BRIGHTEN = "BRIGHTNESS_BRIGHTEN";
    public static BRIGHTNESS_DARKEN = "BRIGHTNESS_DARKEN";
    public static EXPOSURE_DEGREES = "EXPOSURE_DEGREES";
}

export class DataAugmentations {
    public static augmentationItems = {
        IMAGE_LEVEL: {
            FLIP_IMAGE: {
                id: 'FLIP_IMAGE',
                label: 'Flip Image',
                description:
                    'Add horizontal or vertical flips to help your model be insensitive to subject orientation.',
                viewPreprocessedImage: true,
                viewOutputImage: true,
                properties: [
                    {
                        id: DataPropertyTypes.FLIP_HORIZONTAL,
                        name: 'Flip Horizontal',
                        type: DataInputTypes.CHECK_BOX,
                        defaultValue: false,
                        labelType: canvasPropertyLabelTypes.NAME
                    },
                    {
                        id: DataPropertyTypes.FLIP_VERTICAL,
                        name: 'Flip Vertical',
                        type: DataInputTypes.CHECK_BOX,
                        defaultValue: false,
                        labelType: canvasPropertyLabelTypes.NAME
                    },
                ],
            },
            IMAGE_ROTATION: {
                id: 'IMAGE_ROTATION',
                label: 'Image Rotation',
                description:
                    'Add variability to rotations to help your model be more resilient to camera roll.',
                viewPreprocessedImage: true,
                viewOutputImage: true,
                properties: [
                    {
                        id: DataPropertyTypes.PERCENTAGE_SCALE,
                        name: 'Percentage scale',
                        type: DataInputTypes.RANGE,
                        isMultiValue: true,
                        min: -360,
                        max: 360,
                        defaultValue:-10,
                        defaultMaxValue:10,
                        inverseProperty: `${DataPropertyTypes.PERCENTAGE_SCALE}_${DataIdEnums.DUPLICATE}`,
                        valueType: DataValueTypes.degrees,
                        labelType: canvasPropertyLabelTypes.VALUE
                    },
                    {
                        id: `${DataPropertyTypes.PERCENTAGE_SCALE}_${DataIdEnums.DUPLICATE}`,
                        name: 'Percentage scale',
                        type: DataInputTypes.RANGE,
                        min: 0,
                        max: 45,
                        defaultValue:10,
                        isHide: true,
                        valueType: DataValueTypes.degrees,
                        labelType: canvasPropertyLabelTypes.VALUE
                    },
                ],
            },
            IMAGE_BLUR: {
                id: 'IMAGE_BLUR',
                label: 'Image Blur',
                description:
                    'Add random Gaussian blur to help your model be more resilient to camera focus.',
                viewPreprocessedImage: true,
                viewOutputImage: true,
                properties: [
                    {
                        id: DataPropertyTypes.BLUR,
                        name: '',
                        type: DataInputTypes.RANGE,
                        isMultiValue: true,
                        min: 0,
                        max: 15,
                        defaultValue: 1,
                        defaultMaxValue:10,
                        inverseProperty: `${DataPropertyTypes.BLUR}_${DataIdEnums.DUPLICATE}`,
                        valueType: DataValueTypes.pixels,
                        labelType: canvasPropertyLabelTypes.VALUE
                    },
                    {
                        id: `${DataPropertyTypes.BLUR}_${DataIdEnums.DUPLICATE}`,
                        name: '',
                        type: DataInputTypes.RANGE,
                        min: 0,
                        max: 15,
                        defaultValue:10,
                        isHide: true,
                        valueType: DataValueTypes.pixels,
                        labelType: canvasPropertyLabelTypes.VALUE
                    },
                ],
            },
            NINETY_ROTATION: {
                id: 'NINETY_ROTATION',
                label: '90° Rotate',
                description:
                    'Add 90-degree rotations to help your model be insensitive to camera orientation.',
                viewPreprocessedImage: true,
                viewOutputImage: true,
                properties: [
                    {
                        id: DataPropertyTypes.CLOCKWISE,
                        name: 'Clockwise',
                        type: DataInputTypes.CHECK_BOX,
                        defaultValue:false,
                        labelType: canvasPropertyLabelTypes.NAME
                    },
                    {
                        id: DataPropertyTypes.COUNTER_CLOCKWISE,
                        name: 'Counter-Clockwise',
                        type: DataInputTypes.CHECK_BOX,
                        defaultValue:false,
                        labelType: canvasPropertyLabelTypes.NAME
                    },
                    {
                        id: DataPropertyTypes.UPSIDE_DOWN,
                        name: 'Upside Down',
                        type: DataInputTypes.CHECK_BOX,
                        defaultValue:false,
                        labelType: canvasPropertyLabelTypes.NAME
                    },
                ],
            },
            SHEAR: {
                id: 'SHEAR',
                label: 'Shear Images',
                description:
                    'Add variability to perspective to help your model be more resilient to camera and subject pitch and yaw.',
                viewPreprocessedImage: true,
                viewOutputImage: true,
                properties: [
                    {
                        id: DataPropertyTypes.SHEAR_HORIZONTAL,
                        name: 'Horizontal',
                        type: DataInputTypes.RANGE,
                        isMultiValue: true,
                        min: -40,
                        max: 40,
                        defaultValue:-10,
                        defaultMaxValue:10,
                        inverseProperty: `${DataPropertyTypes.SHEAR_HORIZONTAL}_${DataIdEnums.DUPLICATE}`,
                        valueType: DataValueTypes.degrees,
                        labelType: canvasPropertyLabelTypes.MULTI_VALUE
                    },
                    {
                        id: `${DataPropertyTypes.SHEAR_HORIZONTAL}_${DataIdEnums.DUPLICATE}`,
                        name: '',
                        type: DataInputTypes.RANGE,
                        min: -40,
                        max: 40,
                        defaultValue:10,
                        isHide: true,
                        valueType: DataValueTypes.degrees,
                        labelType: canvasPropertyLabelTypes.MULTI_VALUE
                    },
                    {
                        id: DataPropertyTypes.SHEAR_VERTICAL,
                        name: 'Vertical',
                        type: DataInputTypes.RANGE,
                        isMultiValue: true,
                        min: -40,
                        max: 40,
                        defaultValue:-10,
                        defaultMaxValue:10,
                        inverseProperty: `${DataPropertyTypes.SHEAR_VERTICAL}_${DataIdEnums.DUPLICATE}`,
                        valueType: DataValueTypes.degrees,
                        labelType: canvasPropertyLabelTypes.MULTI_VALUE
                    },
                    {
                        id: `${DataPropertyTypes.SHEAR_VERTICAL}_${DataIdEnums.DUPLICATE}`,
                        name: '',
                        type: DataInputTypes.RANGE,
                        min: -40,
                        max: 40,
                        defaultValue:10,
                        isHide: true,
                        valueType: DataValueTypes.degrees,
                        labelType: canvasPropertyLabelTypes.MULTI_VALUE
                    }
                ],
            },
            HUE: {
                id: 'HUE',
                label: 'Hue',
                description: 'Randomly adjust the colors in the image.',
                viewPreprocessedImage: true,
                viewOutputImage: true,
                properties: [
                    {
                        id: DataPropertyTypes.HUE_DEGREES,
                        name: '',
                        type: DataInputTypes.RANGE,
                        isMultiValue: true,
                        min: -50,
                        max: 50,
                        defaultValue:-10,
                        defaultMaxValue:10,
                        inverseProperty: `${DataPropertyTypes.HUE_DEGREES}_${DataIdEnums.DUPLICATE}`,
                        valueType: DataValueTypes.degrees,
                        labelType: canvasPropertyLabelTypes.VALUE
                    },
                    {
                        id: `${DataPropertyTypes.HUE_DEGREES}_${DataIdEnums.DUPLICATE}`,
                        name: '',
                        type: DataInputTypes.RANGE,
                        min: -50,
                        max: 50,
                        defaultValue:10,
                        isHide: true,
                        valueType: DataValueTypes.degrees,
                        labelType: canvasPropertyLabelTypes.VALUE
                    },
                ],
            },
            SATURATION: {
                id: 'SATURATION',
                label: 'Saturation',
                description:
                    'Randomly adjust the vibrancy of the colors in the images.',
                viewPreprocessedImage: true,
                viewOutputImage: true,
                properties: [
                    {
                        id: DataPropertyTypes.SATURATION_DEGREES,
                        name: '',
                        type: DataInputTypes.RANGE,
                        isMultiValue: true,
                        min: -50,
                        max: 50,
                        defaultValue:-10,
                        defaultMaxValue:10,
                        inverseProperty: `${DataPropertyTypes.SATURATION_DEGREES}_${DataIdEnums.DUPLICATE}`,
                        valueType: DataValueTypes.percentage,
                        labelType: canvasPropertyLabelTypes.VALUE
                    },
                    {
                        id: `${DataPropertyTypes.SATURATION_DEGREES}_${DataIdEnums.DUPLICATE}`,
                        name: '',
                        type: DataInputTypes.RANGE,
                        min: -50,
                        max: 50,
                        defaultValue: 10,
                        isHide: true,
                        valueType: DataValueTypes.percentage,
                        labelType: canvasPropertyLabelTypes.VALUE
                    },
                ],
            },
            BRIGHTNESS: {
                id: 'BRIGHTNESS',
                label: 'Brightness',
                description:
                    'Add variability to image brightness to help your model be more resilient to lighting and camera setting changes.',
                viewPreprocessedImage: true,
                viewOutputImage: true,
                properties: [
                    {
                        id: DataPropertyTypes.BRIGHTNESS_DEGREES,
                        name: '',
                        type: DataInputTypes.RANGE,
                        isMultiValue: true,
                        min: -50,
                        max: 50,
                        defaultValue:-10,
                        defaultMaxValue:10,
                        inverseProperty: `${DataPropertyTypes.BRIGHTNESS_DEGREES}_${DataIdEnums.DUPLICATE}`,
                        valueType: DataValueTypes.percentage,
                        labelType: canvasPropertyLabelTypes.VALUE
                    },
                    {
                        id: `${DataPropertyTypes.BRIGHTNESS_DEGREES}_${DataIdEnums.DUPLICATE}`,
                        name: '',
                        type: DataInputTypes.RANGE,
                        min: -50,
                        max: 50,
                        defaultValue:10,
                        isHide: true,
                        valueType: DataValueTypes.percentage,
                        labelType: canvasPropertyLabelTypes.VALUE
                    },
                ],
            },
            NOISE: {
                id: 'NOISE',
                label: 'Noise',
                description:
                    'Add noise to help your model be more resilient to camera artifacts.',
                viewPreprocessedImage: true,
                viewOutputImage: true,
                properties: [
                    {
                        id: DataPropertyTypes.NOISE_PERCENTAGE,
                        name: '',
                        type: DataInputTypes.RANGE,
                        isMultiValue: true,
                        min: 0,
                        max: 250,
                        defaultValue:-10,
                        defaultMaxValue:10,
                        inverseProperty: `${DataPropertyTypes.NOISE_PERCENTAGE}_${DataIdEnums.DUPLICATE}`,
                        valueType: DataValueTypes.percentage,
                        labelType: canvasPropertyLabelTypes.VALUE
                    },
                    {
                        id: `${DataPropertyTypes.NOISE_PERCENTAGE}_${DataIdEnums.DUPLICATE}`,
                        name: '',
                        type: DataInputTypes.RANGE,
                        min: 0,
                        max: 250,
                        defaultValue:10,
                        isHide: true,
                        valueType: DataValueTypes.percentage,
                        labelType: canvasPropertyLabelTypes.VALUE
                    },
                ],
            },
            CROP: {
                id: 'CROP',
                label: 'Crop',
                description:
                    'Add variability to positioning and size to help  your model be more resilient to subject translations and camera position.',
                viewPreprocessedImage: true,
                viewOutputImage: true,
                properties: [
                    {
                        id: DataPropertyTypes.CROP_PERCENTAGE,
                        name: '',
                        type: DataInputTypes.RANGE,
                        isMultiValue: true,
                        min: 0,
                        max: 100,
                        defaultValue:-10,
                        defaultMaxValue:10,
                        inverseProperty: `${DataPropertyTypes.CROP_PERCENTAGE}_${DataIdEnums.DUPLICATE}`,
                        valueType: DataValueTypes.percentage,
                        labelType: canvasPropertyLabelTypes.VALUE
                    },
                    {
                        id: `${DataPropertyTypes.CROP_PERCENTAGE}_${DataIdEnums.DUPLICATE}`,
                        name: '',
                        type: DataInputTypes.RANGE,
                        min: 0,
                        max: 100,
                        defaultValue:10,
                        isMultiValue: true,
                        isHide: true,
                        valueType: DataValueTypes.percentage,
                        labelType: canvasPropertyLabelTypes.VALUE
                    },
                ],
            },
        },
        BOUNDING_BOX_LEVEL: {
            FLIP_BOUNDING_BOX: {
                id: 'FLIP_BOUNDING_BOX',
                label: 'Flip Bounding Box',
                description:
                    'Add horizontal or vertical flips to help your model be insensitive to subject orientation.',
                viewPreprocessedImage: true,
                viewOutputImage: true,
                properties: [
                    {
                        id: 'FLIP_HORIZONTAL',
                        name: 'Flip Horizontal',
                        type: DataInputTypes.CHECK_BOX,
                        defaultValue:false,
                        labelType: canvasPropertyLabelTypes.NAME
                    },
                    {
                        id: 'FLIP_VERTICAL',
                        name: 'Flip Vertical',
                        type: DataInputTypes.CHECK_BOX,
                        defaultValue:false,
                        isHideCanvas: true,
                        labelType: canvasPropertyLabelTypes.NAME
                    },
                ],
            },
            SHEAR_BOUNDING_BOX: {
                id: 'SHEAR_BOUNDING_BOX',
                label: 'Shear Bounding Box',
                description:
                    'Add variability to perspective to help your model be more resilient to camera and subject pitch and yaw.',
                viewPreprocessedImage: true,
                viewOutputImage: true,
                properties: [
                    {
                        id: 'SHEAR HORIZONTAL',
                        name: 'Horizontal',
                        type: DataInputTypes.RANGE,
                        min: 0,
                        max: 45,
                        defaultValue:10,
                        valueType: DataValueTypes.degrees,
                        labelType: canvasPropertyLabelTypes.VALUE
                    },
                    {
                        id: 'SHEAR VERTICAL',
                        name: 'Vertical',
                        type: DataInputTypes.RANGE,
                        min: 0,
                        max: 45,
                        defaultValue:10,
                        valueType: DataValueTypes.degrees,
                        labelType: canvasPropertyLabelTypes.VALUE
                    },
                ],
            },
            BRIGHTNESS_BOUNDING_BOX: {
                id: 'BRIGHTNESS_BOUNDING_BOX',
                label: 'Brightness Bounding Box',
                description:
                    'Add variability to image brightness to help your model be more resilient to lighting and camera setting changes.',
                viewPreprocessedImage: true,
                viewOutputImage: true,
                properties: [
                    {
                        id: 'BRIGHTNESS_DEGREES',
                        name: '',
                        type: DataInputTypes.RANGE,
                        min: 0,
                        max: 99,
                        defaultValue:10,
                        valueType: DataValueTypes.degrees,
                        labelType: canvasPropertyLabelTypes.VALUE
                    },
                    {
                        id: 'BRIGHTNESS_BRIGHTEN',
                        name: 'Brighten',
                        type: DataInputTypes.CHECK_BOX,
                        labelType: canvasPropertyLabelTypes.VALUE
                    },
                    {
                        id: 'BRIGHTNESS_DARKEN',
                        name: 'Darken',
                        type: DataInputTypes.CHECK_BOX,
                        labelType: canvasPropertyLabelTypes.VALUE
                    },
                ],
            },
            BOUNDING_BOX_ROTATION: {
                id: 'BOUNDING_BOX_ROTATION',
                label: 'Bounding Box Rotation',
                description:
                    'Add variability to rotations to help your model be more resilient to camera roll.',
                viewPreprocessedImage: true,
                viewOutputImage: true,
                properties: [
                    {
                        id: 'PERCENTAGE_SCALE',
                        name: 'Percentage scale',
                        type: DataInputTypes.RANGE,
                        min: 0,
                        max: 45,
                        defaultValue:10,
                        valueType: DataValueTypes.degrees,
                        labelType: canvasPropertyLabelTypes.VALUE
                    },
                ],
            },
            BOUNDING_BOX_BLUR: {
                id: 'BOUNDING_BOX_BLUR',
                label: 'Bounding Box Blur',
                description:
                    'Add random Gaussian blur to help your model be more resilient to camera focus.',
                viewPreprocessedImage: true,
                viewOutputImage: true,
                properties: [
                    {
                        id: 'BLUR',
                        name: '',
                        type: DataInputTypes.RANGE,
                        min: 0,
                        max: 25,
                        defaultValue:10,
                        valueType: DataValueTypes.pixels,
                        labelType: canvasPropertyLabelTypes.VALUE
                    },
                ],
            },
            NINETY_ROTATION_BOUNDING_BOX: {
                id: 'NINETY_ROTATION_BOUNDING_BOX',
                label: '90° Rotate',
                description:
                    'Add 90-degree rotations to help your model be insensitive to camera orientation.',
                viewPreprocessedImage: false,
                viewOutputImage: false,
                properties: [
                    {
                        id: 'CLOCKWISE',
                        name: 'Clockwise',
                        type: DataInputTypes.CHECK_BOX,
                        defaultValue:false,
                        labelType: canvasPropertyLabelTypes.NAME
                    },
                    {
                        id: 'COUNTER_CLOCKWISE',
                        name: 'Counter-Clockwise',
                        type: DataInputTypes.CHECK_BOX,
                        defaultValue:false,
                        labelType: canvasPropertyLabelTypes.NAME
                    },
                    {
                        id: 'UPSIDE_DOWN',
                        name: 'Upside Down',
                        type: DataInputTypes.CHECK_BOX,
                        defaultValue:false,
                        labelType: canvasPropertyLabelTypes.NAME
                    },
                ],
            },
            CROP_BOUNDING_BOX: {
                id: 'CROP_BOUNDING_BOX',
                label: 'Crop',
                description:
                    'Add variability to positioning and size to help  your model be more resilient to subject translations and camera position.',
                viewPreprocessedImage: true,
                viewOutputImage: true,
                properties: [
                    {
                        id: 'CROP_PERCENTAGE',
                        name: '',
                        type: DataInputTypes.RANGE,
                        isMultiValue: true,
                        min: 0,
                        max: 99,
                        defaultValue:10,
                        valueType: DataValueTypes.percentage,
                        labelType: canvasPropertyLabelTypes.VALUE
                    },
                ],
            },
            NOISE_BOUNDING_BOX: {
                id: 'NOISE_BOUNDING_BOX',
                label: 'Noise',
                description:
                    'Add noise to help your model be more resilient to camera artifacts.',
                viewPreprocessedImage: true,
                viewOutputImage: true,
                properties: [
                    {
                        id: 'NOISE_PERCENTAGE',
                        name: '',
                        type: DataInputTypes.RANGE,
                        isMultiValue: true,
                        min: 0,
                        max: 25,
                        defaultValue:10,
                        valueType: DataValueTypes.percentage,
                        labelType: canvasPropertyLabelTypes.VALUE
                    },
                ],
            },
            EXPOSURE_BOUNDING_BOX: {
                id: 'EXPOSURE_BOUNDING_BOX',
                label: 'Exposure',
                description:
                    'Add variability to image brightness to help your model be more resilient to lighting and camera setting changes.',
                viewPreprocessedImage: true,
                viewOutputImage: true,
                properties: [
                    {
                        id: 'EXPOSURE_DEGREES',
                        name: '',
                        type: DataInputTypes.RANGE,
                        min: 0,
                        max: 99,
                        defaultValue:10,
                        valueType: DataValueTypes.degrees,
                        labelType: canvasPropertyLabelTypes.VALUE
                    },
                ],
            },
        },
    };
}

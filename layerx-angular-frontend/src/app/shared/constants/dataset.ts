/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

export class SplitTypes {
    public static RANDOM = 'RANDOM';
    public static MANUAL = 'MANUAL';
}

export class DataSetTypes {
    public static TRAINING = 'trainingSet';
    public static VALIDATION = 'validationSet';
    public static TESTING = 'testingSet';
}

export class DataSetProgressTypes {
    public static labelProcessing = 1;
    public static augmentationProcessing = 2;
    public static creationProcessing = 0;
    public static updateProcessing = 4;
}

export class ErrorMessages {
    public static inProgress = 'Dataset create/update in progress';
}
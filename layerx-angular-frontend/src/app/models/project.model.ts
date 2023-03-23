/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

export class Project {
    createdProjectId:string;
    projectName: string;
    projectType: number;
    projectFps:number;
    fileList:Array<any>;
    accessToken: string;
    recentFiles:Array<any>;

    constructor(){
        this.createdProjectId = '';
        this.projectName = '';
        this.projectFps = 4;
        this.projectType = ContentType.video;
        this.fileList = [];
        this.accessToken = '';
        this.recentFiles = [];
    }
}

export class ContentType {
    public static video = 1;
    public static image = 2;
}

export class UIType{
    public static create = 'create';
    public static edit = 'edit';
    public static addFiles = 'addFiles';
    public static success = 'success';
}

export class FileStatus {
    public static pending = 0;
    public static completed = 1;
    public static processingError = 2;
    public static fileError = 3;
}

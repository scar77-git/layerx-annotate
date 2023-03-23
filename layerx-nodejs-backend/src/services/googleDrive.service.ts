/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 * GoogleDrive service for upload download and delete drive files by using url
 */

/**
 * @class GoogleDrive service
 * purpose of GoogleDrive service for upload download and delete drive files
 * @description GoogleDrive service for upload download and delete drive files by using url
 * @author chathushka
 */
import {bind, BindingKey, BindingScope, inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import dotenv from 'dotenv';
import fs from 'fs-extra';
import {google} from 'googleapis';
import * as https from 'https';
import {logger} from '../config';
import { UploadFileStatus } from '../models';
import {ContentType} from '../models/annotation-project.model';
import {
  AnnotationContentUploadRepository,
  AnnotationProjectRepository
} from '../repositories';
import {
  PythonRequestService,
  PYTHON_REQUEST_SERVICE
} from '../services/python-request.service';

const Axios = require('axios');
const Path = require('path');

dotenv.config();

const API_KEY = process.env.GOOGLE_API_KEY;
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const REDIRECT_URI = 'https://developers.google.com/oauthplayground';

const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI,
);
oauth2Client.setCredentials({refresh_token: REFRESH_TOKEN});

const drive = google.drive({
  version: 'v3',
  auth: oauth2Client,
});

@bind({scope: BindingScope.TRANSIENT})
export class GoogleDrive {
  constructor(
    @repository('AnnotationProjectRepository')
    private annotationProjectRepository: AnnotationProjectRepository,
    @inject(PYTHON_REQUEST_SERVICE)
    private pythonRequest: PythonRequestService,
    @repository(AnnotationContentUploadRepository)
    private annotationContentUploadRepository: AnnotationContentUploadRepository,
    @repository(AnnotationContentUploadRepository)
    private AnnotationContentUploadRepository: AnnotationContentUploadRepository,
  ) { }

  /**
   * Use for upload the file to google drive
   * @param filePath {string} path to the file in local folder
   */

  async uploadFile(filePath: string) {
    try {
      const response = await drive.files.create({
        requestBody: {
          name: 'sea.mp4', //This can be name of your choice
          mimeType: 'video/mp4',
        },
        media: {
          mimeType: 'video/mp4',
          body: fs.createReadStream(filePath),
        },
      });

      console.log(response.data);
    } catch /*(error) */ {
      //console.log(error.message);
    }
  }

  /**
   * Use for delete the drive file
   * @param fileId {string} file id of the drive file
   */

  async deleteFile(fileId: string) {
    try {
      const response = await drive.files.delete({
        fileId: fileId, //'1qzEUhYXkkUjRLa3e9W_kA32hVAf-PJvN',
      });
      console.log(response.data, response.status);
    } catch /*(error)*/ {
      //console.log(error.message);
    }
  }

  /**
   * use for create download url
   * @param id {string} file id of the drive file
   */

  async generatePublicUrl(id: string, saveName: string) {
    try {
      const fileId = id;
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      /*
        webViewLink: View the file in browser
        webContentLink: Direct download link
        */
      const result = await drive.files.get({
        fileId: fileId,
        fields: 'webViewLink, webContentLink',
      });
      console.log(result.data.webContentLink);
      await this.download(result.data.webContentLink, saveName);
    } catch (error) {
    }
  }
  /**
   * use for download the url content
   * @param url {string} url use for download
   * @returns nothing returns download file to local folder
   */
  async download(url: any, saveName: string) {
    const Path = '../annotation-manager/' + saveName + '.mp4';
    const writer = fs.createWriteStream(Path);
    const response = await Axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
    });
    response.data.pipe(writer);

    return new Promise<void>((resolve, reject) => {
      response.data.on('end'),
        () => {
          resolve();
        };
      response.data.on('error', (err: any) => {
        reject(err);
      });
    });
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////

  /** Google drive video download loop */

  //////////////////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Use for check the file type of the received fileId
   * @param projectId {string} id of the project
   * @param fileId {string} id of the file from google drive
   * @param frameRate {number} frame rate of the video
   * @param token {string} bearer token
   */
  async checkFileType(
    projectId: string,
    fileId: string,
    frameRate: number,
    token: string,
    tempArray: object[],
  ) {
    logger.debug(
      `checkingFile type of file id ${fileId} of project ${projectId}`,
    );
    var url = `https://content.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true&fields=*&key=${API_KEY}`;
    const fileDetails = await Axios({
      url: url,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    logger.debug(fileDetails.data.mimeType); //video/mp4
    if (
      fileDetails.data.mimeType == 'video/mp4' ||
      fileDetails.data.mimeType == 'video/x-msvideo'
    ) {
      logger.debug(`${fileId}: this is video file`);
      //this.downloadFile(projectId, fileId, frameRate, token)
      tempArray.push(fileDetails.data);

    }
    if (fileDetails.data.mimeType == 'application/vnd.google-apps.folder') {
      logger.debug(fileDetails.data);
      logger.debug(`${fileId}: this is folder`);
      await this.getChildrenList(
        projectId,
        fileId,
        frameRate,
        token,
        tempArray,
      );
    }
  }

  /**
   * Use for download the file to the server
   * @param projectId {string} id of the project
   * @param fileId {string} id of the file from google drive
   * @param frameRate {number} frame rate of the video
   * @param token {string} bearer token
   */
  async downloadFile(
    projectId: string,
    fileId: string,
    frameRate: number,
    token: string,
    projectName: string,
    uploadId: string,
    type: number,
    name: string
  ) {
    logger.debug(
      `downloadFile type of file id ${fileId} of project ${projectId}`,
    );
    let pathToFolder = Path.join(
      __dirname,
      process.env.PYTHON_SERVER,
      projectId,
    );
    logger.debug(pathToFolder);

    if (!fs.existsSync(pathToFolder)) fs.mkdirSync(pathToFolder);

    
    const path = fs.createWriteStream(pathToFolder + '/' + name);

    let pathString = './contents/uploads/' + projectId + '/' + name;
    logger.debug(pathString);

    const options = {
      host: 'www.googleapis.com',
      path: `/drive/v3/files/${fileId}?supportsAllDrives=true&alt=media&key=${API_KEY}`,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
    const req = https.get(options, res => {
      res.pipe(path);
      path.on('error', err => {
        logger.debug(err);
        this.annotationContentUploadRepository.updateById(uploadId, {
          status: UploadFileStatus.NodeJsError,
        });
      });
      path.on('finish', async () => {
        path.close();
        logger.debug('done');
        await this.AnnotationContentUploadRepository.updateById(uploadId, {status: UploadFileStatus.Processing})
        /**
         * call the python server request
         */
        try {
          if (type == ContentType.Video) {
            return this.pythonRequest.uploadGoogleDrive(
              projectId,
              frameRate,
              pathString,
              uploadId,
              type,
            );
          }
        } catch (error) {
          logger.error('python server request failed', error);
          return error;
        }
      });
    });
    req.on('error', function (err) {
      logger.debug(err);
    });
  }

  /**
   * Use for get the children of the google folder
   * @param projectId {string} id of the project
   * @param fileId {string} id of the file from google drive
   * @param frameRate {number} frame rate of the video
   * @param token {string} bearer token
   */
  async getChildrenList(
    projectId: string,
    fileId: string,
    frameRate: number,
    token: string,
    tempArray: object[],
  ) {
    logger.debug(
      `getChildrenList type of file id ${fileId} of project ${projectId}`,
    );
    var url = `https://www.googleapis.com/drive/v2/files/${fileId}/children?fields=*&supportsAllDrives=true&key=${API_KEY}`;
    const fileDetails = await Axios({
      url: url,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    //console.log(fileDetails.data.items);
    for (let file of fileDetails.data.items) {
      try {
        await this.checkFileType(
          projectId,
          file.id,
          frameRate,
          token,
          tempArray,
        );
      } catch (error) {
        logger.error(error);
      }
    }
  }

  /**
   * Use for check the file type of the received fileId
   * @param projectId {string} id of the project
   * @param fileId {string} id of the file from google drive
   * @param frameRate {number} frame rate of the video
   * @param token {string} bearer token
   */
  async chooseImageFiles(
    projectId: string,
    fileId: string,
    frameRate: number,
    token: string,
    tempArray: object[],
  ) {
    var url = `https://content.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true&fields=*&key=${API_KEY}`;
    const fileDetails = await Axios({
      url: url,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (
      fileDetails.data.mimeType == 'image/jpeg' ||
      fileDetails.data.mimeType == 'image/png' ||
      fileDetails.data.mimeType == 'image/webp'
    ) {
     
      tempArray.push(fileDetails.data);
    }
    if (fileDetails.data.mimeType == 'application/vnd.google-apps.folder') {
      logger.debug(fileDetails.data);
      //logger.debug(`${fileId}: this is folder`);
      await this.getImageChildrenList(
        projectId,
        fileId,
        frameRate,
        token,
        tempArray,
      );
    }
  }

  /**
   * Use for get the children of the google folder
   * @param projectId {string} id of the project
   * @param fileId {string} id of the file from google drive
   * @param frameRate {number} frame rate of the video
   * @param token {string} bearer token
   */
  async getImageChildrenList(
    projectId: string,
    fileId: string,
    frameRate: number,
    token: string,
    tempArray: object[],
  ) {
    logger.debug(
      `getChildrenList type of file id ${fileId} of project ${projectId}`,
    );
    var url = `https://www.googleapis.com/drive/v2/files/${fileId}/children?fields=*&supportsAllDrives=true&key=${API_KEY}`;
    const fileDetails = await Axios({
      url: url,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    //console.log(fileDetails.data.items);
    for (let file of fileDetails.data.items) {
      try {
        await this.chooseImageFiles(
          projectId,
          file.id,
          frameRate,
          token,
          tempArray,
        );
      } catch (error) {
        logger.error(error);
      }
    }
  }

  /**
   * Use for download the file to the server
   * @param projectId {string} id of the project
   * @param fileId {string} id of the file from google drive
   * @param frameRate {number} frame rate of the video
   * @param token {string} bearer token
   */
  async downloadImageFile(
    projectId: string,
    fileId: string,
    frameRate: number,
    token: string,
    projectName: string,
    uploadId: string,
    type: number,
    mimeType: string,
    length: number,
    index: number
  ) {
    let extension = mimeType.split('/');
    logger.debug(
      `downloadFile type of file id ${fileId} of project ${projectId}`,
    );
    let pathToFolder = Path.join(
      __dirname,
      process.env.PYTHON_SERVER,
      projectId,
    );

    if (!fs.existsSync(pathToFolder)) fs.mkdirSync(pathToFolder);

    if (!fs.existsSync(pathToFolder + '/image/'))
      fs.mkdirSync(pathToFolder + '/image/');

    const path = fs.createWriteStream(
      pathToFolder + '/image/' + fileId + `.${extension[extension.length - 1]}`,
    );

    let pathString =
      './contents/uploads/' +
      projectId +
      '/image/' +
      fileId +
      `.${extension[extension.length - 1]}`;

    const options = {
      host: 'www.googleapis.com',
      path: `/drive/v3/files/${fileId}?supportsAllDrives=true&alt=media&key=${API_KEY}`,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    return await new Promise((resolve, reject) => {
      const req = https.get(options, async res => {
        res.pipe(path);
        path.on('error', err => {
          logger.debug(err);
          this.annotationContentUploadRepository.updateById(uploadId, {
            status: 3,
          });
        });
        path.on('finish', async () => {
          path.close();
          logger.debug('image upload done for image: ' + pathString);
          resolve(true)
        });
      });
      req.on('error', function (err) {
        logger.debug(err);
      });
    })
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////

  /** Google drive video download loop */

  //////////////////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////
}
export const GOOGLE_DRIVE_SERVICE = BindingKey.create<GoogleDrive>(
  'service.googleDrive',
);

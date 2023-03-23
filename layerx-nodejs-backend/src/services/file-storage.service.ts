/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 * use to handle functions regarding file storage
 */

import { /* inject, */ BindingScope, injectable} from '@loopback/core';
import fs from 'fs-extra';
import path from 'path';
import {logger} from '../config';

@injectable({scope: BindingScope.TRANSIENT})
export class FileStorageService {

  private STORAGE_DIR_NAME = 'storage';
  storeName: string;
  root: string;
  storageDir: string;
  BASE_URL = process.env.BASE_URL + '/api/' || '/api/';

  constructor(store: StorageName | string) {
    this.storeName = store;
    this.root = path.join(__dirname, '../../');
    this.storageDir = path.join(this.root, this.STORAGE_DIR_NAME, store);
    fs.mkdirpSync(this.storageDir); // create storage location
  }

  /**
   * Create single file and remove all other content.
   * **WARNING** This may erase all existing content in the container
   * @param container Container name
   * @param filename name of the stored file
   * @param file file buffer
   */
  createSingleFile(container: string, filename: string, file: Buffer, isWithoutBase: boolean) {
    console.log(this.storageDir, container)
    const fullDir = path.join(this.storageDir, container);
    const fullPath = path.join(fullDir, filename);

    //make sure container exists
    fs.mkdirp(fullDir);

    // delete folder content
    fs.emptyDirSync(fullDir);

    // write file
    this.writeFile(fullPath, file, true);

    let base = this.BASE_URL

    if (isWithoutBase) {
      base = '/api/'
    }

    let url = `${base}${this.STORAGE_DIR_NAME}/${this.storeName}/${container}/${filename}`;

    return {url: url, path: path};
  }


  /**
   * Create single file and remove all other content.
   * **WARNING** This may erase all existing content in the container
   * @param container Container name
   * @param filename name of the stored file
   * @param file file buffer
   */
  async createSingleFileWithoutErasing(container: string, filename: string, file: Buffer, chunkIndex: number, previousChunk: number) {
    console.log(this.storageDir, container)
    const fullDir = path.join(__dirname, process.env.PYTHON_SERVER ?? '../../../../../deepzea-python-backend/contents/uploads/',
      container);

    if (!fs.existsSync(fullDir)) fs.mkdirSync(fullDir);

    if (Number(chunkIndex) >= Number(previousChunk)) {
      logger.debug('directory created', !fs.existsSync(fullDir), 'and path', fullDir)
      const fullPath = path.join(fullDir, filename);


      // write file
      await this.writeFileModify(fullPath, file, true, filename);





      return path.join('/contents/uploads', container, filename);
    } else {
      return null
    }


  }




  /**
   * insert file to the container
   * @param container Container name
   * @param filename Name of the stored file
   * @param file File buffer
   */
  insertFile(container: string, filename: string, file: Buffer, overwrite = false) {
    const fullDir = path.join(this.storageDir, container);
    const fullPath = path.join(fullDir, filename);

    // write file
    this.writeFile(fullPath, file, overwrite);

    return;
  }




  /**
   * Delete file from the container
   * @param container Container name
   * @param filename Name of the file to delete
   */
  deleteFile(container: string, filename: string) {
    const fullDir = path.join(this.storageDir, container);
    const fullPath = path.join(fullDir, filename);

    //make sure container exists
    fs.mkdirp(fullDir);

    // remove file
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    return;
  }




  /**
   * Delete file from the container
   * @param container Container name
   * @param filename Name of the file to delete
   */
  deleteAll(container: string) {
    const fullDir = path.join(this.storageDir, container);

    //make sure container exists
    fs.mkdirp(fullDir);

    // remove file
    if (fs.existsSync(fullDir)) fs.emptyDirSync(fullDir);
    return;
  }



  /**
   *
   * @param fullPath Path with filename
   * @param file file buffer
   * @param overwrite overwrite or rename if file exist
   */
  private writeFile(fullPath: string, file: Buffer, overwrite = false) {
    const pathInfo = path.parse(fullPath);

    //make sure container exists
    fs.mkdirp(pathInfo.dir);

    if (!overwrite) {
      // function to rebuild path with integer at the end of filename
      const rebuildPath = (n: number) => {
        if (n == 0) return path.join(pathInfo.dir, `${pathInfo.name}${pathInfo.ext}`);
        else return path.join(pathInfo.dir, `${pathInfo.name}(${n})${pathInfo.ext}`);
      };

      // check file exists with base name
      for (let i = 0; i < 11; i++) {
        let newPath = rebuildPath(i);
        let isFileExists = fs.existsSync(newPath);
        if (!isFileExists) {
          fullPath = newPath;
          break;
        }
      }
    }

    // create file
    fs.writeFileSync(fullPath, file);
    return;
  }

  /**
   *
   * @param fullPath Path with filename
   * @param file file buffer
   * @param overwrite overwrite or rename if file exist
   */
  private async writeFileModify(fullPath: string, file: Buffer, overwrite = false, filename: string) {
    const pathInfo = path.parse(fullPath);
    logger.debug(fullPath, file)
    //make sure container exists
    if (!pathInfo.dir) fs.mkdirSync(pathInfo.dir);

    if (!overwrite) {
      // function to rebuild path with integer at the end of filename
      const rebuildPath = (n: number) => {
        if (n == 0) return path.join(pathInfo.dir, `${pathInfo.name}${pathInfo.ext}`);
        else return path.join(pathInfo.dir, `${pathInfo.name}(${n})${pathInfo.ext}`);
      };

      // check file exists with base name
      for (let i = 0; i < 11; i++) {
        let newPath = rebuildPath(i);
        let isFileExists = fs.existsSync(newPath);
        if (!isFileExists) {
          fullPath = newPath;
          break;
        }
      }
    }
    let filePath = fs.existsSync(fullPath)
    if (filePath) {
      //fs.appendFileSync(fullPath, file)
      logger.debug('path exists')
      //let fileStream = fs.createWriteStream(fullPath, {flags: 'r+'});
      fs.appendFileSync(fullPath, file)
      //fileStream.write(file);
    } else {
      //fs.mkdirSync(fullPath);
      // fs.writeFileSync(fullPath, file);
      //let fileStream = fs.createWriteStream(fullPath, {flags: 'r+'});
      //fileStream.write(file);
      fs.writeFileSync(fullPath, file)
      logger.debug('path doesnt exists')
    }
    return;
  }




  getFilesList(container: string) {
    const fullDir = path.join(this.storageDir, container);

    if (!fs.existsSync(fullDir)) return [];
    // list all files
    const fileNameList = fs.readdirSync(fullDir);

    const filesInfo = fileNameList.map(filename => {
      const fullPath = path.join(fullDir, filename);
      const relativePath = path.relative(this.root, fullPath);
      return {
        filename: filename,
        container: container,
        storage: this.storeName,
        fileDir: fullDir,
        filePath: fullPath,
        relativePath: relativePath,
      };
    });

    return filesInfo;
  }



  download(container: string, filename: string, toBuffer = false) {
    const fullDir = path.join(this.storageDir, container);
    const filePath = path.join(fullDir, filename);
    const relativePath = path.relative(this.root, filePath);
    if (!fs.existsSync(filePath)) return;
    if (fs.lstatSync(filePath).isDirectory()) return;
    // list all files
    let fileBuffer: Buffer | undefined = undefined;
    if (toBuffer) fileBuffer = fs.readFileSync(filePath);

    return {
      filename: filename,
      container: container,
      storage: this.storeName,
      fileDir: fullDir,
      filePath: filePath,
      relativePath: relativePath,
      buffer: fileBuffer,
    };
  }
  /////////////////////////////////////////////
  async deleteContentFromPython(projectId: string) {

  }
  ////////////////////////////////////////////
}




export enum StorageName {
  Passport = 'passport',
  VoidCheque = 'void-cheque',
  LABELS = "labels",
  Documents = "documents",
  ProjectFiles = "files",
  ProfileImages = "profileImages"
}

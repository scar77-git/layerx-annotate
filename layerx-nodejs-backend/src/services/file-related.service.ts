/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 * use to calculate file size
 */
import { /* inject, */ BindingKey, BindingScope, injectable} from '@loopback/core';
import archiver from 'archiver'
import fs from 'fs-extra'

@injectable({scope: BindingScope.TRANSIENT})
export class FileSizeRelatedService {
  constructor(/* Add @inject to inject parameters */) { }

  async calculateFileSize(size: number, count: number,) {
    let tempList: string[] = []
    let result = await this.calculateFileSizeRecursive(size, count, tempList);
    if (tempList.length > 0) {
      return tempList[0]
    } else {
      return ''
    }

  }

  async calculateFileSizeRecursive(size: number, count: number, tempList: string[]) {
    let fileSize = [

      {
        count: 0,
        symbol: 'B'
      }, {
        count: 1,
        symbol: 'KB'
      },
      {
        count: 2,
        symbol: 'MB'
      },
      {
        count: 3,
        symbol: 'GB'
      },
      {
        count: 4,
        symbol: 'TB'
      }
    ]
    let symbol = ''
    if (size < 1024) {
      for (let item of fileSize) {
        if (count == item.count) {
          symbol = item.symbol
          let sizeString = (size.toString()).split('.')
          let sizeOutput = sizeString[0]//+'.'+ sizeString[1].substring(0,3);
          tempList.push(`${sizeOutput}${symbol}`)
        }
      }
      return
    }
    count += 1
    this.calculateFileSizeRecursive(size / 1024, count, tempList);
  }




  /**
   * Use for save the directory as zip save
   * @param sourceDir {string} directory needed to zip
   * @param outPath {string} directory needed to zip tto save
   * @returns promise
   */
  async zipDirectory(sourceDir: string, outPath: string) {
    const archive = archiver('zip', { zlib: { level: 9 }});
    const stream = fs.createWriteStream(outPath);
  
    return new Promise<void>((resolve, reject) => {
      archive
        .directory(sourceDir, false)
        .on('error', (err: any) => reject(err))
        .pipe(stream)
      ;
  
      stream.on('close', () => resolve());
      archive.finalize();
    });
  }
}
export const File_SizeRelated_Service = BindingKey.create<FileSizeRelatedService>(
  'service.fileSizeRelatedService',
);
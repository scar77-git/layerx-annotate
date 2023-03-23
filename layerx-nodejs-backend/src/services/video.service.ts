/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 * service to handle function related to video
 */

/**
 * @class video service
 *  service to handle function related to video
 * @description  service to handle function related to video
 * @author chamath
 */

import { /* inject, */ BindingScope, injectable} from '@loopback/core';
import fs from "fs-extra";
import path from 'path';
const Axios = require('axios')
const nthline = require('nthline');
var http = require('http');
@injectable({scope: BindingScope.TRANSIENT})
export class VideoService {
  constructor() { }

  /**
   * Download images in server
   * @param url {string} videos url
   * @param id {string} Mongo db Id
   */
  async downloadVideos(url: string, id: string) {
    const savePath = path.join(__dirname, "../../video");
    if (!fs.existsSync(savePath)) fs.mkdirpSync(savePath);
    const _path = path.join(savePath, `/${id}.mp4`);
    const writer = fs.createWriteStream(_path);

    const response = await Axios({
      url,
      method: 'GET',
      responseType: 'stream'
    })

    await response.data.pipe(writer)

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve)
      writer.on('error', reject)
    })
  }

}

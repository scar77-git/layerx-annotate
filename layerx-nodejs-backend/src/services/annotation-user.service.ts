/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 *service to handle user related functions(eg:generate image profile)
 */

/**
 * @class AnnotationUserService
 * AnnotationUserService use for user related calculation and profile images generations profile image download
 * @description use for user related calculation and profile images generations profile image download
 * @author chathushka
 */
import { /* inject, */ BindingScope, injectable} from '@loopback/core';
import {repository} from '@loopback/repository';
import axios from 'axios';
import {createCanvas} from 'canvas';
import dotenv from 'dotenv';
import fs from 'fs-extra';
import path from 'path';
import {logger} from '../config';
import {AnnotationUserRepository} from '../repositories/annotation-user.repository';
dotenv.config();
@injectable({scope: BindingScope.TRANSIENT})
export class AnnotationUserService {
  constructor(
    @repository(AnnotationUserRepository)
    private userRepo: AnnotationUserRepository,/* Add @inject to inject parameters */) { }



  /**
   * Use for create default image for user using first two letters of user name
   * @param text {string} first two letters of user name
   * @param userId {string} id of the user
   * @returns nothing returns
   */
  async profileImageCreate(text: string, userId: string) {
    const canvas = createCanvas(300, 300)
    const ctx = canvas.getContext('2d')

    ctx.beginPath();
    ctx.rect(0, 0, 300, 300);
    ctx.fillStyle = "#7166F9";
    ctx.fill();


    ctx.font = `800 160px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle';
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(text, 150, 150)

    //console.log(canvas)
    logger.debug(__dirname, 'userId', userId)
    let pathToImageLocation = path.join(__dirname, "../../storage/profileImages");
    if (!fs.existsSync(pathToImageLocation)) fs.mkdirSync(pathToImageLocation)


    let pathToImage = path.join(__dirname, `../../storage/profileImages/${userId}`)

    if (!fs.existsSync(pathToImage)) fs.mkdirSync(pathToImage);

    logger.debug(pathToImage, 'userId', userId)
    const out = fs.createWriteStream(pathToImage + `/defaultProfileImage.png`)
    const stream = canvas.createPNGStream()
    stream.pipe(out)
    //console.log(out)
    out.on('finish', () => logger.debug('The PNG file was created.'))
    let userDetails = await this.userRepo.findById(userId);

    let imageUrl = userDetails.imageUrl ?? `${process.env.BASE_URL}/api/user/profileImage/${userId}/defaultProfileImage.png`
    await this.userRepo.updateById(userId, {imageUrl: imageUrl});

    return
  }




  /**
   * Use for download google profile image of user
   * @param url {string} google profile image url
   * @param userId {string} id of the user
   */
  async downloadImage(url: string, userId: string) {
    logger.info(`google image download for user id ${userId} and url ${url}`)

    const savePath = path.join(__dirname, "../../storage/profileImages");
    if (!fs.existsSync(savePath)) fs.mkdirSync(savePath);

    let pathToImage = path.join(__dirname, `../../storage/profileImages/${userId}`)

    if (!fs.existsSync(pathToImage)) fs.mkdirSync(pathToImage);

    fs.emptyDirSync(pathToImage);

    const _path = path.join(pathToImage, `/defaultProfileImage.png`);

    const writer = fs.createWriteStream(_path);



    const response = await axios({
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

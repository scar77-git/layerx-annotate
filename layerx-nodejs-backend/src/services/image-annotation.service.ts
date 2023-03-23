/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 * services related to the image annotation
 */
import { /* inject, */ BindingScope, injectable} from '@loopback/core';
import {repository} from '@loopback/repository';
import {ObjectId} from 'mongodb';
import {AnnotationData} from '../models/annotation-frame.model';
import {AnnotationFrameRepository} from '../repositories/annotation-frame.repository';
import {AnnotationTaskRepository} from '../repositories/annotation-task.repository';

@injectable({scope: BindingScope.TRANSIENT})
export class ImageAnnotationService {
  constructor(
    @repository(AnnotationTaskRepository)
    public annotationTaskRepository: AnnotationTaskRepository,
    @repository(AnnotationFrameRepository)
    public annotationFrameRepository: AnnotationFrameRepository,
  ) { }

  /**
   * Use for the convert the annotated data to real image size scale
   * @param boxes {AnnotationData[]} annotated data for save
   * @param taskId {string} id of the belonging task
   * @param frameId {string} id of the frame
   * @returns {AnnotationData[]} scaled annotated data for save
   */
  async boxConvert(boxes: AnnotationData[], taskId: string, frameId: number) {

    let frame = await this.annotationFrameRepository.findOne({
      where: {taskId: taskId, frameId: frameId}
    })
    let centerOffSet_X = frame?.imageOffSetX ?? 0
    let centerOffSet_Y = frame?.imageOffSetY ?? 0
    let K = frame?.imageMultiplier ?? 1
    for (let i in boxes) {
      boxes[i].boundaries.x = (boxes[i].boundaries.x - centerOffSet_X) / K
      boxes[i].boundaries.y = (boxes[i].boundaries.y - centerOffSet_Y) / K
      boxes[i].boundaries.w = boxes[i].boundaries.w / K
      boxes[i].boundaries.h = boxes[i].boundaries.h / K
    }
    return boxes
  }


  /**
   * Use for the reConvert the annotated data to real image size scale
   * @param taskId {string} id of the belonging task
   * @returns {AnnotationData[]} scaled annotated data for retrieve
   */
  async boxReConvert(taskId: string) {

    let param = [
      {$match: {"taskId": new ObjectId(taskId)}},
      {
        $project: {
          "frameId": 1,
          "status": 1,
          "isUserAnnotated": 1,
          "userLog": 1,
          "updatedAt": 1,
          "taskId": 1,
          "commentBoxes": 1,
          "annotatedAt": 1,
          "isEmpty": 1,
          boxes: {
            $map: {
              input: "$boxes",
              as: "box",
              in: {
                id: "$$box.boundaries.id",
                boundaries: {
                  id: "$$box.boundaries.id",
                  type: "$$box.boundaries.type",
                  x: {$add: [{$multiply: ["$$box.boundaries.x", {$ifNull: ["$imageMultiplier", 1]}]}, {$ifNull: ["$imageOffSetX", 0]}]},
                  y: {$add: [{$multiply: ["$$box.boundaries.y", {$ifNull: ["$imageMultiplier", 1]}]}, {$ifNull: ["$imageOffSetY", 0]}]},
                  w: {$multiply: ["$$box.boundaries.w", {$ifNull: ["$imageMultiplier", 1]}]},
                  h: {$multiply: ["$$box.boundaries.h", {$ifNull: ["$imageMultiplier", 1]}]},
                  label: "$$box.boundaries.label",
                  color: "$$box.boundaries.color",
                  status: "$$box.boundaries.status",
                  isPermanent: "$$box.boundaries.isPermanent",
                  isHide: "$$box.boundaries.isHide",
                  attributeValues: "$$box.boundaries.attributeValues",
                  createdAt: "$$box.boundaries.createdAt",
                  annotatorId: "$$box.boundaries.annotatorId"
                }, attributeValues: "$$box.attributeValues"
              }
            }
          }
        }
      },
      {$sort: {frameId: 1}}

    ]
    return await this.annotationFrameRepository.aggregate(param)
  }


}

"""
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.

maintainers : dinusha@zoomi.ca, tharindu@zoomi.ca, isuruj@zoomi.ca

This python script handles the dataset creation process.
"""

import os
import sys
from bson.objectid import ObjectId
import shutil
import cv2
import time
from datetime import datetime, timedelta
from mongo_manager import MongoDBmanager
from s3_manager import s3_bucket_manager
from multiprocessing.pool import ThreadPool
import configparser
import traceback
from PIL import Image
import numpy as np
import augmentation_processor
import random


class DATASET_GENARATOR:
    def __init__(self, logger):

        # logging configuration
        self.dataset_logger = logger
        # Read settings from config file
        self.params = configparser.ConfigParser(os.environ)               
        self.params.read('config.cfg')
        # folder paths
        self.TASK_BASE = f"{self.params.get('Folders', 'task_base')}"
        self.CLIP_BASE = f"{self.params.get('Folders', 'clip_base')}"
        self.AUG_BASE = f"{self.params.get('Folders', 'aug_base')}"
        self.S3_AUG_BASE = f"{self.params.get('Folders', 's3_base_aug')}"
        # augmentation settings
        self.AUGMENTATION_MAP = eval(self.params.get('Augmentation', 'aug_map'))
        self.FLAG_KEEP_SIZE = eval(self.params.get('Augmentation', 'keep_size_crop'))
        self.DISABLED_AUGS = eval(f"{self.params.get('Augmentation', 'disabled_augs')}")
        self.RANGE_MAPPING_FACTORS = eval(f"{self.params.get('Augmentation', 'range_map')}")
        # number of parallel processes/threads to use
        self.PROCESSES = int(f"{self.params.get('Cores', 'cpu_cores')}")

        self.MDB_USER = f"{self.params.get('MongoDB', 'user_name')}"
        self.MDB_PASS = f"{self.params.get('MongoDB', 'password')}"
        self.MDB_NAME = f"{self.params.get('MongoDB', 'db_name')}"

        self.S3_REGION = f"{self.params.get('S3', 'region')}"
        self.S3_ACCESS_KEY = f"{self.params.get('S3', 'access_key_id')}"
        self.S3_SECRET_KEY = f"{self.params.get('S3', 'secret_access_key')}"
        self.S3_BUCKET = f"{self.params.get('S3', 'bucket_name')}"

        # Mongo DB configurations
        self.task_db = MongoDBmanager(self.MDB_USER, self.MDB_PASS, self.MDB_NAME, 'AnnotationTask')
        self.frame_db = MongoDBmanager(self.MDB_USER, self.MDB_PASS, self.MDB_NAME, 'AnnotationFrame')
        self.dataset_db = MongoDBmanager(self.MDB_USER, self.MDB_PASS, self.MDB_NAME, 'AnnotationDatasetVersion')
        self.masterData_db = MongoDBmanager(self.MDB_USER, self.MDB_PASS, self.MDB_NAME, 'MasterData')

        # S3 configurations
        self.s3_bucket = s3_bucket_manager(self.S3_REGION, self.S3_ACCESS_KEY, self.S3_SECRET_KEY, self.S3_BUCKET)
        self.s3_client = self.s3_bucket.get_client()


    # This function  get information from task
    def get_task_info(self, zoomi_task_id):
        # get AnnotationTask from the db
        doc = self.task_db.get_one_document({"_id": ObjectId(zoomi_task_id)})
        video_w = doc['videoResolutionWidth']
        video_h = doc['videoResolutionHeight']
        s3_path = doc['S3_url']
        frame_count = doc['frameCount']
        return s3_path, video_h, video_w, frame_count


    # This function process augmentations for a task
    def process_augmentations(self, zoomi_task_id, frame_id_list, augmentation_options_list, version_id, group_id, dataset_id, aug_folder, task_folder, s3_bucket, s3_client):
        frame_doc = self.frame_db.get_documents({"taskId": ObjectId(zoomi_task_id)})
        # to count text files
        taskAugTextFileCount = 0
        # taskAugImageTotalSize = 0

        # reset dataset version (when updating existing version)
        tempDSVersion_augmentations_reset = { "datasetVersions.$.augmentationImages": None }
        self.frame_db.find_and_update_many({"taskId":ObjectId(zoomi_task_id), "datasetVersions.versionId": ObjectId(dataset_id)}, tempDSVersion_augmentations_reset)
        
        taskAugTextFileCounts = {}
        for i,augmentation_options in enumerate(augmentation_options_list):
            imageCount = 0
            imageDataSize = 0
            for frame_id in frame_id_list[i]:
                augData = {}
                # get the frame object id
                obj_id = frame_doc[frame_id -1]['_id']
                img_path = f"{task_folder}/{zoomi_task_id}_{frame_id}.jpg"
                txt_path = f"{task_folder}/{zoomi_task_id}_{frame_id}.txt"
                img_save_path = aug_folder + '/' + f'{zoomi_task_id}_{augmentation_options["augmentation_type"]}_{str(frame_id)}.jpg'
                txt_save_path = aug_folder + '/' + f'{zoomi_task_id}_{augmentation_options["augmentation_type"]}_{str(frame_id)}.txt'
                image_aug, bbs_aug = augmentation_processor.augment_one_image(augmentation_options, img_path, txt_path)
                augmentation_processor.save_images(bbs_aug, image_aug, img_save_path, txt_save_path)
                s3_txt = 'dataset/{}/{}/{}/{}/{}'.format(group_id, zoomi_task_id, frame_id, self.S3_AUG_BASE,
                                                        f'{version_id}_{augmentation_options["augmentation_type"]}_{str(frame_id)}.txt')
                s3_img = 'dataset/{}/{}/{}/{}/{}'.format(group_id, zoomi_task_id, frame_id, self.S3_AUG_BASE,
                                                        f'{augmentation_options["augmentation_type"]}_{str(frame_id)}.jpg')
                # augData[f'{augmentation_options["augmentation_type"]}'] = {"textFiles": s3_txt, "imageUrl": s3_img}
                # generate aws auth url for thumbnail
                imageAugThumbSavePath = s3_img.replace(".jpg", "_thumbnail.jpg")
                thumbnailExpirationTime = 86400
                thumbnailAuthUrl = s3_bucket.s3_getAuthenticatedUrl(s3_client,imageAugThumbSavePath, thumbnailExpirationTime)
                imgAuthUrl = s3_bucket.s3_getAuthenticatedUrl(s3_client, s3_img, thumbnailExpirationTime)
                thumbnailUrlExpDate = datetime.now() + timedelta(seconds=thumbnailExpirationTime)

                # get current augmentations
                frameCurrentData = self.frame_db.get_one_document({"_id": ObjectId(obj_id)})
                for dsVersion in frameCurrentData['datasetVersions']:
                    if dsVersion['versionId'] == ObjectId(dataset_id):
                        if dsVersion['augmentationImages'] is not None:
                            augData = dsVersion['augmentationImages']

                # update add new augmentations
                augData[f"{augmentation_options['augmentation_type']}"] = {
                    "textFiles": s3_txt,
                    "imageUrl": s3_img,
                    "thumbnailUrl": imageAugThumbSavePath,
                    "awsThumbnailUrl": thumbnailAuthUrl,
                    "awsImageUrl":imgAuthUrl,
                    "awsThumbnailExpiredDate": thumbnailUrlExpDate
                    }

                # update frame DB
                tempDSVersion_augmentations = { "datasetVersions.$.augmentationImages": augData }
                self.frame_db.find_one_update({"_id": ObjectId(obj_id), "datasetVersions.versionId": ObjectId(dataset_id)}, tempDSVersion_augmentations)

                # # count augmentation text files
                # augmented image size count
                imageCount += 1
                imageDataSize += os.stat(img_save_path).st_size   
                # --------------------
            taskAugTextFileCounts[augmentation_options['augmentation_type']]={
                "count":imageCount,
                "size":imageDataSize
            }

        # save textFileCount for task in db
        tempTaskDataAug = {
        "taskStatus.tasks.$.augmentationFileCounts": taskAugTextFileCounts,
        # "taskStatus.tasks.$.imageDataSize": imageDataSize
        }
        print(f'[test info] text file count for taskId: {zoomi_task_id} = {taskAugTextFileCounts}')
        self.dataset_db.find_one_update({"_id": ObjectId(dataset_id), "taskStatus.tasks.task": zoomi_task_id}, tempTaskDataAug)    



    # This function split frames task video
    def split_frames(self, task_id, video_path, dataset_id):
        task_folder = self.TASK_BASE + task_id + dataset_id
        # create a folder using task name if not exist
        if not os.path.exists(task_folder):
            os.makedirs(task_folder)
        elif os.path.exists(task_folder):
            shutil.rmtree(task_folder)
            os.makedirs(task_folder)

        vidcap = cv2.VideoCapture(video_path)
        success, image = vidcap.read()
        count = 1
        imageCount = 0
        imageDataSize = 0
        while success:
            cv2.imwrite(f"{task_folder}/{task_id}_{count}.jpg", image)  # save frame as JPEG file
            try:
                image1 = Image.fromarray(image)
                image1.thumbnail((250, 250))
                m_np = np.asarray(image1)
                cv2.imwrite(f"{task_folder}/{task_id}_{count}_thumbnail.jpg",m_np)  # save thumbnail of a frame as JPEG file
            except IOError:
                pass

            success, image = vidcap.read()
            imageCount += 1
            imageDataSize += os.stat(f"{task_folder}/{task_id}_{count}.jpg").st_size
            count += 1
        vidcap.release()
        tempTaskData = {
            "taskStatus.tasks.$.imageCount": imageCount,
            "taskStatus.tasks.$.imageDataSize": imageDataSize
        }
        self.dataset_db.find_one_update({"_id": ObjectId(dataset_id), "taskStatus.tasks.task": task_id}, tempTaskData)


    # This function will be run in a process pool
    # TODO : add other dataset types 
    def process_one_task(self, zoomi_task_id, labels, group_id, version_id, dataset_id, augmentation_options_list):
        s3_bucket = s3_bucket_manager(self.S3_REGION, self.S3_ACCESS_KEY, self.S3_SECRET_KEY, self.S3_BUCKET)
        s3_client = s3_bucket.get_client()

        labels_available = False
        task_content_folder = self.TASK_BASE + zoomi_task_id + dataset_id
        # Get task information's
        video_path, h_img, w_img, frame_count = self.get_task_info(zoomi_task_id)
        # download video from s3 bucket
        save_path = self.CLIP_BASE + dataset_id +'/'+ video_path.split('/')[-1]

        # don't dawnload if video already exists (incase same task is used in another dataset version)
        if not os.path.exists(save_path):
            s3_bucket.s3_download(s3_client, save_path, video_path)
            self.dataset_logger.debug(f'[{dataset_id}][{zoomi_task_id}] {video_path}')

        # split video in to frames
        self.split_frames(zoomi_task_id, save_path, dataset_id)
        # delete video file
        os.remove(save_path)

        # create augmentation folder
        aug_folder = self.TASK_BASE + zoomi_task_id + dataset_id+ self.AUG_BASE

        if not os.path.exists(aug_folder):
            os.makedirs(aug_folder)
        elif os.path.exists(aug_folder):
            shutil.rmtree(aug_folder)
            os.makedirs(aug_folder)

        # upload all the frames of task to S3
        s3_bucket.s3_upload_images(s3_client,zoomi_task_id, task_content_folder, group_id)
        # get AnnotationFrame from the db
        doc = self.frame_db.get_documents({"taskId": ObjectId(zoomi_task_id)})
        # select the frames randomly for augmentations
        frame_id_list = []
        arr = np.arange(1,frame_count+1)
        frame_list = arr.tolist()
        num_of_frames_to_augment = 0.1*frame_count
        num_of_aug = len(augmentation_options_list)

        for i in range(0,num_of_aug):
            aug_frame_id_list = random.sample(frame_list, int(num_of_frames_to_augment))
            frame_id_list.append(aug_frame_id_list)

        self.dataset_logger.debug(f'[{dataset_id}][{zoomi_task_id}]List of Augmentation frames [tasks[frames]]: {frame_id_list}')

        # TODO dataset version check

        # for each frame in the task
        for data in doc:
            obj_id = data['_id']
            frame_id = data['frameId']
            box_list = data['boxes']
            anno_list = []

            # for each box in that frame
            for box in box_list:
                x = box['boundaries']['x']
                y = box['boundaries']['y']
                w = box['boundaries']['w']
                h = box['boundaries']['h']
                lbl = box['boundaries']['label']
                attr = box['boundaries']['attributeValues']
                if len(labels) == 0:
                    default_anno = [lbl, (x + w / 2) / w_img, (y + h / 2) / h_img, w / w_img, h / h_img]
                    anno_list.append(default_anno)

                # labels with attributes
                elif len(labels) != 0:
                    labels_available = True
                    # checkout each label-attribute dictionary
                    for label_dic in labels:
                        # first check the main label
                        if lbl == label_dic['label']:
                            # then check the attribute
                            if attr == label_dic['attributeValues']:
                                yolo_anno = [label_dic['label_index'], (x + w / 2) / w_img, (y + h / 2) / h_img, w / w_img, h / h_img]
                                anno_list.append(yolo_anno)

            with open(f'{self.TASK_BASE}{zoomi_task_id}{dataset_id}/{zoomi_task_id}_{str(frame_id)}.txt', 'a') as textfile:
                for i in range(len(anno_list)):
                    for j in range(len(anno_list[i])):
                        textfile.write(str(anno_list[i][j]))
                        textfile.write(' ')
                    textfile.write('\n')

            if not labels_available:
                temp = {
                    "imageUrl": f'dataset/{group_id}/{zoomi_task_id}/{frame_id}/{frame_id}.jpg',
                    "thumbnailUrl": f'dataset/{group_id}/{zoomi_task_id}/{frame_id}/{frame_id}_thumbnail.jpg',
                }
                tempDSVersion = {
                    "datasetVersions.$.textFiles": {
                        "DEFAULT": f'dataset/{group_id}/{zoomi_task_id}/{frame_id}/{version_id}_{frame_id}.txt'  # DEFAULT
                    }
                }

            else:
                temp = {
                    "imageUrl": f'dataset/{group_id}/{zoomi_task_id}/{frame_id}/{frame_id}.jpg',
                    "thumbnailUrl": f'dataset/{group_id}/{zoomi_task_id}/{frame_id}/{frame_id}_thumbnail.jpg',
                }
                tempDSVersion = {
                    "datasetVersions.$.textFiles": {
                        "YOLO": f'dataset/{group_id}/{zoomi_task_id}/{frame_id}/{version_id}_{frame_id}.txt'
                    }
                }
            
            # get authenticated s3 url for thumbnail
            thumbnailExpirationTime = 86400
            thumbnailAuthUrl = s3_bucket.s3_getAuthenticatedUrl(s3_client,temp['thumbnailUrl'], thumbnailExpirationTime)
            imageAuthUrl = s3_bucket.s3_getAuthenticatedUrl(s3_client,temp['imageUrl'], thumbnailExpirationTime)
            thumbnailUrlExpDate = datetime.now() + timedelta(seconds=thumbnailExpirationTime)
            temp['awsThumbnailUr'] = thumbnailAuthUrl
            temp['awsThumbnailExpiredDate'] = thumbnailUrlExpDate
            temp["awsUrl"] = imageAuthUrl
            temp['awsExpiredDate'] = thumbnailUrlExpDate
            # -----------------
            # update db
            self.frame_db.find_one_update({"_id": obj_id}, temp)
            # dsVersionData=
            self.frame_db.find_one_update({"_id": obj_id, "datasetVersions.versionId": ObjectId(dataset_id)}, tempDSVersion)
            # ---------------
            
        # start augmentation
        if len(augmentation_options_list) > 0:
            self.process_augmentations(zoomi_task_id, frame_id_list, augmentation_options_list, version_id, group_id, dataset_id, aug_folder, task_content_folder, s3_bucket, s3_client)
        # upload all the text file to S3
        s3_bucket.s3_upload_textfiles(s3_client,zoomi_task_id, task_content_folder, group_id, version_id)
        # upload all the text file to S3
        if len(augmentation_options_list) > 0:
            s3_bucket.s3_upload_images_aug(s3_client,zoomi_task_id, aug_folder, group_id, version_id)
        # delete frames in temp task folder
        shutil.rmtree(task_content_folder)


    # this function read labels with attributes
    def get_labels(self, dataset_id):
        doc = self.dataset_db.get_one_document({"_id": ObjectId(dataset_id)})
        lable_dic = doc['labelAttributeList']
        selected_labels = []
        for n, label in enumerate(lable_dic):

            if label['isEnabled']:
                selected_labels.append({
                    'label': label['mainLabel'],
                    'attributeValues': label['attributes'],
                    'label_index': n
                })
        return selected_labels

    # split long task list in to small sub_size lists
    def split_task_list(self, task_list, sub_size):
        sub_list = [task_list[i:i+sub_size] for i in range(0, len(task_list), sub_size)] 
        return sub_list
    
    """
    This function list all the pending status datasets
    """
    def get_pending_datasets(self):
        # get pending task list from the AnnotationTask
        docs = self.dataset_db.get_documents({"taskStatus.state" : "pending"})
        pending_datasets =[]

        for doc in docs:
            pending_datasets.append(str(doc['_id']))

        self.dataset_logger.debug(f'Pending datasets : {pending_datasets}')
        return pending_datasets


    # This function handles the warm start when a crash happens in the system
    def warm_start(self, dataset_id):
        task_already_available = False

        try:
            # get the dataset document
            doc = self.dataset_db.get_one_document({"_id": ObjectId(dataset_id)})
            # get labels dictionary
            lable_list = self.get_labels(dataset_id)
            # get dataset group id
            group_id = str(doc['dataSetGroupId'])
            # get the augmentation list
             # get dataset augmentation options
            augmentation_options_list = []
            if "augmentationTypes" in doc:
                augmentations = doc['augmentationTypes']['IMAGE_LEVEL']
                for augmentation in augmentations:
                    for aug in augmentation['properties']:
                        augmentation_value = aug['values']
                        augmentation_type = aug['id']
                        augmentation_option = {'augmentation_type': None,
                                            'keep_size': None, 'range': None}
                        if augmentation_type == 'CLOCKWISE':
                            if len(augmentation_value) > 0 and augmentation_value[0]:
                                augmentation_option = {'augmentation_type': self.AUGMENTATION_MAP[augmentation_type],
                                                    'keep_size': self.FLAG_KEEP_SIZE}
                            else:
                                continue
                        elif augmentation_type == 'UPSIDE_DOWN':
                            if len(augmentation_value) > 0 and augmentation_value[0]:
                                augmentation_option = {'augmentation_type': self.AUGMENTATION_MAP[augmentation_type],
                                                    'keep_size': self.FLAG_KEEP_SIZE}
                            else:
                                continue
                        elif augmentation_type == 'COUNTER_CLOCKWISE':
                            if len(augmentation_value) > 0 and augmentation_value[0]:
                                augmentation_option = {'augmentation_type': self.AUGMENTATION_MAP[augmentation_type],
                                                    'keep_size': self.FLAG_KEEP_SIZE}
                            else:
                                continue
                        elif augmentation_type == 'FLIP_HORIZONTAL':
                            if len(augmentation_value) > 0 and augmentation_value[0]:
                                augmentation_option = {'augmentation_type': self.AUGMENTATION_MAP[augmentation_type]}
                            else:
                                continue
                        elif augmentation_type == 'FLIP_VERTICAL':
                            if len(augmentation_value) > 0 and augmentation_value[0]:
                                augmentation_option = {'augmentation_type': self.AUGMENTATION_MAP[augmentation_type]}
                            else:
                                continue
                        else:
                            if augmentation_type not in self.DISABLED_AUGS:
                                try:
                                    # re-arrange the range
                                    flag_rearrange = False
                                    for item in self.RANGE_MAPPING_FACTORS:
                                        if item == augmentation_type:
                                            flag_rearrange = True
                                            factor = int(self.RANGE_MAPPING_FACTORS[augmentation_type])
                                            augmentation_option = {'augmentation_type': self.AUGMENTATION_MAP[augmentation_type],
                                                                'range': tuple(ti / factor for ti in augmentation_value)}
                                    if not flag_rearrange:
                                        augmentation_option = {'augmentation_type': self.AUGMENTATION_MAP[augmentation_type],
                                                            'range': tuple(augmentation_value)}
                                except KeyError as e:
                                    print(f'[ERROR] {e}')
                                    pass
                            else:
                                continue
                        augmentation_options_list.append(augmentation_option)
            # get the dataset version
            version_id = doc['versionNo']
            # read pending task status
            uncompleted_task_list = []
            for item in doc:
                if item == 'taskStatus':
                    task_already_available = True

            if task_already_available:
                if doc['taskStatus']['state'] == "complete":
                    return 2
                elif doc['taskStatus']['state'] == "pending":
                    task_stat_list = doc['taskStatus']['tasks']
                    for task in task_stat_list:
                        if task['state'] == 'pending':
                            uncompleted_task_list.append(
                                [task['task'], lable_list, group_id, version_id, augmentation_options_list])
            else:
                return 1

            if len(uncompleted_task_list) != 0:
                print(uncompleted_task_list)
                return uncompleted_task_list

        except Exception as e:
            var = traceback.format_exc()
            self.dataset_logger.debug(f'[{dataset_id}]ERROR warm_start(): {var}')
            if str(e) == 'READ_ERROR':
                print("No such ID")
                return -1
            if str(e) == 'READ ERROR':
                print("No such ID")
                return -1


    # This function returns  the argument list (for the whole dataset) for the pool_function
    def create_dataset(self, dataset_id):
        # Check for warm start at first
        ret = self.warm_start(dataset_id)
        if ret == -1:
            # no such database_id
            self.dataset_logger.debug(f'[{dataset_id}][fn:create_dataset()] : No such dataset id')
            raise Exception("NO_SUCH_DATASET_ID")
        elif ret == 2:
            self.dataset_logger.debug(f'[{dataset_id}][fn:create_dataset()] : Already completed Dataset')
    
        elif ret == 1:
            self.dataset_logger.debug(f'[{dataset_id}][fn:create_dataset()] : Start tasks from beginning')
            # get the dataset document
            doc = self.dataset_db.get_one_document({"_id": ObjectId(dataset_id)})
            # get labels dictionary
            lable_list = self.get_labels(dataset_id)
            # get dataset group id
            group_id = str(doc['dataSetGroupId'])
            # get the augmentation list
            augmentation_options_list = []
            if "augmentationTypes" in doc:
                augmentations = doc['augmentationTypes']['IMAGE_LEVEL']
                for augmentation in augmentations:
                    for aug in augmentation['properties']:
                        augmentation_value = aug['values']
                        augmentation_type = aug['id']
                        augmentation_option = {'augmentation_type': None,
                                            'keep_size': None, 'range': None}
                        if augmentation_type == 'CLOCKWISE':
                            if len(augmentation_value) > 0 and augmentation_value[0]:
                                augmentation_option = {'augmentation_type': self.AUGMENTATION_MAP[augmentation_type],
                                                    'keep_size': self.FLAG_KEEP_SIZE}
                            else:
                                continue
                        elif augmentation_type == 'UPSIDE_DOWN':
                            if len(augmentation_value) > 0 and augmentation_value[0]:
                                augmentation_option = {'augmentation_type': self.AUGMENTATION_MAP[augmentation_type],
                                                    'keep_size': self.FLAG_KEEP_SIZE}
                            else:
                                continue
                        elif augmentation_type == 'COUNTER_CLOCKWISE':
                            if len(augmentation_value) > 0 and augmentation_value[0]:
                                augmentation_option = {'augmentation_type': self.AUGMENTATION_MAP[augmentation_type],
                                                    'keep_size': self.FLAG_KEEP_SIZE}
                            else:
                                continue
                        elif augmentation_type == 'FLIP_HORIZONTAL':
                            if len(augmentation_value) > 0 and augmentation_value[0]:
                                augmentation_option = {'augmentation_type': self.AUGMENTATION_MAP[augmentation_type]}
                            else:
                                continue
                        elif augmentation_type == 'FLIP_VERTICAL':
                            if len(augmentation_value) > 0 and augmentation_value[0]:
                                augmentation_option = {'augmentation_type': self.AUGMENTATION_MAP[augmentation_type]}
                            else:
                                continue
                        else:
                            if augmentation_type not in self.DISABLED_AUGS:
                                try:
                                    # re-arrange the range
                                    flag_rearrange = False
                                    for item in self.RANGE_MAPPING_FACTORS:
                                        if item == augmentation_type:
                                            flag_rearrange = True
                                            factor = int(self.RANGE_MAPPING_FACTORS[augmentation_type])
                                            augmentation_option = {'augmentation_type': self.AUGMENTATION_MAP[augmentation_type],
                                                                'range': tuple(ti / factor for ti in augmentation_value)}
                                    if not flag_rearrange:
                                        augmentation_option = {'augmentation_type': self.AUGMENTATION_MAP[augmentation_type],
                                                            'range': tuple(augmentation_value)}
                                except KeyError as e:
                                    print(f'[ERROR] {e}')
                                    pass
                            else:
                                continue
                        augmentation_options_list.append(augmentation_option)
            # get the dataset version
            version_id = doc['versionNo']
            # add the task list status to AnnotationDataset initial state is pending
            dataset_status = {'state': 'pending', 'tasks': []}
            # read the task list from database doc
            task_list = []
            _list = doc['taskList']
            for task in _list:
                task_list.append(str(task))
            for task in task_list:
                temp = {"task": task, "state": "pending", "error":"none"}
                dataset_status['tasks'].append(temp)

            self.dataset_db.find_one_update({"_id": ObjectId(dataset_id)}, {"taskStatus": dataset_status})

            initial_task_list = []
            for task in task_list:
                initial_task_list.append([task, dataset_id, lable_list, group_id, version_id, augmentation_options_list])

            return initial_task_list

        elif ret is None:
            print("[Info] No tasks")
            self.dataset_logger.debug(f'[{dataset_id}][fn:create_dataset()] : No tasks')
    

        else:
            # there are uncompleted tasks , ret -> uncompleted_task_list
            print("[Info] There are uncompleted tasks")
            self.dataset_logger.debug(f'[{dataset_id}][fn:create_dataset()] : There are uncompleted tasks in this dataset')
            uncompleted_task_list = []
            for task_item in ret:
                uncompleted_task_list.append(
                    [task_item[0], dataset_id, task_item[1], task_item[2], task_item[3], task_item[4]])
                    # task_item[5], task_item[6], task_item[7], task_item[8]])

            return uncompleted_task_list

    # This function is used to create a dataset sample
    def sample_zip_create(self, dataset_id):
        dataSet = self.dataset_db.get_one_document({"_id": ObjectId(dataset_id)})
        percentage_list = []
        for i in range(len(dataSet['splitCount'])):
            percentage_list.append(int(dataSet['splitCount'][i]['percentage']))
        frame_list = []
        for i in range(len(percentage_list)):
            param = [
                {"$unwind": "$datasetVersions"},
                {"$match": {"datasetVersions.versionId": ObjectId(dataset_id), "datasetVersions.datasetType": i + 1,
                            "datasetVersions.textFiles.YOLO": {"$exists": True}}},
                {"$project": {"datasetVersions": 1, "imageUrl": 1}},
                {"$sample": {"size": percentage_list[i]}}
            ]
            doc = self.frame_db.aggregate_documents(param)
            frame_list.append(doc)
        dataSetVersion_id = dataSet['_id']
        initialPath = os.path.join(f'./sampleTemp')
        if not os.path.exists(initialPath):
            os.mkdir(initialPath)
        path = os.path.join(f'./sampleTemp/{dataSetVersion_id}')
        if not os.path.exists(path):
            os.mkdir(path)
        for i in range(len(percentage_list)):
            for data in frame_list[i]:
                dataset_version = data['datasetVersions']
                textFile = dataset_version['textFiles']['YOLO']
                imageName = data['imageUrl'].split("/")
                lastElement = imageName.pop()
                lastElement = lastElement.split(".")
                imageName.append(lastElement[0])
                imageName = '_'.join(imageName)
                self.s3_bucket.s3_download(self.s3_client,f'./sampleTemp/{dataSetVersion_id}/{imageName}.jpg', data['imageUrl'])
                self.s3_bucket.s3_download(self.s3_client,f'./sampleTemp/{dataSetVersion_id}/{imageName}.txt', textFile)
        shutil.make_archive(path, 'zip', path)
        savePath = self.s3_bucket.s3_upload_sample(self.s3_client,path + '.zip', dataSet['dataSetGroupId'], dataSetVersion_id)
        os.remove(os.path.join(f'./sampleTemp/{dataSetVersion_id}.zip'))
        shutil.rmtree(path)
        return savePath

    # This function is used in the multithreading pool
    def pool_function(self, data):
        task = data[0]
        dataset_id = data[1]
        lbl = data[2]
        group_id = data[3]
        version_id = data[4]
        augmentation_options_list = data[5]

        try:
            self.process_one_task(task, lbl, group_id, version_id, dataset_id, augmentation_options_list)
            # if task is finished update task status in AnnotationDataset
            self.dataset_db.find_one_update({"_id": ObjectId(dataset_id), "taskStatus.tasks.task": task},
                                    {"taskStatus.tasks.$.state": 'complete'}
                                    )
        except Exception as e:
            print(e)
            var = traceback.format_exc()
            self.dataset_db.find_one_update({"_id": ObjectId(dataset_id), "taskStatus.tasks.task": task},
                                        {"taskStatus.tasks.$.error": var}
                                        )
            self.dataset_logger.debug(f'[{dataset_id}][{task}][fn pool_function()] : {var}')



    # The main function whichcalled in the flask API
    def process_dataset(self, dataset_id):
        self.dataset_logger.debug(f'Dataset generation started : {dataset_id}')
        video_content_folder = self.CLIP_BASE + dataset_id 
        if not os.path.exists(video_content_folder):
            os.makedirs(video_content_folder)
        arg_list = self.create_dataset(dataset_id)
        # set export formats progress to 0 when starting dataset creation
        self.dataset_db.find_one_update({"_id": ObjectId(dataset_id)}, {"exportFormats.YOLO.progress": 0})
        masterData = self.masterData_db.get_one_document({"_id": ObjectId("619dd3ff8c115a50e135b303")})  # _id of master data only record
        yoloData = masterData['exportFormats']['YOLO']
        yoloData['createdAt'] = datetime.now()
        yoloData['lastUpdatedAt'] = datetime.now()
        yoloData['progress'] = 0
        self.dataset_db.find_one_update({"_id": ObjectId(dataset_id)}, {"exportFormats.YOLO": yoloData})

        st = time.time()
      
        # split long argument list into small sub lists to avoid creating more threads
        _args = self.split_task_list(arg_list, self.PROCESSES)

        for task_list in _args:
            p = ThreadPool(self.PROCESSES)
            p.map(self.pool_function, task_list)
            p.close()
            p.join()

    
        print(f"[INFO] Time elapsed for dataset generation: {time.time() - st}")
        self.dataset_logger.debug(f'[{dataset_id}]Took {time.time() - st} seconds')
        dataset_complete = True
        yoloData['lastUpdatedAt'] = datetime.now()
        yoloData['progress'] = 100
        # Update datasetVersion with YOLO export format and progress
        self.dataset_db.find_one_update({"_id": ObjectId(dataset_id)}, {"exportFormats.YOLO": yoloData})
        # make sure overall state to complete
        doc = self.dataset_db.get_one_document({"_id": ObjectId(dataset_id)})
        totalImageCount = 0
        totalImageSize = 0
        totalTextFileCount = 0
        totalAugImageSize = 0
        for item in doc:
            if item == 'taskStatus':
                states = doc['taskStatus']['tasks']
                for task in states:
                    if task['state'] == 'pending':
                        dataset_complete = False
                    else:
                        totalImageCount += task['imageCount']
                        totalImageSize += task['imageDataSize']

                        try:
                            # totalTextFileCount += task['augmentationFileCount']
                            # augmentation file count and size
                            # augmentationFileCounts
                            if "augmentationFileCounts" in task:
                                augFieldData = task["augmentationFileCounts"]
                                for (augKey,augVal) in augFieldData.items():
                                    if "count" in augVal:
                                        totalTextFileCount += int(augVal['count'])
                                    if "size" in augVal:
                                        totalAugImageSize += int(augVal['size'])

                        except Exception as e:
                            var = traceback.format_exc()
                            self.dataset_logger.debug(f'ERROR augmentationFileCount): {var}')
                            print(f'[ERROR] [augmentationFileCount] {var}')


        if dataset_complete:
            self.dataset_db.find_one_update({"_id": ObjectId(dataset_id)}, {"taskStatus.state": 'complete',
                                                                    "imageCount": (totalImageCount + totalTextFileCount),
                                                                    'size': (totalImageSize + totalAugImageSize),
                                                                    "exportFormats.YOLO.fileCount": (totalTextFileCount + totalImageCount)
                                                                    })
            self.dataset_logger.debug(f'Dataset {dataset_id} successfully generated')
            print(f'Total image count:{totalImageCount}, size:{totalImageSize}')
            print(f'Dataset {dataset_id} successfully generated')
        else:
            self.dataset_logger.warn(f'Dataset {dataset_id} generation incomplete!')
            print(f'Dataset {dataset_id} generation incomplete!')
        
        sampleZipFile = self.sample_zip_create(dataset_id)
        self.dataset_db.find_one_update({"_id": ObjectId(dataset_id)}, {"exportFormats.YOLO.sample": sampleZipFile})


# if __name__ == '__main__':

"""
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.

maintainers : dinusha@zoomi.ca, tharindu@zoomi.ca, isuruj@zoomi.ca

This python script handles the dataset edit process.
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
from logger import get_debug_logger
import random

# Read settings from config file
params = configparser.ConfigParser(os.environ)

# logging configuration
dataset_logger = get_debug_logger('dataset_processor', './logs/dataset_edit_processor.log')

CONFIG_FILE_PATH = 'config.cfg'
params.read(CONFIG_FILE_PATH)

MDB_USER = f"{params.get('MongoDB', 'user_name')}"
MDB_PASS = f"{params.get('MongoDB', 'password')}"
MDB_NAME = f"{params.get('MongoDB', 'db_name')}"

S3_REGION = f"{params.get('S3', 'region')}"
S3_ACCESS_KEY = f"{params.get('S3', 'access_key_id')}"
S3_SECRET_KEY = f"{params.get('S3', 'secret_access_key')}"
S3_BUCKET = f"{params.get('S3', 'bucket_name')}"

TASK_BASE = f"{params.get('Folders', 'task_base')}"
CLIP_BASE = f"{params.get('Folders', 'clip_base')}"
AUG_BASE = f"{params.get('Folders', 'aug_base')}"
S3_AUG_BASE = f"{params.get('Folders', 's3_base_aug')}"

AUGMENTATION_MAP = eval(params.get('Augmentation', 'aug_map'))
FLAG_KEEP_SIZE = eval(params.get('Augmentation', 'keep_size_crop'))
DISABLED_AUGS = eval(f"{params.get('Augmentation', 'disabled_augs')}")
RANGE_MAPPING_FACTORS = eval(f"{params.get('Augmentation', 'range_map')}")

# number of cpu cores to use
PROCESSES = int(f"{params.get('Cores', 'cpu_cores')}")

# Mongo DB configurations
task_db = MongoDBmanager(MDB_USER, MDB_PASS, MDB_NAME, 'AnnotationTask')
frame_db = MongoDBmanager(MDB_USER, MDB_PASS, MDB_NAME, 'AnnotationFrame')
dataset_db = MongoDBmanager(MDB_USER, MDB_PASS, MDB_NAME, 'AnnotationDatasetVersion')
masterData_db = MongoDBmanager(MDB_USER, MDB_PASS, MDB_NAME, 'MasterData')
# print("mDB pass: "+MDB_PASS)

# S3 configurations
s3_bucket = s3_bucket_manager(S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET)

"""
This function  get information from task
input - task id
"""
def get_task_info(zoomi_task_id):
    # get AnnotationTask from the db
    doc = task_db.get_one_document({"_id": ObjectId(zoomi_task_id)})

    video_w = doc['videoResolutionWidth']
    video_h = doc['videoResolutionHeight']
    s3_path = doc['S3_url']
    frame_count = doc['frameCount']

    return s3_path, video_h, video_w, frame_count



# updated augmentation function
def process_augmentations(zoomi_task_id, frame_id_list, augmentation_options_list, version_id, group_id, dataset_id, aug_folder, task_folder):

    frame_doc = frame_db.get_documents({"taskId": ObjectId(zoomi_task_id)})

    for i,augmentation_options in enumerate(augmentation_options_list):
        for frame_id in frame_id_list[i]:
            data = {}

            # get the frame object id
            obj_id = frame_doc[frame_id -1]['_id']
            # dataset_logger.debug(f' oid : {obj_id}')

            # aug_folder = TASK_BASE + zoomi_task_id + AUG_BASE
            # task_folder = TASK_BASE + zoomi_task_id
            img_path = f"{task_folder}/{zoomi_task_id}_{frame_id}.jpg"
            txt_path = f"{task_folder}/{zoomi_task_id}_{frame_id}.txt"

            img_save_path = aug_folder + '/' + f'{zoomi_task_id}_{augmentation_options["augmentation_type"]}_{str(frame_id)}.jpg'
            txt_save_path = aug_folder + '/' + f'{zoomi_task_id}_{augmentation_options["augmentation_type"]}_{str(frame_id)}.txt'
            image_aug, bbs_aug = augmentation_processor.augment_one_image(augmentation_options, img_path, txt_path)
            augmentation_processor.save_images(bbs_aug, image_aug, img_save_path, txt_save_path)
            s3_txt = 'dataset/{}/{}/{}/{}/{}'.format(group_id, zoomi_task_id, frame_id, S3_AUG_BASE,
                                                    f'{version_id}_{augmentation_options["augmentation_type"]}_{str(frame_id)}.txt')
            s3_img = 'dataset/{}/{}/{}/{}/{}'.format(group_id, zoomi_task_id, frame_id, S3_AUG_BASE,
                                                    f'{augmentation_options["augmentation_type"]}_{str(frame_id)}.jpg')
            data[f'{augmentation_options["augmentation_type"]}'] = {"textFiles": s3_txt, "imageUrl": s3_img}

             # update frame DB
            tempDSVersion_augmentations = {
                                "datasetVersions.$.augmentationImages": data
                            }
            frame_db.find_one_update({"_id": ObjectId(obj_id), "datasetVersions.versionId": ObjectId(dataset_id)}, tempDSVersion_augmentations)


"""
This function split frames task video
input - task id , s3 path for the video
"""
def split_frames(task_id, video_path, dataset_id):
    task_folder = TASK_BASE + task_id + dataset_id
    # create a folder using task name if not exist
    if not os.path.exists(task_folder):
        os.makedirs(task_folder)
    elif os.path.exists(task_folder):
        # This means that another dataset version is already using the same task,
        # to avoid using same files, create new task folder with dataset_id prefix
        shutil.rmtree(task_folder)
        # task_folder = TASK_BASE + task_id + dataset_id
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
            cv2.imwrite(f"{task_folder}/{task_id}_{count}_thumbnail.jpg",
                        m_np)  # save thumbnail of a frame as JPEG file
        except IOError:
            pass

        success, image = vidcap.read()
        # print('Read a new frame: ', success)
        imageCount += 1
        imageDataSize += os.stat(f"{task_folder}/{task_id}_{count}.jpg").st_size
        count += 1
    vidcap.release()
    print(f"task image count:{imageCount}, size:{imageDataSize}")
    tempTaskData = {
        "taskStatus.tasks.$.imageCount": imageCount,
        "taskStatus.tasks.$.imageDataSize": imageDataSize
    }
    dataset_db.find_one_update({"_id": ObjectId(dataset_id), "taskStatus.tasks.task": task_id}, tempTaskData)
    # dataset_db.find_one_update({"_id" : ObjectId(dataset_id)},{'$inc': {'imageCount': int(imageCount), 'size': int(imageDataSize)}})


# This function will be run in a process pool
# TODO add dataset type to these
# inputs are task id and labels dictionary
def process_one_task(zoomi_task_id, labels, group_id, version_id, dataset_id, augmentation_options_list):
    labels_available = False

    task_content_folder = TASK_BASE + zoomi_task_id + dataset_id
    # if not os.path.exists(task_content_folder):
    #     os.makedirs(task_content_folder)
    # elif os.path.exists(task_content_folder):
    #     # This means that another dataset version is already using the same task,
    #     # to avoid using same files, create new task folder with dataset_id prefix
    #     # task_content_folder = TASK_BASE + zoomi_task_id + dataset_id 
    #     os.makedirs(task_content_folder)

    # Get task information's
    video_path, h_img, w_img, frame_count = get_task_info(zoomi_task_id)
    # download video from s3 bucket
    save_path = CLIP_BASE + video_path.split('/')[-1]
    print(f'SAVE PATH : {save_path}')

    # don't dawnload if video already exists (incase same task is used in another dataset version)
    if not os.path.exists(save_path):
        s3_bucket.s3_download(save_path, video_path)


    # split video in to frames
    split_frames(zoomi_task_id, save_path, dataset_id)
    # delete video file
    # os.remove(save_path)

    # create augmentation folder
    aug_folder = TASK_BASE + zoomi_task_id + dataset_id+ AUG_BASE

    if not os.path.exists(aug_folder):
        os.makedirs(aug_folder)
    elif os.path.exists(aug_folder):
        # This means that another dataset version is already using the same task,
        # to avoid using same files, create new task folder with dataset_id prefix
        shutil.rmtree(aug_folder)
        # aug_folder = TASK_BASE + zoomi_task_id + dataset_id + AUG_BASE
        os.makedirs(aug_folder)

    # upload all the frames of task to S3
    s3_bucket.s3_upload_images(zoomi_task_id, task_content_folder, group_id)

    # get AnnotationFrame from the db
    doc = frame_db.get_documents({"taskId": ObjectId(zoomi_task_id)})
    # print(doc)

    # select the frames randomly for augmentations
    frame_id_list = []
    arr = np.arange(1,frame_count+1)
    frame_list = arr.tolist()
    num_of_frames_to_augment = 0.1*frame_count
    num_of_aug = len(augmentation_options_list)

    for i in range(0,num_of_aug):
        aug_frame_id_list = random.sample(frame_list, int(num_of_frames_to_augment))
        frame_id_list.append(aug_frame_id_list)

    print("AUG_FRAMES",frame_id_list)
    dataset_logger.debug(f'List of Augmentation frames [tasks[frames]]: {frame_id_list}')

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
                # No specific labels were given generate annotation files for all the labels in frames
                # print("[Info] generating annotations for all the labels")
                default_anno = [lbl, (x + w / 2) / w_img, (y + h / 2) / h_img, w / w_img, h / h_img]
                anno_list.append(default_anno)


            # labels with attributes
            elif len(labels) != 0:
                # print("[Info] generating annotations according to given labels")
                labels_available = True

                # checkout each label-attribute dictionary
                for label_dic in labels:
                    # first check the main label
                    if lbl == label_dic['label']:
                        # then check the attribute
                        if attr == label_dic['attributeValues']:
                            yolo_anno = [label_dic['label_index'], (x + w / 2) / w_img, (y + h / 2) / h_img, w / w_img,
                                         h / h_img]
                            anno_list.append(yolo_anno)

        with open(f'{TASK_BASE}{zoomi_task_id}{dataset_id}/{zoomi_task_id}_{str(frame_id)}.txt', 'a') as textfile:
            for i in range(len(anno_list)):
                for j in range(len(anno_list[i])):
                    textfile.write(str(anno_list[i][j]))
                    textfile.write(' ')
                textfile.write('\n')
        textfile.close()


        if not labels_available:
            temp = {
                "imageUrl": f'dataset/{group_id}/{zoomi_task_id}/{frame_id}/{frame_id}.jpg',
                "thumbnailUrl": f'dataset/{group_id}/{zoomi_task_id}/{frame_id}/{frame_id}_thumbnail.jpg',
            }
            tempDSVersion = {
                # "datasetVersions.$.versionNo" : version_id,
                # "datasetVersions.$.augmentationImages": augData,
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
                # "datasetVersions.$.versionNo" : version_id,
                # "datasetVersions.$.augmentationImages": augData,
                "datasetVersions.$.textFiles": {
                    "YOLO": f'dataset/{group_id}/{zoomi_task_id}/{frame_id}/{version_id}_{frame_id}.txt'
                }
            }
           

        # get authenticated s3 url for thumbnail
        thumbnailExpirationTime = 86400
        thumbnailAuthUrl = s3_bucket.s3_getAuthenticatedUrl(temp['thumbnailUrl'], thumbnailExpirationTime)
        imageAuthUrl = s3_bucket.s3_getAuthenticatedUrl(temp['imageUrl'], thumbnailExpirationTime)
        thumbnailUrlExpDate = datetime.now() + timedelta(seconds=thumbnailExpirationTime)
        temp['awsThumbnailUr'] = thumbnailAuthUrl
        temp['awsThumbnailExpiredDate'] = thumbnailUrlExpDate
        temp["awsUrl"] = imageAuthUrl
        temp['awsExpiredDate'] = thumbnailUrlExpDate
        # -----------------
        # update db
        frame_db.find_one_update({"_id": obj_id}, temp)
        frame_db.find_one_update({"_id": obj_id, "datasetVersions.versionId": ObjectId(dataset_id)}, tempDSVersion)

    # start augmentation
    if len(augmentation_options_list) > 0:
        process_augmentations(zoomi_task_id, frame_id_list, augmentation_options_list, version_id, group_id, dataset_id, aug_folder, task_content_folder)

    print(f"Completed task id: {zoomi_task_id}")
    # upload all the text file to S3
    s3_bucket.s3_upload_textfiles(zoomi_task_id, task_content_folder, group_id, version_id)

    # upload all the text file to S3
    if len(augmentation_options_list) > 0:
        # aug_folder = TASK_BASE + zoomi_task_id + AUG_BASE
        s3_bucket.s3_upload_images_aug(zoomi_task_id, aug_folder, group_id, version_id)

    # delete frames in temp task folder
    shutil.rmtree(task_content_folder)


# this function read labels with attributes
def get_labels(dataset_id):
    doc = dataset_db.get_one_document({"_id": ObjectId(dataset_id)})
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


"""
This function handles the warm start when a crash happen is the system
input : dataset id
outputs : 1 , if no taskStatus related info (This means we need to start from the beginning)
            -1 , No such dataset id
            uncompleted_task_list , if there are some pending tasks in the dataset DB

"""
def warm_start(dataset_id):
    task_already_available = False

    try:
        # get the dataset document
        print("datasetVersionId: " + dataset_id)
        doc = dataset_db.get_one_document({"_id": ObjectId(dataset_id)})

        # get labels dictionary
        # lable_dic = doc['labels']
        lable_list = get_labels(dataset_id)
        print(lable_list)

        # get dataset group id
        group_id = str(doc['dataSetGroupId'])
        # print("group_id: " + group_id)

        # get dataset augmentation options
        augmentation_options_list = []
        if "augmentationTypes" in doc:
            augmentations = doc['augmentationTypes']['IMAGE_LEVEL']
            for augmentation in augmentations:
                for aug in augmentation['properties']:
                    augmentation_value = aug['values']
                    if len(augmentation_value) > 0:
                        print(f"[INFO] AUG VALUES {augmentation_value[0]}")
                    augmentation_type = aug['id']
                    augmentation_option = {'augmentation_type': None,
                                           'keep_size': None, 'range': None}
                    if augmentation_type == 'CLOCKWISE':
                        if len(augmentation_value) > 0 and augmentation_value[0]:
                            augmentation_option = {'augmentation_type': AUGMENTATION_MAP[augmentation_type],
                                                   'keep_size': FLAG_KEEP_SIZE}
                        else:
                            continue

                    elif augmentation_type == 'UPSIDE_DOWN':
                        if len(augmentation_value) > 0 and augmentation_value[0]:
                            augmentation_option = {'augmentation_type': AUGMENTATION_MAP[augmentation_type],
                                                   'keep_size': FLAG_KEEP_SIZE}
                        else:
                            continue

                    elif augmentation_type == 'COUNTER_CLOCKWISE':
                        if len(augmentation_value) > 0 and augmentation_value[0]:
                            augmentation_option = {'augmentation_type': AUGMENTATION_MAP[augmentation_type],
                                                   'keep_size': FLAG_KEEP_SIZE}
                        else:
                            continue

                    elif augmentation_type == 'FLIP_HORIZONTAL':
                        if len(augmentation_value) > 0 and augmentation_value[0]:
                            augmentation_option = {'augmentation_type': AUGMENTATION_MAP[augmentation_type]}
                        else:
                            continue

                    elif augmentation_type == 'FLIP_VERTICAL':
                        if len(augmentation_value) > 0 and augmentation_value[0]:
                            augmentation_option = {'augmentation_type': AUGMENTATION_MAP[augmentation_type]}
                        else:
                            continue

                    else:
                        if augmentation_type not in DISABLED_AUGS:
                            try:
                                # re-arrange the range
                                flag_rearrange = False
                                for item in RANGE_MAPPING_FACTORS:
                                    if item == augmentation_type:
                                        flag_rearrange = True
                                        factor = int(RANGE_MAPPING_FACTORS[augmentation_type])
                                        augmentation_option = {'augmentation_type': AUGMENTATION_MAP[augmentation_type],
                                                               'range': tuple(ti / factor for ti in augmentation_value)}

                                if not flag_rearrange:
                                    augmentation_option = {'augmentation_type': AUGMENTATION_MAP[augmentation_type],
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
        dataset_logger.debug(f'ERROR warm_start(): {var}')
        if str(e) == 'READ_ERROR':
            print("No such ID")
            return -1
        if str(e) == 'READ ERROR':
            print("No such ID")
            return -1


# dataset creation main function
# dataset_id must be a string
def create_dataset(dataset_id):
    # Check for warm start at first
    ret = warm_start(dataset_id)

    if ret == -1:
        # no such database_id
        dataset_logger.debug(f'create_dataset() : No such dataset id')
        raise Exception("NO_SUCH_DATASET_ID")

    elif ret == 2:
        print("[Info] Already completed Dataset")
        dataset_logger.debug(f'Already completed Dataset')
        sys.exit()

    elif ret == 1:
        print("[Info] Start tasks from beginning")
        dataset_logger.debug(f'Start tasks from beginning')

        # get the dataset document
        doc = dataset_db.get_one_document({"_id": ObjectId(dataset_id)})

        # get labels dictionary
        # lable_dic = doc['labels']
        lable_list = get_labels(dataset_id)

        # get dataset group id
        group_id = str(doc['dataSetGroupId'])
        # get dataset augmentation options
        augmentation_options_list = []
        if "augmentationTypes" in doc:
            augmentations = doc['augmentationTypes']['IMAGE_LEVEL']
            for augmentation in augmentations:
                for aug in augmentation['properties']:
                    augmentation_value = aug['values']
                    if len(augmentation_value) > 0:
                        print(f"[INFO] AUG VALUES {augmentation_value[0]}")
                    augmentation_type = aug['id']
                    augmentation_option = {'augmentation_type': None,
                                           'keep_size': None, 'range': None}
                    if augmentation_type == 'CLOCKWISE':
                        if len(augmentation_value) > 0 and augmentation_value[0]:
                            augmentation_option = {'augmentation_type': AUGMENTATION_MAP[augmentation_type],
                                                   'keep_size': FLAG_KEEP_SIZE}
                        else:
                            continue

                    elif augmentation_type == 'UPSIDE_DOWN':
                        if len(augmentation_value) > 0 and augmentation_value[0]:
                            augmentation_option = {'augmentation_type': AUGMENTATION_MAP[augmentation_type],
                                                   'keep_size': FLAG_KEEP_SIZE}
                        else:
                            continue

                    elif augmentation_type == 'COUNTER_CLOCKWISE':
                        if len(augmentation_value) > 0 and augmentation_value[0]:
                            augmentation_option = {'augmentation_type': AUGMENTATION_MAP[augmentation_type],
                                                   'keep_size': FLAG_KEEP_SIZE}
                        else:
                            continue

                    elif augmentation_type == 'FLIP_HORIZONTAL':
                        if len(augmentation_value) > 0 and augmentation_value[0]:
                            augmentation_option = {'augmentation_type': AUGMENTATION_MAP[augmentation_type]}
                        else:
                            continue

                    elif augmentation_type == 'FLIP_VERTICAL':
                        if len(augmentation_value) > 0 and augmentation_value[0]:
                            augmentation_option = {'augmentation_type': AUGMENTATION_MAP[augmentation_type]}
                        else:
                            continue

                    else:
                        if augmentation_type not in DISABLED_AUGS:
                            try:
                                # re-arrange the range
                                flag_rearrange = False
                                for item in RANGE_MAPPING_FACTORS:
                                    if item == augmentation_type:
                                        flag_rearrange = True
                                        factor = int(RANGE_MAPPING_FACTORS[augmentation_type])
                                        augmentation_option = {'augmentation_type': AUGMENTATION_MAP[augmentation_type],
                                                               'range': tuple(ti / factor for ti in augmentation_value)}

                                if not flag_rearrange:
                                    augmentation_option = {'augmentation_type': AUGMENTATION_MAP[augmentation_type],
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

        dataset_db.find_one_update({"_id": ObjectId(dataset_id)}, {"taskStatus": dataset_status})

        initial_task_list = []
        for task in task_list:
            initial_task_list.append([task, dataset_id, lable_list, group_id, version_id, augmentation_options_list])

        return initial_task_list

    elif ret is None:
        print("[Info] No tasks")
        dataset_logger.debug(f'No tasks')
        sys.exit()

    else:
        # there are uncompleted tasks , ret -> uncompleted_task_list
        print("[Info] There are uncompleted tasks")
        # print(ret)
        dataset_logger.debug(f'There are uncompleted tasks in this dataset')
        uncompleted_task_list = []
        for task_item in ret:
            uncompleted_task_list.append(
                [task_item[0], dataset_id, task_item[1], task_item[2], task_item[3], task_item[4]])

        return uncompleted_task_list


# function used in multiprocessing pool
def pool_function(data):
    task = data[0]
    dataset_id = data[1]
    lbl = data[2]
    group_id = data[3]
    version_id = data[4]
    augmentation_options_list = data[5]

    try:
        process_one_task(task, lbl, group_id, version_id, dataset_id, augmentation_options_list)
        # if task is finished update task status in AnnotationDataset
        dataset_db.find_one_update({"_id": ObjectId(dataset_id), "taskStatus.tasks.task": task},
                                   {"taskStatus.tasks.$.state": 'complete'}
                                   )
    except Exception as e:
        print(e)
        var = traceback.format_exc()
        dataset_db.find_one_update({"_id": ObjectId(dataset_id), "taskStatus.tasks.task": task},
                                    {"taskStatus.tasks.$.error": var}
                                    )
        dataset_logger.debug(f'ERROR pool_function(): {var}')


# function used for create DataSet sample
def sample_zip_create(dataset_id):
    dataSet = dataset_db.get_one_document({"_id": ObjectId(dataset_id)})
    print(dataSet['splitCount'])

    percentage_list = []
    for i in range(len(dataSet['splitCount'])):
        percentage_list.append(int(dataSet['splitCount'][i]['percentage']))
    print(percentage_list)
    frame_list = []
    for i in range(len(percentage_list)):
        param = [
            {"$unwind": "$datasetVersions"},
            {"$match": {"datasetVersions.versionId": ObjectId(dataset_id), "datasetVersions.datasetType": i + 1,
                        "datasetVersions.textFiles.YOLO": {"$exists": True}}},
            {"$project": {"datasetVersions": 1, "imageUrl": 1}},
            {"$sample": {"size": percentage_list[i]}}
            #   { "$limit":  percentage_list[i]}
        ]
        doc = frame_db.aggregate_documents(param)
        frame_list.append(doc)
    # print(frame_list)
    dataSetVersion_id = dataSet['_id']
    initialPath = os.path.join(f'./sampleTemp')
    if not os.path.exists(initialPath):
        os.mkdir(initialPath)
    path = os.path.join(f'./sampleTemp/{dataSetVersion_id}')
    if not os.path.exists(path):
        os.mkdir(path)
    for i in range(len(percentage_list)):
        for data in frame_list[i]:
            #   frame_id = data['_id']
            dataset_version = data['datasetVersions']
            textFile = dataset_version['textFiles']['YOLO']
            imageName = data['imageUrl'].split("/")
            lastElement = imageName.pop()
            lastElement = lastElement.split(".")
            imageName.append(lastElement[0])
            imageName = '_'.join(imageName)
            s3_bucket.s3_download(f'./sampleTemp/{dataSetVersion_id}/{imageName}.jpg', data['imageUrl'])
            s3_bucket.s3_download(f'./sampleTemp/{dataSetVersion_id}/{imageName}.txt', textFile)
    shutil.make_archive(path, 'zip', path)
    savePath = s3_bucket.s3_upload_sample(path + '.zip', dataSet['dataSetGroupId'], dataSetVersion_id)
    os.remove(os.path.join(f'./sampleTemp/{dataSetVersion_id}.zip'))
    shutil.rmtree(path)
    return savePath


# Main function to call in flask API
"""
This is the class for dataset creation
inputs : dataset_id
"""
def process_dataset(dataset_id):
    dataset_logger.debug(f'Dataset generation started : {dataset_id}')
    arg_list = create_dataset(dataset_id)

    # set export formats progress to 0 when starting dataset creation
    dataset_db.find_one_update({"_id": ObjectId(dataset_id)}, {"exportFormats.YOLO.progress": 0})

    st = time.time()
    with ThreadPool(PROCESSES) as p:
        p.map(pool_function, arg_list)
        p.close()

    print(f"[INFO] Time elapsed for dataset generation: {time.time() - st}")
    dataset_logger.debug(f'Took {time.time() - st} seconds')

    dataset_complete = True

    st_ = time.time()
    # Add exportFormat for YOLO----------
    # Get deta from masterData
    masterData = masterData_db.get_one_document(
        {"_id": ObjectId("619dd3ff8c115a50e135b303")})  # _id of master data only record
    yoloData = masterData['exportFormats']['YOLO']
    yoloData['createdAt'] = datetime.now()
    yoloData['lastUpdatedAt'] = datetime.now()
    yoloData['progress'] = 100
    try:
        yoloData['sample'] = sample_zip_create(dataset_id)
    except Exception as e:
        var = traceback.format_exc()
        dataset_logger.debug(f'ERROR sample_zip_create(): {var}')
        print(f'[ERROR] [sample_zip_create()] {e}')
        pass
    # Update datasetVersion with YOLO export format and progress
    dataset_db.find_one_update({"_id": ObjectId(dataset_id)}, {"exportFormats.YOLO": yoloData})

    # make sure overall state to complete
    doc = dataset_db.get_one_document({"_id": ObjectId(dataset_id)})

    print(f"[INFO] Time elapsed for dataset generation: {time.time() - st_}")
    dataset_logger.debug(f'Took {time.time() - st_} seconds')

    totalImageCount = 0
    totalImageSize = 0
    for item in doc:
        if item == 'taskStatus':
            states = doc['taskStatus']['tasks']
            for task in states:
                if task['state'] == 'pending':
                    dataset_complete = False
                else:
                    totalImageCount += task['imageCount']
                    totalImageSize += task['imageDataSize']

            if dataset_complete:
                dataset_db.find_one_update({"_id": ObjectId(dataset_id)}, {"taskStatus.state": 'complete',
                                                                           "imageCount": totalImageCount,
                                                                           'size': totalImageSize})
                dataset_logger.debug(f'Dataset {dataset_id} successfully generated')
                print(f'Total image count:{totalImageCount}, size:{totalImageSize}')
                print(f'Dataset {dataset_id} successfully generated')
            else:
                dataset_logger.warn(f'Dataset {dataset_id} generation incomplete!')
                print(f'Dataset {dataset_id} generation incomplete!')


# if __name__ == '__main__':


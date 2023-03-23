"""

Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.

maintainers : tharindu@zoomi.ca

This is the script for generate the tasks and relevant annotation videos
according to required selection frame rate.
output object:

task_object = {
                    "projectId": str(project_ID),
                    "taskId": str(taskID),
                    "frameStart": str(original_frame_numbers_per_task[0]),
                    "frameCount": str(frames_per_task),
                    "status": None,
                    "videoPath": str(out_put_path)
                }

reports:
    request types: (request_type)
        1. AA_bar (only tasks without annotations) : 0
        2. AA_tasks (tasks plus annotations)       : 1
        3. AA (auto annotations only)              : 2

    task completion types in AnnotationContentUpload (status)
        1. inprogress and failed : 0
        2. completed            : 1
        3. error                : 2

    annotation versions (AutoAnnotationVersion)
        1. no annotations: 0
        2. other annotation versions: (1,2,3....,n)

    audit status in AnnotationTask (auditStatus)
        0. Pending    : 0
        1. Accepted   : 1
        2. Rejected   : 2
        3. Fixed      : 3
        4. Fixing     : 4
        5. Completed  : 5

    task status in AnnotationTask (taskStatus)
        1 In Progress : 1
        2 Completed   : 2
        3 Not Started : 0

    force fully write the same video (force_write)
        1. no force write : 0
        2. force write    : 1
"""

import shutil
import cv2
import os
from mongo_manager import MongoDBmanager
from s3_manager import s3_bucket_manager
import bson
from datetime import timedelta
from datetime import datetime
from bson.objectid import ObjectId
from annotation_processor import inference
import ast
import configparser
import math
import image_processor
from logger import get_debug_logger
import json

content_processor_logger = get_debug_logger('content_processor', './logs/content_processor.log')
content_processor_warmstart_logger = get_debug_logger('content_processor_warmstart', './logs/content_processor_warmstart.log')

params = configparser.ConfigParser(os.environ)
CONFIG_FILE_PATH = 'config.cfg'
params.read(CONFIG_FILE_PATH)

MDB_USER = f"{params.get('MongoDB', 'user_name')}"
MDB_PASS = f"{params.get('MongoDB', 'password')}"
MDB_NAME = f"{params.get('MongoDB', 'db_name')}"

S3_REGION = f"{params.get('S3', 'region')}"
S3_ACCESS_KEY = f"{params.get('S3', 'access_key_id')}"
S3_SECRET_KEY = f"{params.get('S3', 'secret_access_key')}"
S3_BUCKET = f"{params.get('S3', 'bucket_name')}"

ALLOWED_EXTENSIONS_ = eval(f"{params.get('Content', 'allowed_extensions')}")
API_KEY = f"{params.get('App', 'API_key')}"
INFERENCE_TYPE = f"{params.get('Inference', 'type')}"
GPU_DEVICE = int(f"{params.get('Inference', 'gpu_device_id')}")
CONTENT_BASE = f"{params.get('Folders', 'content_base')}"
CONTENT_BASE_S3 = f"{params.get('Folders', 'content_base_s3')}"
FRAMES_PER_TASK = int(f"{params.get('Content', 'frames_per_task')}")


class processContent:
    def __init__(self):
        self.API_key = API_KEY
        self.ALLOWED_EXTENSIONS = ALLOWED_EXTENSIONS_

        self.mdb = MongoDBmanager(MDB_USER, MDB_PASS, MDB_NAME, 'AnnotationTask')
        self.mdb_progress = MongoDBmanager(MDB_USER, MDB_PASS, MDB_NAME, 'AnnotationContentUpload')
        self.project_update = MongoDBmanager(MDB_USER, MDB_PASS, MDB_NAME, 'AnnotationProject')
        self.mdb_annotation = MongoDBmanager(MDB_USER, MDB_PASS, MDB_NAME, 'AnnotationFrame')

        self.region_name = S3_REGION
        self.aws_access_key_id = S3_ACCESS_KEY
        self.aws_secret_access_key = S3_SECRET_KEY
        self.bucket_name = S3_BUCKET
        self.s3_bucket = s3_bucket_manager(self.region_name, self.aws_access_key_id, self.aws_secret_access_key,
                                           self.bucket_name)
        self.s3_client = self.s3_bucket.get_client()

        # model folder check
        model_existing_flag, errors_model = self.model_checker('content_processor')
        self.inference_type = INFERENCE_TYPE
        if not model_existing_flag:
            self.loger_handler('content_processor', f'{errors_model}', '[ERROR]', 'processContent __init__()')
        else:
            self.Inference = inference(GPU_DEVICE)

    @staticmethod
    def select_frames(req_fps, fps, frame_total):
        mod = round(fps) % req_fps
        frame_Select_flag = False
        divide_checker = None
        if mod != 0:
            frame_Select_flag = True
            divide_checker = round(fps) / mod

        div = int(fps / req_fps)
        div_ = round(fps / req_fps)
        frame_array = []
        count = 0
        if frame_Select_flag:
            while True:
                count = count + div
                for i in range(count - div, count + 1):
                    if i != 0:
                        if i % divide_checker == 0:
                            count = count + 1
                else:
                    if count > frame_total:
                        break
                    frame_array.append(count)
        else:
            while True:
                count = count + div_
                if count > frame_total:
                    break
                frame_array.append(count)

        return frame_array

    def skip_tasks(self, last_processed_frame_, selected_frames):
        if last_processed_frame_ == 0:
            return selected_frames, True
        else:
            if last_processed_frame_ != selected_frames[-1]:
                remove = selected_frames.index(last_processed_frame_) + 1
                selected_frames = selected_frames[remove:]
                return selected_frames, True
            else:
                self.loger_handler('content_processor', 'no uncompleted tasks for the video', '[INFO]', 'skip_tasks()')
                return [], False

    # check for existing content uploads in content upload collection by video name and if so delete them and rewrite
    def delete_and_rewrite_mdb_progress(self, content_path, object_update, project_ID):
        doc = self.mdb_progress.get_documents({"projectId": ObjectId(project_ID)})
        progress_flag = True
        ret_id = None
        for data in doc:
            db_cont_path = str(data['sourceFilePath'])
            _id_ = data['_id']
            if content_path == db_cont_path:
                progress_flag = True
                # since the front end will generate the content upload, there is no need to delete the existing record
                # and rewrite it so progress_flag always will be True
                self.mdb_progress.delete_one_document(ObjectId(str(_id_)))
                ret_id = self.mdb_progress.post_one_document(object_update)

                doc = self.project_update.get_documents({"_id": ObjectId(project_ID)})
                for it in doc:
                    if len(it['contentUploads']) != 0:
                        arr = []
                        for i in it['contentUploads']:
                            i_ = ObjectId(str(i))
                            arr.append(i_)
                        arr.remove(ObjectId(_id_))
                        arr.append(ret_id)
                        self.project_update.remove_feild(
                            {'_id': ObjectId(str(project_ID))}, {'contentUploads': ""})
                        for contents in arr:
                            self.project_update.find_one_push({'_id': ObjectId(str(project_ID))},
                                                              {'contentUploads': contents})
                    else:
                        self.project_update.find_one_push({'_id': ObjectId(str(project_ID))},
                                                          {'contentUploads': ret_id})

        if progress_flag:
            ret_id = self.mdb_progress.post_one_document(object_update)
            self.project_update.find_one_push({'_id': ObjectId(str(project_ID))}, {'contentUploads': ret_id})
        return ret_id

    def error_update(self, upload_id, error_content):
        self.mdb_progress.find_one_update({'_id': ObjectId(str(upload_id))},
                                          {'errorMessage': error_content})
        self.mdb_progress.find_one_update({'_id': ObjectId(str(upload_id))},
                                          {'status': 2})

    def update_mdb_progress(self, upload_id, object_update, project_ID):
        self.mdb_progress.delete_one_document(ObjectId(str(upload_id)))
        ret_id = self.mdb_progress.post_one_document(object_update)
        self.project_update.find_one_push({'_id': ObjectId(str(project_ID))}, {'contentUploads': ret_id})
        return ret_id

    # check for existing content uploads in AnnotationTask collection by video name and if so delete them
    def delete_mdb_tasks(self, content_path, project_ID, permission_flag):
        if permission_flag:
            doc = self.mdb.get_documents({"projectId": ObjectId(project_ID)})
            for data in doc:
                db_vid = '-'.join(data['taskName'].split('-')[2:])
                _id_ = data['_id']
                if content_path.split('/')[-1].split('.')[0] == db_vid:
                    self.mdb.delete_one_document(ObjectId(str(_id_)))
                    self.loger_handler('content_processor', f'deleted {data["_id"]} from collection AnnotationTasks', '[INFO]',
                                       'delete_mdb_tasks()')

    def delete_mdb_progress_tasks(self, content_path, project_ID, permission_flag):
        if permission_flag:
            doc = self.mdb_progress.get_documents({"projectId": ObjectId(project_ID)})
            for data in doc:
                db_vid = data['sourceFilePath'].split('/')[-1].split('.')[0]
                _id_ = data['_id']
                if content_path.split('/')[-1].split('.')[0] == db_vid:
                    self.mdb_progress.delete_one_document(ObjectId(str(_id_)))
                    self.loger_handler('content_processor', f'deleted {data["_id"]} from collection AnnotationContentUpload', '[INFO]',
                                       'delete_mdb_progress_tasks()')

    def content_process_auto_anno(self, project_ID, content_path, tasks_id_list,
                                  requested_anno_version, upload_id, logger_flag=None):

        self.mdb_progress.find_one_update({'_id': ObjectId(str(upload_id))},
                                          {'request_type': int(2)})
        self.mdb_progress.find_one_update({'_id': ObjectId(str(upload_id))},
                                          {'request_annotation_version': int(requested_anno_version)})
        self.mdb_progress.find_one_update({'_id': ObjectId(str(upload_id))},
                                          {'status': int(0)})
        self.mdb_progress.find_one_update({'_id': ObjectId(str(upload_id))},
                                          {'errorMessage': {}})
        self.mdb_progress.find_one_update({'_id': ObjectId(str(upload_id))},
                                          {'progress': int(0)})

        self.loger_handler(logger_flag, f'Task ID list: {tasks_id_list}', '[INFO]', 'content_process_auto_anno()')
        # need to be like this: ./contents/uploads/testproject_1/Cam1-15-16-9.mp4

        # s3_folder_path = contents/1l2HgvZVrWgpwT5MzboR53GhJm125kgMN/
        task_count = len(tasks_id_list)
        for task in range(task_count):
            self.loger_handler(logger_flag, f'processing task_id {tasks_id_list[task]}', '[INFO]', 'content_process_auto_anno()')
            doc = self.mdb.get_documents({"_id": ObjectId(str(tasks_id_list[task]))})
            content_path_s3 = doc[0]["S3_url"]
            annotation_object = []
            if doc[0]['taskName'] is not None:
                task_id = int(content_path_s3.split('/')[-1].split('-')[1])
                video_name = content_path.split("/")[-1].split('.')[0]
                if not os.path.exists(
                        CONTENT_BASE + content_path.split("/")[-2] + f'/task-{int(task_id)}-{video_name}/'):
                    os.makedirs(CONTENT_BASE + content_path.split("/")[-2] + f'/task-{int(task_id)}-{video_name}/')

                self.loger_handler(logger_flag, f'S3 Path: {content_path_s3}', '[INFO]', 'content_process_auto_anno()')
                save_path = f'{CONTENT_BASE_S3}{content_path.split("/")[-2]}/task-{int(task_id)}-{video_name}/' \
                            f'task-{int(task_id)}-{video_name}.mp4'
                if not os.path.isfile(save_path):
                    self.s3_bucket.s3_download(self.s3_client,'./' + save_path, content_path_s3)
                else:
                    self.loger_handler(logger_flag, f'file {save_path} already existing. shifting to the next file ...', '[INFO]',
                                       'content_process_auto_anno()')

                content_path_ = f'{CONTENT_BASE}{content_path.split("/")[-2]}/task-{int(task_id)}-{video_name}/' \
                                f'task-{int(task_id)}-{video_name}.mp4'
            else:
                video_name = content_path.split("/")[-1].split('.')[0]
                if not os.path.exists(
                        CONTENT_BASE + content_path.split("/")[-2] + f'/{video_name}/'):
                    os.makedirs(CONTENT_BASE + content_path.split("/")[-2] + f'/{video_name}/')

                save_path = f'{CONTENT_BASE_S3}{content_path.split("/")[-2]}/{video_name}/' \
                            f'{video_name}.mp4'
                if not os.path.isfile(save_path):
                    self.s3_bucket.s3_download(self.s3_client,'./' + save_path, content_path_s3)
                else:
                    self.loger_handler(logger_flag, f'file {save_path} already existing. shifting to the next file ...', '[INFO]',
                                       'content_process_auto_anno()')

                content_path_ = f'{CONTENT_BASE}{content_path.split("/")[-2]}/{video_name}/' \
                                f'{video_name}.mp4'

            self.loger_handler(logger_flag, f'content path of the video: {content_path_}', '[INFO]', 'content_process_auto_anno()')
            cap = cv2.VideoCapture(content_path_)
            cnt = 0
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break

                frame_ID = cap.get(cv2.CAP_PROP_POS_FRAMES)
                frame_object = {
                    "frameId": frame_ID,
                    "status": 0,
                    "boxes": [],
                    "taskId": None,
                    "commentBoxes": [],
                    'isEmpty': True,
                    "datasetVersions": []
                }
                image, anno_object = self.Inference.inference_selector(frame, self.inference_type, frame_object)
                annotation_object.append(anno_object)
                cnt = cnt + 1

                self.loger_handler(logger_flag, f'UPLOAD_ID: {upload_id} | TASK: {task + 1} | COUNT:{cnt} | Frame_ID:{frame_ID}', '[INFO]', 'content_process_auto_anno()')
            cap.release()

            # append the original frame IDS for the response and Db update
            for item in annotation_object:
                item['taskId'] = ObjectId(str(tasks_id_list[task]))

            # deletion of previous record if there is any
            try:
                self.mdb_annotation.post_documents(annotation_object)
                self.mdb.find_one_update({'_id': ObjectId(str(tasks_id_list[task]))},
                                         {'AutoAnnotationVersion': requested_anno_version})

            except Exception:
                doc = self.mdb_annotation.get_documents({"taskId": ObjectId(str(tasks_id_list[task]))})
                for item in doc:
                    id = str(item['_id'])
                    self.mdb_annotation.delete_one_document(ObjectId(id))
                self.mdb_annotation.post_documents(annotation_object)
                self.mdb.find_one_update({'_id': ObjectId(str(tasks_id_list[task]))},
                                         {'AutoAnnotationVersion': requested_anno_version})

            # update progress
            doc = self.mdb_progress.get_documents({"projectId": ObjectId(project_ID)})
            for data in doc:
                db_cont_path = str(data['sourceFilePath'])
                _id_ = data['_id']
                if content_path == db_cont_path:
                    self.mdb_progress.find_one_update({'_id': ObjectId(str(_id_))},
                                                      {'progress': ((task + 1) / len(tasks_id_list)) * 100})

            self.loger_handler(logger_flag, f'deleting the video {save_path}', '[INFO]', 'content_process_auto_anno()')
            os.remove(save_path)

            self.mdb_progress.find_one_update({'_id': ObjectId(str(upload_id))},
                                              {'progress': ((task + 1) / task_count) * 100})
            self.mdb_progress.find_one_update({'_id': ObjectId(str(upload_id))},
                                              {'taskCount': task + 1})

        self.loger_handler(logger_flag, 'successfully completed downloading and processing all tasks for all videos', '[INFO]', 'content_process_auto_anno()')

        # update the status after finished
        doc = self.mdb_progress.get_documents({"projectId": ObjectId(project_ID)})
        for data in doc:
            db_cont_path = str(data['sourceFilePath'])
            _id_ = data['_id']
            if content_path == db_cont_path:
                self.mdb_progress.find_one_update({'_id': ObjectId(str(_id_))},
                                                  {'status': int(1)})
                self.mdb_progress.find_one_update({'_id': ObjectId(str(_id_))},
                                                  {'progress': 100})

        return "success"

    def content_process_auto_anno_tasks(self, content_path, frame_rate, project_ID, annotation_version,
                                        upload_id, task_start_number=0, last_processed_frame=0, permission_flag=True, logger_flag=None):
        # response array
        res = []
        # original frame appending list
        original_frame_numbers_per_task = []

        annotation_object = []

        tasks = []
        original_frameid = []

        cap = cv2.VideoCapture(content_path)

        fps = float(cap.get(cv2.CAP_PROP_FPS))
        self.loger_handler(logger_flag, f'Original video Frame Rate: {fps}', '[INFO]', 'content_process_auto_anno_tasks()')

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        codec = cv2.VideoWriter_fourcc(*'avc1')
        # codec = cv2.VideoWriter_fourcc(*'MP4V')

        frame_count = 1
        task_count = task_start_number
        cnt = 0

        taskID = 'task-' + str(task_count) + '-' + str(content_path).split('/')[-1].split('.')[0]
        if not os.path.exists(CONTENT_BASE + str(project_ID) + '/' + taskID):
            os.makedirs(CONTENT_BASE + str(project_ID) + '/' + taskID)
        else:
            res_num = 0
            return res_num, taskID
        out_put_path = CONTENT_BASE + str(project_ID) + '/' + taskID + '/' + taskID + '.mp4'

        out = cv2.VideoWriter(out_put_path, codec, frame_rate, (width, height))

        taskID_write = None
        out_put_path_write = None

        flag = False

        selected_frame_array = self.select_frames(frame_rate, fps, total_frames)

        self.loger_handler(logger_flag, f'selected original frame count: {len(selected_frame_array)}', '[INFO]', 'content_process_auto_anno_tasks()')

        selected_frame_array, flag_ = self.skip_tasks(last_processed_frame, selected_frame_array)
        if not flag_:
            res_num = 1
            return res_num, taskID

        self.loger_handler('content_processor', 'searching for already processed tasks and skipping them', '[INFO]', 'content_process_auto_anno_tasks()')

        self.loger_handler('content_processor', f'selected frame count after skip: {len(selected_frame_array)}', '[INFO]', 'content_process_auto_anno_tasks()')

        Total_task_count = round(len(selected_frame_array) / FRAMES_PER_TASK)

        self.loger_handler(logger_flag, f'Total number of tasks: {Total_task_count + 1}', '[INFO]', 'content_process_auto_anno_tasks()')

        # Progress start
        create_time = datetime.utcnow()
        progress_update = {
            "_id": ObjectId(upload_id),
            "projectId": ObjectId(project_ID),
            "createdAt": create_time,
            "finishedAt": "",
            "errorMessage": {},
            "status": int(0),
            "request_type": int(1),
            "request_annotation_version": int(annotation_version),
            "sourceFilePath": content_path,
            "progress": 0,
            "taskCount": 0,
            "frames_per_task": FRAMES_PER_TASK,
            "frame_rate": frame_rate
        }
        ret_id = self.update_mdb_progress(upload_id, progress_update, project_ID)
        self.delete_mdb_tasks(content_path, project_ID, permission_flag)

        while cap.isOpened():
            # t_frame_read = time.time()
            ret, frame = cap.read()
            if not ret:
                break

            frame_ID = cap.get(cv2.CAP_PROP_POS_FRAMES)

            if frame_ID in selected_frame_array:

                # if frame count is leass than 120(frame per task count) it will write in to a video
                if frame_count <= FRAMES_PER_TASK:

                    frame_object = {
                        "frameId": frame_count,
                        "status": 0,
                        "boxes": [],
                        "taskId": None,
                        "commentBoxes": [],
                        'isEmpty': True,
                        "datasetVersions": []
                    }
                    image, anno_object = self.Inference.inference_selector(frame, self.inference_type, frame_object)
                    annotation_object.append(anno_object)

                    # append the original frame IDS for the response and Db update
                    original_frame_numbers_per_task.append(frame_ID)

                    self.loger_handler(logger_flag, f'UPLOAD_ID: {upload_id} | TASK: {task_count + 1} | COUNT:{frame_count} | Frame ID: {frame_ID}', '[INFO]',
                                       'content_process_auto_anno_tasks()')

                    frame_count = frame_count + 1
                    out.write(frame)

                # once the 120 frames per task is completed, close the ongoing writing video and re-initialize next
                # task video, next frame data initialization (frame object, frames), dB pushes, s3 uploads
                else:
                    flag = True

                    out.release()
                    original_frameid.append(original_frame_numbers_per_task)
                    tasks.append(taskID)

                    taskID = 'task-' + str(task_count) + '-' + str(content_path).split('/')[-1].split('.')[0]
                    taskID_write = 'task-' + str(task_count + 1) + '-' + \
                                   str(content_path).split('/')[-1].split('.')[0]

                    out_put_path = CONTENT_BASE + str(project_ID) + '/' + taskID + '/' + taskID + '.mp4'
                    out_put_path_write = CONTENT_BASE + str(project_ID) + '/' + taskID_write + '/' + taskID_write + \
                                         '.mp4'

                    os.makedirs(CONTENT_BASE + str(project_ID) + '/' + taskID_write)
                    out = cv2.VideoWriter(out_put_path_write, codec, frame_rate, (width, height))
                    out.write(frame)

                    self.loger_handler(logger_flag, f'UPLOAD_ID: {upload_id} | TASK: {task_count + 2} | COUNT:{frame_count} | Frame ID: {frame_ID}', '[INFO]',
                                       'content_process_auto_anno_tasks()')

                    self.loger_handler(logger_flag,"New Log added in Content Processor")
                    print("Hello There from Content Processor 2 ")
                    s3_path = self.s3_bucket.s3_upload(self.s3_client,str(content_path).split('/')[-2], out_put_path)
                    print("Hello There from Content Processor 2 ")

                    task_object = {
                        "projectId": ObjectId(project_ID),
                        "taskName": str(taskID),
                        "frameStart": int(original_frame_numbers_per_task[0]),
                        "frameStartTime": float(int(original_frame_numbers_per_task[0]) / fps),
                        "frameEnd": int(original_frame_numbers_per_task[-1]),
                        "frameCount": int(FRAMES_PER_TASK),
                        "status": int(0),
                        "videoPath": str(out_put_path),
                        "original_frames": str(original_frame_numbers_per_task),
                        "S3_url": str(s3_path),
                        "uploadId": ret_id,
                        "videoDuration": str(timedelta(seconds=int(FRAMES_PER_TASK / frame_rate))),
                        "skipFrameCount": 24.0 / frame_rate,
                        "frameRate": frame_rate,
                        "Originalframerate": fps,
                        "videoResolutionWidth": width,
                        "videoResolutionHeight": height,
                        "createdAt": create_time,
                        "auditStatus": 0,
                        "taskStatus": 2,
                        "AutoAnnotationVersion": annotation_version,
                        "datasetVersions": [],
                        "completedFrames": 0,
                        "videoName": str(content_path).split('/')[-1].split('.')[0]
                    }
                    task_id_mongo = self.mdb.post_one_document(task_object)

                    for item in annotation_object:
                        item['taskId'] = task_id_mongo

                    self.mdb_annotation.post_documents(annotation_object)
                    self.mdb_progress.find_one_update({'_id': ObjectId(str(ret_id))},
                                                      {'progress': ((task_count + 1) / Total_task_count) * 100})
                    self.mdb_progress.find_one_update({'_id': ObjectId(str(ret_id))},
                                                      {'taskCount': task_count + 1})

                    "============================================================================================"
                    frame_object = {
                        "frameId": 1,
                        "status": 0,
                        "boxes": [],
                        "taskId": None,
                        "commentBoxes": [],
                        'isEmpty': True,
                        "datasetVersions": []
                    }

                    image, anno_object = self.Inference.inference_selector(frame, self.inference_type, frame_object)
                    res.append(task_object)
                    task_count = task_count + 1

                    original_frame_numbers_per_task = []
                    annotation_object = []
                    original_frame_numbers_per_task.append(frame_ID)
                    annotation_object.append(anno_object)

                    frame_count = 2
                cnt = cnt + 1

        out.release()
        cap.release()

        # once final task is finished.
        original_frameid.append(original_frame_numbers_per_task)
        tasks.append('task-' + str(task_count) + '-' + str(content_path).split('/')[-1].split('.')[0])

        # if winished with more than 1 tasks.
        if flag:
            s3_path = self.s3_bucket.s3_upload(self.s3_client,str(content_path).split('/')[-2], out_put_path_write)

            # s3_path = None
            task_object = {
                "projectId": ObjectId(project_ID),
                "taskName": str(taskID_write),
                "frameStart": int(original_frame_numbers_per_task[0]),
                "frameStartTime": float(int(original_frame_numbers_per_task[0]) / fps),
                "frameEnd": int(original_frame_numbers_per_task[-1]),
                "frameCount": int(len(original_frame_numbers_per_task)),
                "status": int(0),
                "videoPath": str(out_put_path_write),
                "original_frames": str(original_frame_numbers_per_task),
                "S3_url": str(s3_path),
                "uploadId": ret_id,
                "videoDuration": str(
                    timedelta(seconds=int(int(len(original_frame_numbers_per_task)) / frame_rate))),
                "skipFrameCount": 24.0 / frame_rate,
                "frameRate": frame_rate,
                "Originalframerate": fps,
                "videoResolutionWidth": width,
                "videoResolutionHeight": height,
                "createdAt": create_time,
                "auditStatus": 0,
                "taskStatus": 2,
                "AutoAnnotationVersion": annotation_version,
                "datasetVersions": [],
                "completedFrames": 0,
                "videoName": str(content_path).split('/')[-1].split('.')[0]
            }
            task_id_mongo = self.mdb.post_one_document(task_object)

            for item in annotation_object:
                item['taskId'] = task_id_mongo
            self.mdb_annotation.post_documents(annotation_object)

            self.mdb_progress.find_one_update({'_id': ObjectId(str(ret_id))},
                                              {'progress': 100})
            self.mdb_progress.find_one_update({'_id': ObjectId(str(ret_id))},
                                              {'taskCount': task_count + 1})

            res.append(task_object)

        # if finished with less than a single tasks
        else:
            s3_path = self.s3_bucket.s3_upload(self.s3_client,str(content_path).split('/')[-2], out_put_path)

            task_object = {
                "projectId": ObjectId(project_ID),
                "taskName": str(tasks[0]),
                "frameStart": int(original_frame_numbers_per_task[0]),
                "frameStartTime": float(int(original_frame_numbers_per_task[0]) / fps),
                "frameEnd": int(original_frame_numbers_per_task[-1]),
                "frameCount": int(len(original_frame_numbers_per_task)),
                "status": int(0),
                "videoPath": str(out_put_path),
                "original_frames": str(original_frame_numbers_per_task),
                "S3_url": str(s3_path),
                "uploadId": ret_id,
                "videoDuration": str(
                    timedelta(seconds=int(int(len(original_frame_numbers_per_task)) / frame_rate))),
                "skipFrameCount": 24.0 / frame_rate,
                "frameRate": frame_rate,
                "Originalframerate": fps,
                "videoResolutionWidth": width,
                "videoResolutionHeight": height,
                "createdAt": create_time,
                "auditStatus": 0,
                "taskStatus": 0,
                "AutoAnnotationVersion": annotation_version,
                "datasetVersions": [],
                "completedFrames": 0,
                "videoName": str(content_path).split('/')[-1].split('.')[0]
            }
            task_id_mongo = self.mdb.post_one_document(task_object)

            for item in annotation_object:
                item['taskId'] = task_id_mongo

            self.mdb_annotation.post_documents(annotation_object)
            self.mdb_progress.find_one_update({'_id': ObjectId(str(ret_id))}, {'progress': 100})
            self.mdb_progress.find_one_update({'_id': ObjectId(str(ret_id))}, {'taskCount': 1})
            res.append(task_object)

        # Progress finished
        finished_time = datetime.utcnow()
        self.mdb_progress.find_one_update({'_id': ObjectId(str(ret_id))}, {"finishedAt": finished_time})
        self.mdb_progress.find_one_update({'_id': ObjectId(str(ret_id))}, {"status": int(1)})

        # delete content after process is finished
        os.remove(content_path)

        # deleting generated tasks
        try:
            for vid_folder in os.listdir(f'{CONTENT_BASE}{project_ID}'):
                if content_path.split('/')[-1].split('.')[0] == '-'.join(vid_folder.split('-')[2:]):
                    path = f'{CONTENT_BASE}{project_ID}/' + vid_folder
                    shutil.rmtree(path)
        except Exception as e:
            self.loger_handler(logger_flag, f'in deleting generated tasks; {e}', '[ERROR]', 'content_process_base()')
            pass

        return res, taskID

    def content_process_base(self, content_path, frame_rate, project_ID, upload_id, task_start_number=0,
                             last_processed_frame=0, permission_flag=True, logger_flag=None):
        # response array
        res = []
        # original frame appending list
        original_frame_numbers_per_task = []
        annotation_object = []
        tasks = []
        original_frameid = []

        cap = cv2.VideoCapture(content_path)

        fps = float(cap.get(cv2.CAP_PROP_FPS))
        self.loger_handler(logger_flag, f'Frame Rate: {fps}', '[INFO]', 'content_process_base()')

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        codec = cv2.VideoWriter_fourcc(*'avc1')
        # codec = cv2.VideoWriter_fourcc(*'MP4V')

        frame_count = 1
        task_count = task_start_number
        cnt = 0

        taskID = 'task-' + str(task_count) + '-' + str(content_path).split('/')[-1].split('.')[0]
        if not os.path.exists(CONTENT_BASE + str(project_ID) + '/' + taskID):
            os.makedirs(CONTENT_BASE + str(project_ID) + '/' + taskID)
        else:
            res_num = 0
            return res_num, taskID
        out_put_path = CONTENT_BASE + str(project_ID) + '/' + taskID + '/' + taskID + '.mp4'

        out = cv2.VideoWriter(out_put_path, codec, frame_rate, (width, height))

        taskID_write = None
        out_put_path_write = None

        flag = False

        selected_frame_array = self.select_frames(frame_rate, fps, total_frames)

        self.loger_handler(logger_flag, 'searching for already processed tasks and skipping them', '[INFO]', 'content_process_base()')

        self.loger_handler(logger_flag, f'selected original frame count: {len(selected_frame_array)}', '[INFO]', 'content_process_base()')

        # this only work when warm starts process when we have completed tasks
        selected_frame_array, flag_ = self.skip_tasks(last_processed_frame, selected_frame_array)
        if not flag_:
            res_num = 1
            return res_num, taskID

        self.loger_handler(logger_flag, f'selected frame count after skip: {len(selected_frame_array)}', '[INFO]', 'content_process_base()')

        Total_task_count = round(len(selected_frame_array) / FRAMES_PER_TASK)
        self.loger_handler(logger_flag, f'Total number of tasks: {Total_task_count + 1}', '[INFO]', 'content_process_base()')

        # Progress start
        create_time = datetime.utcnow()
        progress_update = {
            "_id": ObjectId(upload_id),
            "projectId": ObjectId(project_ID),
            "createdAt": create_time,
            "finishedAt": "",
            "errorMessage": {},
            "status": int(0),
            "request_type": int(0),
            "request_annotation_version": int(0),
            "sourceFilePath": content_path,
            "progress": 0,
            "taskCount": 0,
            "frames_per_task": FRAMES_PER_TASK,
            "frame_rate": frame_rate
        }

        # check for existing content uploads and if so delete them and rewrite
        ret_id = self.update_mdb_progress(upload_id, progress_update, project_ID)
        self.delete_mdb_tasks(content_path, project_ID, permission_flag)

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            frame_ID = cap.get(cv2.CAP_PROP_POS_FRAMES)
            if frame_ID in selected_frame_array:
                # if frame count is leass than 120(frame per task count) it will write in to a video
                if frame_count <= FRAMES_PER_TASK:

                    anno_object = {
                        "frameId": frame_count,
                        "status": 0,
                        "boxes": [],
                        "taskId": None,
                        "commentBoxes": [],
                        'isEmpty': True,
                        "datasetVersions": []
                    }
                    annotation_object.append(anno_object)
                    # append the original frame IDS for the response and Db update
                    original_frame_numbers_per_task.append(frame_ID)
                    frame_count = frame_count + 1
                    out.write(frame)

                    self.loger_handler(logger_flag, f'UPLOAD_ID: {upload_id} | TASK: {task_count + 1} | COUNT: {frame_count} | Frame_ID: {frame_ID}', '[INFO]',
                                       'content_process_base()')

                # once the 120 frames per task is completed, close the ongoing writing video and re-initialize next
                # task video, next frame data initialization (frame object, frames), dB pushes, s3 uploads
                else:
                    flag = True

                    out.release()
                    original_frameid.append(original_frame_numbers_per_task)
                    tasks.append(taskID)

                    taskID = 'task-' + str(task_count) + '-' + str(content_path).split('/')[-1].split('.')[0]
                    taskID_write = 'task-' + str(task_count + 1) + '-' + \
                                   str(content_path).split('/')[-1].split('.')[0]

                    out_put_path = CONTENT_BASE + str(project_ID) + '/' + taskID + '/' + taskID + '.mp4'
                    out_put_path_write = CONTENT_BASE + str(
                        project_ID) + '/' + taskID_write + '/' + taskID_write + '.mp4'

                    os.makedirs(CONTENT_BASE + str(project_ID) + '/' + taskID_write)
                    out = cv2.VideoWriter(out_put_path_write, codec, frame_rate, (width, height))
                    out.write(frame)

                    self.loger_handler(logger_flag, f'UPLOAD_ID: {upload_id} | TASK: {task_count + 2} | COUNT: {frame_count} | Frame_ID: {frame_ID}', '[INFO]',
                                       'content_process_base()')

                    s3_path = self.s3_bucket.s3_upload(self.s3_client,str(content_path).split('/')[-2], out_put_path)
                    temp = self.s3_bucket.s3_upload(self.s3_client,str(content_path).split('/'[-2]),'latest.mp4')
                    self.loger_handler(logger_flag,'Latest .mp4 file uploaded')
                    # s3_path = None
                    task_object = {
                        "projectId": ObjectId(project_ID),
                        "taskName": str(taskID),
                        "frameStart": int(original_frame_numbers_per_task[0]),
                        "frameEnd": int(original_frame_numbers_per_task[-1]),
                        "frameStartTime": float(int(original_frame_numbers_per_task[0]) / fps),
                        "frameCount": int(FRAMES_PER_TASK),
                        "status": int(0),
                        "videoPath": str(out_put_path),
                        "original_frames": str(original_frame_numbers_per_task),
                        "S3_url": str(s3_path),
                        "uploadId": ret_id,
                        "videoDuration": str(timedelta(seconds=int(FRAMES_PER_TASK / frame_rate))),
                        "skipFrameCount": 24.0 / frame_rate,
                        "frameRate": frame_rate,
                        "Originalframerate": fps,
                        "videoResolutionWidth": width,
                        "videoResolutionHeight": height,
                        "createdAt": create_time,
                        "auditStatus": 0,
                        "taskStatus": 2,
                        "AutoAnnotationVersion": 0,
                        "datasetVersions": [],
                        "completedFrames": 0,
                        "videoName": str(content_path).split('/')[-1].split('.')[0]
                    }
                    task_id_mongo = self.mdb.post_one_document(task_object)

                    for item in annotation_object:
                        item['taskId'] = task_id_mongo

                    self.mdb_annotation.post_documents(annotation_object)

                    self.mdb_progress.find_one_update({'_id': ObjectId(str(ret_id))},
                                                      {'progress': ((task_count + 1) / Total_task_count) * 100})
                    self.mdb_progress.find_one_update({'_id': ObjectId(str(ret_id))},
                                                      {'taskCount': task_count + 1})

                    "============================================================================================"
                    res.append(task_object)
                    task_count = task_count + 1

                    original_frame_numbers_per_task = [frame_ID]

                    annotation_object = []
                    anno_object = {
                        "frameId": 1,
                        "status": 0,
                        "boxes": [],
                        "taskId": None,
                        "commentBoxes": [],
                        'isEmpty': True,
                        "datasetVersions": []
                    }
                    annotation_object.append(anno_object)

                    frame_count = 2
                cnt = cnt + 1

        out.release()
        cap.release()

        # once final task is finished.
        original_frameid.append(original_frame_numbers_per_task)
        tasks.append('task-' + str(task_count) + '-' + str(content_path).split('/')[-1].split('.')[0])

        # if finished with more than 1 tasks.
        if flag:
            s3_path = self.s3_bucket.s3_upload(self.s3_client,str(content_path).split('/')[-2], out_put_path_write)
            # s3_path = None

            task_object = {
                "projectId": ObjectId(project_ID),
                "taskName": str(taskID_write),
                "frameStart": int(original_frame_numbers_per_task[0]),
                "frameStartTime": float(int(original_frame_numbers_per_task[0]) / fps),
                "frameEnd": int(original_frame_numbers_per_task[-1]),
                "frameCount": int(len(original_frame_numbers_per_task)),
                "status": int(0),
                "videoPath": str(out_put_path_write),
                "original_frames": str(original_frame_numbers_per_task),
                "S3_url": str(s3_path),
                "uploadId": ret_id,
                "videoDuration": str(
                    timedelta(seconds=int(int(len(original_frame_numbers_per_task)) / frame_rate))),
                "skipFrameCount": 24.0 / frame_rate,
                "frameRate": frame_rate,
                "Originalframerate": fps,
                "videoResolutionWidth": width,
                "videoResolutionHeight": height,
                "createdAt": create_time,
                "auditStatus": 0,
                "taskStatus": 2,
                "AutoAnnotationVersion": 0,
                "datasetVersions": [],
                "completedFrames": 0,
                "videoName": str(content_path).split('/')[-1].split('.')[0]
            }
            task_id_mongo = self.mdb.post_one_document(task_object)
            for item in annotation_object:
                item['taskId'] = task_id_mongo
            self.mdb_annotation.post_documents(annotation_object)

            self.mdb_progress.find_one_update({'_id': ObjectId(str(ret_id))},
                                              {'progress': 100})
            self.mdb_progress.find_one_update({'_id': ObjectId(str(ret_id))},
                                              {'taskCount': task_count + 1})

            res.append(task_object)

        # if finished with less than a single tasks
        else:
            s3_path = self.s3_bucket.s3_upload(self.s3_client,str(content_path).split('/')[-2], out_put_path)
            # s3_path = None

            task_object = {
                "projectId": ObjectId(project_ID),
                "taskName": str(tasks[0]),
                "frameStart": int(original_frame_numbers_per_task[0]),
                "frameStartTime": float(int(original_frame_numbers_per_task[0]) / fps),
                "frameEnd": int(original_frame_numbers_per_task[-1]),
                "frameCount": int(len(original_frame_numbers_per_task)),
                "status": int(0),
                "videoPath": str(out_put_path),
                "original_frames": str(original_frame_numbers_per_task),
                "S3_url": str(s3_path),
                "uploadId": ret_id,
                "videoDuration": str(
                    timedelta(seconds=int(int(len(original_frame_numbers_per_task)) / frame_rate))),
                "skipFrameCount": 24.0 / frame_rate,
                "frameRate": frame_rate,
                "Originalframerate": fps,
                "videoResolutionWidth": width,
                "videoResolutionHeight": height,
                "createdAt": create_time,
                "auditStatus": 0,
                "taskStatus": 0,
                "AutoAnnotationVersion": 0,
                "datasetVersions": [],
                "completedFrames": 0,
                "videoName": str(content_path).split('/')[-1].split('.')[0]
            }
            task_id_mongo = self.mdb.post_one_document(task_object)
            for item in annotation_object:
                item['taskId'] = task_id_mongo
            self.mdb_annotation.post_documents(annotation_object)

            self.mdb_progress.find_one_update({'_id': ObjectId(str(ret_id))}, {'progress': 100})
            self.mdb_progress.find_one_update({'_id': ObjectId(str(ret_id))}, {'taskCount': 1})
            res.append(task_object)

        # Progress finished
        finished_time = datetime.utcnow()
        self.mdb_progress.find_one_update({'projectId': ObjectId(project_ID)}, {"finishedAt": finished_time})
        self.mdb_progress.find_one_update({'_id': ObjectId(str(ret_id))}, {"status": int(1)})

        # delete content after process is finished
        os.remove(content_path)

        # deleting generated tasks
        try:
            for vid_folder in os.listdir(f'{CONTENT_BASE}{project_ID}'):
                if content_path.split('/')[-1].split('.')[0] == '-'.join(vid_folder.split('-')[2:]):
                    path = f'{CONTENT_BASE}{project_ID}/' + vid_folder
                    shutil.rmtree(path)
        except Exception as e:
            self.loger_handler(logger_flag, f'in deleting generated tasks; {e}', '[ERROR]', 'content_process_base()')
            pass

        return res, taskID

    """
    inputs:
    content_path : path to the  folder where images are saved
    """

    # method to process image upload (similar to content_proces_base)
    def content_process_image(self, content_path, frames_per_task, project_ID, upload_id, permission_flag=True):
        # response array
        res = []

        frame_rate = 4

        total_frames = 0
        # count the number of images in the content path
        for file in os.listdir(content_path):
            if file.endswith(".jpg") or file.endswith(".jpeg") or file.endswith("png"):
                total_frames += 1

        content_processor_logger.debug(f'[INFO] content_process_imaged(): Frame Rate: {total_frames}')

        # calculate task count
        if total_frames < frames_per_task:
            # raise Exception("Not enough frames")
            Total_task_count = 1
        else:
            Total_full_task_count = math.floor(total_frames / frames_per_task)
            print(Total_full_task_count)
            if (total_frames % frames_per_task) != 0:
                Total_task_count = Total_full_task_count + 1
            elif (total_frames % frames_per_task) == 0:
                Total_task_count = Total_full_task_count

        print(f' Total tasks : {Total_task_count}')

        # Progress start
        create_time = datetime.utcnow()

        progress_update = {
            "_id": ObjectId(upload_id),
            "projectId": ObjectId(project_ID),
            "createdAt": create_time,
            "finishedAt": "",
            "errorMessage": {},
            "status": int(0),
            "request_type": int(0),
            "request_annotation_version": int(0),
            "sourceFilePath": content_path,
            "progress": 0,
            "taskCount": 0,
            "frames_per_task": frames_per_task
        }

        # Progress update to mongo DB
        ret_id = image_processor.update_mdb_progress(upload_id, progress_update, project_ID)
        image_processor.delete_mdb_tasks(content_path, project_ID, permission_flag)

        for task_count in range(Total_task_count):

            # create a taskID
            taskID = 'task-' + str(task_count) + '-' + str(content_path).split('/')[-2]

            task_folder = './contents/' + taskID + '/'

            # Create a folder for task
            if not os.path.exists(task_folder):
                os.mkdir(task_folder)
                # move frames_per_task images to this folder from content_path
                m_w, m_h, original_resolution, frames_in_task = image_processor.move_taks_images(content_path,
                                                                                                 task_folder,

                                                                                                 frames_per_task)

            elif os.path.exists(task_folder):
                # first delete it and create a new one
                shutil.rmtree(task_folder)
                os.makedirs(task_folder)
                m_w, m_h, original_resolution, frames_in_task = image_processor.move_taks_images(content_path,
                                                                                                 task_folder,
                                                                                                 frames_per_task)

            out_put_path = './contents/' + taskID + '/' + taskID + '.mp4'
            print(out_put_path)

            # reshape images
            border_info = image_processor.reshape_one_task(task_folder, m_w, m_h)

            # add border_info to the original_resolution dictionary
            for f_id, info in enumerate(border_info):
                print("for border info ")  # --------------------

            # generate video from images and frame contents for the AnnotationFrame
            annotation_object = image_processor.generate_video(task_folder, out_put_path, frame_rate)

            s3_path = image_processor.s3_bucket.s3_upload(self.s3_client,str(content_path).split('/')[-2], out_put_path)
            # s3_path = None
            task_object = {
                "projectId": ObjectId(project_ID),
                "taskName": str(taskID),
                "frameCount": frames_in_task,
                "status": int(0),
                "videoPath": str(out_put_path),
                "createdAt": create_time,
                "S3_url": str(s3_path),
                "skipFrameCount": 24.0 / frame_rate,
                "frameRate": frame_rate,
                "videoResolutionWidth": m_w,
                "videoResolutionHeight": m_h,
                "padded_width": m_w,
                "padded_height": m_h,
                "auditStatus": 0,
                "taskStatus": 2,
                "uploadId": ret_id,
                "videoDuration": str(timedelta(seconds=int(frames_per_task / frame_rate))),
                "AutoAnnotationVersion": 0,
                "Original_resolutions": original_resolution
                # "frameStart": int(original_frame_numbers_per_task[0]),
                # "frameEnd": int(original_frame_numbers_per_task[-1]),
                # "frameStartTime": float(int(original_frame_numbers_per_task[0]) / fps),
                # "original_frames": str(original_frame_numbers_per_task),
                # "Originalframerate": fps,
            }

            task_id_mongo = image_processor.task_db.post_one_document(task_object)

            # for item in annotation_object:
            #     item['taskId'] = task_id_mongo

            # frame_db.post_documents(annotation_object)

            image_processor.project_update.find_one_push({'_id': ObjectId(str(project_ID))},
                                                         {'contentUploads': task_id_mongo})

            image_processor.mdb_progress.find_one_update({'_id': ObjectId(str(ret_id))},
                                                         {'progress': ((task_count + 1) / Total_task_count) * 100})
            image_processor.mdb_progress.find_one_update({'_id': ObjectId(str(ret_id))}, {'taskCount': task_count + 1})

            "============================================================================================"
            res.append(task_object)

        # # Progress finished
        image_processor.mdb_progress.find_one_update({'_id': ObjectId(str(ret_id))}, {'progress': 100})
        finished_time = datetime.utcnow()
        image_processor.mdb_progress.find_one_update({'projectId': ObjectId(project_ID)}, {"finishedAt": finished_time})
        image_processor.mdb_progress.find_one_update({'_id': ObjectId(str(ret_id))}, {"status": int(1)})

        return res

    def get_auto_anno_status(self, content_path, project_ID, anno_version, permission_autoanno_flag=True):
        video_name = content_path.split('/')[-1].split('.')[0]
        doc = self.mdb.get_documents({"projectId": ObjectId(project_ID)})
        task_id_list = []
        for data in doc:
            if data['taskName'] is not None:
                vid_name = '-'.join(data['taskName'].split('-')[2:])
            else:
                vid_name = data['S3_url'].split('/')[-1].split('.')[0]

            if vid_name == video_name:
                self.loger_handler('content_processor', f'processing task {data["_id"]}', '[INFO]', 'get_auto_anno_status()')
                flag_anno = True
                for item in data:
                    if item == 'AutoAnnotationVersion':
                        flag_anno = False
                        if int(data['AutoAnnotationVersion']) == 0:
                            task_id_list.append(data['_id'])
                            # task_ids.append(task_id)
                        else:
                            if int(data['AutoAnnotationVersion']) != int(anno_version):
                                task_id_list.append(data['_id'])
                                # task_ids.append(task_id)

                    elif item == 'isAutoAnnotated':
                        flag_anno = False
                        if not data['isAutoAnnotated']:
                            task_id_list.append(data['_id'])
                            # task_ids.append(task_id)
                if flag_anno:
                    if permission_autoanno_flag:
                        task_id_list.append(data['_id'])
                        # task_ids.append(task_id)

        # sorting task ids in order of task numbers
        return task_id_list

    def get_completed_tasks(self, video_name, project_ID):
        doc = self.mdb.get_documents({"projectId": ObjectId(project_ID)})
        frames_ = []
        completed_task_cnt = 0
        frame_rate_old = None
        fpto = []
        frames_per_task_old = None
        data_ = []
        # check weather there are at least 1 task generated for the video
        for dat in doc:
            vid_name = '-'.join(dat['taskName'].split('-')[2:])
            if vid_name == video_name:
                data_.append(dat)
        if len(data_) != 0:
            for data in data_:
                vid_name = '-'.join(data['taskName'].split('-')[2:])
                if vid_name == video_name:
                    completed_task_cnt = completed_task_cnt + 1
                    frames_.append(ast.literal_eval(data['original_frames'])[-1])
                    frame_rate_old = int(data['frameRate'])
                    frames_per_task_old = int(data['frameCount'])
                    fpto.append(frames_per_task_old)
            completed_task_count = len(frames_)
            processed_last_frame = frames_[-1]
        else:
            completed_task_count = 0
            processed_last_frame = 0
            self.loger_handler('content_processor_warmstart', 'zero tasks have created', '[INFO]', 'get_completed_tasks()')

        self.loger_handler('content_processor_warmstart', f'completed_task_count: {completed_task_count} | processed_last_frame {processed_last_frame} | frame_rate_old {frame_rate_old} | frames_per_task_old {frames_per_task_old}', '[INFO]', 'get_completed_tasks()')
        return completed_task_count, processed_last_frame, frame_rate_old

    def check_existence_task(self, video_name, project_ID):
        doc = self.mdb.get_documents({"projectId": ObjectId(project_ID)})
        flag = False
        for data in doc:
            vid_name = '-'.join(data['taskName'].split('-')[2:])
            if vid_name == video_name:
                flag = True
        return flag

    def key_auth(self, auth_key):
        auth = 'Fail'
        if auth_key == self.API_key:
            auth = 'Pass'
        return auth

    def allowed_file(self, filename):
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in self.ALLOWED_EXTENSIONS

    @staticmethod
    def validation_project_ID(project_ID):
        try:
            ObjectId(project_ID)
            return True, 'OK'
        except bson.errors.InvalidId as e:
            return False, e

    def warm_up_process(self, project={}):
        doc = self.mdb_progress.get_documents(project)
        videos_list_for_warmup_AA_bar = []
        videos_list_for_warmup_AA_tasks = []
        videos_list_for_warmup_AA = []
        for data in doc:
            if int(data['status']) == 0:
                vid_name = str(data['sourceFilePath']).split('/')[-1].split('.')[0]
                project_id = data['projectId']
                upload_id = data['_id']
                frame_rate = data['frame_rate']
                if int(data['request_type']) == 0:
                    object_0 = {'video_name': vid_name, 'project_id': project_id,
                                'content_path': data['sourceFilePath'], 'upload_id': upload_id, 'frame_rate': frame_rate}
                    videos_list_for_warmup_AA_bar.append(object_0)
                if int(data['request_type']) == 1:
                    requested_annotation_version = data['request_annotation_version']
                    object_1 = {'video_name': vid_name, 'project_id': project_id,
                                'content_path': data['sourceFilePath'],
                                'requested annotation version': requested_annotation_version, 'upload_id': upload_id, 'frame_rate': frame_rate}
                    videos_list_for_warmup_AA_tasks.append(object_1)
                if int(data['request_type']) == 2:
                    requested_annotation_version = data['request_annotation_version']
                    object_2 = {'video_name': vid_name, 'project_id': project_id,
                                'requested annotation version': requested_annotation_version,
                                'content_path': data['sourceFilePath'], 'frame_per_task': data['frames_per_task'],
                                'upload_id': upload_id}
                    videos_list_for_warmup_AA.append(object_2)

        self.loger_handler('content_processor_warmstart', f'videos_list_for_warmup_AA_bar: {videos_list_for_warmup_AA_bar}', '[INFO]', 'warm_up_process()')
        self.loger_handler('content_processor_warmstart', f'videos_list_for_warmup_AA_tasks: {videos_list_for_warmup_AA_tasks}', '[INFO]', 'warm_up_process()')
        self.loger_handler('content_processor_warmstart', f'videos_list_for_warmup_AA: {videos_list_for_warmup_AA}', '[INFO]', 'warm_up_process()')

        return videos_list_for_warmup_AA_bar, videos_list_for_warmup_AA_tasks, videos_list_for_warmup_AA

    def check_current_anno_version(self, project_ID, content_path):
        doc = self.mdb_progress.get_documents({"projectId": ObjectId(project_ID)})
        for data in doc:
            if content_path == data['sourceFilePath']:
                return int(data['request_annotation_version'])
        return None

    def validate_frames_per_task(self, project_ID, content_path):
        doc = self.mdb_progress.get_documents({"projectId": ObjectId(project_ID)})
        for data in doc:
            if content_path == data['sourceFilePath']:
                if data['frames_per_task'] != FRAMES_PER_TASK:
                    return True, data['frames_per_task']
                else:
                    return False, data['frames_per_task']
        return None, None

    def get_video_list_from_tasks(self, project_ID):
        video_list = []
        video_list_scale = []
        doc = self.mdb.get_documents({"projectId": ObjectId(project_ID)})
        for data in doc:
            try:
                db_vid = '-'.join(data['taskName'].split('-')[2:]) + '.mp4'
                if db_vid not in video_list:
                    video_list.append(db_vid)
            except Exception:
                db_vid = data['S3_url'].split('/')[-1]
                if db_vid not in video_list:
                    video_list_scale.append(db_vid)
                pass
        self.loger_handler('content_processor', f'video list: {video_list}', '[INFO]', 'get_video_list_from_tasks()')
        self.loger_handler('content_processor', f'video list scale: {video_list_scale}', '[INFO]', 'get_video_list_from_tasks()')
        return video_list, video_list_scale

    def content_processor_warmstart(self, project_ID={}):
        try:
            if len(project_ID) != 0:
                project = {"projectId": ObjectId(project_ID)}
                object_0, object_1, object_2 = self.warm_up_process(project)
            else:
                object_0, object_1, object_2 = self.warm_up_process()
            if len(object_0) == 0:
                self.loger_handler('content_processor_warmstart', f'AA_bar: No incomplete tasks', '[INFO]', 'content_processor_warmstart()')
            else:
                for item in object_0:
                    vid_name = item['video_name']
                    p_id = item['project_id']
                    cont_path = item['content_path']
                    upload_id = item['upload_id']

                    completed_task_count, processed_last_frame, frame_rate_old = self.get_completed_tasks(vid_name, p_id)
                    if frame_rate_old is None:
                        frame_rate_old = item['frame_rate']

                    if os.path.exists(f'{CONTENT_BASE}{p_id}/'):
                        for vid_folder in os.listdir(f'{CONTENT_BASE}{p_id}/'):
                            if cont_path.split('/')[-1].split('.')[0] == '-'.join(vid_folder.split('-')[2:]):
                                path = f'{CONTENT_BASE}{p_id}/' + vid_folder
                                shutil.rmtree(path)

                    self.content_process_base(cont_path, frame_rate_old, p_id,
                                                                   upload_id, completed_task_count,
                                                                   processed_last_frame,
                                                                   permission_flag=False, logger_flag='content_processor_warmstart')
                    self.loger_handler('content_processor_warmstart',
                                       f'Completed warm up process in AA_bar for {vid_name} in project {p_id}', '[INFO]',
                                       'content_processor_warmstart()')

            if len(object_1) == 0:
                self.loger_handler('content_processor_warmstart', f'AA_task: No incomplete tasks',
                                   '[INFO]', 'content_processor_warmstart()')

            else:
                for item in object_1:
                    vid_name = item['video_name']
                    p_id = item['project_id']
                    cont_path = item['content_path']
                    auto_anno_version = item['requested annotation version']
                    upload_id = item['upload_id']
                    completed_task_count, processed_last_frame, frame_rate_old = self.get_completed_tasks(vid_name, p_id)
                    if frame_rate_old is None:
                        frame_rate_old = item['frame_rate']

                    for vid_folder in os.listdir(f'{CONTENT_BASE}{p_id}/'):
                        if cont_path.split('/')[-1].split('.')[0] == '-'.join(vid_folder.split('-')[2:]):
                            path = f'{CONTENT_BASE}{p_id}/' + vid_folder
                            shutil.rmtree(path)

                    # check if the models are available in models folder
                    self.content_process_auto_anno_tasks(cont_path, int(frame_rate_old),
                                                                              p_id,
                                                                              auto_anno_version, upload_id,
                                                                              completed_task_count,
                                                                              processed_last_frame,
                                                                              permission_flag=False, logger_flag='content_processor_warmstart')

                    self.loger_handler('content_processor_warmstart',
                                       f'Completed warm up process in AA_task for {vid_name} in project {p_id}', '[INFO]',
                                       'content_processor_warmstart()')

            if len(object_2) == 0:
                self.loger_handler('content_processor_warmstart', f'AA: No incomplete tasks', '[INFO]',
                                   'content_processor_warmstart()')
            else:
                for item in object_2:
                    p_id = item['project_id']
                    cont_path = item['content_path']
                    auto_anno_version = item['requested annotation version']
                    upload_id = item['upload_id']

                    task_id_list = self.get_auto_anno_status(cont_path, p_id, auto_anno_version)

                    if len(task_id_list) == 0:

                        self.loger_handler('content_processor_warmstart', f'AA: No incomplete tasks', '[INFO]',
                                           'content_processor_warmstart()')
                    else:
                        # check if the models are available in models folder
                        self.content_process_auto_anno(p_id, cont_path, task_id_list, auto_anno_version,
                                                              upload_id, logger_flag='content_processor_warmstart')
        except Exception as e:
            self.loger_handler('content_processor_warmstart', f'{e}', '[ERROR]', 'content_processor_warmstart()')

    def model_checker(self, logger_flag=None):
        model_existing_flag = False
        cfg_existing_flag = False
        weight_existing_flag = False
        class_existing_flag = False
        MODEL_CFG = f"{params.get('Inference', 'config_file')}"
        MODEL_WEIGHTS = f"{params.get('Inference', 'weight_file')}"
        MODEL_NAMES = f"{params.get('Inference', 'labels_file')}"

        errors = {}

        if not os.path.exists(MODEL_CFG):
            errors[str(MODEL_CFG)] = 'CFG file not existing'
        else:
            cfg_existing_flag = True

        if not os.path.exists(MODEL_WEIGHTS):
            errors[str(MODEL_WEIGHTS)] = 'WEIGHTS file not existing'
        else:
            weight_existing_flag = True

        if not os.path.exists(MODEL_NAMES):
            errors[str(MODEL_NAMES)] = 'LABEL file not existing'
        else:
            class_existing_flag = True

        if cfg_existing_flag and weight_existing_flag and class_existing_flag:
            model_existing_flag = True

        if model_existing_flag:
            input_object = {'CFG_FILE': MODEL_CFG, 'WEIGHT_FILE': MODEL_WEIGHTS, 'CLASS_FILE': MODEL_NAMES}
            json_formatted_str = json.dumps(input_object, indent=4)
            self.loger_handler(logger_flag, f'MODEL PARAMETERS: {json_formatted_str}', '[INFO]', 'model_checker()')
        else:
            json_formatted_str = json.dumps(errors, indent=4)
            self.loger_handler(logger_flag, f'MODEL PARAMETERS NOT FOUND: {json_formatted_str}', '[ERROR]', 'model_checker()')

        return model_existing_flag, errors

    @staticmethod
    def loger_handler(logger_client, message, header, function_header):
        if logger_client == 'content_processor_warmstart':
            content_processor_warmstart_logger.debug(f'{header} || {function_header} || {message}')
        if logger_client == 'content_processor':
            content_processor_logger.debug(f'{header} || {function_header} || {message}')


# if __name__ == '__main__':
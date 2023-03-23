"""
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.

maintainers : dinusha@zoomi.ca, isuruj@zoomi.ca

This file contain image to video converter.
"""

import os
import cv2 
from PIL import Image 
import shutil
from mongo_manager import MongoDBmanager
from s3_manager import s3_bucket_manager
from datetime import timedelta
from datetime import datetime
from bson.objectid import ObjectId
from annotation_processor import inference
import random
import math
import configparser

# Read settings from config file
params = configparser.ConfigParser(os.environ)

#logging configeration
from logger import get_debug_logger
dataset_logger = get_debug_logger('image_dataset','./logs/image_processor.log')

CONFIG_FILE_PATH = 'config.cfg'
params.read(CONFIG_FILE_PATH)

MDB_USER = f"{params.get('MongoDB', 'user_name')}"
MDB_PASS = f"{params.get('MongoDB', 'password')}"
MDB_NAME = f"{params.get('MongoDB', 'db_name')}"

S3_REGION = f"{params.get('S3', 'region')}"
S3_ACESS_KEY = f"{params.get('S3', 'access_key_id')}"
S3_SECRET_KEY = f"{params.get('S3', 'secret_access_key')}"
S3_BUCKET = f"{params.get('S3', 'bucket_name')}"

TASK_BASE = f"{params.get('Folders', 'task_base')}"
CLIP_BASE = f"{params.get('Folders', 'clip_base')}"

#number of cpu cores to use
PROCESSES = int(f"{params.get('Cores', 'cpu_cores')}")

# Mongo DB configurations
task_db = MongoDBmanager(MDB_USER, MDB_PASS, MDB_NAME, 'AnnotationTask')
mdb_progress = MongoDBmanager(MDB_USER, MDB_PASS, MDB_NAME,'AnnotationContentUpload')
project_update = MongoDBmanager(MDB_USER, MDB_PASS, MDB_NAME,'AnnotationProject')
frame_db = MongoDBmanager(MDB_USER, MDB_PASS, MDB_NAME,'AnnotationFrame')

# S3 configurations
s3_bucket = s3_bucket_manager(S3_REGION, S3_ACESS_KEY, S3_SECRET_KEY,S3_BUCKET)






# Get the resizing dimension for the image
def get_resized_image_dim(image, max_w, max_h, re_scale_w, re_scale_h):
    dim = None
    # horizontal_image = False
    # vertical_image = False
    (h, w) = image.shape[:2]
    # R = w/h
    # if R > 0:
    #     horizontal_image = True
    # elif R < 0:
    #     vertical_image = True
    
    # case 1: im_w < re_scale_w and im_h < re_scale_h
    if w < re_scale_w and h < re_scale_h:
        dim = (re_scale_w, re_scale_h)
    # case 2: im_w < re_scale_w and im_h > re_scale_h
    elif w < re_scale_w and h > re_scale_h:
        dim = (re_scale_w, h)
    # case 3: im_w > re_scale_w and im_h < re_scale_h
    elif w > re_scale_w and h < re_scale_h:
        dim = (w, re_scale_h)
    # case 4: im_w > re_scale_w and im_h > re_scale_h
    elif w > re_scale_w and h > re_scale_h:
        dim = (w, h)
    # case 5: im_w = max_w and im_h < re_scale_h
    elif w == max_w and h < re_scale_h:
        dim = (w, re_scale_h)
    # case 6: im_w = max_w and im_h > re_scale_h
    elif w == max_w and h > re_scale_h:
        dim = (w, h)
    # case 7: im_w < re_scale_w and im_h = max_h
    elif w < re_scale_w and h == max_h:
        dim = (re_scale_w, h)
    # case 8: im_w > re_scale_w and im_h = max_h
    elif w > re_scale_w and h == max_h:
        dim = (w, h)
    # case 9: im_w = max_w and im_h = max_h
    elif w == max_w and h == max_h:
        dim = (w, h)

    return dim


# resize and center the image
def resize_and_center_image(image_path, max_w, max_h, re_scale_w, re_scale_h):

    image = cv2.imread(image_path)
    dim = get_resized_image_dim(image, max_w, max_h, re_scale_w, re_scale_h)

    if dim is not None:
        resized = cv2.resize(image, dim, interpolation = cv2.INTER_AREA)
        t, b, l, r = center_image(max_w, max_h, resized)
        img_pad = cv2.copyMakeBorder(resized, t, b, l, r, cv2.BORDER_CONSTANT, (0,0,0))

    return img_pad, t, b, l, r



# center the resized image by adding boders (top, bottom, left, right)
def center_image(max_w, max_h, resized_image):
    (h, w) = resized_image.shape[:2]
    delta_w = max_w - w
    delta_h = max_h - h
    # top and bottom pad width
    pd_t = int(delta_h/2)
    pd_b = pd_t
    # left and right  pad width
    pd_l = int(delta_w/2)
    pd_r = pd_l

    return pd_t, pd_b, pd_l, pd_r


# pad images to a given size
def pad_image(image_path, max_h, max_w):
    frame = cv2.imread(image_path)
    h,w,c = frame.shape
    pad_w = max_w - w
    if pad_w <= 0:
        pad_w = 0
    pad_h = max_h - h
    if pad_h <= 0:
        pad_h = 0
    img_pad = cv2.copyMakeBorder(frame, 0, pad_h, 0, pad_w, cv2.BORDER_CONSTANT, (0,0,0))
    return img_pad


# Resize images to given resolutions for a task
def reshape_one_task(task_folder, m_width, m_height):

    re_scale_w = 0.75*m_width
    re_scale_h = 0.75*m_height

    border_info = {}

    for f_id,file in enumerate(os.listdir(task_folder)):
        if file.endswith(".jpg") or file.endswith(".jpeg") or file.endswith("png"):

            image_path = os.path.join(task_folder, file)
            # Pad images
            # paded_image = pad_image(image_path, m_height, m_width)
            paded_image, t, b, l, r = resize_and_center_image(image_path, m_width, m_height, re_scale_w, re_scale_h)
            border_info[f'{f_id}'] = (t, b, l, r)

            os.remove(image_path)
            cv2.imwrite(image_path, paded_image)
    
    return border_info



def update_mdb_progress(upload_id, object_update, project_ID):
    mdb_progress.delete_one_document(ObjectId(str(upload_id)))
    ret_id = mdb_progress.post_one_document(object_update)
    project_update.find_one_push({'_id': ObjectId(str(project_ID))}, {'contentUploads': ret_id})
    return ret_id           
          
def delete_mdb_tasks(content_path, project_ID, permision_flag):
    if permision_flag:
        doc = task_db.get_documents({"projectId": ObjectId(project_ID)})
        for data in doc:
            db_vid = '-'.join(data['taskName'].split('-')[2:])
            _id_ = data['_id']
            if content_path.split('/')[-1].split('.')[0] == db_vid:
                task_db.delete_one_document(ObjectId(str(_id_)))
  
# Video Generating function
def generate_video(image_folder, video_name, fps):

    annotation_object = []
      
    images = [img for img in os.listdir(image_folder)
              if img.endswith(".jpg") or
                 img.endswith(".jpeg") or
                 img.endswith("png")]
     

    frame = cv2.imread(os.path.join(image_folder, images[0]))
  
    # setting the frame width, height width
    # the width, height of first image
    height, width, layers = frame.shape  
    codec = cv2.VideoWriter_fourcc(*'avc1')
    out = cv2.VideoWriter(video_name, codec, fps, (width, height)) 
  
    # Appending the images to the video one by one
    for frame_id,image in enumerate(images): 
        out.write(cv2.imread(os.path.join(image_folder, image))) 

        anno_object = {
                        "frameId": frame_id,
                        "status": 0,
                        "boxes": [],
                        "taskId": None,
                        "commentBoxes": [],
                        'isEmpty': True
                    }
        annotation_object.append(anno_object)
      
    # Deallocating memories taken for window creation
    cv2.destroyAllWindows() 
    out.release()  # releasing the video generated

    return annotation_object



# this function select frames from the user dataset 
# Parameters : 
# input : path : path of the original dataset
#         frames_per_task : number of frames to select for a task
# Return: max_h, max_w : maximum height and width of the images
#         list of original resolutions of images to put in the Annotation task
def move_taks_images(content_path, task_path, frames_per_task):
    # read file list from content_path
    file_list = []
    for file in os.listdir(content_path):
        if file.endswith(".jpg") or file.endswith(".jpeg") or file.endswith("png"):
            file_list.append(file)

    # select frames_per_task images from list and move to task folder
    if len(file_list) > frames_per_task:
        task_list = random.sample(file_list, frames_per_task)
    elif len(file_list) < frames_per_task:
        task_list = file_list

    for file in task_list:
        if file.endswith(".jpg") or file.endswith(".jpeg") or file.endswith("png"):
            # print(file)
            os.rename(content_path + '/'+file, task_path + file)
            # shutil.copyfile(source + f, destination + f)
    
    # calculate the max height and widths per task and create list of original resolution
    max_h = 0
    max_w = 0
    original_resolusion = {}

    for f_id,image in enumerate(os.listdir(task_path)):
        if image.endswith('.jpg') or image.endswith(".jpeg") or image.endswith("png"):
            im = cv2.imread(os.path.join(task_path, image))
            h,w,c = im.shape
            original_resolusion[f'{f_id}'] = (w, h)

            if h >= max_h:
                max_h = h

            if w >= max_w:
                max_w = w

    return max_w, max_h, original_resolusion, len(task_list)


"""
inputs:
content_path : path to the  folder where images are saved

"""
def content_process_imaged(content_path, frames_per_task, project_ID, upload_id, permision_flag=True):
    # response array
    res = []

    frame_rate = 4
   
    total_frames = 0
    # count the number of images in the content path
    for file in os.listdir(content_path):
        if file.endswith(".jpg") or file.endswith(".jpeg") or file.endswith("png"):
            total_frames += 1

    print(f' Total frames : {total_frames}')
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
    ret_id = update_mdb_progress(upload_id, progress_update, project_ID)
    delete_mdb_tasks(content_path, project_ID, permision_flag)


    for task_count in range(Total_task_count):
       
        # create a taskID
        taskID = 'task-' + str(task_count) + '-' + str(content_path).split('/')[-2]
    
        task_folder = './contents/' + taskID + '/'

        # Create a folder for task 
        if not os.path.exists(task_folder):
            os.mkdir(task_folder)
            # move frames_per_task images to this folder from content_path
            m_w, m_h, original_resolusion, frames_in_task = move_taks_images(content_path, task_folder, frames_per_task)


        elif os.path.exists(task_folder):
            # first delete it and create a new one
            shutil.rmtree(task_folder)
            os.makedirs(task_folder)
            m_w, m_h, original_resolusion, frames_in_task = move_taks_images(content_path, task_folder, frames_per_task)
        
        out_put_path = './contents/' + taskID + '/' + taskID + '.mp4'
        print(out_put_path)

        # reshape images
        border_info = reshape_one_task(task_folder, m_w, m_h)

        # add border_info to the original_resolusion dictionary
        for f_id,info in enumerate(border_info):
            print("for border info")


        # genarate video from images and frame contents for the AnnotationFrame
        annotation_object = generate_video(task_folder, out_put_path, frame_rate)


        s3_path = s3_bucket.s3_upload(str(content_path).split('/')[-2], out_put_path)
        # print(s3_path)
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
            "paded_width":m_w,
            "paded_height": m_h,
            "auditStatus": 0,
            "taskStatus": 2,
            "uploadId": ret_id,
            "videoDuration": str(timedelta(seconds=int(frames_per_task / frame_rate))),
            "AutoAnnotationVersion": 0,
            "Original_resolutions" : original_resolusion
            # "frameStart": int(original_frame_numbers_per_task[0]),
            # "frameEnd": int(original_frame_numbers_per_task[-1]),
            # "frameStartTime": float(int(original_frame_numbers_per_task[0]) / fps),
            # "original_frames": str(original_frame_numbers_per_task),
            # "Originalframerate": fps,   
        }

        task_id_mongo = task_db.post_one_document(task_object)

        # for item in annotation_object:
        #     item['taskId'] = task_id_mongo

        # frame_db.post_documents(annotation_object)

        project_update.find_one_push({'_id': ObjectId(str(project_ID))},
                                                          {'contentUploads': task_id_mongo})

        mdb_progress.find_one_update({'_id': ObjectId(str(ret_id))},{'progress': ((task_count + 1) / Total_task_count) * 100})
        mdb_progress.find_one_update({'_id': ObjectId(str(ret_id))},{'taskCount': task_count + 1})

        "============================================================================================"
        res.append(task_object)
    

    # # Progress finished
    mdb_progress.find_one_update({'_id': ObjectId(str(ret_id))},{'progress': 100})
    finished_time = datetime.utcnow()
    mdb_progress.find_one_update({'projectId': ObjectId(project_ID)}, {"finishedAt": finished_time})
    mdb_progress.find_one_update({'_id': ObjectId(str(ret_id))}, {"status": int(1)})

    return res


# if __name__ == '__main__':

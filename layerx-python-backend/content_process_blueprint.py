"""

Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.

maintainers : tharindu@zoomi.ca

This is the script for the flask API which will generate the tasks and relevant annotation videos
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
request codes
    unauthorised : 401
    Bad Request code : 400

API end points and request url:
    http://127.0.0.1:5000/api/processContent
body params:
    auth_key : ZOOMI-ANNO_TOOL_EupRMda1RzHobazafFVzTut0h40GfVttGSOJy9IvsTT2z8vcqTgYleZMbgC9nXozjQ
        this is fixed key.
    project_id :
        related project id for the tasked to be generated
    frame_rate : 5
        required frame rate to select the frames from the input video
        need to be an integer
    content_path : ./contents/uploads/testproject1/Cam1-15-16-9.mp4
        server location of the uploaded video
"""

from flask import request, jsonify, Blueprint
from flask_cors import cross_origin
from content_processor import processContent
import os
import shutil
import time
import json
import configparser
from logger import get_debug_logger

content_process_blueprint_ = Blueprint('content_process_blueprint_', __name__)

# logging configuration
app_logger = get_debug_logger('app', './logs/app.log')

params = configparser.ConfigParser(os.environ)
CONFIG_FILE_PATH = 'config.cfg'
params.read(CONFIG_FILE_PATH)

CONTENT_BASE = f"{params.get('Folders', 'content_base')}"
app_process = processContent()


@content_process_blueprint_.route('/api/processContent',  methods=['GET', 'POST'])
@cross_origin()
def contentprocess():
    if request.method == 'POST':
        frame_rate = request.form.get('frame_rate')
        upload_id = request.form.get('upload_id')
        project_id = request.form.get('project_id')
        content_path = request.form.get('content_path')
        auth_key = request.form.get('auth_key')
        force_write = request.form.get('force_write')
        auto_anno_version = request.form.get('auto_anno_version')
        request_type = request.form.get('request_type')
        content_type = request.form.get('content_type')

        input_object = {'frame_rate': frame_rate, 'upload_id': upload_id, 'project_id': project_id,
                        'content_path': content_path, 'auth_key': auth_key, 'force_write': force_write,
                        'auto_anno_version': auto_anno_version, 'request_type': request_type, 'content_type': content_type}

        json_formatted_str = json.dumps(input_object, indent=4)
        app_logger.debug(f'[INFO] contentprocess() | input parameters: {json_formatted_str}')

        res = None
        errors = {}
        success = False
        strt = 0

        if upload_id:
            flag, error = app_process.validation_project_ID(upload_id)
            if not flag:
                resp = jsonify({str(upload_id): 'invalid ObjectId, it must be a 12-byte input or a 24-character hex '
                                                'string (EX: 6127d7b6cb8d74adc903eeb9)'})
                resp.status_code = 400
                return resp
        else:
            resp = jsonify({'message': 'missing upload_id param'})
            resp.status_code = 400
            return resp

        if auth_key != '':
            auth = app_process.key_auth(auth_key)
            if auth == 'Fail':
                error = {'Authentication Error': 'Invalid auth key. please provide the valid auth key'}
                resp = jsonify(error)
                resp.status_code = 401
                error_content = {'error_code': 401, 'error_message': str(error)}
                app_process.error_update(upload_id, error_content)
                return resp
        else:
            error = {'message': 'please provide the auth key'}
            resp = jsonify(error)
            resp.status_code = 400
            error_content = {'error_code': 401, 'error_message': str(error)}
            app_process.error_update(upload_id, error_content)
            return resp

        if frame_rate:
            if not frame_rate.isnumeric():
                error = {str(frame_rate): 'frame_rate need to be an integer'}
                resp = jsonify(error)
                resp.status_code = 400
                error_content = {'error_code': 401, 'error_message': str(error)}
                app_process.error_update(upload_id, error_content)
                return resp
        else:
            error = {'missing frame_rate param'}
            resp = jsonify(error)
            resp.status_code = 400
            error_content = {'error_code': 400, 'error_message': str(error)}
            app_process.error_update(upload_id, error_content)
            return resp

        if project_id:
            flag, error = app_process.validation_project_ID(project_id)
            if not flag:
                error = {str(project_id): 'invalid ObjectId, it must be a 12-byte input or a 24-character hex '
                                                 'string (EX: 6127d7b6cb8d74adc903eeb9)'}
                resp = jsonify(error)
                resp.status_code = 400
                error_content = {'error_code': 400, 'error_message': str(error)}
                app_process.error_update(upload_id, error_content)
                return resp
        else:
            error = {'missing project_id param'}
            resp = jsonify(error)
            resp.status_code = 400
            error_content = {'error_code': 400, 'error_message': str(error)}
            app_process.error_update(upload_id, error_content)
            return resp

        if force_write:
            if not force_write.isnumeric():
                error = {str(force_write): 'force_write need to be an integer.',
                                'INFO': {'no force write': int(0), 'forcefully write': int(1)}}
                resp = jsonify(error)
                resp.status_code = 400
                error_content = {'error_code': 400, 'error_message': str(error)}
                app_process.error_update(upload_id, error_content)
                return resp
            else:
                if int(force_write) == 1:
                    try:
                        for vid_folder in os.listdir(CONTENT_BASE + project_id):
                            if content_path.split('/')[-1].split('.')[0] == '-'.join(vid_folder.split('-')[2:]):
                                path = CONTENT_BASE + project_id + '/' + vid_folder
                                shutil.rmtree(path)
                    except Exception as e:
                        app_logger.debug(f'[ERROR] contentprocess() | no project folder to delete with the project_id: {project_id} | [INFO] {e}')
                        pass
        else:
            error = {'missing force_write param'}
            resp = jsonify(error)
            resp.status_code = 400
            error_content = {'error_code': 400, 'error_message': str(error)}
            app_process.error_update(upload_id, error_content)
            return resp

        if request_type:
            if not request_type.isnumeric():
                error = {str(request_type): 'request_type need to be an integer.',
                                'INFO': {'only tasks without annotations': int(0), 'tasks plus annotations': int(1),
                                         'auto annotations only': int(2)}}
                resp = jsonify(error)
                resp.status_code = 400
                error_content = {'error_code': 400, 'error_message': str(error)}
                app_process.error_update(upload_id, error_content)
                return resp
            else:
                if int(request_type) == 2:
                    rest_, numb = app_process.validate_frames_per_task(project_id, content_path)
                    if rest_:
                        error = {str(request_type): 'frames_per_task is not match with the previous values',
                                        'INFO': f'previous frames_per_task = {numb}'}
                        resp = jsonify({str(request_type): 'frames_per_task is not match with the previous values',
                                        'INFO': f'previous frames_per_task = {numb}'})
                        resp.status_code = 400
                        error_content = {'error_code': 400, 'error_message': str(error)}
                        app_process.error_update(upload_id, error_content)
                        return resp
        else:
            error = {'missing request_type param'}
            resp = jsonify(error)
            resp.status_code = 400
            error_content = {'error_code': 400, 'error_message': str(error)}
            app_process.error_update(upload_id, error_content)
            return resp

        if auto_anno_version:
            if not auto_anno_version.isnumeric():
                error = {str(auto_anno_version): 'auto_anno_version need to be an integer.',
                                'INFO': {'no annotations': int(0), 'other annotation versions': '1, 2, 3, ..., n'}}
                resp = jsonify(error)
                resp.status_code = 400
                error_content = {'error_code': 400, 'error_message': str(error)}
                app_process.error_update(upload_id, error_content)
                return resp
            else:
                if int(request_type) == 0 and int(auto_anno_version) != 0:
                    error = {str(auto_anno_version): 'auto_anno_version needed to be 0, if auto annotations not '
                                                            'required.'}
                    resp = jsonify(error)
                    resp.status_code = 400
                    error_content = {'error_code': 400, 'error_message': str(error)}
                    app_process.error_update(upload_id, error_content)
                    return resp

                if int(auto_anno_version) == 0 and int(request_type) != 0:
                    error = {str(auto_anno_version): 'auto_anno_version = 0 means no annotations requested. so'
                                                            'when requesting auto annotations auto_anno_version cannot'
                                                            'equal to zero. (auto_anno_version > existing version) '}
                    resp = jsonify(error)
                    resp.status_code = 400
                    error_content = {'error_code': 400, 'error_message': str(error)}
                    app_process.error_update(upload_id, error_content)
                    return resp

                try:
                    ret_ = app_process.check_current_anno_version(project_id, content_path)
                    if ret_ is not None:
                        if int(ret_) >= int(auto_anno_version) != 0:
                            error = {str(auto_anno_version): 'requested auto_anno_version id less than the existing '
                                                             'version please make sure requesting '
                                                             'auto_anno_version > existing version '}
                            resp = jsonify(error)
                            resp.status_code = 400
                            error_content = {'error_code': 400, 'error_message': str(error)}
                            app_process.error_update(upload_id, error_content)
                            return resp
                    else:
                        pass
                except KeyError:
                    pass

        else:
            error = {'missing auto_anno_version param'}
            resp = jsonify(error)
            resp.status_code = 400
            error_content = {'error_code': 400, 'error_message': str(error)}
            app_process.error_update(upload_id, error_content)
            return resp

        if content_path:
            if content_type != 2:
                if app_process.allowed_file(str(content_path).split('/')[-1]):
                    if os.path.isfile(str(content_path)):
                        video_existence_flag = True
                    else:
                        if not int(request_type) == 2:
                            video_existence_flag = False
                        else:
                            video_existence_flag = True
                    if video_existence_flag:
                        vid_name = content_path.split('/')[-1].split('.')[0]
                        fg_existence = app_process.check_existence_task(vid_name, project_id)
                        print(fg_existence)
                        if not fg_existence:
                            flag_task_existence = True  # okay
                        else:
                            if int(force_write) == 0:
                                if int(request_type) == 2:
                                    flag_task_existence = True  # okay
                                else:
                                    flag_task_existence = False
                                    success = False
                            else:
                                flag_task_existence = True  # okay

                        if flag_task_existence:
                            if int(request_type) == 0:
                                strt = time.time()
                                res, taskID = app_process.content_process_base(content_path, int(frame_rate), project_id, upload_id, logger_flag='content_processor')

                                success = True
                                if res == 0:
                                    success = False
                                    errors[str(taskID)] = 'task is already exist'
                                if res == 1:
                                    success = False
                                    errors[str(taskID)] = 'No incomplete tasks'

                            if int(request_type) == 1:
                                model_existing_flag, errors_model = app_process.model_checker('content_processor')
                                if model_existing_flag:
                                    strt = time.time()
                                    res, taskID = app_process.content_process_auto_anno_tasks(content_path, int(frame_rate), project_id,
                                                                                              auto_anno_version, upload_id, logger_flag='content_processor')
                                    if res == 0:
                                        success = False
                                        errors[str(taskID)] = 'task is already exist'
                                    else:
                                        success = True
                                else:
                                    success = False
                                    errors['MODELS NOT FOUND'] = errors_model

                            if int(request_type) == 2:
                                model_existing_flag, errors_model = app_process.model_checker('content_processor')
                                if model_existing_flag:
                                    strt = time.time()
                                    task_id_list = app_process.get_auto_anno_status(content_path, project_id,
                                                                                                  auto_anno_version)
                                    # print(autoannotation_frame_list, task_id_list)
                                    if len(task_id_list) == 0:
                                        errors[str(auto_anno_version)] = f'version is already updated for all tasks. update it ' \
                                                                         f'to {auto_anno_version + str(1)}'
                                        success = False
                                    else:
                                        res = app_process.content_process_auto_anno(project_id, content_path, task_id_list,
                                                                                    auto_anno_version, upload_id, logger_flag='content_processor')
                                        success = True
                                else:
                                    success = False
                                    errors['MODELS NOT FOUND'] = errors_model
                        else:
                            errors[str(project_id)] = f'requested video: {vid_name} ' \
                                                      f'is already has generated tasks in Project_ID: {project_id}'

                    else:
                        errors[str(content_path).split('/')[-1]] = 'video file is not existing'
                else:
                    errors[str(content_path).split('/')[-1]] = 'video type is not allowed'
            else:
                print("content type is image")
                res = app_process.content_process_imaged(content_path, int(frame_rate), project_id, upload_id)
        else:
            error = {'missing content_path param'}
            resp = jsonify(error)
            resp.status_code = 400
            error_content = {'error_code': 400, 'error_message': str(error)}
            app_process.error_update(upload_id, error_content)
            return resp

        if success:
            if res != 'success':
                for dict in res:
                    dict.pop('_id', None)
                    dict.pop('projectId', None)
                    dict.pop('uploadId', None)
                    dict.pop('taskId', None)

            resp = jsonify(res)
            resp.status_code = 200
            app_logger.debug(f'[INFO] contentprocess() | time elapsed for the request with upload_id {upload_id}: {time.time() - strt}')
            print(f'[INFO] contentprocess() time_elapse: {time.time() - strt}')
            return resp
        else:
            resp = jsonify(errors)
            error_content = {'error_code': 200, 'message': str(errors)}
            resp.status_code = 200
            app_process.error_update(upload_id, error_content)
            return resp

    return '''
            <!doctype html>
            <title>video content process</title>
            <h1>insert project data</h1>
            <form method=post enctype=multipart/form-data>
              <label for="P_ID">Project ID:</label> 
              <input type="text" name="project_id" id="P_ID"> <br>
              <br>
              <label for="U_ID">Upload ID:</label> 
              <input type="text" name="upload_id" id="U_ID"> <br>
              <br>
              <label for="FR">Frame rate:</label> 
              <input type="text" name="frame_rate" id="FR"> <br>
              <br>
              <label for="key">Auth key:</label> 
              <input type="text" name="auth_key" id="key"> <br>
              <br>
              <label for="Cpath">Content video path:</label> 
              <input type="text" name="content_path" id="Cpath"> <br>
              <br>
              <label for="FR">Force write:</label> 
              <input type="text" name="force_write" id="FR"> <br>
              <br>
              <label for="AAV">Required annotation version:</label> 
              <input type="text" name="auto_anno_version" id="AAV"> <br>
              <br>
              <label for="RT">Request Type:</label> 
              <input type="text" name="request_type" id="RT"> <br>
              <br>
              <input type=submit value=Upload>
            </form>
            '''
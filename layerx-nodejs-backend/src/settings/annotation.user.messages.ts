/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 */
export const AnnotationUserMessages = {
  PROJECT_ID_CREATE_FAIL: 'Failed to create project', //Failed to create project in system
  PROJECT_DELETE_SUCCESS: 'Project successfully deleted', //Delete project success
  PROJECT_DELETE_NOT_FOUND: 'Project not available', //Sent when try to delete a project that not available
  API_ACCESS_DENIED: 'Authorization Failed', //Sent for the external API - when authorization parameters (API keys ) are invalid
  PROJECT_GOOGLE_UPLOAD_FAILED: 'Google Drive file upload Failed',
  PROJECT_GOOGLE_PROCESS_FAILED: 'File process failed',
  PROJECT_VIDEO_NOT_FOUND: "videos are already deleted",//sent when videos belong to a project already are deleted
  VIDEO_DELETE_SUCCESS: "videos successfully deleted",
  VIDEO_DELETE_FAIL: "fail to delete videos",
  PROJECT_UPLOAD_FILE_TIME_OUT: 'File upload time out',
  PROJECT_USED: 'project label can not be edit',
  DATASET_TASK_COUNT_ZERO: "No Videos Added",
  EMAIL_DUPLICATE: "Another User with Edited Email",
  INVALID_EMAIL: "Invalid Email",
  NOT_INVITED: "You have to be invited",
  PROJECT_IS_USED: "Project cannot be deleted as it is already used for one or more data sets",
  NO_TASKS_IN_DATASET:"No tasks are selected",
  DOWNLOADING: "Downloading",
  FILE_SIZE_EXCEEDED_LIMIT: "File sizes are larger than 2GB Maximum Limit",
  USER_NOT_FOUND: "User not Found"
};

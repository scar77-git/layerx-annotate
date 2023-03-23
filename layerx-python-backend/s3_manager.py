"""
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.

maintainers : dinusha@zoomi.ca, tharindu@zoomi.ca

S3 bucket access functions.
"""

import os
import boto3
import configparser

# logging configuration
from logger import get_debug_logger
s3_logger = get_debug_logger('s3_manager', './logs/s3_manager.log')

# Read settings from config file
params = configparser.ConfigParser(os.environ)
CONFIG_FILE_PATH = 'config.cfg'
params.read(CONFIG_FILE_PATH)
S3_AUG_BASE = f"{params.get('Folders', 's3_base_aug')}"

class s3_bucket_manager:
    def __init__(self, region_name, aws_access_key_id, aws_secret_access_key, bucket_name):
        self.region_name = region_name
        self.aws_access_key_id = aws_access_key_id
        self.aws_secret_access_key = aws_secret_access_key
        self.bucket_name = bucket_name

        try:
            # s3 credentials
            self.session = boto3.session.Session()
            self.s3_client = self.session.client('s3', region_name=self.region_name,
                                          aws_access_key_id=self.aws_access_key_id,
                                          aws_secret_access_key=self.aws_secret_access_key)
            
            s3_logger.debug(f"Successfully connected to {self.bucket_name}")
        except Exception as e:
            s3_logger.debug(f" S3 Error {e}")
            raise Exception("S3_CONNECTION_ERROR")

    def get_client(self):
        return self.s3_client
        
    def s3_upload(self, s3_client, project_path, content_path):
        s3_client.upload_file(
                                    content_path,                                 
                                    self.bucket_name,                                     
                                    'contents/{}/{}/{}'.format(project_path, content_path.split('/')[-2],
                                                               content_path.split('/')[-1]),
                                    ExtraArgs={'ContentType': 'video/mp4'})
        
        # Added Line
        s3_client.upload_file( content_path,self.bucket_name, '/Latest/latest.mp4',ExtraArgs={'ContentType':'video/mp4'})

        print("++++++++++++++++ Code reached ++++++++++ Video with latest tag should be uploaded")
        s3_logger.debug("Code reheaced and video with latest tag saved")
        
        s3_path = 'contents/{}/{}/{}'.format(project_path, content_path.split('/')[-2],
                                             content_path.split('/')[-1])
                                                                                                                                                     
        return s3_path

    def s3_upload_images(self, s3_client, project_path, content_path, group_id):
        for img in os.listdir(content_path):
            if img.endswith("thumbnail.jpg"): 
                frame_name = img.split('_')[-2]
                frame_id = frame_name.replace('.jpg', '')
                frame_name = frame_id+"_thumbnail.jpg"
                s3_client.upload_file(
                                        os.path.join(content_path, img),
                                        self.bucket_name, 
                                        'dataset/{}/{}/{}/{}'.format(group_id, project_path, frame_id, frame_name)
                                          )

            elif img.endswith(".jpg"): 
                # find frame id by splitting image name
                frame_name = img.split('_')[-1]
                frame_id = frame_name.replace('.jpg', '')
                s3_client.upload_file(
                                            os.path.join(content_path, img),
                                            self.bucket_name, 
                                            'dataset/{}/{}/{}/{}'.format(group_id, project_path, frame_id, frame_name)
                                          )

    def s3_upload_images_aug(self, s3_client, project_path, content_path, group_id, version_id):
        for file in os.listdir(content_path):
            if file.endswith("_thumbnail.jpg"):
                # find frame id by splitting image name
                frame_name = '_'.join(file.split('_')[-3:])
                frame_id = int(file.split('_')[-2])
                self.s3_client.upload_file(
                    os.path.join(content_path, file),
                    self.bucket_name,
                    'dataset/{}/{}/{}/{}/{}'.format(group_id, project_path, frame_id, S3_AUG_BASE, frame_name)
                )
            elif file.endswith(".jpg"):
                # find frame id by splitting image name
                frame_name = '_'.join(file.split('_')[-2:])
                frame_id = int(file.split('_')[-1].split('.')[0])
                s3_client.upload_file(
                    os.path.join(content_path, file),
                    self.bucket_name,
                    'dataset/{}/{}/{}/{}/{}'.format(group_id, project_path, frame_id, S3_AUG_BASE, frame_name)
                )
            if file.endswith(".txt"):
                frame_name = '_'.join(file.split('_')[-2:])
                frame_id = int(file.split('_')[-1].split('.')[0])
                s3_client.upload_file(
                    os.path.join(content_path, file),
                    self.bucket_name,
                    'dataset/{}/{}/{}/{}/{}'.format(group_id, project_path, frame_id, S3_AUG_BASE, f'{version_id}_{frame_name}')
                )

    def s3_upload_textfiles(self, s3_client, project_path, content_path, group_id, version_id):
        for txt in os.listdir(content_path):
            if txt.endswith(".txt"):
                frame_name = txt.split('_')[-1]
                frame_id = frame_name.replace('.txt', '')
    
                s3_client.upload_file(
                                        os.path.join(content_path, txt),
                                        self.bucket_name,
                                        'dataset/{}/{}/{}/{}'.format(group_id, project_path, frame_id, f'{version_id}_{frame_name}')
                                          )

    def s3_download(self, s3_client, save_path, content_path):
        downloaded = 0
        def progress(chunk):
            nonlocal downloaded
            downloaded += chunk
    
        with open(save_path, 'wb') as f:
            s3_client.download_fileobj(self.bucket_name, content_path, f, Callback=progress)

    # Use for upload sample to s3 bucket
    def s3_upload_sample(self, s3_client, content_path, group_id, version_id):
        s3_client.upload_file(
            os.path.join(content_path),
            self.bucket_name,
            'dataset/{}/{}/{}'.format(group_id, version_id, 'samples.zip')
        )
        return 'dataset/{}/{}/{}'.format(group_id, version_id, 'samples.zip')
    
    #Use for get authenticated s3 URL
    def s3_getAuthenticatedUrl(self,s3_client, content_path, expiration):
        s3Url = s3_client.generate_presigned_url('get_object',Params={'Bucket': self.bucket_name,'Key': content_path},ExpiresIn=expiration)
        return s3Url



# Python backend operations

Python backend content processor receives projectID, video file location and required frame rate from Node.js through
Flask API

### REST API details
    API end points and request url:
        http://127.0.0.1:5000/api/processContent
    body parms:

        upload_id : 
            related upload id from ContentUpload collectopn

        auth_key : ZOOMI-ANNO_TOOL_EupRMda1RzHobazafFVzTut0h40GfVttGSOJy9IvsTT2z8vcqTgYleZMbgC9nXozjQ
                   this is fixed key.

        project_id :
            related project id for the tasked to be generated

        frame_rate : 5
            required frame rate to select the frames from the input video
            need to be an integer

        content_path : ./contents/uploads/testproject1/Cam1-15-16-9.mp4
            server location of the uploaded video

        force_write
            flag to determine ovewrite the data
                1. no force write : 0
                2. force write    : 1

        auto_anno_version
            required auto annotation version 
                1. no annotations: 0
                2. other annotation versions: (1,2,3....,n)

        request_type
            calling request type
                1. AA_bar (only tasks without annotations) : 0
                2. AA_tasks (tasks plus annotations)       : 1
                3. AA (auto annotations only)              : 2

        content_type
            type of uploaded content
                1. Video : 1
                2. Image : 2

### Status details 

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
        
## Dependancy installation

### Opencv installation

follow the instructions here

    https://www.pyimagesearch.com/2018/08/15/how-to-install-opencv-4-on-ubuntu/

### installation requirements
    
    pip3 install -r requirements.txt

### mongo DB dependencies 

MongoDB is used to maintain task and project related documents.

    AnnotationProject : contains information about the project
    AnnotationTask    : contains information about task related information
    AnnotationContentUpload : contains information on task generation process using opencv and progress update information for the front end

pymongo library is used to code, All the mongoDB related codes are in mongo_manager.py.

follow the instructions here

    https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/
    
## Run flask server 

#### flask deployment server 
Note: not recomended for production deployment

    nohup python3 app.py &

#### gunicorn production server 


* Gunicorn with gevent async worker

       gunicorn --bind 0.0.0.0:8081 wsgi:app -k gevent --worker-connections 1000
    
* Gunicorn 1 worker 12 threads:
    
       gunicorn --bind 0.0.0.0:8081 wsgi:app -w 1 --threads 12
    
* Gunicorn with 4 workers (multiprocessing):
    
       gunicorn --bind 0.0.0.0:8081 wsgi:app -w 4

More information on Flask concurrency can be found here.

https://stackoverflow.com/questions/10938360/how-many-concurrent-requests-does-a-single-flask-process-receive


## Architecture details

create tasks videos from a given video clip for the project

		1. Split video in to frames according to the given frame rate
		2. write the splited frames in to a task video , are the two main objectives which use Opencv.
		
Since frontend need to have h264 video format to play videos in the browser, Opencv needs to be build from \
source (Opencv needs to be directed to use libx264-dev). Following link shows how to install opencv \
from the source.


## Dataset creation

### Usage

#### Step 1
config.cfg           : use to hold the MongoDB, S3 and folder paths (edit this according to the MongoDB used (production,QA,dev))
##### NOTE 
change the number of cores in config.cfg according to the server used.

#### Step 2
dataset_processor.py : used to crate a dataset and upload images and annotation text files to the S3

    $ ./dataset_processor.py -v <dataset-version-id>


### warm start
dataset_creation_warm_start.py, this script is used when a warm start of the server. It will look for the \
datasets with pending tasks and complete them.

TODO : https://askubuntu.com/questions/817011/run-python-script-on-os-boot#:~:text=Place%20the%20script,sh/temperature.sh%20%20%26

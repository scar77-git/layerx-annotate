"""

Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.

maintainers : dinusha@zoomi.ca

endpoint for dataset creation
inputs: database_version_id
generates frames and text files

"""

from flask import request, Blueprint
from flask_cors import cross_origin
from multiprocessing import Process
from dataset_processor import DATASET_GENARATOR
from logger import get_debug_logger

# logging configuration
dataset_logger = get_debug_logger('dataset_processor', './logs/dataset_processor.log') 


dataset_process_blueprint_ = Blueprint('dataset_process_blueprint_', __name__)


def create_datasets_async(id):
    dataset_creator = DATASET_GENARATOR(dataset_logger)    
    dataset_creator.process_dataset(id)


@dataset_process_blueprint_.route('/api/createDataSet', methods=['POST'])
@cross_origin()
def datasetProcess():
    datasetVersionId = request.form.get('data_version_id')
    p = Process(target=create_datasets_async, args=(datasetVersionId,))
    p.start()
    # response = Flask.Response(status=201)
    return "", 201
"""
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.

maintainers : dinusha@zoomi.ca

This python script handles the warm start of dataset creation process when the server is restarted.
"""

from dataset_processor import DATASET_GENARATOR
import traceback

#logging configeration
from logger import get_debug_logger
dataset_warm_logger = get_debug_logger('dataset_warm_start_logger','./logs/dataset_warmstart.log')

# Main function to call in flask API
def dataset_warmstart():
    # create dataset_creator object
    dataset_creator = DATASET_GENARATOR(dataset_warm_logger)    
    pending_list = dataset_creator.get_pending_datasets()
    for dataset in pending_list:
        try:
            dataset_creator.process_dataset(dataset)
        except Exception as e:
            var = traceback.format_exc()
            dataset_warm_logger.debug(f'[{dataset}]ERROR warm_start(): {var}')


# if __name__ == '__main__':
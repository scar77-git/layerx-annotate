"""
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.

maintainers : dinusha@zoomi.ca

This is the script for add logging capability.
"""

import logging
import logging.handlers


def get_debug_logger(name, log_file_path, level=logging.DEBUG):
    _logger = logging.getLogger(name)
    _logger.setLevel(level)
    file_handler = logging.FileHandler(log_file_path)
    formatter = logging.Formatter(fmt='%(asctime)s %(levelname)-8s %(message)s', datefmt='%Y-%m-%d %H:%M:%S')
    file_handler.setFormatter(formatter)
    _logger.addHandler(file_handler)

    return _logger

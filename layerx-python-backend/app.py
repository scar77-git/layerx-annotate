"""
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.

maintainers : tharindu@zoomi.ca, dinusha@zoomi.ca, isuruj@zoomi.ca

Flask API for web services
Main programme to start the web service

service up:
production
    gunicorn --bind 0.0.0.0:8081 wsgi:app
dev
    python3 app.py

"""

from flask import Flask, jsonify
from content_process_blueprint import content_process_blueprint_
from data_process_blueprint import dataset_process_blueprint_
from content_processor import processContent
from dataset_creation_warm_start import *
import threading
from multiprocessing import Process

app = Flask(__name__)
app.url_map.strict_slashes = False
app_process = processContent()


@app.before_request
# trailing slash
def clear_trailing():
    from flask import redirect, request

    rp = request.path
    if rp != '/' and rp.endswith('/'):
        return redirect(rp[:-1])


@app.errorhandler(404)
# inbuilt function which takes error as parameter
def not_found(e):
    # defining function
    object_ = {'message': str(e)}
    resp = jsonify(object_)
    resp.status_code = 404
    return resp


app.register_blueprint(content_process_blueprint_)
app.register_blueprint(dataset_process_blueprint_)


def app_run(host, port, debug, use_reloader):
    app.run(host=host, port=port, debug=debug, use_reloader=use_reloader)


def warmstart_content_processor(project_id={}):
    app_process.content_processor_warmstart(project_ID=project_id)


def warmstart_dataset_processor():
    dataset_warmstart()


if __name__ == '__main__':

    host = '0.0.0.0'
    port = 8081
    debug = True
    use_reloader = False

    # dataset warm start
    p = Process(target=warmstart_dataset_processor)
    p.daemon = True
    p.start()

    t1 = threading.Thread(target=warmstart_content_processor)
    t2 = threading.Thread(target=app_run, args=(
        host, port, debug, use_reloader,))
    # content processor warm startup
    t1.start()
    # app start
    t2.start()

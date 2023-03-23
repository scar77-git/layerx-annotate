"""

Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.

maintainers : dinusha@zoomi.ca

This is the Gunicorn configuration file.
"""

from logger import get_debug_logger
# logging configuration
unicorn_logger = get_debug_logger('unicorn_logger', './logs/gunicorn.log')

bind = '0.0.0.0:8081'
backlog = 2048

workers = 4
max_requests = 1
worker_class = 'sync'
worker_connections = 1000
timeout = 30
keepalive = 2
spew = False

daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

errorlog = '-'
loglevel = 'info'
accesslog = '-'
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'

proc_name = None

# server hooks

def on_starting(server):
    unicorn_logger.debug("Server starting ")


def post_fork(server, worker):
    unicorn_logger.debug("Worker spawned (pid: %s)", worker.pid)

# Called just before a worker processes the request
def pre_request(worker, req):
    unicorn_logger.debug("(worker pid : %s) %s %s" % (worker.pid, req.method, req.path))

def child_exit(server, worker):
    unicorn_logger.debug("Worker exited from master process (pid: %s)", worker.pid)

def worker_exit(server, worker):
    unicorn_logger.debug("Worker exited from worker process (pid: %s)", worker.pid)

def nworkers_changed(server, new_value, old_value):
    unicorn_logger.debug("num Worker changed from (%s) to (%s)" % (old_value ,new_value))

def pre_exec(server):
    unicorn_logger.debug("Forked child, re-executing.") 

def when_ready(server):
    unicorn_logger.debug("Server is ready. Spawning workers")  

def worker_int(worker):
    unicorn_logger.debug("worker received INT or QUIT signal")

    ## get traceback info
    import threading, sys, traceback
    id2name = {th.ident: th.name for th in threading.enumerate()}
    code = []
    for threadId, stack in sys._current_frames().items():
        code.append("\n# Thread: %s(%d)" % (id2name.get(threadId,""),
            threadId))
        for filename, lineno, name, line in traceback.extract_stack(stack):
            code.append('File: "%s", line %d, in %s' % (filename,
                lineno, name))
            if line:
                code.append("  %s" % (line.strip()))
    unicorn_logger.debug("\n".join(code))

def worker_abort(worker):
    unicorn_logger.debug("worker received SIGABRT signal (pid: %s)", worker.pid)
"""
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.

maintainers : tharindu@zoomi.ca

auto annotation process for AI tool.
"""

import cv2
import colorsys
import numpy as np
import time
import os
import random
import tensorflow as tf
from tensorflow.python.saved_model import tag_constants
from tensorflow.python.ops import gen_image_ops
import configparser

params = configparser.ConfigParser(os.environ)
CONFIG_FILE_PATH = 'config.cfg'
params.read(CONFIG_FILE_PATH)

OBJECTNESS_CONFIDANCE = float(f"{params.get('Inference', 'objectness_confidance')}")
NMS_THRESHOLD = float(f"{params.get('Inference', 'nms_threshold')}")
labels_file = f"{params.get('Inference', 'labels_file')}"
weight_file = f"{params.get('Inference', 'weight_file')}"
config_file = f"{params.get('Inference', 'config_file')}"
default_net_width = int(f"{params.get('Inference', 'default_net_width')}")
default_net_height = int(f"{params.get('Inference', 'default_net_height')}")
ALLOWED_EXTENSIONS_ = eval(f"{params.get('Content', 'allowed_extensions')}")

weight_tf = f"{params.get('Inference', 'weight_tf')}"
image_size = int(f"{params.get('Inference', 'image_size')}")

physical_devices = tf.config.experimental.list_physical_devices('GPU')

if len(physical_devices) > 0:
    tf.config.experimental.set_memory_growth(physical_devices[0], True)

tf.image.non_max_suppression = gen_image_ops.non_max_suppression_v2

# comment out below line to enable tensorflow logging outputs
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'


class inference:
    def __init__(self, target_gpu_id):
        # opencv config
        self.labelspath = labels_file
        self.configpath = config_file
        self.weightspath = weight_file
        self.objectness_confidance = OBJECTNESS_CONFIDANCE
        self.nms_threshold = NMS_THRESHOLD
        self.gpu_id = target_gpu_id
        self.avg_fps = []
        self.total_detections = []
        self.total_groundtruths = []

        self.LABELS = self.get_classes()
        self.net = cv2.dnn_DetectionModel(self.configpath, self.weightspath)

        # TF
        self.classes = self.read_class_names(labels_file)
        self.LABELS = open(self.labelspath).read().strip().split("\n")
        self.weight = weight_tf
        self.image_size = image_size

        # initialize a list of colors to represent each possible class label
        self.COLORS = {'green': [64, 255, 64],
                       'blue': [255, 128, 0],
                       'coral': [0, 128, 255],
                       'yellow': [0, 255, 255],
                       'gray': [169, 169, 169],
                       'cyan': [255, 255, 0],
                       'magenta': [255, 0, 255],
                       'white': [255, 255, 255],
                       'red': [64, 0, 255]
                       }

        # OpenCV GPU on CUDA support
        try:
            device_count = cv2.cuda.getCudaEnabledDeviceCount()
            print("[INFO] GPU device count", device_count)
            cv2.cuda.setDevice(self.gpu_id)
            print(f"DNN_TARGET_CUDA set to GPU id {self.gpu_id}")

            self.net.setPreferableBackend(cv2.dnn.DNN_BACKEND_CUDA)
            self.net.setPreferableTarget(cv2.dnn.DNN_TARGET_CUDA_FP16)
            print("[INFO] You are using DNN_TARGET_CUDA_FP16 backend to increase the FPS. "
                  "Please make sure your GPU supports floating point 16, or change it back to DNN_TARGET_CUDA. "
                  "Ref: https://docs.nvidia.com/cuda/cuda-c-programming-guide/index.html#arithmetic-instructions")
        except Exception as e:
            print(e)
            print("[INFO] Please build OpenCV with GPU support in order to use DNN_BACKEND_CUDA: "
                  "https://www.pyimagesearch.com/2020/02/03/how-to-use-opencvs-dnn-module-with-nvidia-"
                  "gpus-cuda-and-cudnn/")
            print("[INFO] Shifting back to DNN_TARGET_CPU")
            self.net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
            self.net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
            pass

        print("[INFO] OpenCV version:", cv2.__version__)
        self.version = cv2.__version__
        if self.version < '4.5.4':
            print(f"[INFO] Your OpenCV version is {self.version} and it does not support the Scaled-YOLO models:"
                  f"yolov4-csp, yolov4-csp-swish, yolov4-p5, yolov4-p6. Please install OpenCV-4.5.3 or later")

        net_width, net_height = self.get_networksize()
        print('[INFO] Network width', net_width)
        print('[INFO] Network height', net_height)

        self.net.setInputParams(size=(int(net_width), int(net_height)), scale=1 / 255, swapRB=True, crop=False)

    def get_classes(self):
        names = []
        with open(self.labelspath) as f:
            content = f.read().splitlines()
            for line in content:
                names.append(line)
        return names

    def get_networksize(self):
        file = open(self.configpath, 'r')
        content = file.read()
        paths = content.split("\n")
        # default net size will be set as 416 if the network size is not detected from the cfg file
        net_width = 416
        net_height = 416
        for path in paths:
            if path.split("=")[0] == 'width':
                net_width = path.split("=")[1]
            if path.split("=")[0] == 'height':
                net_height = path.split("=")[1]
        return net_width, net_height

    def read_class_names(self, class_file_name):
        names = {}
        with open(class_file_name, 'r') as data:
            for ID, name in enumerate(data):
                names[ID] = name.strip('\n')
        return names

    def draw_bbox(self, image, bboxes, frame_object, show_label=False):
        num_classes = len(self.classes)
        image_h, image_w, _ = image.shape
        hsv_tuples = [(1.0 * x / num_classes, 1., 1.) for x in range(num_classes)]
        colors = list(map(lambda x: colorsys.hsv_to_rgb(*x), hsv_tuples))
        colors = list(map(lambda x: (int(x[0] * 255), int(x[1] * 255), int(x[2] * 255)), colors))

        random.seed(0)
        random.shuffle(colors)
        random.seed(None)
        out_boxes, out_scores, out_classes, num_boxes = bboxes
        for i in range(num_boxes[0]):
            print(i)
            if int(out_classes[0][i]) < 0 or int(out_classes[0][i]) > num_classes: continue
            coor = out_boxes[0][i]
            coor[0] = int(coor[0] * image_h)
            coor[2] = int(coor[2] * image_h)
            coor[1] = int(coor[1] * image_w)
            coor[3] = int(coor[3] * image_w)

            fontScale = 0.5
            score = out_scores[0][i]
            class_ind = int(out_classes[0][i])
            bbox_color = colors[class_ind]
            bbox_thick = int(0.6 * (image_h + image_w) / 600)
            c1, c2 = (coor[1], coor[0]), (coor[3], coor[2])
            # cv2.rectangle(image, (int(c1[0]), int(c1[1])), (int(c2[0]), int(c2[1])), bbox_color, bbox_thick)
            anno = [int(c1[0]), int(c1[1]), (int(c2[0])-int(c1[0])), (int(c2[1])-int(c1[1]))]
            if show_label:
                bbox_mess = '%s: %.2f' % (self.classes[class_ind], score)
                t_size = cv2.getTextSize(bbox_mess, 0, fontScale, thickness=bbox_thick // 2)[0]
                c3 = (c1[0] + t_size[0], c1[1] - t_size[1] - 3)
                cv2.rectangle(image, (int(c1[0]), int(c1[1])), (int(c3[0]), int(c3[1])), bbox_color, -1)  # filled

                cv2.putText(image, bbox_mess, (int(c1[0]), int(c1[1] - 2)), cv2.FONT_HERSHEY_SIMPLEX,
                            fontScale, (0, 0, 0), bbox_thick // 2, lineType=cv2.LINE_AA)

            boundaries = {'id': i, 'type': "rectangle", 'label': "Lap Sponge", 'color': "#00d1ff",
                          'status': "completed",
                          'isPermanent': "True", 'x': anno[0], 'y': anno[1], 'w': anno[2], 'h': anno[3],
                          'attributeValues': {},  "autoLable_confidance": str(score)}

            temp = {

                "id": i,
                "boundaries": boundaries,
                "attributeValues": {
                    "state": "Ready"
                }
            }
            frame_object['boxes'].append(temp)
        return image, frame_object

    def inference_selector(self, frame, service_type, frame_object):
        img = None
        anno_object = None
        if service_type == 'opencv-inference':
            img, anno_object = self.opencv_infer(frame, frame_object)

        if service_type == 'tensorflow-inference':
            img, anno_object = self.tensorflow_infer(frame, frame_object)
        return img, anno_object

    def tensorflow_infer(self, frame, frame_object):
        config = tf.compat.v1.ConfigProto(allow_soft_placement=True, log_device_placement=True)
        config.gpu_options.allow_growth = True
        os.environ["CUDA_VISIBLE_DEVICES"] = '0'
        input_size = self.image_size

        saved_model_loaded = tf.saved_model.load(self.weight, tags=[tag_constants.SERVING])
        infer = saved_model_loaded.signatures['serving_default']

        frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        image_data = cv2.resize(frame, (input_size, input_size))
        image_data = image_data / 255.
        image_data = image_data[np.newaxis, ...].astype(np.float32)
        prev_time = time.time()

        batch_data = tf.constant(image_data)
        pred_bbox = infer(batch_data)

        boxes = None
        pred_conf = None
        for key, value in pred_bbox.items():
            boxes = value[:, :, 0:4]
            pred_conf = value[:, :, 4:]

        boxes, scores, classes, valid_detections = tf.image.combined_non_max_suppression(
            boxes=tf.reshape(boxes, (tf.shape(boxes)[0], -1, 1, 4)),
            scores=tf.reshape(
                pred_conf, (tf.shape(pred_conf)[0], -1, tf.shape(pred_conf)[-1])),
            max_output_size_per_class=50,
            max_total_size=50,
            iou_threshold=self.nms_threshold,
            score_threshold=self.objectness_confidance
        )
        pred_bbox = [boxes.numpy(), scores.numpy(), classes.numpy(), valid_detections.numpy()]
        image, frame_obj = self.draw_bbox(frame, pred_bbox, frame_object)
        fps = 1.0 / (time.time() - prev_time)
        print("FPS: %.2f" % fps)

        result = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        return result, frame_obj

    def opencv_infer(self, image, frame_object):
        start_time = time.time()
        class_ids, confidences, boxes = self.net.detect(image, self.objectness_confidance, self.nms_threshold)

        try:
            class_names = [self.LABELS[id] for id in class_ids.flatten().tolist()]
            for i in range(class_ids.shape[0]):
                class_id = int(class_ids[i])
                confidence = float(confidences[i])
                x = int(boxes[i, 0])
                y = int(boxes[i, 1])
                w = int(boxes[i, 2])
                h = int(boxes[i, 3])

                color = self.COLORS[list(self.COLORS)[class_id % len(self.COLORS)]]
                label = "{}: {:.4f}".format(class_names[i], confidence)
                if class_names[i] == 'name_tag':
                    object_name = 'Name Tag'
                elif class_names[i] == 'face':
                    object_name = 'Face'
                elif class_names[i] == 'laparotomy_sponge':
                    object_name = 'Lap Sponge'
                else:
                    object_name = class_names[i]

                flag_render_detections = False
                if flag_render_detections:
                    cv2.rectangle(image, (x, y), (x + w, y + h), color, 2)
                    cv2.putText(image, label, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)

                boundaries = {'id': i, 'type': "rectangle", 'label': object_name, 'color': "#00d1ff",
                              'status': "completed", 'isPermanent': "True", 'x': x, 'y': y, 'w': w, 'h': h,
                              'attributeValues': {}, "autoLable_confidance": str(confidences[i])}

                temp = {

                    "id": i,
                    "boundaries": boundaries,
                    "attributeValues": {
                        "state": "Ready"
                    }
                }

                frame_object['boxes'].append(temp)
        except Exception as e:
            print(e)
            pass

        end_time = time.time()
        self.avg_fps.append(1 / (end_time - start_time))

        # avg_fps = "[INFO] approx. FPS: {:.2f}".format(sum(self.avg_fps) / len(self.avg_fps))
        # print("[INFO] approx. FPS per image: {:.2f}".format(1 / (end_time - start_time)))
        # print("[INFO] average FPS: {}".format(avg_fps))
        # print("=================================================================================================")
        return image, frame_object


# if __name__ == '__main__':


"""
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.

maintainers : tharindu@zoomi.ca

This python script handles augmentation process.
"""
import imgaug.augmenters as iaa
from imgaug.augmentables.bbs import BoundingBox, BoundingBoxesOnImage
from bson.objectid import ObjectId
import os
import cv2
import random
from mongo_manager import MongoDBmanager
from s3_manager import s3_bucket_manager
from logger import get_debug_logger
import configparser
from PIL import Image
import numpy as np

# Read settings from config file
params = configparser.ConfigParser(os.environ)

# logging configuration
augmentation_logger = get_debug_logger('augmentation_processor', './logs/augmentation_processor.log')

CONFIG_FILE_PATH = 'config.cfg'
params.read(CONFIG_FILE_PATH)

MDB_USER = f"{params.get('MongoDB', 'user_name')}"
MDB_PASS = f"{params.get('MongoDB', 'password')}"
MDB_NAME = f"{params.get('MongoDB', 'db_name')}"

S3_REGION = f"{params.get('S3', 'region')}"
S3_ACCESS_KEY = f"{params.get('S3', 'access_key_id')}"
S3_SECRET_KEY = f"{params.get('S3', 'secret_access_key')}"
S3_BUCKET = f"{params.get('S3', 'bucket_name')}"

TASK_BASE = f"{params.get('Folders', 'task_base')}"
CLIP_BASE = f"{params.get('Folders', 'clip_base')}"
AUG_BASE = f"{params.get('Folders', 'aug_base')}"
S3_AUG_BASE = f"{params.get('Folders', 's3_base_aug')}"

AUGMENTATION_MAP = eval(params.get('Augmentation', 'aug_map'))
FLAG_KEEP_SIZE = eval(params.get('Augmentation', 'keep_size_crop'))

# Mongo DB configurations
task_db = MongoDBmanager(MDB_USER, MDB_PASS, MDB_NAME, 'AnnotationTask')
frame_db = MongoDBmanager(MDB_USER, MDB_PASS, MDB_NAME, 'AnnotationFrame')
dataset_db = MongoDBmanager(MDB_USER, MDB_PASS, MDB_NAME, 'AnnotationDatasetVersion')
# print("mDB pass: "+MDB_PASS)

# S3 configurations
s3_bucket = s3_bucket_manager(S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET)

# Temporary folder locations
# sample_base = '/home/annotation.manager.dev/annotationserver/python_backend/annotation-backend/AnnotationDataProcessor/temp_augmentation/'
# augmented_data_base = '/home/annotation.manager.dev/annotationserver/python_backend/annotation-backend/AnnotationDataProcessor/augmented_data/'


def get_original_anno(h, w, txt_path):
    annotations = []
    with open(txt_path) as f:
        content = f.readlines()
        for line in content:
            line = line.split('//')[0].replace(' ', '_').split('_')

            lbl = line[0]
            x1 = int((float(line[1]) - (float(line[3]) / 2)) * w)
            y1 = int((float(line[2]) - (float(line[4]) / 2)) * h)
            x2 = int((float(line[1]) + (float(line[3]) / 2)) * w)
            y2 = int((float(line[2]) + (float(line[4]) / 2)) * h)
            # print(lbl,x1,y1,x2,y2)
            annotations.append([lbl, x1, y1, x2, y2])

    return annotations


def write_anno_to_txt(boxes, img_size, filepath):
    txt_file = open(filepath, "w")
    for box in boxes:
        x1 = int(box[0])
        y1 = int(box[1])
        x2 = int(box[2])
        y2 = int(box[3])
        w = x2 - x1
        h = y2 - y1
        h_img = img_size[0]
        w_img = img_size[1]
        print(box[4], (x1 + w / 2) / w_img, (y1 + h / 2) / h_img, w / w_img, h / h_img, file=txt_file)
    txt_file.close()


def augment_one_image(augmentation_options, img_path, txt_path):
    image = cv2.imread(img_path)
    h, w, c = image.shape
    anno = get_original_anno(h, w, txt_path)

    bbx = []
    for bo in anno:
        bbx.append(BoundingBox(x1=bo[1], y1=bo[2], x2=bo[3], y2=bo[4], label=bo[0]))

    bbs = BoundingBoxesOnImage(bbx, shape=image.shape)
    
    # augmentation options for dataset generation
    dic_augmentations = {
        'flip-horizontal': lambda: iaa.Flipud(),
        'flip-vertical': lambda: iaa.Fliplr(),

        'rotate': lambda angle_range: iaa.Affine(rotate=angle_range),
        'rotate-90': lambda keepsize: iaa.Rot90(1, keep_size=keepsize),
        'rotate-180': lambda keepsize: iaa.Rot90(2, keep_size=keepsize),
        'rotate-270': lambda keepsize: iaa.Rot90(3, keep_size=keepsize),

        'blur-gaussian': lambda sigma_range: iaa.GaussianBlur(sigma=sigma_range),
        'blur-average': lambda k_range: iaa.AverageBlur(k=k_range),
        'blur-median': lambda k_range: iaa.MedianBlur(k=k_range),

        'noise-gaussian': lambda scale_range: iaa.AdditiveGaussianNoise(scale=scale_range),
        'noise-laplace': lambda scale_range: iaa.AdditiveLaplaceNoise(scale=scale_range),

        'shear': lambda shear_range: iaa.Affine(shear=shear_range),
        'shear-x': lambda range_x: iaa.ShearX(range_x),
        'shear-y': lambda range_y: iaa.ShearY(range_y),

        'brightness-add': lambda range_brightness: iaa.AddToBrightness(range_brightness),
        'brightness-multiply': lambda range_brightness: iaa.MultiplyBrightness(range_brightness),

        'hue-add': lambda heu_range: iaa.AddToHue(heu_range),
        'hue-multiply': lambda heu_range: iaa.MultiplyHue(heu_range),

        'saturation-add': lambda saturation_range: iaa.AddToSaturation(saturation_range),
        'saturation-multiply': lambda saturation_range: iaa.MultiplySaturation(saturation_range),

        'grayscale': lambda alpha_range: iaa.Grayscale(alpha=alpha_range),

        'crop': lambda percentage_range: iaa.CropToFixedSize(width=int(w * (1 - (random.randint(int(percentage_range[0] * 100), int(percentage_range[1] * 100)))/100)),
                                                             height=int(h * (1 - (random.randint(int(percentage_range[0] * 100), int(percentage_range[1] * 100)))/100))),
        'crop-pad': lambda percentage_range: iaa.CropAndPad(percent=percentage_range),

        'contrast-gamma': lambda contrast_range: iaa.GammaContrast(contrast_range),
        'contrast-sigmoid': lambda gain_range: iaa.SigmoidContrast(gain=gain_range, cutoff=(0.4, 0.6)),

        'sharpen': lambda alpha_range: iaa.Sharpen(alpha=alpha_range, lightness=(0.5, 1.5))

    }
    augment_type = augmentation_options['augmentation_type']
    func = dic_augmentations[augment_type]

    if augment_type == 'rotate-90' or augment_type == 'rotate-180' or augment_type == 'rotate-270':
        seq = iaa.Sequential([func(augmentation_options['keep_size'])])
    elif augment_type == 'flip-horizontal' or augment_type == 'flip-vertical':
        seq = iaa.Sequential([func()])
    else:
        seq = iaa.Sequential([func(augmentation_options['range'])])

    # Augment BBs and images.
    image_aug, bbs_aug = seq(image=image, bounding_boxes=bbs)
    return image_aug, bbs_aug


def save_images(bbs_aug, image_aug, img_save_path, txt_save_path):
    augmented_bbox = []
    for i in range(len(bbs_aug.bounding_boxes)):
        after = bbs_aug.bounding_boxes[i]
        augmented_bbox.append([after.x1, after.y1, after.x2, after.y2, after.label])

    write_anno_to_txt(augmented_bbox, image_aug.shape, txt_save_path)
    cv2.imwrite(img_save_path, image_aug)
    try:
        # Create thumbnail of augmented image
        imageAugSavePath = img_save_path.replace(".jpg", "_thumbnail.jpg")
        imageThumb = Image.fromarray(image_aug)
        imageThumb.thumbnail((250, 250))
        augThumbnail = np.asarray(imageThumb)
        cv2.imwrite(imageAugSavePath, augThumbnail)  # save thumbnail of a frame as JPEG file
    except Exception as e:
        print(f"[error augmentation thumbnail] {e}")
    # ---------------------------------


def get_random_samples_from_dataset(dataset_id):
    # get the dataset document
    doc = dataset_db.get_one_document({"_id": ObjectId(dataset_id)})

    # get the task id list from AnnotatioDataset DB
    tasks = doc['taskList']

    # get frame id list from AnnotationFrame for all the tasks
    frame_ids = []

    for task in tasks:
        frames = frame_db.get_documents({"taskId": task})
        for frame in frames:
            frame_ids.append(frame)

    # Randomly select 10% of frame ids
    aug_list = random.sample(frame_ids, round(len(frame_ids) * 0.1))
    print(len(aug_list))

    # download images and text files for those frame ids from S3
    S3_image_list = []
    S3_text_list = []
    for item in aug_list:
        # get the image and text paths from AnnotationFrame
        doc = frame_db.get_one_document({"_id": item})
        S3_image_list.append(doc['imageUrl'])

        dataset_versions = doc['datasetVersions']
        for version in dataset_versions:
            if version['versionNo'] == 0.1:
                S3_text_list.append(version['textFiles']['YOLO'])


# if __name__ == '__main__':
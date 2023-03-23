// create mongodb user
db.createUser(
    {
      user: "layerx_aiuser",
      pwd:  "aiS123layerX",
      roles: [ { role: "readWrite", db: "AIData" } ],
      mechanisms:["SCRAM-SHA-1"]
    }
  );

//insert masterData
db.getCollection('MasterData').insert({
    "_id" : ObjectId("619dd3ff8c115a50e135b303"),
    "exportFormats" : {
        "YOLO" : {
            "fileType" : "XML",
            "name" : "Yolo",
            "category" : "category1"
        },
        "YOLO_DARK" : {
            "fileType" : "XML",
            "name" : "Yolo Darknet",
            "category" : "category2"
        },
        "YOLO_KERAS" : {
            "fileType" : "txt",
            "name" : "Yolo Keras",
            "category" : "category2"
        }
    },
    "augmentationTypes" : {
        "image" : [ 
            {
                "augmentationType" : "Flip Image",
                "settings" : [ 
                    "Horizontal", 
                    "Vertical"
                ],
                "subTitle" : "Add horizontal or vertical flips to help your model be insensitive to subject orientation.",
                "thumbnailUrl" : "/api/dataSet/image level thumbnail/flipImage.png"
            }, 
            {
                "augmentationType" : "90° Rotate",
                "settings" : [ 
                    "Clockwise", 
                    "Counter-Clockwise", 
                    "Upside Down"
                ],
                "subTitle" : "Add 90-degree rotations to help your model be insensitive to camera orientation.",
                "thumbnailUrl" : "/api/dataSet/image level thumbnail/90Rotate.png"
            }, 
            {
                "augmentationType" : "Crop",
                "settings" : [ 
                    "Percentage scale to crop"
                ],
                "subTitle" : "Add variability to positioning and size to help your model be more resilient to subject translations and camera position.",
                "thumbnailUrl" : "/api/dataSet/image level thumbnail/imageRotation.png"
            }, 
            {
                "augmentationType" : "Image Rotation",
                "settings" : [ 
                    "Percentage scale"
                ],
                "subTitle" : "Add variability to rotations to help your model be more resilient to camera roll.",
                "thumbnailUrl" : "/api/dataSet/image level thumbnail/imageRotation.png"
            }, 
            {
                "augmentationType" : "Shear",
                "settings" : [ 
                    "Percentage scale both for Horizontal & Vertical"
                ],
                "subTitle" : "Add variability to perspective to help your model be more resilient to camera and subject pitch and yaw.",
                "thumbnailUrl" : "/api/dataSet/image level thumbnail/shearImage.png"
            }, 
            {
                "augmentationType" : "gray Scale",
                "settings" : [ 
                    "Percentage scale both for Horizontal & Vertical"
                ],
                "subTitle" : "Probabilistically apply grayscale to a subset of the training set.",
                "thumbnailUrl" : "/api/dataSet/image level thumbnail/GreyScale.png"
            }, 
            {
                "augmentationType" : "Hue",
                "settings" : [ 
                    "Percentage scale"
                ],
                "subTitle" : "Randomly adjust the colors in the image.",
                "thumbnailUrl" : "/api/dataSet/image level thumbnail/Hue.png"
            }, 
            {
                "augmentationType" : "Saturation",
                "settings" : [ 
                    "Percentage scale both for Horizontal & Vertical"
                ],
                "subTitle" : "Randomly adjust the vibrancy of the colors in the images.",
                "thumbnailUrl" : "/api/dataSet/image level thumbnail/saturation.png"
            }, 
            {
                "augmentationType" : "Brightness",
                "settings" : [ 
                    "Brighten", 
                    "Darken"
                ],
                "subTitle" : "Add variability to image brightness to help your model be more resilient to lighting and camera setting changes.",
                "thumbnailUrl" : "/api/dataSet/image level thumbnail/brightness.png"
            }, 
            {
                "augmentationType" : "Exposure",
                "settings" : [ 
                    "Percentage scale"
                ],
                "subTitle" : "Add variability to image brightness to help your model be more resilient to lighting and camera setting changes.",
                "thumbnailUrl" : "/api/dataSet/image level thumbnail/exposure.png"
            }, 
            {
                "augmentationType" : "Blur",
                "settings" : [ 
                    "Percentage scale"
                ],
                "subTitle" : "Add random Gaussian blur to help your model be more resilient to camera focus.",
                "thumbnailUrl" : "/api/dataSet/image level thumbnail/ImageBlur.png"
            }, 
            {
                "augmentationType" : "Noise",
                "settings" : [ 
                    "Percentage scale"
                ],
                "subTitle" : "Add noise to help your model be more resilient to camera artifacts.",
                "thumbnailUrl" : "/api/dataSet/image level thumbnail/flipImage.png"
            }, 
            {
                "augmentationType" : "Cut out",
                "settings" : [ 
                    "Percent", 
                    "Count"
                ],
                "subTitle" : "Add cutout to help your model be more resilient to object occlusion.",
                "thumbnailUrl" : "/api/dataSet/image level thumbnail/cutOut.png"
            }, 
            {
                "augmentationType" : "Mosaic",
                "subTitle" : "Add mosaic to help your model perform better on small objects.",
                "thumbnailUrl" : "/api/dataSet/image level thumbnail/Mosaic.png"
            }
        ],
        "boundingBox" : [ 
            {
                "augmentationType" : "Flip",
                "settings" : [ 
                    "Horizontal", 
                    "Vertical"
                ],
                "subTitle" : "Add horizontal or vertical flips to help your model be insensitive to subject orientation.",
                "thumbnailUrl" : "/api/dataSet/bounding box level thumbnail/flipBoundingBox.png"
            }, 
            {
                "augmentationType" : "90° Rotate",
                "settings" : [ 
                    "Clockwise", 
                    "Counter-Clockwise", 
                    "Upside Down"
                ],
                "subTitle" : "Add 90-degree rotations to help your model be insensitive to camera orientation.",
                "thumbnailUrl" : "/api/dataSet/bounding box level thumbnail/boundingBox90Rotate.png"
            }, 
            {
                "augmentationType" : "Crop",
                "settings" : [ 
                    "Percentage scale"
                ],
                "subTitle" : "Add variability to positioning and size to help your model be more resilient to subject translations and camera position.",
                "thumbnailUrl" : "/api/dataSet/bounding box level thumbnail/cropBox.png"
            }, 
            {
                "augmentationType" : "Rotation",
                "settings" : [ 
                    "Percentage scale"
                ],
                "subTitle" : "Add variability to rotations to help your model be more resilient to camera roll.",
                "thumbnailUrl" : "/api/dataSet/bounding box level thumbnail/boundingBoxRotation.png"
            }, 
            {
                "augmentationType" : "Shear",
                "settings" : [ 
                    "Percentage scale both for Horizontal & Vertical"
                ],
                "subTitle" : "Add variability to perspective to help your model be more resilient to camera and subject pitch and yaw.",
                "thumbnailUrl" : "/api/dataSet/bounding box level thumbnail/shear.png"
            }, 
            {
                "augmentationType" : "Brightness",
                "settings" : [ 
                    "Brighten", 
                    "Darken"
                ],
                "subTitle" : "Add variability to image brightness to help your model be more resilient to lighting and camera setting changes.",
                "thumbnailUrl" : "/api/dataSet/bounding box level thumbnail/brightnessBox.png"
            }, 
            {
                "augmentationType" : "Exposure",
                "settings" : [ 
                    "Percentage scale"
                ],
                "subTitle" : "Add variability to image brightness to help your model be more resilient to lighting and camera setting changes.",
                "thumbnailUrl" : "/api/dataSet/bounding box level thumbnail/exposureBox.png"
            }, 
            {
                "augmentationType" : "Blur",
                "settings" : [ 
                    "Percentage scale"
                ],
                "subTitle" : "Add random Gaussian blur to help your model be more resilient to camera focus.",
                "thumbnailUrl" : "/api/dataSet/bounding box level thumbnail/flipBoundingBox.png"
            }, 
            {
                "augmentationType" : "Noise",
                "settings" : [ 
                    "Percentage scale"
                ],
                "subTitle" : "Add noise to help your model be more resilient to camera artifacts.",
                "thumbnailUrl" : "/api/dataSet/bounding box level thumbnail/NoiseBox.png"
            }
        ]
    }
})

// insert default system user - admin
db.getCollection('AnnotationUser').insert({
    "_id" : ObjectId("6204ad5741bd2d02991d6349"),
    "userType" : 2,
    "email" : "admin@layerx.local.ai",
    "name" : "admin",
    "profileImgUrl" : "defaultProfileImage.png",
    "userStatus" : 1,
    "isAll" : false,
    "timeZoneOffset" : 0,
    "isUserDeactivated" : false
})
db.getCollection('AnnotationUserCredentials').insert({
    "_id" : "4195ba0c-fb19-4830-8b8f-aabadab57f3b",
    "password" : "$2a$10$Tl6satCG1wco5LZ01O1FAumQ5pllWUGi8E/Pd.59wZfXgTXwPOjsS",
    "userId" : ObjectId("6204ad5741bd2d02991d6349"),
    "annotationUserId" : ObjectId("6204ad5741bd2d02991d6349")
})

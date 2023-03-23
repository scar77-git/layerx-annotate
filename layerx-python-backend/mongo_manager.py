"""
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.

maintainers : dinusha@zoomi.ca, tharindu@zoomi.ca

This is the script for handling mongo db related processors.
"""

import pymongo
import json
from pymongo import MongoClient
from pymongo.errors import AutoReconnect, ConnectionFailure
import bson
from bson.objectid import ObjectId
import configparser
import os

#logging configeration
from logger import get_debug_logger
mongodb_logger = get_debug_logger('mongo_manager', './logs/mongomanager.log')

# Read Mongodb settings from config file
params = configparser.ConfigParser(os.environ)

CONFIG_FILE_PATH = 'config.cfg'
params.read(CONFIG_FILE_PATH)

IP = f"{params.get('IP', 'server_ip')}"
PORT = f"{params.get('MongoDB', 'port')}"


class MongoDBmanager:
    def __init__(self, user, password, db, collection):
        # t_mongo_init = time.time()
        self.usr = user
        self.password = password
        self.db = db
        self.collection = collection
        # Connect to the DB
        try:
            self.client = MongoClient(f'mongodb://{self.usr}:{self.password}@{IP}:{PORT}/{self.db}')
            # self.client = MongoClient("mongodb://localhost:27017/")
            mongodb_logger.debug(f'Connected to Mongodb @ mongodb://{self.usr}:{self.password}@{IP}:{PORT}/{self.db}')
        except (AutoReconnect, ConnectionFailure) as e:
            print(e)
            mongodb_logger.debug(f'CONNECTION_ERROR to mongodb://{self.usr}:{self.password}@{IP}:{PORT}/{self.db}')
            raise Exception("CONNECTION_ERROR")

    # Create a new collection in the DB
    def create_collection(self, collection_name):
        _DB = self.client[self.db]
        coll_names = _DB.list_collection_names()
        if collection_name in coll_names:
            raise pymongo.errors.CollectionInvalid("collection already exists")

        else:
            _coll = self.client.create_collection(collection_name)
            return _coll

    def get_number_of_documents(self):
        _DB = self.client[self.db]
        collection = _DB[self.collection]
        return collection.count_documents({})

    def post_one_document(self, data_dict):
        _DB = self.client[self.db]
        collection = _DB[self.collection]
        res = collection.insert_one(data_dict)
        if res.acknowledged:           
            return res.inserted_id
        else:
            raise Exception("WRITE_ERROR")

    def post_documents(self, list_of_dict):
        _DB = self.client[self.db]
        collection = _DB[self.collection]
        collection.insert_many(list_of_dict)

    # This function is used to update id on annotation project
    def find_one_update(self, find_query, update_query):
        _DB = self.client[self.db]
        collection = _DB[self.collection]
        try:
            collection.update_one(find_query, {'$set': update_query})
        except bson.errors.InvalidId:
            mongodb_logger.debug('find_one_update(): UNSUPPORTED ID')
            raise Exception("UNSUPPORTED_ID")

    def find_and_update_many(self, find_query, update_query):
        _DB = self.client[self.db]
        collection = _DB[self.collection]
        try:
            collection.update_many(find_query, {'$set': update_query})
        except bson.errors.InvalidId:
            mongodb_logger.debug('find_and_update_many(): UNSUPPORTED ID')
            raise Exception("UNSUPPORTED_ID")

    def remove_feild(self, update_query, feild):
        _DB = self.client[self.db]
        collection = _DB[self.collection]
        try:
            collection.update_one(update_query, {'$unset': feild})
        except bson.errors.InvalidId:
            mongodb_logger.debug('remove_feild(): UNSUPPORTED ID')
            raise Exception("UNSUPPORTED_ID")

    # This function is used to update id on annotation project
    def find_one_push(self, find_query, push_query):
        _DB = self.client[self.db]
        collection = _DB[self.collection]
        try:
            collection.update_one(find_query, {'$push': push_query})
        except bson.errors.InvalidId:
            mongodb_logger.debug('find_one_push(): UNSUPPORTED ID')
            raise Exception("UNSUPPORTED_ID")
        
    # Insert a documents from a json file
    def post_documents_json(self, json_file_path):
        _DB = self.client[self.db]
        collection = _DB[self.collection]
        # open the json file
        with open(json_file_path) as f:
            file_data = json.load(f)
        # insert the data into the collection
        res = collection.insert_many(file_data)
        if res.acknowledged:           
            return res.inserted_ids
        else:
            mongodb_logger.debug('post_documents_json(): WRITE_ERROR')
            raise Exception("WRITE_ERROR")

    def get_one_document(self, query):
        _DB = self.client[self.db]
        collection = _DB[self.collection]
        res = collection.find_one(query)
        if res is not None:           
            return res
        else:
            mongodb_logger.debug('get_one_document(): READ_ERROR')
            raise Exception("READ_ERROR")
 

    def get_documents(self, query):
        _DB = self.client[self.db]
        collection = _DB[self.collection]
        ret = collection.find(query)
        return ret

    def collection_query(self, operator, **kwargs):
        _DB = self.client[self.db]
        collection = _DB[self.collection]
        results = []
        result = None
        for key, value in kwargs.items():
            result = collection.find({key: {operator: value}})

            for i in result:
                print(i)
                results.append(i)
        return result

    # Delete a document from collection using its id field
    def delete_one_document(self, id):
        _DB = self.client[self.db]
        collection = _DB[self.collection]
        collection.delete_one({'_id': ObjectId(id)})

    # Update document by it's id
    # field : field which need to be changed
    # new_value : new value 
    def update_document(self, id, field, new_value):
        _DB = self.client[self.db]
        collection = _DB[self.collection]
        collection.update_one({"_id": ObjectId(id)}, {'$set': {field: new_value}})

    # use for query data with aggregate method
    def aggregate_documents(self, query):
        _DB = self.client[self.db]
        collection = _DB[self.collection]
        ret = collection.aggregate(query)
        return ret


# if __name__ == '__main__':
    

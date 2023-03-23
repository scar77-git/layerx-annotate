/*
Repository to handle the data updation to the Object mapping to Defects in the system.
*/

import {Getter, inject} from '@loopback/core';
import {
  BelongsToAccessor,
  DefaultCrudRepository,
  HasManyRepositoryFactory,
  repository
} from '@loopback/repository';

import {ObjectMapping,ObjectDefectRelations,ObjectMappingInterface} from '../models';

import {ObjectId} from 'mongodb';
import {logger} from '../config';
import {MongoDataSource} from '../datasources';
import dotenv from 'dotenv';

dotenv.config();

export class AnnotationObjectMappingRepository extends DefaultCrudRepository
<ObjectMapping,
typeof ObjectMapping.prototype.id,ObjectDefectRelations>{
  constructor(
    @inject('datasources.mongo') dataSource: MongoDataSource,
  ){
    super(ObjectMapping,dataSource);
  }

  // Used to create a new Mapping for objects and Defects in a particular project
  async createMapping(projectId:string,objectCount:number,objectBody:ObjectMappingInterface[]){
    let isDefected = false;
    if(objectBody.length > 0 ){
      isDefected = true;
    }
    const mapping = await this.create({
      projectId,
      objectCount,
      objects:objectBody
    })


    return mapping;
  }

}
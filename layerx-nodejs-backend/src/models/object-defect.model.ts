/*
Model to have object to defect mapping in the annotated frame
Model Collection entity 

{
	id:ID,
	projectId:ID,
	objectCount:Number,
	objects:[
		{
			objectId:Number,
			defects:[scratch],
			isDefected:Boolean
		}]
}

*/

import {Entity, model, property,belongsTo} from '@loopback/repository';
import {AnnotationProject} from './annotation-project.model';


@model()
export class ObjectMapping extends Entity{
    @property({
        type:'string',
        required:true,
        generated:true
    })
    id?:string;


    @belongsTo(() => AnnotationProject)
    projectId: string;

    @property({
        type:'number',
        required:true,
    })objectCount?:number;

    @property({
        type:'object'
    })objects?:ObjectMappingInterface[];
}

export interface ObjectMappingInterface{
    objectId:number,
    defects:string[],
    isDefected:boolean
}

export interface ObjectDefectRelations{
    // Define Navigational properties here.
}

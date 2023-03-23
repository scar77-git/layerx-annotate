/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CreateDataSetRoutingModule } from './create-data-set-routing.module';
import { CreateDatasetComponent } from './components/create-dataset/create-dataset.component';
import { RebalanceComponent } from './components/rebalance/rebalance.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { EditDatasetComponent } from './components/edit-dataset/edit-dataset.component';



@NgModule({
  declarations: [
    CreateDatasetComponent,
    RebalanceComponent,
    EditDatasetComponent,
  ],
  imports: [
    CommonModule,
    CreateDataSetRoutingModule,
    SharedModule,
    FormsModule,
    HttpClientModule,
    ReactiveFormsModule,
    DragDropModule
  ]
})
export class CreateDataSetModule { }

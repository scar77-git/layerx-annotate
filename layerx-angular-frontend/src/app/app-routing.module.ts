/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { PublicGuard } from './guards/public.guard';
import { AnnotationComponent } from './home/annotation/annotation.component';
import { CreateProjectComponent } from './home/annotation/create-project/create-project.component';
import { DocumentationComponent } from './home/annotation/documentation/documentation.component';
import { LabelsComponent } from './home/annotation/labels/labels.component';
import { OverviewComponent } from './home/annotation/overview/overview.component';
import { QualityComponent } from './home/annotation/quality/quality.component';
import { TasksComponent } from './home/annotation/tasks/tasks.component';
import { ApiComponent } from './home/api/api.component';
import { AuditComponent } from './home/audit/audit.component';
import { DatasetAugmentationComponent } from './home/data-set/dataset-augmentation/dataset-augmentation.component';
import { DDataGridComponent } from './home/data-set/d-data-grid/d-data-grid.component';
import { DatasetLabelsComponent } from './home/data-set/dataset-labels/dataset-labels.component';
import { DatasetOverviewComponent } from './home/data-set/dataset-overview/dataset-overview.component';
import { DataSetComponent } from './home/data-set/data-set.component';
import { DatasetSplitComponent } from './home/data-set/dataset-split/dataset-split.component';
import { DeepLearningComponent } from './home/deep-learning/deep-learning.component';
import { LoginComponent } from './public/login/login.component';
import { DatasetExportComponent } from './home/data-set/dataset-export/dataset-export.component';
import { DatasetCreateComponent } from './home/data-set/dataset-create/dataset-create.component';
import { DatasetRebalanceComponent } from './home/data-set/dataset-rebalance/dataset-rebalance.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/annotation/tasks',
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [PublicGuard],
  },
  { path: 'audit', component: AuditComponent, canActivate: [AuthGuard] },
  { path: 'create-project', component: CreateProjectComponent },
  { path: 'create-dataset', component: DatasetCreateComponent},
  { path: 'dataset-rebalance', component: DatasetRebalanceComponent},
  {
    path: 'annotation',
    component: AnnotationComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        redirectTo: '/annotation/tasks',
        pathMatch: 'full',
      },
      { path: 'tasks', component: TasksComponent },
      { path: 'overview', component: OverviewComponent },
      { path: 'labels', component: LabelsComponent },
      { path: 'quality', component: QualityComponent },
      { path: 'documentation', component: DocumentationComponent },
    ],
  },
  {
    path: 'dataset',
    component: DataSetComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        redirectTo: '/dataset/overview',
        pathMatch: 'full',
      },
      { path: 'overview', component: DatasetOverviewComponent },
      { path: 'labels', component: DatasetLabelsComponent },
      { path: 'split', component: DatasetSplitComponent },
      { path: 'data-grid', component: DDataGridComponent },
      { path: 'augmentation', component: DatasetAugmentationComponent },
      { path: 'export', component: DatasetExportComponent },
    ],
  },
  {
    path: 'deep-learning',
    component: DeepLearningComponent,
    canActivate: [AuthGuard],
  },
  { path: 'api', component: ApiComponent, canActivate: [AuthGuard] },
  {
    path: 'process-data-set',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./home/create-data-set/create-data-set.module').then(
        (m) => m.CreateDataSetModule
      ),
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}

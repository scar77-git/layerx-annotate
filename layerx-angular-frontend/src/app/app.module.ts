/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { LoginComponent } from './public/login/login.component';
import { AnnotationComponent } from './home/annotation/annotation.component';
import { CreateProjectComponent } from './home/annotation/create-project/create-project.component';
import { OverviewComponent } from './home/annotation/overview/overview.component';
import { TasksComponent } from './home/annotation/tasks/tasks.component';
import { LabelsComponent } from './home/annotation/labels/labels.component';
import { LoadingBarModule } from '@ngx-loading-bar/core';

import { ClickOutsideModule } from 'ng-click-outside';
import { CanvasComponent } from './home/audit/canvas/canvas.component';

import { JwtInterceptor } from './helper/jwt.interceptor';
import { MaterialModule } from './material-module';
import { ErrorDialogComponent } from './components/modals/error-dialog/error-dialog.component';
import { ErrorInterceptor } from './helper/error.interceptor';
import { CommentComponent } from './home/audit/comment/comment.component';
import { MarkedLabelsComponent } from './home/audit/marked-labels/marked-labels.component';
import { AuditComponent } from './home/audit/audit.component';
import { CustomModalComponent } from './components/modals/custom-modal/custom-modal.component';
import { SubLabelComponent } from './home/audit/sub-label/sub-label.component';
import { ConfirmModalComponent } from './components/modals/confirm-modal/confirm-modal.component';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { ApiInterceptor } from './interceptors/api.interceptor';
import { SkipFrameComponent } from './home/audit/skip-frame/skip-frame.component';
import { MissingFramesComponent } from './home/audit/missing-frames/missing-frames.component';
import { ChartsModule } from 'ng2-charts';
import { FramePropertyComponent } from './home/audit/side-bar-right/components/frame-property/frame-property.component';
import { FilterPropertyComponent } from './home/audit/side-bar-right/components/filter-property/filter-property.component';
import { CommentPropertyComponent } from './home/audit/side-bar-right/components/comment-property/comment-property.component';
import { SideBarRightComponent } from './home/audit/side-bar-right/side-bar-right.component';
import { QualityComponent } from './home/annotation/quality/quality.component';
import {
  GoogleLoginProvider,
  SocialAuthServiceConfig,
  SocialLoginModule,
} from 'angularx-social-login';
import { environment } from 'src/environments/environment';
import { DeepLearningComponent } from './home/deep-learning/deep-learning.component';
import { ApiComponent } from './home/api/api.component';
import { NewLabelComponent } from './components/modals/new-label/new-label.component';
import { DocumentationComponent } from './home/annotation/documentation/documentation.component';
import { UploadxModule } from 'ngx-uploadx';
import { DataSetComponent } from './home/data-set/data-set.component';
import { DatasetOverviewComponent } from './home/data-set/dataset-overview/dataset-overview.component';
import { DatasetLabelsComponent } from './home/data-set/dataset-labels/dataset-labels.component';
import { AddLabelModalComponent } from './components/modals/add-label-modal/add-label-modal.component';
import { DatasetSplitComponent } from './home/data-set/dataset-split/dataset-split.component';
import { DDataGridComponent } from './home/data-set/d-data-grid/d-data-grid.component';
import { DatasetAugmentationComponent } from './home/data-set/dataset-augmentation/dataset-augmentation.component';
import { DatasetAddAugmentationModalComponent } from './components/modals/dataset-add-augmentation-modal/dataset-add-augmentation-modal.component';
import { DatasetExportComponent } from './home/data-set/dataset-export/dataset-export.component';
import { DatasetExportAddFormatComponent } from './components/modals/dataset-export-add-format/dataset-export-add-format.component';
import { DatasetDuplicateComponent } from './components/modals/dataset-duplicate/dataset-duplicate.component';
import { DatasetDeleteComponent } from './components/modals/dataset-delete/dataset-delete.component';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { NewVersionConfirmationComponent } from './components/modals/new-version-confirmation/new-version-confirmation.component';
import { DatagridImageViewComponent } from './components/modals/datagrid-image-view/datagrid-image-view.component';
import { DatasetSplitRebalanceComponent } from './components/modals/dataset-split-rebalance/dataset-split-rebalance.component';
import { NgxSliderModule } from '@angular-slider/ngx-slider';
import { SuccessDialogComponent } from './components/modals/success-dialog/success-dialog.component';
import { DatasetCreateComponent } from './home/data-set/dataset-create/dataset-create.component';
import { DatasetRebalanceComponent } from './home/data-set/dataset-rebalance/dataset-rebalance.component';
import { CreateDataSetModule } from './home/create-data-set/create-data-set.module';
import { SharedModule } from './shared/shared.module';
import { SplitTaskModalComponent } from './components/modals/split-task-modal/split-task-modal.component';
import { DatasetDownloadModalComponent } from './components/modals/dataset-download-modal/dataset-download-modal.component';
import { MyProfileComponent } from './components/modals/my-profile/my-profile.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    AnnotationComponent,
    CreateProjectComponent,
    OverviewComponent,
    TasksComponent,
    LabelsComponent,
    AuditComponent,
    CanvasComponent,
    ErrorDialogComponent,
    CommentComponent,
    MarkedLabelsComponent,
    CustomModalComponent,
    SubLabelComponent,
    ConfirmModalComponent,
    SkipFrameComponent,
    MissingFramesComponent,
    SideBarRightComponent,
    FramePropertyComponent,
    FilterPropertyComponent,
    CommentPropertyComponent,
    QualityComponent,
    DeepLearningComponent,
    ApiComponent,
    NewLabelComponent,
    DocumentationComponent,
    DataSetComponent,
    DatasetOverviewComponent,
    DatasetLabelsComponent,
    AddLabelModalComponent,
    DatasetSplitComponent,
    DDataGridComponent,
    DatasetAugmentationComponent,
    DatasetAddAugmentationModalComponent,
    DatasetExportComponent,
    DatasetExportAddFormatComponent,
    DatasetDuplicateComponent,
    DatasetDeleteComponent,
    NewVersionConfirmationComponent,
    DatagridImageViewComponent,
    DatasetSplitRebalanceComponent,
    SuccessDialogComponent,
    DatasetCreateComponent,
    DatasetRebalanceComponent,
    SplitTaskModalComponent,
    DatasetDownloadModalComponent,
    MyProfileComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    LoadingBarModule,
    FormsModule,
    ClickOutsideModule,
    HttpClientModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    MaterialModule,
    MatDatepickerModule,
    MatNativeDateModule,
    ChartsModule,
    SocialLoginModule,
    UploadxModule,
    NgxSliderModule,
    InfiniteScrollModule,
    DragDropModule,
    CreateDataSetModule,
    SharedModule,
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ApiInterceptor, multi: true },
    {
      provide: 'SocialAuthServiceConfig',
      useValue: {
        autoLogin: false,
        providers: [
          {
            id: GoogleLoginProvider.PROVIDER_ID,
            provider: new GoogleLoginProvider(environment.GAPI_CLIENT_ID),
          },
        ],
      } as SocialAuthServiceConfig,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}

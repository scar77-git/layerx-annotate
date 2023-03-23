/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 */
// IMPORTS for JWT Authentication -------------
import {AuthenticationComponent} from '@loopback/authentication';
import {
  JWTAuthenticationComponent,
  RefreshTokenServiceBindings,
  TokenServiceBindings,
  UserServiceBindings
} from '@loopback/authentication-jwt';
import {BootMixin} from '@loopback/boot';
import {ApplicationConfig, asLifeCycleObserver} from '@loopback/core';
import {CronComponent} from '@loopback/cron';
import {RepositoryMixin} from '@loopback/repository';
import {RestApplication} from '@loopback/rest';
import {
  RestExplorerBindings,
  RestExplorerComponent
} from '@loopback/rest-explorer';
import {ServiceMixin} from '@loopback/service-proxy';
import path from 'path';
import {MongoDataSource} from './datasources';
import {AnnotationUserRepository} from './repositories';
import {MySequence} from './sequence';
import {AwsCloudService, FileSizeRelatedService, GoogleDrive, ProjectStatsCronJobService, ProjectStatsUpdateService, PythonRequestService, UpdateExpiredAwsUrlService, UserStatsUpdateService} from './services';
import {UserStatsCronJobService} from './services/userStatsCronJob.service';

// -------------
export {ApplicationConfig};

export class AnnotationManagerApplication extends BootMixin(
  ServiceMixin(RepositoryMixin(RestApplication)),
) {
  constructor(options: ApplicationConfig = {}) {
    super(options);

    this.bind(TokenServiceBindings.TOKEN_EXPIRES_IN).to('259200s');

    // Set up the custom sequence
    this.sequence(MySequence);

    //cron job
    this.component(CronComponent);

    // Set up default home page
    this.static('/', path.join(__dirname, '../public'));

    // Customize @loopback/rest-explorer configuration here
    this.configure(RestExplorerBindings.COMPONENT).to({
      path: '/explorer',
    });
    this.component(RestExplorerComponent);

    this.projectRoot = __dirname;
    // Customize @loopback/boot Booter Conventions here
    this.bootOptions = {
      controllers: {
        // Customize ControllerBooter Conventions here
        dirs: ['controllers'],
        extensions: ['.controller.js'],
        nested: true,
      },
    };

    //For JWT Authentication
    // Mount authentication system
    this.component(AuthenticationComponent);
    // Mount jwt component
    this.component(JWTAuthenticationComponent);
    // Bind datasources
    this.dataSource(MongoDataSource, UserServiceBindings.DATASOURCE_NAME);
    this.dataSource(
      MongoDataSource,
      RefreshTokenServiceBindings.DATASOURCE_NAME,
    );
    //Bind custom user-repo
    this.bind(UserServiceBindings.USER_REPOSITORY).toClass(
      AnnotationUserRepository,
    );
    //Token expiration set to 3 days
    this.bind(TokenServiceBindings.TOKEN_EXPIRES_IN).to('259200');

    this.bind('service.googleDrive').toClass(GoogleDrive);
    this.bind('service.pythonRequestService').toClass(PythonRequestService);
    this.bind('service.awsCloudService').toClass(AwsCloudService);
    this.bind('service.projectStatsUpdateService').toClass(ProjectStatsUpdateService);
    this.bind('service.UserStatsUpdateService').toClass(UserStatsUpdateService);
    this.bind('service.updateExpiredAwsUrl').toClass(UpdateExpiredAwsUrlService).apply(asLifeCycleObserver);
    this.bind('service.projectStatsCronJob').toClass(ProjectStatsCronJobService).apply(asLifeCycleObserver);
    this.bind('service.userStatsCronJob').toClass(UserStatsCronJobService).apply(asLifeCycleObserver);
    this.bind('service.fileSizeRelatedService').toClass(FileSizeRelatedService);
  }
}

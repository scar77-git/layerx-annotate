/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class ApiInterceptor implements HttpInterceptor {

  constructor() {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {

    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    let date = new Date();
    if (currentUser) {
        request = request.clone({
            setHeaders: {
                versionNo: '1.0.1',
                timeZoneOffset : date.getTimezoneOffset().toString()
            }
        });

    }
    
    return next.handle(request);
  }
}

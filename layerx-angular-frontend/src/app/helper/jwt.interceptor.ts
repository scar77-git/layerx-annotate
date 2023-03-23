/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

/**
 * @class: JwtInterceptor
 * Purpose is this module is to handle HTTP request
 * @description: call the API’s by providing the token in the Authorization header as a bearer token
 * @author: Isuru Avishka
 */
import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  constructor() {}

  /**
   * send authenticated request.
   * set bearer token to request header.
   * @param request - The outgoing request object to handle
   * @param next - The next interceptor in the chain, or the backend if no interceptors remain in the chain
   * @returns - An observable of the event stream.
   */
  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    const isApiUrl = request.url.startsWith(environment.apiUrl);
    const token = localStorage.getItem('authToken');
    if (token) {
      const idToken = token!.replace(/"/g,"");
      if (idToken && isApiUrl) {
        request = request.clone({
          setHeaders: {
            Authorization: `Bearer ${idToken}`,
          },
        });
      }
    }


    return next.handle(request);
  }
}

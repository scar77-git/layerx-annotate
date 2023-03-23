/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { flatten } from '@angular/compiler';
import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlSerializer,
  UrlTree,
} from '@angular/router';
import { Observable } from 'rxjs';
import { AuthenticationService } from '../services/authentication.service';

@Injectable({
  providedIn: 'root',
})
export class LinkGuard implements CanActivate {
  constructor(
    private router: Router,
    public _authenticationService: AuthenticationService,
    private urlSerializer: UrlSerializer
  ) {}
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ):
    | Observable<boolean | UrlTree>
    | Promise<boolean | UrlTree>
    | boolean
    | UrlTree {
    const token = route.queryParams.token;

    if (token) {
      this._authenticationService
        .validateInvitationLink(token)
        .subscribe((response) => {
          if (response.result === 'expired' || response.result === 'invalid') {
            // this.router.navigate(['/onboarding']);
            return true;
          } else {
            this.router.navigate(['/signup'], {
              queryParams: {
                status: route.queryParams.status,
                userId: response.userId,
                email: response.email,
                name: response.name,
              },
              queryParamsHandling: 'merge',
            });
            return false;
          }
        });
      return false;
    } else return false;
  }
}

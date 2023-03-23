/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { Injectable } from '@angular/core';
import { User } from '../models/user';

@Injectable({
  providedIn: 'root',
})
export class UserDataService {
  USER_DETAILS_KEY = 'currentUser';
  GOOGLE_AUTH_DETAILS = 'googleUser';
  constructor() {
    // empty
  }

  setUserDetails(details: User): void {
    const value = JSON.stringify(details);
    localStorage.setItem(this.USER_DETAILS_KEY, value);
  }

  getUserDetails(): any {
    let userDetails: any = localStorage.getItem(this.USER_DETAILS_KEY);
    if (userDetails) {
      return JSON.parse(userDetails);
    }
    return null;
  }

  setGoogleAuthUserDetails(details: any): void {
    const value = JSON.stringify(details);
    localStorage.setItem(this.GOOGLE_AUTH_DETAILS, value);
  }

  getGoogleUserDetails(): any {
    let googleUserDetails: any = localStorage.getItem(this.GOOGLE_AUTH_DETAILS);
    if (googleUserDetails) {
      return JSON.parse(googleUserDetails);
    }
    return null;
  }

  clearUserDetails(): void {
    localStorage.remove(this.USER_DETAILS_KEY);
  }
}

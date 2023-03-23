/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

/**
 * @class: AuthenticationService
 * purpose of this module is communicate with backend API
 * @description:implements all the api calls related to authentication
 * @author: Isuru Avishka
 */
import { EventEmitter, Injectable, Output } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AuthenticationService {
  @Output() getCurrentUser: EventEmitter<any> = new EventEmitter();
  authToken: string;
  constructor(private http: HttpClient) {
    this.authToken = JSON.parse(localStorage.getItem('authToken') || '{}');
  }

  loginWithGoogle(token: any, userId?: string) {
    return this.http
      .post<any>(`${environment.apiUrl}/api/google/login?userId=${userId}`, {
        token: token,
      })
      .pipe(
        map((authRes) => {
          // login successful if there's a jwt token in the response
          if (authRes.token) {

            // store user details and jwt token in local storage to keep user logged in between page refreshes
            localStorage.setItem('authToken', JSON.stringify(authRes.token));
            localStorage.setItem('currentUser', JSON.stringify(authRes.user));
          }
          return authRes.user;
        })
      );
  }

  login(username: string, password: string) {
    username = username.toLowerCase();
    return this.http
      .post<any>(`${environment.apiUrl}/users/login`, {
        email: username.toLowerCase(),
        password: password,
      })
      .pipe(
        map((authRes) => {
          // login successful if there's a jwt token in the response

          if (authRes.token) {
            // store user details and jwt token in local storage to keep user logged in between page refreshes
            localStorage.setItem('authToken', JSON.stringify(authRes.token));
            localStorage.setItem('currentUser', JSON.stringify(authRes.user));
          }
          return authRes.user;
        })
      );
  }

  logout() {
    this.authToken = JSON.parse(localStorage.getItem('authToken') || '{}');
    localStorage.clear();
    sessionStorage.clear();
  }

  validateInvitationLink(token: string) {
    return this.http
      .post<any>(`${environment.apiUrl}/api/teams/validateInvitation`, {
        code: token,
      })
      .pipe(
        map((authRes) => {
          // login successful if there's a jwt token in the response
          return authRes;
        })
      );
  }

  createTeam(teamName: string, adminId: string, teamId: string) {
    return this.http.post<any>(`${environment.apiUrl}/api/teams/newUser`, {
      adminId: adminId,
      teamId: teamId,
      teamName: teamName,
    });
  }

  setupPassword(userId: string, password: string, name: string, email: string) {
    return this.http
      .post<any>(`${environment.apiUrl}/api/teams/setupPassword`, {
        userId: userId,
        password: password,
        name: name,
        email: email,
      })
      .pipe(
        map((authRes) => {
          if (authRes.token) {
            localStorage.setItem('authToken', JSON.stringify(authRes.token));
            localStorage.setItem('currentUser', JSON.stringify(authRes.user));
          }
          return authRes.user;
        })
      );
  }

  registerUsingEmail(email: string) {
    return this.http.post<any>(
      `${environment.apiUrl}/api/signup?email=${email}`,
      {}
    );
  }
}

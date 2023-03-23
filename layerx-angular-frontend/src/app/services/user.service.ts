/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private isUserDataUpdated: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  constructor(private http: HttpClient) {}

  uploadProfileImage(userId: string, image: FormData) {
    return this.http.post(
      `${environment.apiUrl}/api/user/profileImage/upload/${userId}`,
      image
    );
  }

  getProfileImage(userId: string, image: string) {
    return this.http.get<any>(
      `${environment.apiUrl}/api/user/profileImage/${userId}/${image}`
    );
  }

  updateUserData(userData: any) {
    return this.http.post(
      `${environment.apiUrl}/api/teams/updateMember/`,{ 
        userId: userData.userId,
        name: userData.name,
        email: userData.email,
        teamName: userData.teamName,
        userType: userData.userType
      }
    );
  }

  setUserDataUpdateStatus(isUserDataUpdated:boolean) {    
    this.isUserDataUpdated.next(isUserDataUpdated);
  }

  getUserDataUpdateStatus():Observable<boolean>{
    return this.isUserDataUpdated.asObservable();
  }
}

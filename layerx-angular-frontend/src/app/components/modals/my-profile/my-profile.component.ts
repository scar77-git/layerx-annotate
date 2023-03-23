/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { Component, Inject, OnInit } from '@angular/core';
import {
  MatDialog,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { UserDataService } from 'src/app/services/user-data.service';
import { UserService } from 'src/app/services/user.service';
import { environment } from 'src/environments/environment';
import { ErrorDialogComponent } from '../error-dialog/error-dialog.component';

export interface DialogData {
  currentUser: any;
}

@Component({
  selector: 'app-my-profile',
  templateUrl: './my-profile.component.html',
  styleUrls: ['./my-profile.component.scss'],
})
export class MyProfileComponent implements OnInit {
  currentUserDetails: any;
  environment: any = environment;
  profileUrl: string | undefined;
  loading: boolean;

  userName: string;
  email: string;
  isImageAvailable: boolean;

  constructor(
    private _userService: UserService,
    private _userDataService: UserDataService,
    public _dialogRef: MatDialogRef<MyProfileComponent>,
    public _dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.currentUserDetails = data.currentUser;
    this.userName = this.currentUserDetails.name;
    this.email = this.currentUserDetails.email;
    this.isImageAvailable = false;
    this.loading = true;
    this.getProfileImage();
  }

  ngOnInit(): void {}

  close(): void {
    this._dialogRef.close();
  }
  /**
   * update member details
   * */
  update() {
    this._userService.updateUserData(this.currentUserDetails).subscribe(
      (response) => {
        this._userDataService.setUserDetails(this.currentUserDetails);
        this._userService.setUserDataUpdateStatus(true);
        this.close();
      },
      (error) => {
        this.onError('Error', error.error.error.message);
      }
    );
  }

  /**
   * check image loaded status
   */
  loaded(){
    this.loading = false;
  }

  /**
   * upload profile Image
   */
  uploadProfileImage(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.loading = true;
      const formData = new FormData();
      formData.append('document', file);

      this._userService
        .uploadProfileImage(this.currentUserDetails.userId, formData)
        .subscribe(
          (response) => {
            this.currentUserDetails.profileImgUrl = file.name;
            this.getProfileImage();
            this.currentUserDetails.imageUrl = this.profileUrl;
            this._userDataService.setUserDetails(this.currentUserDetails);
            this._userService.setUserDataUpdateStatus(true);
          },
          (error) => {
            this.onError('Error', error.error.error.message);
            this.loading = false;
          }
        );
    }
  }

  /**
   * get profile Image
   */
  getProfileImage() {
    this.profileUrl = `${environment.apiUrl}/api/user/profileImage/${this.currentUserDetails.userId}/${this.currentUserDetails.profileImgUrl}`;
    if(this.profileUrl == undefined || this.profileUrl == '') {
      this.isImageAvailable = true;
    }
  }

  onError(header: string, description: string, error?: string) {
    const dialogRef = this._dialog.open(ErrorDialogComponent, {
      disableClose: true,
      width: '460px',
      data: { header: header, description: description, error: error },
    });

    dialogRef.afterClosed().subscribe((result) => {
      this.close();
    });
  }
}

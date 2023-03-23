/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

/**
 * @class: HeaderComponent
 * purpose of this module is view header bar of application
 * @description:implements all the logics related to header bar
 * @author: Isuru Avishka
 */
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ErrorDialogComponent } from 'src/app/components/modals/error-dialog/error-dialog.component';
import { MyProfileComponent } from 'src/app/components/modals/my-profile/my-profile.component';
import { AuthenticationService } from 'src/app/services/authentication.service';
import { UserDataService } from 'src/app/services/user-data.service';
import { UserService } from 'src/app/services/user.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit {
  searchKey: string;
  showSearchResults: boolean;
  selectedUser: any;
  teamId: string;
  teamMembersList: Array<any>;
  userType: number;
  currentUserDetails: any; // to assign currently logged in user details
  profileUrl: string; // to assign profile image url
  USER_TYPE_TEAM_ADMIN = environment.USER_TYPE_TEAM_ADMIN;
  USER_TYPE_ADMIN = environment.USER_TYPE_ADMIN;
  teamOptionText!: string;

  private ngUnsubscribe = new Subject();

  constructor(
    private _authenticationService: AuthenticationService,
    private _router: Router,
    public _dialog: MatDialog,
    private _userDataService: UserDataService,
    private _userService: UserService
  ) {
    this.searchKey = '';
    this.showSearchResults = false;
    this.teamId = this._userDataService.getUserDetails().teamId;
    this.userType = this._userDataService.getUserDetails().userType;
    this.currentUserDetails = this._userDataService.getUserDetails();
    this.teamMembersList = [];
    let userObj = JSON.parse(localStorage.getItem('currentUser') || '{}');
    this.profileUrl = userObj.imageUrl;
  }

  ngOnInit(): void {
    this.selectedUser = this._userDataService.getUserDetails();
    this.detectUserDataUpdateStatus();
  }

  /**
   * Detect frame filter change from filter tab in side
   */
  detectUserDataUpdateStatus(): void {
    this._userService
      .getUserDataUpdateStatus()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((isUserDetails: boolean) => {
        if (isUserDetails) {
          this.selectedUser = this._userDataService.getUserDetails();
          this.profileUrl = this.selectedUser.imageUrl;
        }
      });
  }

  /**
   * show and hide search result set
   */
  onSearchTaskList() {
    if (this.searchKey.trim().length > 0) {
      this.showSearchResults = true;
    } else {
      this.showSearchResults = false;
    }
  }

  /**
   * change state of showSearchResults
   * when click on out side hide div
   * @param event - click event of div
   */
  onClickedOutside(event: Event) {
    this.showSearchResults = false;
  }

  /**
   * logout user from system and navigate back to login ui
   */
  logoutUser() {
    this._authenticationService.logout();
    this._router.navigate(['/login']);
  }


  /**
   * open profile modal. Call from My profile select option
   */
  openMyProfileModel() {
    const dialogRef = this._dialog.open(MyProfileComponent, {
      disableClose: true,
      width: '1020px',
      data: {
        currentUser: this.currentUserDetails,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
    });
  }

  /**
   * If there is error prompt error message to user
   * @param header - Modal title
   * @param description - Message description
   */
  onError(header: string, description: string) {
    const dialogRef = this._dialog.open(ErrorDialogComponent, {
      disableClose: true,
      width: '460px',
      data: { header: header, description: description },
    });

    dialogRef.afterClosed().subscribe((result) => {
    });
  }
}

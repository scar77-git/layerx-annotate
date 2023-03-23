/**
 * @class: LoginComponent
 * purpose of this module is view login view
 * @description:implements all the logics related login class
 * @author: Isuru Avishka
 */
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  SocialAuthService,
  SocialUser,
} from 'angularx-social-login';
import { first } from 'rxjs/operators';
import { AuthenticationService } from 'src/app/services/authentication.service';
import { UserDataService } from 'src/app/services/user-data.service';
import { environment } from 'src/environments/environment';
import { ErrorDialogComponent } from 'src/app/components/modals/error-dialog/error-dialog.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  LOGIN_VIEW: number = 1;


  loginForm!: FormGroup;
  loading = false;
  submitted = false;
  errorMsg: string;
  returnUrl: string;
  uiState: number;
  user: SocialUser | undefined;
  isEnterPrise:boolean;

  constructor(
    public _router: Router,
    private _formBuilder: FormBuilder,
    private _authenticationService: AuthenticationService,
    public _dialog: MatDialog,
  ) {
    this.isEnterPrise = environment.isEnterprise;
    this.errorMsg = '';
    this.returnUrl = '';
    this.uiState = this.LOGIN_VIEW;
  }

  ngOnInit(): void {
    this.loginForm = this._formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  get f() {
    return this.loginForm.controls;
  }
  /**
   * call login res call if login form valid
   * if user details are correct navigate to tasks view
   * @returns - form validity
   */
  onSubmit() {
    this.submitted = true;

    // stop here if form is invalid
    if (this.loginForm.invalid) {
      return;
    }
    let email = this.f.username.value.trim();
    let password = this.f.password.value.trim();
    this.loading = true;
    this._authenticationService
      .login(email, password)
      .pipe(first())
      .subscribe(
        (data) => {
          this.errorMsg = '';
          this.loading = false;
          this._router.navigate(['/annotation/tasks']);
        },
        (error) => {
          this.errorMsg = '';
          if (error.status == 0) {
            this.errorMsg = 'Please check your network connection';
          } else if (error.status == 401) {
            this.errorMsg = 'Invalid Username or Password';
          } else if (error.status == 500) {
            this.errorMsg = 'Internal server error';
          } else {
            this.errorMsg = 'Error occurred, Please try again ';
          }
          this.loading = false;
        }
      );
  }

  navigateToSystem() {
    this._router.navigate(['/annotation/tasks']);
  }

  changeUI() {
    this._router.navigate(['/signup']);
  }

  onError(errorMsg: any) {
    const dialogRef = this._dialog.open(ErrorDialogComponent, {
      disableClose: true,
      width: '460px',
      data: { header: "Error", description: errorMsg.error.error.message },
    });

    dialogRef.afterClosed().subscribe((result) => {
    });
  }
}

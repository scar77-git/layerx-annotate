/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

declare var gapi: any;
declare const google: any;

@Injectable({
  providedIn: 'root',
})
export class GoogleApiService {
  private scope = 'https://www.googleapis.com/auth/drive.file';
  private oauthAccessToken = null;
  private pickerApiLoaded = false;
  private pickerCallback = null;
  private oAuthData = null;

  constructor() {}

  open(callback: any): void {
    this.pickerCallback = callback;
    gapi.load('auth', { callback: this.onAuthApiLoad.bind(this) });
    gapi.load('picker', { callback: this.onPickerApiLoad.bind(this) });
  }

  onAuthApiLoad(): void {
    gapi.auth.authorize(
      {
        client_id: environment.GAPI_CLIENT_ID,
        scope: this.scope,
        immediate: false,
      },
      this.handleAuthResult.bind(this)
    );
  }

  onPickerApiLoad(): void {
    this.pickerApiLoaded = true;
  }

  handleAuthResult(authResult: any): void {
    if (authResult && !authResult.error) {
      this.oAuthData = authResult;
      this.oauthAccessToken = authResult.access_token;
      this.createPicker();
    }
  }

  private createPicker(): void {
    if (this.pickerApiLoaded && this.oauthAccessToken) {
      const docsView = new google.picker.DocsView(google.picker.ViewId.DOCS)
      docsView.setMimeTypes("video/mp4,application/vnd.google-apps.folder")
        .setIncludeFolders(true)
        .setSelectFolderEnabled(true);
      let picker = new google.picker.PickerBuilder()
        .enableFeature(google.picker.Feature.NAV_HIDDEN)
        .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
        .setAppId(environment.GOOGLE_APP_ID)
        .setOAuthToken(this.oauthAccessToken)
        .addView(docsView)
        .addView(new google.picker.DocsUploadView())
        .setDeveloperKey(environment.GDRIVE_API_KEY)
        .setCallback(this.pickerCallback)
        .build();
      picker.setVisible(true);
    }
  }

  getUserOAuthData(): any {
    if (this.oauthAccessToken) {
      return this.oauthAccessToken;
    }
    return null;
  }
}

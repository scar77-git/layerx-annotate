// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {

  production: true,
  apiUrl: '<BASE_URL>',
  clientUrl:'<BASE_URL>',
  
  GOOGLE_APP_ID:'<GOOGLE_APP_ID>',
  GAPI_CLIENT_ID:'<GOOGLE_CLIENT_ID>',
  GDRIVE_API_KEY: '<GOOGLE_API_KEY>',

  isEnterprise:false,

  USER_TYPE_ANNOTATOR: 0,
  USER_TYPE_AUDITOR: 1,
  USER_TYPE_ADMIN: 2,
  USER_TYPE_TEAM_ADMIN: 3,
  USER_TYPE_QA: 4,
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.

/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { environment } from 'src/environments/environment';

export class TaskButtonStatus {
  buttonTypesForStatusAndUsers: any[][] = [];
  constructor() {
    this.buttonTypesForStatusAndUsers = [
      //Status not started
      [
        ['complete'], // Annotator
        ['complete'], // Auditor
        ['complete'], // Admin
        ['complete'], // Team-Admin
        ['disable'], // QA
      ],
      //Status inProgress
      [
        ['complete'], // Annotator
        ['complete'], // Auditor
        ['complete', 'qaApprove', 'qaReject', 'accept'], // Admin
        ['complete', 'qaApprove', 'qaReject', 'accept'], // Team-Admin
        ['disable'], // QA
      ],

      //Completed
      [
        ['inProgress'], // Annotator
        ['accept', 'reject'], // Auditor
        ['accept', 'reject', 'inProgress', 'qaApprove', 'qaInReview', 'qaReject'], // Admin
        ['accept', 'reject', 'inProgress', 'qaApprove', 'qaInReview', 'qaReject'], // Team-Admin
        ['qaInReview'], // QA
      ],
      [],
      [],
      [],

      //Status QA In Accepted(Completed)
      [
        ['disable'], // Annotator
        ['complete','reject'], // Auditor
        ['complete', 'reject'], // Admin
        ['complete','reject'], // Team-Admin
        ['disable'], // QA
      ],

      //Status Rejected
      [
        ['startFixing'], // Annotator
        ['complete','accept'], // Auditor
        ['complete', 'accept', 'startFixing', 'fix'], // Admin
        ['complete', 'accept', 'startFixing', 'fix'], // Team-Admin
        ['startFixing'], // QA
      ],

      //Status Fixed
      [
        ['disable'], // Annotator
        ['accept', 'reject'], // Auditor
        ['complete', 'accept', 'reject'], // Admin
        ['complete', 'accept', 'reject'], // Team-Admin
        ['qaApprove', 'qaReject'], // QA
      ],

      //Status Fixing
      [
        ['fix'], // Annotator
        ['complete'], // Auditor
        ['complete', 'accept', 'reject', 'fix'], // Admin
        ['complete', 'accept', 'reject', 'fix'], // Team-Admin
        ['qaApprove', 'qaReject'], // QA
      ],

      //Status QA In Review
      [
        ['disable'], // Annotator
        ['complete'], // Auditor
        ['accept', 'reject', 'qaApprove', 'qaReject'], // Admin
        ['accept', 'reject', 'qaApprove', 'qaReject'], // Team-Admin
        ['qaApprove', 'qaReject'], // QA
      ],
      //Status QA Rejected
      [
        ['startFixing'], // Annotator
        ['complete'], // Auditor
        ['inProgress', 'qaInReview', 'qaApprove', 'accept', 'reject'], // Admin
        ['inProgress', 'qaInReview', 'qaApprove', 'accept', 'reject'], // Team-Admin
        ['qaApprove', 'qaInReview'], // QA
      ],

      //Status QA In Verified
      [
        ['disable'], // Annotator
        ['accept', 'reject'], // Auditor
        ['accept', 'reject', 'inProgress', 'qaApprove', 'qaInReview', 'qaReject'], // Admin
        ['accept', 'reject', 'inProgress', 'qaApprove', 'qaInReview', 'qaReject'], // Team-Admin
        ['qaInReview', 'qaReject'], // QA
      ],
    ];
  }
}

export function convertClassToObject(classObject: any) {
  let objectString = JSON.stringify({ ...classObject });
  return JSON.parse(objectString);
}

export class ButtonTypes {
  public static complete = {
    text: 'Complete',
    colorHex: '#6BC371',
    hoverColor: '#80d986',
    statusCode: 2,
  };
  public static cancel = {
    text: 'Cancel',
    colorHex: '#000000',
    hoverColor: '#',
    statusCode: NaN,
  };
  public static accept = { 
    text: 'Accept', 
    colorHex: '#589BFC', 
    hoverColor: '#71aafc',
    statusCode: 6 
  };
  public static reject = { 
    text: 'Reject', 
    colorHex: '#EF5050', 
    hoverColor: '#f76262',
    statusCode: 7 };
  public static inProgress = {
    text: 'In Progress',
    colorHex: '#FFA31A',
    hoverColor: '#fcad37',
    statusCode: 1,
  };
  public static startFixing = {
    text: 'Start Fixing',
    colorHex: '#FE6173',
    hoverColor: '#fa7281',
    statusCode: 9,
  };
  public static fix = { 
    text: 'Fix', 
    colorHex: '#1D62FE', 
    hoverColor: '#3f79fc',
    statusCode: 8 };
  public static qaApprove = {
    text: 'QA Approve',
    colorHex: '#24CEDF',
    hoverColor: '#37d8e8',
    statusCode: 12,
  };
  public static qaReject = {
    text: 'QA Reject',
    colorHex: '#C93053',
    hoverColor: '#db4a6c',
    statusCode: 11,
  };
  public static qaInReview = {
    text: 'QA In Review',
    colorHex: '#FF8A4A',
    hoverColor: '#f79a67',
    statusCode: 10,
  };
  public static disable = {
    text: 'Change status',
    colorHex: '#EF5050',
    statusCode: null,
  };
}

export class TaskStatus {
  public static notStarted = 0;
  public static inProgress = 1;
  public static completed = 2;

  public static accepted = 6; //start from 6
  public static rejected = 7;
  public static fixed = 8;
  public static fixing = 9;
  public static qaInReview = 10;
  public static qaRejected = 11;
  public static qaVerified = 12;
}

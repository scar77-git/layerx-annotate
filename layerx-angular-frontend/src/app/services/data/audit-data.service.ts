/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Audit } from 'src/app/models/audit.model';

@Injectable({
  providedIn: 'root'
})
export class AuditDataService {
  private auditInstance: BehaviorSubject<Audit> = new BehaviorSubject<Audit>(new Audit());
  constructor() { }
  setAuditInstance(audit: Audit) {
    this.auditInstance.next(audit);
  }

  getAuditInstance():Observable<Audit>{
    return this.auditInstance.asObservable();
  }
}

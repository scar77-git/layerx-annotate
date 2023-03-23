/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './components/header/header.component';
import { SideBarComponent } from './components/side-bar/side-bar.component';
import { DataSetMenuComponent } from './components/side-bar/data-set-menu/data-set-menu.component';
import { MaterialModule } from '../material-module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { RouterModule } from '@angular/router';


@NgModule({
    declarations: [
        HeaderComponent, 
        SideBarComponent, 
        DataSetMenuComponent
    ],
    imports: [
        CommonModule,
        MaterialModule,
        ReactiveFormsModule,
        MatDatepickerModule,
        MatNativeDateModule,
        RouterModule,
        FormsModule
    ],
    exports: [
        HeaderComponent, 
        SideBarComponent, 
        DataSetMenuComponent
    ],
})
export class SharedModule { }

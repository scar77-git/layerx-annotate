import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CreateDatasetComponent } from './components/create-dataset/create-dataset.component';
import { EditDatasetComponent } from './components/edit-dataset/edit-dataset.component';
import { RebalanceComponent } from './components/rebalance/rebalance.component';

const routes: Routes = [
  {
    path: '',
    component: CreateDatasetComponent,
  },
  {
    path: 'create',
    component: CreateDatasetComponent,
  },
  {
    path: 'rebalance',
    component: RebalanceComponent,
  },
  {
    path: 'edit',
    component: EditDatasetComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CreateDataSetRoutingModule {}

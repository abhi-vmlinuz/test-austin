import { Routes } from '@angular/router';
import { authGuard } from './core/guards';
import { LandingComponent } from './pages/landing.component';
import { LoginComponent } from './pages/login.component';
import { RegisterComponent } from './pages/register.component';
import { ShellComponent } from './layout/shell.component';
import { DashboardComponent } from './pages/dashboard.component';
import { RawListComponent } from './pages/raw-list.component';
import { RawCreateComponent } from './pages/raw-create.component';
import { RawDetailComponent } from './pages/raw-detail.component';
import { ProcessingComponent } from './pages/processing.component';
import { PgDetailComponent } from './pages/pg-detail.component';
import { QualityComponent } from './pages/quality.component';
import { InventoryComponent } from './pages/inventory.component';
import { InvDetailComponent } from './pages/inv-detail.component';
import { StorageComponent } from './pages/storage.component';
import { OrdersComponent } from './pages/orders.component';
import { OrderCreateComponent } from './pages/order-create.component';
import { OrderDetailComponent } from './pages/order-detail.component';
import { EgListComponent } from './pages/eg-list.component';
import { EgDetailComponent } from './pages/eg-detail.component';
import { ShipmentsComponent } from './pages/shipments.component';
import { TraceComponent } from './pages/trace.component';
import { ReportsComponent } from './pages/reports.component';
import { AdminComponent } from './pages/admin.component';
import { DocumentsComponent } from './pages/documents.component';
import { ProfileComponent } from './pages/profile.component';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'traceability/:code', component: TraceComponent },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'raw-batches', component: RawListComponent },
      { path: 'raw-batches/create', component: RawCreateComponent },
      { path: 'source/raw-batches/create', component: RawCreateComponent },
      { path: 'raw-batches/:id', component: RawDetailComponent },
      { path: 'processing', component: ProcessingComponent },
      { path: 'processing-groups/:id', component: PgDetailComponent },
      { path: 'quality', component: QualityComponent },
      { path: 'inventory', component: InventoryComponent },
      { path: 'inventory/:id', component: InvDetailComponent },
      { path: 'storage', component: StorageComponent },
      { path: 'orders', component: OrdersComponent },
      { path: 'orders/create', component: OrderCreateComponent },
      { path: 'orders/:id', component: OrderDetailComponent },
      { path: 'export-groups', component: EgListComponent },
      { path: 'export-groups/:id', component: EgDetailComponent },
      { path: 'shipments', component: ShipmentsComponent },
      { path: 'reports', component: ReportsComponent },
      { path: 'admin', component: AdminComponent },
      { path: 'documents', component: DocumentsComponent },
      { path: 'profile', component: ProfileComponent },
    ]
  },
  { path: '**', redirectTo: '' }
];

import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards';
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
import { ForbiddenComponent } from './pages/forbidden.component';

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
      { path: 'raw-batches', component: RawListComponent, canActivate: [roleGuard('ADMIN', 'SOURCE_OPERATOR', 'PROCESSOR')] },
      { path: 'raw-batches/create', component: RawCreateComponent, canActivate: [roleGuard('ADMIN', 'SOURCE_OPERATOR', 'PROCESSOR')] },
      { path: 'source/raw-batches/create', component: RawCreateComponent, canActivate: [roleGuard('ADMIN', 'SOURCE_OPERATOR', 'PROCESSOR')] },
      { path: 'raw-batches/:id', component: RawDetailComponent, canActivate: [roleGuard('ADMIN', 'SOURCE_OPERATOR', 'PROCESSOR')] },
      { path: 'processing', component: ProcessingComponent, canActivate: [roleGuard('ADMIN', 'PROCESSOR')] },
      { path: 'processing-groups/:id', component: PgDetailComponent, canActivate: [roleGuard('ADMIN', 'PROCESSOR')] },
      { path: 'quality', component: QualityComponent, canActivate: [roleGuard('ADMIN', 'QUALITY_INSPECTOR')] },
      { path: 'inventory', component: InventoryComponent, canActivate: [roleGuard('ADMIN', 'PROCESSOR', 'EXPORTER')] },
      { path: 'inventory/:id', component: InvDetailComponent, canActivate: [roleGuard('ADMIN', 'PROCESSOR', 'EXPORTER')] },
      { path: 'storage', component: StorageComponent, canActivate: [roleGuard('ADMIN', 'PROCESSOR', 'EXPORTER')] },
      { path: 'orders', component: OrdersComponent, canActivate: [roleGuard('ADMIN', 'EXPORTER', 'IMPORTER')] },
      { path: 'orders/create', component: OrderCreateComponent, canActivate: [roleGuard('ADMIN', 'IMPORTER')] },
      { path: 'orders/:id', component: OrderDetailComponent, canActivate: [roleGuard('ADMIN', 'EXPORTER', 'IMPORTER')] },
      { path: 'export-groups', component: EgListComponent, canActivate: [roleGuard('ADMIN', 'EXPORTER')] },
      { path: 'export-groups/:id', component: EgDetailComponent, canActivate: [roleGuard('ADMIN', 'EXPORTER')] },
      { path: 'shipments', component: ShipmentsComponent, canActivate: [roleGuard('ADMIN', 'EXPORTER')] },
      { path: 'reports', component: ReportsComponent, canActivate: [roleGuard('ADMIN', 'EXPORTER', 'PROCESSOR')] },
      { path: 'admin', component: AdminComponent, canActivate: [roleGuard('ADMIN')] },
      { path: 'documents', component: DocumentsComponent, canActivate: [roleGuard('ADMIN', 'EXPORTER')] },
      { path: 'profile', component: ProfileComponent },
      { path: 'forbidden', component: ForbiddenComponent },
    ]
  },
  { path: '**', redirectTo: '' }
];

import { userDetailsResolver } from './core/resolvers/user-details.resolver';
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { SignupComponent } from './pages/signup/signup.component';
import { UserProfileComponent } from './pages/user-profile/user-profile.component';
import { LoginComponent } from './pages/login-operation/login/login.component';
import { LayoutComponent } from './pages/layout/layout.component';
import { PageNotFoundComponent } from './pages/page-not-found/page-not-found.component';
import { loginGuard } from './core/guards/login.guard';
// import { RazorpayFlowComponent } from './core/reused/razorpay-flow/razorpay-flow.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  //login-operation
  {
    path: 'login',
    component: LoginComponent,
    title: 'Login',
    canActivate: [loginGuard],
  },
  {
    path: 'registeruser',
    loadComponent: () =>
      import(
        './pages/login-operation/register-user/register-user.component'
      ).then((m) => m.RegisterUserComponent),
    title: 'Register User',
    canActivate: [loginGuard],
  },
  {
    path: 'forgotpassword',
    loadComponent: () =>
      import(
        './pages/login-operation/forgot-password/forgot-password.component'
      ).then((m) => m.ForgotPasswordComponent),
    title: 'Forgot Password',
    canActivate: [loginGuard],
  },
  {
    path: 'resetpassword/:resettoken',
    loadComponent: () =>
      import(
        './pages/login-operation/reset-password/reset-password.component'
      ).then((m) => m.ResetPasswordComponent),
    title: 'Reset Password',
    canActivate: [loginGuard],
  },
  {
    path: 'signup',
    component: SignupComponent,
    title: 'Sign Up',
  },

  // {
  //   path: 'razorpay-demo',
  //   component: RazorpayFlowComponent,
  //   title: 'Online Payment',
  // },

  //main components

  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: 'client-dashboard',
        loadComponent: () =>
          import(
            './pages/client/client-dashboard/client-dashboard.component'
          ).then((m) => m.ClientDashboardComponent),
        title: 'Dashboard',
        canActivate: [authGuard],
      },
      {
        path: 'manager-dashboard',
        loadComponent: () =>
          import(
            './pages/client/client-dashboard/client-dashboard.component'
          ).then((m) => m.ClientDashboardComponent),
        title: 'Manager Dashboard',
        canActivate: [authGuard],
      },
      {
        path: 'frontdesk-dashboard',
        loadComponent: () =>
          import(
            './pages/frontdesk/frontdesk-dashboard/frontdesk-dashboard.component'
          ).then((m) => m.FrontdeskDashboardComponent),
        title: 'Frontdesk',
        canActivate: [authGuard],
      },
      {
        path: 'superadmin-dashboard',
        loadComponent: () =>
          import(
            './pages/super-admin/superadmin-dashboard/superadmin-dashboard.component'
          ).then((m) => m.SuperadminDashboardComponent),
        title: 'Super Admin',
        canActivate: [authGuard],
      },
      {
        path: 'manage-user/:propertyUnitId',
        loadComponent: () =>
          import('./pages/client/manage-user/manage-user.component').then(
            (m) => m.ManageUserComponent
          ),
        title: 'Manage User',
        canActivate: [authGuard],
      },

      //property-setup components

      {
        path: 'property-setup/:propertyUnitId',
        loadComponent: () =>
          import(
            './pages/property-setup/add-update-property/add-update-property.component'
          ).then((m) => m.AddUpdatePropertyComponent),
        title: 'Property Setup',
        canActivate: [authGuard],
      },

      {
        path: 'roomtype-setup/:propertyUnitId/:roomTypeId',
        loadComponent: () =>
          import(
            './pages/property-setup/room-type-range-setup/room-type-range-setup.component'
          ).then((m) => m.RoomTypeRangeSetupComponent),
        title: 'RoomType Setup',
        canActivate: [authGuard],
      },
      {
        path: 'policy-setup/:propertyUnitId',
        loadComponent: () =>
          import(
            './pages/property-setup/policy-list/policy-list.component'
          ).then((m) => m.PolicyListComponent),
        title: 'Policy Setup',
        canActivate: [authGuard],
      },
      {
        path: 'rooms-review/:propertyUnitId',
        loadComponent: () =>
          import(
            './pages/property-setup/rooms-review/rooms-review.component'
          ).then((m) => m.RoomsReviewComponent),
        title: 'Rooms Review',
        canActivate: [authGuard],
      },
      {
        path: 'tax-setup/:propertyUnitId',
        loadComponent: () =>
          import('./pages/property-setup/tax-set/tax-set.component').then(
            (m) => m.TaxSetComponent
          ),
        title: 'Tax Setup',
        canActivate: [authGuard],
      },
      {
        path: 'rateplan-setup/:ratePlanId',
        loadComponent: () =>
          import('./pages/property-setup/rateplan/rateplan.component').then(
            (m) => m.RateplanComponent
          ),
        title: 'RatePlan Setup',
        canActivate: [authGuard],
      },
      {
        path: 'baserate-setup/:propertyUnitId',
        loadComponent: () =>
          import('./pages/property-setup/rateplan/rateplan.component').then(
            (m) => m.RateplanComponent
          ),
        title: 'BaseRate Setup',
        canActivate: [authGuard],
      },
      {
        path: 'rateplan-list',
        loadComponent: () =>
          import(
            './pages/property-setup/rateplan-list/rateplan-list.component'
          ).then((m) => m.RateplanListComponent),
        title: 'RatePlan List',
        canActivate: [authGuard],
      },
      {
        path: 'profile',
        component: UserProfileComponent,
        title: 'User Profile',
        resolve: { userDetails: userDetailsResolver },
      },

      //reservation collection

      {
        path: 'create-reservation',
        loadComponent: () =>
          import(
            './pages/reservation-collection/create-reservation/create-reservation.component'
          ).then((m) => m.CreateReservationComponent),
        title: 'Create Reservation',
        canActivate: [authGuard],
      },
      {
        path: 'create-walkin',
        loadComponent: () =>
          import(
            './pages/reservation-collection/create-walkin/create-walkin.component'
          ).then((m) => m.CreateWalkinComponent),
        title: 'Create Walkin',
        canActivate: [authGuard],
      },
      {
        path: 'reservation-info',
        loadComponent: () =>
          import(
            './pages/reservation-collection/reservation-info/reservation-info.component'
          ).then((m) => m.ReservationInfoComponent),
        title: 'Reservation Info',
        canActivate: [authGuard],
      },
      {
        path: 'walkin-info',
        loadComponent: () =>
          import(
            './pages/reservation-collection/reservation-info/reservation-info.component'
          ).then((m) => m.ReservationInfoComponent),
        title: 'Walkin Info',
        canActivate: [authGuard],
      },
      {
        path: 'reservation-payment',
        loadComponent: () =>
          import(
            './pages/reservation-collection/create-reservation-payment/create-reservation-payment.component'
          ).then((m) => m.CreateReservationPaymentComponent),
        title: 'Reservation Payment',
        canActivate: [authGuard],
      },
      {
        path: 'walkin-payment',
        loadComponent: () =>
          import(
            './pages/reservation-collection/create-reservation-payment/create-reservation-payment.component'
          ).then((m) => m.CreateReservationPaymentComponent),
        title: 'Walkin Payment',
        canActivate: [authGuard],
      },
      {
        path: 'guest-folio/:groupId',
        loadComponent: () =>
          import(
            './pages/reservation-collection/guest-folio/guest-folio.component'
          ).then((m) => m.GuestFolioComponent),
        title: 'Guest Folio',
        canActivate: [authGuard],
      },

      // booking management
      {
        path: 'reservation-list',
        loadComponent: () =>
          import(
            './pages/booking-management/reservation-list/reservation-list.component'
          ).then((m) => m.ReservationListComponent),
        title: 'Reservation List',
        canActivate: [authGuard],
      },

      //room collection

      {
        path: 'room-maintenance',
        loadComponent: () =>
          import(
            './pages/room-operation/room-maintenance/room-maintenance.component'
          ).then((m) => m.RoomMaintenanceComponent),
        title: 'Room Maintenance',
        canActivate: [authGuard],
      },
      {
        path: 'house-keeping',
        loadComponent: () =>
          import(
            './pages/room-operation/house-keeping/house-keeping.component'
          ).then((m) => m.HouseKeepingComponent),
        title: 'House Keeping',
        canActivate: [authGuard],
      },

      // rate management collection
      {
        path: 'future-availability',
        loadComponent: () =>
          import(
            './pages/rate-management/future-availability/future-availability.component'
          ).then((m) => m.FutureAvailabilityComponent),
        title: 'Future Availability',
        canActivate: [authGuard],
      },
      {
        path: 'tape-chart',
        loadComponent: () =>
          import(
            './pages/rate-management/tape-chart/tape-chart.component'
          ).then((m) => m.TapeChartComponent),
        title: 'Tape Chart',
        canActivate: [authGuard],
      },
      {
        path: 'future-rates',
        loadComponent: () =>
          import(
            './pages/rate-management/future-rates/future-rates.component'
          ).then((m) => m.FutureRatesComponent),
        title: 'Future Rates',
      },
      {
        path: 'yield-management',
        loadComponent: () =>
          import(
            './pages/rate-management/yield-management/yield-management.component'
          ).then((m) => m.YieldManagementComponent),
        title: 'Yield Management',
      },
      {
        path: 'view-notification',
        loadComponent: () =>
          import('./pages/view-notification/view-notification.component').then(
            (m) => m.ViewNotificationComponent
          ),
        title: 'View Notification',
        canActivate: [authGuard],
      },
    ],
  },

  //wild card route
  {
    path: '**',
    component: PageNotFoundComponent,
    title: 'Page Not Found',
  },
];

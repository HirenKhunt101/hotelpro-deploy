import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import {
  catchError,
  switchMap,
  throwError,
  filter,
  take,
  finalize,
} from 'rxjs';
import { AuthService } from '../services/auth.service';
import { inject } from '@angular/core';
import { from } from 'rxjs';
import { LoaderService } from '../services/loader.service';

export const responseHandlerInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const loaderService = inject(LoaderService);

  return next(req).pipe(
    catchError((err: any) => {
      if (err instanceof HttpErrorResponse && err.status === 403) {
        return authService.tokenRefreshInProgress.pipe(
          filter((inProgress) => !inProgress),
          take(1),
          switchMap(() => {
            return from(authService.refreshToken()).pipe(
              switchMap(() => {
                const newAuthReq = req.clone({
                  withCredentials: true,
                });
                return next(newAuthReq);
              }),
              catchError((refreshErr) => {
                console.error('Error refreshing token:', refreshErr);
                authService.clearLocalStorageAndRedirect();
                return throwError(() => refreshErr);
              })
            );
          })
        );
      } else {
        console.error('HTTP error:', err);
        return throwError(() => err);
      }
    }),
    finalize(() => {
      if (!req.params.has('skipLoader')) {
        loaderService.hide();
      }
      authService.tokenRefreshInProgressSubject.next(false);
    })
  );
};

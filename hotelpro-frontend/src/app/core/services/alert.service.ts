import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AlertMessage {
  type: 'success' | 'danger' | 'info' | 'warning' | 'primary';
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class AlertService {
  private alertSubject = new BehaviorSubject<AlertMessage | null>(null);
  alertState$ = this.alertSubject.asObservable();
  private alertVisible = false; // Should be private

  customAlert(
    type: 'success' | 'danger' | 'info' | 'warning' | 'primary',
    message: string
  ): void {
    this.alertSubject.next({ type, message });
    this.alertVisible = true;
    this.autoClearAlert();
  }

  successAlert(message: string): void {
    this.alertSubject.next({ type: 'success', message });
    this.alertVisible = true;
    this.autoClearAlert();
  }

  errorAlert(message: string = 'Something went wrong'): void {
    this.alertSubject.next({ type: 'danger', message });
    this.alertVisible = true;
    this.autoClearAlert();
  }

  private autoClearAlert(): void {
    setTimeout(() => this.clearAlert(), 5000); // Auto-hide after 5 seconds
  }

  clearAlert(): void {
    this.alertSubject.next(null); // Use null to clear the alert
    this.alertVisible = false;
  }
}

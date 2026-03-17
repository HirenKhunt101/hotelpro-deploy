import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AlertService, AlertMessage } from '../../services/alert.service';
import { CommonModule } from '@angular/common';
import { NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [CommonModule, NgbAlertModule],
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.css'], // Use 'styleUrls' instead of 'styleUrl'
})
export class AlertComponent implements OnInit, OnDestroy {
  alert: AlertMessage | null = null; // Make alert nullable
  private alertSubscription!: Subscription;

  constructor(private alertService: AlertService) {} // Prefer private for DI services

  ngOnInit(): void {
    this.alertSubscription = this.alertService.alertState$.subscribe(
      (alert) => {
        this.alert = alert;
      }
    );
  }

  ngOnDestroy(): void {
    this.alertSubscription.unsubscribe();
  }

  close(): void {
    this.alertService.clearAlert();
  }
}

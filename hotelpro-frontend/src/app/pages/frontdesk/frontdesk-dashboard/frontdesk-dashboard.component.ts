import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';

import { AuthService } from '../../../core/services/auth.service';
import { CrudService } from '../../../core/services/crud.service';
import { APIConstant } from '../../../core/constants/APIConstant';
import { AlertService } from '../../../core/services/alert.service';

@Component({
  selector: 'app-frontdesk-dashboard',
  standalone: true,
  imports: [DatePipe, CurrencyPipe],
  templateUrl: './frontdesk-dashboard.component.html',
  styleUrl: './frontdesk-dashboard.component.css',
})
export class FrontdeskDashboardComponent {
  userInfo: any;
  availabilityData: any;
  totalRooms = 0;
  availableRooms = 0;
  reservationData: any;
  roomData: any;
  constructor(
    private authService: AuthService,
    private router: Router,
    private crudService: CrudService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.userInfo = this.authService.getUserInfo()?.user;
    console.log(this.userInfo);

    this.fetchData();
  }

  fetchData() {
    let startDate = new Date();
    let endDate = new Date();
    endDate.setDate(endDate.getDate() + 6);
    this.crudService
      .post(APIConstant.READ_FUTURE_AVAILABILITY, {
        propertyUnitId: this.userInfo.propertyUnitId,
        startDate,
        endDate,
      })
      .then((response: any) => {
        this.availabilityData = response.data;
        console.log(this.availabilityData);
        for (let ad of this.availabilityData) {
          this.totalRooms += ad.TotalRoom;
          this.availableRooms += ad.Occupancy?.[0]?.Available;
        }
      })
      .catch((error) => {
        this.alertService.errorAlert(error?.error?.message || error.message);
      });

    this.crudService
      .post(APIConstant.READ_FRONTDESK_DASHBOARD, {
        propertyUnitId: this.userInfo.propertyUnitId,
        startDate,
      })
      .then((response: any) => {
        this.reservationData = response.data;
        console.log(this.reservationData);
      })
      .catch((error) => {
        this.alertService.errorAlert(error?.error?.message || error.message);
      });

    let tomorrow = new Date(startDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.crudService
      .post(APIConstant.READ_TAPECHART, {
        startDate,
        endDate: tomorrow,
        propertyUnitId: this.userInfo.propertyUnitId,
        from: 'dashboard',
      })
      .then((response: any) => {
        this.roomData = response.data.tapechartData;
        console.log(this.roomData);
      })
      .catch((error) => {
        this.alertService.errorAlert(error.statusMessage);
      });
  }
}

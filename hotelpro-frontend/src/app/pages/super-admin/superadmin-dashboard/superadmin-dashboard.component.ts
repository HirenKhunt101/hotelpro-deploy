import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../../core/services/auth.service';
import { CrudService } from '../../../core/services/crud.service';
import { APIConstant } from '../../../core/constants/APIConstant';
import { AlertService } from '../../../core/services/alert.service';
import { UserInfoService } from '../../../core/services/user-info.service';

import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartEvent, ChartType } from 'chart.js';

@Component({
  selector: 'app-superadmin-dashboard',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './superadmin-dashboard.component.html',
  styleUrl: './superadmin-dashboard.component.css',
})
export class SuperadminDashboardComponent implements OnInit {
  userInfo: any;
  dashboardData: any;

  // Chart Configuration
  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {},
      y: {
        min: 0
      }
    },
    plugins: {
      legend: {
        display: true,
      },
    }
  };
  public barChartType: ChartType = 'bar';
  public barChartPlugins = [];

  public barChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [
      { data: [], label: 'Daily Revenue', backgroundColor: '#4e73df', hoverBackgroundColor: '#2e59d9' }
    ]
  };

  constructor(
    private authService: AuthService,
    private userInfoService: UserInfoService,
    private router: Router,
    private crudService: CrudService,
    private alertService: AlertService
  ) { }

  ngOnInit(): void {
    this.userInfo = this.authService.getUserInfo()?.user;

    // if (this.userInfo?.userType != "superadmin") {
    //   this.authService.logout();
    // }

    this.loadDashboardData();
  }

  loadDashboardData() {
    this.crudService
      .post(APIConstant.GET_SUPERADMIN_DASHBOARD, {})
      .then((response: any) => {
        this.dashboardData = response.data;
        this.processChartData(this.dashboardData.revenueChartData);
      })
      .catch((error) => {
        this.alertService.errorAlert(error?.error?.message || error.message);
      });
  }

  processChartData(data: any[]) {
    if (data && data.length > 0) {
      this.barChartData.labels = data.map(item => item._id);
      this.barChartData.datasets[0].data = data.map(item => item.totalRevenue);
    } else {
      // Fallback for demo if no data
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      this.barChartData.labels = days;
      this.barChartData.datasets[0].data = [0, 0, 0, 0, 0, 0, 0];
    }
  }

  login(email: String) {
    this.crudService
      .post(APIConstant.CLIENT_LOGIN_BY_SUPERADMIN, { email })
      .then((response: any) => {
        let userData = response.data;
        this.userInfoService.setUserInfo(userData);
        this.router.navigate([`/client-dashboard`]);
      })
      .catch((error) => {
        this.alertService.errorAlert(error?.error?.message || error.message);
      });
  }
}

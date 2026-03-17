import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { CrudService } from '../../../core/services/crud.service';
import { APIConstant } from '../../../core/constants/APIConstant';
import { AlertService } from '../../../core/services/alert.service';
import { FormsModule } from '@angular/forms';
import { UserInfoService } from '../../../core/services/user-info.service';

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './client-dashboard.component.html',
  styleUrl: './client-dashboard.component.css',
})
export class ClientDashboardComponent {
  userInfo: any;
  dashboardData: any;
  activePropertyUnit = 0;
  constructor(
    private authService: AuthService,
    private userService: UserInfoService,
    private router: Router,
    private crudService: CrudService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.userInfo = this.authService.getUserInfo()?.user;
    console.log(this.userInfo);
    let obj = {};
    if (this.userInfo.userType == 'manager') {
      obj = { accessPropertyUnitIds: this.userInfo.accessPropertyUnitIds };
    } else {
      obj = { propertyId: this.userInfo.propertyId };
    }

    this.crudService
      .post(APIConstant.READ_CLIENT_DASHBOARD, obj)
      .then((response: any) => {
        this.dashboardData = response.data;
        this.activePropertyUnit = 0;
        for (let p of this.dashboardData?.property?.propertyUnits) {
          this.activePropertyUnit += p.active == true ? 1 : 0;
        }
        console.log(this.dashboardData);
      })
      .catch((error) => {
        this.alertService.errorAlert(error?.error?.message || error.message);
      });
  }
  updatePropertyUnitStatus(PropertyUnit: any) {
    this.crudService
      .post(APIConstant.UPDATE_PROPERTY_UNIT_STATUS + PropertyUnit._id, {
        active: PropertyUnit.active,
      })
      .then((response: any) => {
        console.log(response);
        let userData = this.userService.getUserInfo();
        if (PropertyUnit.active) {
          if (!userData.user.propertyUnitId)
            userData.user.propertyUnitId = PropertyUnit._id;
          if (!userData.user.propertyUnitCode)
            userData.user.propertyUnitCode = PropertyUnit.propertyUnitCode;
          if (!userData.user.propertyUnitName)
            userData.user.propertyUnitName = PropertyUnit.propertyUnitName;

          userData.user.propertyUnits.push(PropertyUnit);
        } else {
          userData.user.propertyUnits = userData.user.propertyUnits.filter(
            (p: any) => {
              return p._id != PropertyUnit._id;
            }
          );
          if (userData.user.propertyUnitId === PropertyUnit._id) {
            if (userData.user.propertyUnits?.length > 0) {
              userData.user.propertyUnitId = userData.user.propertyUnits[0]._id;
              userData.user.propertyUnitCode =
                userData.user.propertyUnits[0].propertyUnitCode;
              userData.user.propertyUnitName =
                userData.user.propertyUnits[0].propertyUnitName;
            } else {
              delete userData.user.propertyUnitId;
              delete userData.user.propertyUnitCode;
              delete userData.user.propertyUnitName;
            }
          }
        }
        this.userService.updateUserInfo(userData);
        this.ngOnInit();
      })
      .catch((error) => {
        this.alertService.errorAlert(error?.error?.message || error.message);
      });
  }
  addPropertyUnit() {
    this.router.navigate(['/property-setup/ADD']);
  }

  editPropertyUnit(propertyUnitId: any) {
    this.router.navigate(['/property-setup', propertyUnitId]);
  }

  manageUser(propertyUnitId: any) {
    this.router.navigate(['/manage-user', propertyUnitId]);
  }
}

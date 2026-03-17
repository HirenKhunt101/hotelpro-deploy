import { Component, OnDestroy, OnInit, TemplateRef } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CrudService } from '../../core/services/crud.service';
import { APIConstant } from '../../core/constants/APIConstant';
import { AlertService } from '../../core/services/alert.service';
import { NgbModal, NgbToast } from '@ng-bootstrap/ng-bootstrap';
import { AsyncPipe, CommonModule, DatePipe, JsonPipe } from '@angular/common';
import { NotificationSharedService } from '../../core/services/notification-shared.service';
import { interval, Subscription } from 'rxjs';
import { UserInfoService } from '../../core/services/user-info.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    RouterModule,
    JsonPipe,
    AsyncPipe,
    DatePipe,
    NgbToast,
  ],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent implements OnInit, OnDestroy {
  oldPassword: string = '';
  newPassword: string = '';
  userInfo: any = {};
  notifications: any[] = [];
  private pollingSubscription: Subscription | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private userServie: UserInfoService,
    private crudService: CrudService,
    private alertService: AlertService,
    private notificationService: NotificationSharedService,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.userInfo = this.authService.getUserInfo()?.user;
    this.readNotifications();
    this.userServie.navBarUpdate$.subscribe((data: any) => {
      console.log(data);
      if (data == true) {
        this.userInfo = this.authService.getUserInfo()?.user;
        this.readNotifications();
      }
    });
    // this.notificationService.joinToRoom(this.userInfo._id);

    // this.notificationService.on('new-notification').subscribe((data) => {
    //   this.notifications.unshift(data);
    // });
    // this.monitorForNotifications();
  }
  monitorForNotifications() {
    this.pollingSubscription = interval(60000) // 1 minute interval
      .subscribe(() => {
        this.readNotifications();
      });
  }
  identify(index: any, item: any) {
    return item._id;
  }
  readNotifications() {
    this.crudService
      .post(
        APIConstant.READ_ALL_NOTIFICATION,
        {
          propertyUnitId: this.userInfo?.propertyUnitId,
        },
        {
          skipLoader: true,
        }
      )
      .then((response: any) => {
        console.log(response?.data);
        response?.data?.forEach((e: any) => {
          if (e.message && typeof e.message === 'string') {
            try {
              e.message = JSON.parse(e.message);
            } catch (err) {
              console.error('Failed to parse message', err);
            }
          }
        });
        // this.notificationService.sendNewNotifications(response?.data);
        this.notifications = response?.data;
      })
      .catch((error: any) => {
        this.alertService.errorAlert(error?.error?.message);
      });
  }
  async logOut() {
    try {
      await this.authService.logout();
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout failed', error);
    }
  }
  openChangePassword(content: TemplateRef<any>) {
    this.modalService.open(content).result.then((result) => {
      if (result) {
        this.changePassWord({
          newPassword: this.newPassword,
          oldPassword: this.oldPassword,
        });
      } else {
        this.newPassword = '';
        this.oldPassword = '';
      }
    });
  }
  changePassWord(obj: any) {
    this.crudService
      .post(APIConstant.CHANGE_PASSWORD, obj)
      .then((response: any) => {
        console.log(response);
        this.alertService.successAlert(response.message);
        this.newPassword = '';
        this.oldPassword = '';
      })
      .catch((error) => {
        console.error('There was an error!', error);
        this.alertService.errorAlert(error.message);
      });
  }
  passwordValidator() {
    const value = this.newPassword;
    if (!value) {
      return null;
    }
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumeric = /[0-9]/.test(value);
    const hasSpecialCharacter = /[!@#$%^&*(),.?":{}|<>]/.test(value);

    const passwordValid =
      hasUpperCase && hasLowerCase && hasNumeric && hasSpecialCharacter;

    return !passwordValid ? { passwordStrength: true } : null;
  }

  async updateNotifications(ids: any[]) {
    // this.notificationService.emit('markNotificationAsRead', {
    //   ids: ids,
    //   _id: this.userInfo._id,
    // });

    // this.notifications = this.notifications.filter((d) => !ids.includes(d._id));

    this.crudService
      .post(
        APIConstant.UPDATE_MULTIPLE_NOTIFICATION,
        {
          ids,
        },
        {
          skipLoader: true,
        }
      )
      .then((response: any) => {
        console.log(response?.data);
        this.notifications = this.notifications.filter(
          (d) => !ids.includes(d._id)
        );
        this.notificationService.sendNewNotifications(this.notifications);
      })
      .catch((error: any) => {
        this.alertService.errorAlert(error?.error?.message);
      });
  }

  async switchPropertyUnit() {
    await this.authService.switchProperty({
      propertyUnitId: this.userInfo.propertyUnitId,
    });
  }
  dismiss(id: any) {
    this.updateNotifications([id]);
  }
  markAsRead() {
    this.closeDropDown();
    if (this.notifications.length) {
      this.updateNotifications(this.notifications.map((e) => e._id));
    }
  }
  goToPage(link: string, id?: any) {
    this.router.navigateByUrl(link);
    this.closeDropDown();
    if (id) this.dismiss(id);
  }
  closeDropDown() {
    let el = document?.getElementById('notificationId');
    if (el) el.classList.remove('show');
  }
  gotoDashboard() {
    this.router.navigate([`/${this.userInfo?.userType}-dashboard`]);
  }

  ngOnDestroy(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null; // Clean up
    }
  }
}

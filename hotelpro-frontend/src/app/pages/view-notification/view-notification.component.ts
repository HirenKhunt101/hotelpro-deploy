import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AlertService } from '../../core/services/alert.service';
import { AuthService } from '../../core/services/auth.service';
import { CrudService } from '../../core/services/crud.service';
import { APIConstant } from '../../core/constants/APIConstant';
import { CommonModule, JsonPipe } from '@angular/common';

@Component({
  selector: 'app-view-notification',
  standalone: true,
  imports: [CommonModule, JsonPipe],
  templateUrl: './view-notification.component.html',
  styleUrl: './view-notification.component.css',
})
export class ViewNotificationComponent implements OnInit {
  propertyUnitId: string | null = '';
  notifications: any[] = [];

  constructor(
    private fb: FormBuilder,
    private crudService: CrudService,
    private alertService: AlertService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.propertyUnitId = this.authService.getUserInfo()?.user?.propertyUnitId;
    this.crudService
      .post(APIConstant.READ_ALL_NOTIFICATION, {
        propertyUnitId: this.propertyUnitId,
        viewAll: true,
      })
      .then((response: any) => {
        console.log(response?.data);
        response?.data?.forEach((e: any) => {
          if (e.message) {
            e.message = JSON.parse(e.message);
          }
        });
        this.notifications = response?.data;
      })
      .catch((error: any) => {
        this.alertService.errorAlert(error?.error?.message);
      });
  }
}

import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AlertService } from '../../../core/services/alert.service';
import { CrudService } from '../../../core/services/crud.service';
import { AuthService } from '../../../core/services/auth.service';
import { APIConstant } from '../../../core/constants/APIConstant';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-rateplan-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './rateplan-list.component.html',
  styleUrl: './rateplan-list.component.css',
})
export class RateplanListComponent implements OnInit {
  propertyUnitId: string | null = '';
  ratePlanList: any[] = [];
  constructor(
    private fb: FormBuilder,
    private crudService: CrudService,
    private alertService: AlertService,
    private activeRoute: ActivatedRoute,
    private authService: AuthService
  ) {}
  ngOnInit(): void {
    this.propertyUnitId = this.authService.getUserInfo()?.user?.propertyUnitId;
    this.crudService
      .post(APIConstant.READ_RATEPLAN, {
        propertyUnitId: this.propertyUnitId,
        fromList: true,
      })
      .then((response: any) => {
        console.log(response);

        this.ratePlanList = response.data.ratePlanList;
        this.alertService.successAlert(response.message);
      })
      .catch((error: any) => {
        console.log(error);
        this.alertService.errorAlert(error?.error?.message);
      });
  }
}

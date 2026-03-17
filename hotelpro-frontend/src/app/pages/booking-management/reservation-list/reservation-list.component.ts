import { Component, EventEmitter, OnInit } from '@angular/core';
import {
  FormGroup,
  FormArray,
  FormBuilder,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AlertService } from '../../../core/services/alert.service';
import { CrudService } from '../../../core/services/crud.service';
import { APIConstant } from '../../../core/constants/APIConstant';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { CustomValidators } from '../../../core/shared/validators/custom-validators';
import { StatusPipe } from '../../../core/shared/pipes/status.pipe';

@Component({
  selector: 'app-reservation-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    StatusPipe,
  ],
  templateUrl: './reservation-list.component.html',
  styleUrl: './reservation-list.component.css',
})
export class ReservationListComponent implements OnInit {
  propertyUnitId: string | null = '';
  reservationData: any[] = [];
  today: any;
  constructor(
    private crudService: CrudService,
    private fb: FormBuilder,
    private alertService: AlertService,
    private activeRoute: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.propertyUnitId = this.authService.getUserInfo()?.user?.propertyUnitId;
    this.today = new Date();
    this.today.setUTCHours(0, 0, 0, 0);
    this.fetchData();
  }

  fetchData() {
    this.crudService
      .post(APIConstant.GET_ALL_RESERVATION, {
        propertyUnitId: this.propertyUnitId,
      })
      .then((response) => {
        this.reservationData = response.data;
      })
      .catch((error) => {
        this.alertService.errorAlert(
          error?.error?.message || 'An error occurred while fetching users'
        );
        console.error(error);
      });
  }

  search(event: any) {
    this.reservationData.forEach((element: any) => {
      if (
        JSON.stringify(element)
          ?.toLowerCase()
          ?.includes(event.target.value.toLowerCase())
      ) {
        element.Show = true;
      } else {
        element.Show = false;
      }
    });
  }

  filterByReservationStatus(event: any) {
    let filter = event.target.value;
    for (let r of this.reservationData) {
      r.Show = false;
      if (filter == "all") {
        r.Show = true;
      }
      else if (filter == "arrival") {
        if (r.reservationStatus == "reserved" && new Date(r.arrival).toString() == this.today.toString()) {
          r.Show = true;
        }
      } else if (filter == "departure") {
        if (r.reservationStatus == "inhouse" && new Date(r.departure).toString() == this.today.toString()) {
          r.Show = true;
        }
      } else if (r.reservationStatus == filter) {
        r.Show = true;
      }
    }
  }
}

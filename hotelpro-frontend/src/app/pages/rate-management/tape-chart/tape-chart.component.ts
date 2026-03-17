import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { APIConstant } from '../../../core/constants/APIConstant';
import { AlertService } from '../../../core/services/alert.service';
import { CrudService } from '../../../core/services/crud.service';
import { AuthService } from '../../../core/services/auth.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NgMultiSelectDropDownModule } from 'ng-multiselect-dropdown';
import { CommonModule, DatePipe } from '@angular/common';

@Component({
  selector: 'app-tape-chart',
  standalone: true,
  imports: [
    FormsModule,
    NgMultiSelectDropDownModule,
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
  ],
  templateUrl: './tape-chart.component.html',
  styleUrl: './tape-chart.component.css',
})
export class TapeChartComponent {
  propertyUnitId: string | null = '';
  startDate!: any;
  endDate!: any;
  Date: any;
  Week = 2;
  RoomData: any;
  DateArr: any;
  dropdownSettings!: {
    singleSelection: boolean;
    idField: string;
    textField: string;
    unSelectAllText: string;
    enableCheckAll: boolean;
    itemsShowLimit: number;
    allowSearchFilter: boolean;
  };
  dropdownList: any = [];
  selectedItems: any = [];
  Max!: any;
  Today!: any;
  unAssignReservations: any[] = [];

  constructor(
    private crudService: CrudService,
    private fb: FormBuilder,
    private alertService: AlertService,
    private router: Router,
    private activeRoute: ActivatedRoute,
    private modalService: NgbModal,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.propertyUnitId = this.authService.getUserInfo()?.user?.propertyUnitId;

    this.Max = new DatePipe('en-US').transform(new Date(), 'yyyy-MM-dd');
    this.Date = new DatePipe('en-US').transform(new Date(), 'yyyy-MM-dd');
    this.Today = new DatePipe('en-US').transform(new Date(), 'yyyy-MM-dd');

    this.dropdownSettings = {
      singleSelection: false,
      idField: 'item_id',
      textField: 'item_text',
      unSelectAllText: 'UnSelect All',
      enableCheckAll: false,
      itemsShowLimit: 2,
      allowSearchFilter: true,
    };

    this.fetchdata();
  }

  fetchdata() {
    if (this.Week < 2) this.Week = 2;
    if (this.Week > 52) this.Week = 52;
    if (
      new Date(this.Date).toISOString() < new Date(this.Today).toISOString()
    ) {
      this.Date = this.Today; // if user enter past date using input
      this.alertService.errorAlert('You can not visit past data');
      return;
    }

    this.startDate = new Date(this.Date.replace(/-/g, '/'));
    this.endDate = new Date(this.startDate);
    this.endDate.setDate(this.endDate.getDate() + this.Week * 7);
    this.DateArr = [];
    for (
      let d = new Date(this.startDate);
      d < new Date(this.endDate);
      d.setDate(d.getDate() + 1)
    ) {
      this.DateArr.push({ date: new Date(d) });
    }

    const payloadStartDate = this.startDate.toLocaleDateString('en-CA'); // "yyyy-mm-dd"
    const payloadEndDate = this.endDate.toLocaleDateString('en-CA');

    this.crudService
      .post(APIConstant.READ_TAPECHART, {
        startDate: payloadStartDate,
        endDate: payloadEndDate,
        propertyUnitId: this.propertyUnitId,
      })
      .then((response: any) => {
        this.dropdownList = [];
        this.RoomData = this.roomSort(response.data.tapechartData);
        this.unAssignReservations = response.data.unAssignReservations;

        this.DateArr.forEach((d: any) => {
          let r = this.unAssignReservations.filter((u) => {
            return new Date(u.arrival).toISOString() == d.date.toISOString();
          });
          d.unAssignRooms = r;
        });
        for (let r of this.RoomData) {
          for (let room of r.roomDetails) {
            for (let rr of room.reservation) {
              rr.arrival = new Date(
                rr.arrival.split('T')[0].replace(/-/g, '/') + ' 00:00'
              );
              rr.departure = new Date(
                rr.departure.split('T')[0].replace(/-/g, '/') + ' 00:00'
              );
            }

            for (let rm of room.maintenance) {
              rm.startDate = new Date(
                rm.startDate.split('T')[0].replace(/-/g, '/') + ' 00:00'
              );
              rm.endDate = new Date(
                rm.endDate.split('T')[0].replace(/-/g, '/') + ' 00:00'
              );
            }
          }
          if (!this.dropdownList.includes(r.roomTypeName)) {
            this.dropdownList.push(r.roomTypeName);
          }
          r.Show = true;
        }
        this.dropdownList = this.dropdownList.map((e: any) => {
          return { item_id: e, item_text: e };
        });
      })
      .catch((error) => {
        this.alertService.errorAlert(error.statusMessage);
      });
  }

  roomSort(data: any) {
    data.sort((a: any, b: any) => {
      if (a.roomTypeName < b.roomTypeName) {
        return -1;
      }
      if (a.roomTypeName > b.roomTypeName) {
        return 1;
      }
      return 0;
    });
    data.map((d: any) => {
      d.roomDetails.sort((a: any, b: any) => {
        if (a.roomName < b.roomName) {
          return -1;
        }
        if (a.roomName > b.roomName) {
          return 1;
        }
        return 0;
      });
    });

    return data;
  }

  setBackground(r: any) {
    if (r.reservationStatus == 'reserved') {
      return 'reservation';
    } else if (r.reservationStatus == 'inhouse') {
      return 'inhouse';
    } else if (r.reservationStatus == 'checkedout') {
      return 'checkedout';
    }
    return '';
  }

  add() {
    this.Week += 1;
  }

  sub() {
    if (this.Week > 2) {
      this.Week -= 1;
    }
  }

  test(d: any, r: any) {
    if (
      d.toString() == r.arrival.toString() ||
      (r.arrival <= this.startDate && d.toString() == this.startDate.toString())
    ) {
      return true;
    } else {
      return false;
    }
  }

  testmaintainance(d: any, m: any) {
    console.log(
      d.toString(),
      m.startDate.toString(),
      d.toString() == m.startDate.toString()
    );
    if (
      d.toString() == m.startDate.toString() ||
      (m.startDate <= this.startDate &&
        d.toString() == this.startDate.toString())
    ) {
      return true;
    } else {
      return false;
    }
  }

  nightNumber(a: any, d: any) {
    let date1 = new Date(a);
    let date2 = new Date(d);
    let en = new Date(this.endDate);
    let st = new Date(this.startDate);
    st.setUTCHours(0, 0, 0, 0);
    en.setUTCHours(0, 0, 0, 0);
    date1.setUTCHours(0, 0, 0, 0);
    date2.setUTCHours(0, 0, 0, 0);

    let z = 0;
    if (date1 < st) {
      if (date2 > en) {
        z = Math.abs(date2.getTime() - en.getTime());
        z = Math.round(z / (24 * 60 * 60 * 1000));
        z += 0.3;
      }
      if (date2.toString() == en.toString()) {
        z = 0.3;
      }

      let di = (st.getTime() - date1.getTime()) / (24 * 60 * 60 * 1000);
      let diff = (date2.getTime() - date1.getTime()) / (24 * 60 * 60 * 1000);
      return diff - di - z >= 1 ? diff - di - z : 0.7;
    }

    if (date2 > en) {
      z = Math.abs(date2.getTime() - en.getTime());
      z = Math.round(z / (1000 * 3600 * 24));
      z += 0.3;
    }
    if (date2.toString() == en.toString()) {
      z = 0.3;
    }
    let diff = Math.round(
      (date2.getTime() - date1.getTime()) / (1000 * 3600 * 24)
    );
    return diff - z >= 1 ? diff - z : 0.7;
  }

  filterRoom() {
    let r = this.selectedItems.map((e: any) => e.item_id);
    if (r.length > 0) {
      for (let t of this.RoomData) {
        if (r.includes(t.roomTypeName)) {
          t.Show = true;
        } else {
          t.Show = false;
        }
      }
    } else {
      for (let t of this.RoomData) {
        t.Show = true;
      }
    }
  }
}

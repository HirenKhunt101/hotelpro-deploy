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
  selector: 'app-room-maintenance',
  standalone: true,
  imports: [
    FormsModule,
    NgMultiSelectDropDownModule,
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
  ],
  templateUrl: './room-maintenance.component.html',
  styleUrl: './room-maintenance.component.css',
})
export class RoomMaintenanceComponent implements OnInit {
  propertyUnitId: string | null = '';
  AddMaintenance!: FormGroup;
  RoomData: any;
  startDate!: any;
  endDate!: any;
  Tomorrow!: any;
  ShowAdd = false;
  DateArr: any;
  Date: any;
  Week = 2;
  ShowMain = false;

  dropdownSettings!: {
    singleSelection: boolean;
    idField: string;
    textField: string;
    unSelectAllText: string;
    enableCheckAll: boolean;
    itemsShowLimit: number;
    allowSearchFilter: boolean;
  };
  dropdownListRoom: any = [];
  dropdownSettingsRooms!: {
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
  CurrentMaintainance: any;
  RoomTypes!: any[];
  ShowEdit = false;
  Max!: any;
  availableRoom: any;
  Today!: any;
  RangeMaintenance: any[] = [];

  constructor(
    private crudService: CrudService,
    private fb: FormBuilder,
    private alertService: AlertService,
    private router: Router,
    private activeRoute: ActivatedRoute,
    private modalService: NgbModal,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.propertyUnitId = this.authService.getUserInfo()?.user?.propertyUnitId;

    this.ShowAdd = false;

    this.Max = new DatePipe('en-US').transform(new Date(), 'yyyy-MM-dd');
    this.Date = new DatePipe('en-US').transform(new Date(), 'yyyy-MM-dd');
    this.Today = new DatePipe('en-US').transform(new Date(), 'yyyy-MM-dd');

    this.Tomorrow = new Date(this.Today);
    this.Tomorrow.setDate(this.Tomorrow.getDate() + 1);
    this.Tomorrow = new DatePipe('en-US').transform(
      this.Tomorrow,
      'yyyy-MM-dd'
    );

    this.dropdownListRoom = [];

    this.AddMaintenance = this.fb.group({
      propertyUnitId: [this.propertyUnitId],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      roomType: ['', Validators.required],
      Rooms: [[], Validators.required],
      Reason: ['', Validators.required],
      Notes: [''],
    });
    this.dropdownSettings = {
      singleSelection: false,
      idField: 'item_id',
      textField: 'item_text',
      unSelectAllText: 'UnSelect All',
      enableCheckAll: false,
      itemsShowLimit: 2,
      allowSearchFilter: true,
    };
    this.dropdownSettingsRooms = {
      singleSelection: false,
      idField: 'item_id',
      textField: 'item_text',
      unSelectAllText: 'UnSelect All',
      enableCheckAll: true,
      itemsShowLimit: 1,
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

    this.AddMaintenance.reset({
      roomType: '',
      Reason: '',
      Rooms: [],
    });

    this.ShowAdd = false;
    this.startDate = new Date(this.Date.replace(/-/g, '/'));
    this.endDate = new Date(this.startDate);
    this.endDate.setDate(this.endDate.getDate() + this.Week * 7);
    this.DateArr = [];
    for (
      let d = new Date(this.startDate);
      d < new Date(this.endDate);
      d.setDate(d.getDate() + 1)
    ) {
      this.DateArr.push(new Date(d));
    }

    this.crudService
      .post(APIConstant.READ_ROOM_MAINTENANCE, {
        startDate: this.startDate,
        endDate: this.endDate,
        propertyUnitId: this.propertyUnitId,
      })
      .then((response: any) => {
        this.dropdownList = [];
        this.RoomData = this.roomSort(response.data.Rooms);

        for (let r of this.RoomData) {
          for (let rr of r.Reservation) {
            rr.arrival = new Date(
              rr.arrival.split('T')[0].replace(/-/g, '/') + ' 00:00'
            );
            rr.departure = new Date(
              rr.departure.split('T')[0].replace(/-/g, '/') + ' 00:00'
            );
          }
          for (let rm of r.RoomMaintainance) {
            rm.startDate = new Date(
              rm.startDate.split('T')[0].replace(/-/g, '/') + ' 00:00'
            );
            rm.endDate = new Date(
              rm.endDate.split('T')[0].replace(/-/g, '/') + ' 00:00'
            );
          }
          if (!this.dropdownList.includes(r.roomType)) {
            this.dropdownList.push(r.roomType);
          }
          r.Show = true;
        }
        this.RoomTypes = [...this.dropdownList];
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
      if (a.roomType < b.roomType) {
        return -1;
      }
      if (a.roomType > b.roomType) {
        return 1;
      }
      if (a.roomName < b.roomName) {
        return -1;
      }
      if (a.roomName > b.roomName) {
        return 1;
      }
      return 0;
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

  getAvailRoomdata() {
    this.AddMaintenance.patchValue({
      roomType: '',
      Reason: '',
      Rooms: [],
    });

    if (
      this.AddMaintenance.controls.startDate.value?.toString() >=
      this.AddMaintenance.controls.endDate.value?.toString()
    ) {
      this.AddMaintenance.patchValue({
        endDate: this.getTomorrow(),
      });
    }

    if (
      this.AddMaintenance.controls.startDate.value &&
      this.AddMaintenance.controls.endDate.value
    ) {
      this.crudService
        .post(APIConstant.READ_AVAILABLE_ROOM_FOR_DATERANGE, {
          startDate: this.AddMaintenance.controls.startDate.value,
          endDate: this.AddMaintenance.controls.endDate.value,
          propertyUnitId: this.propertyUnitId,
        })
        .then((response: any) => {
          this.availableRoom = response.data.RoomTypes;
        })
        .catch((error) => {
          this.alertService.errorAlert(error.message);
        });
    }
  }

  showRooms(event: any) {
    for (let i of this.availableRoom) {
      if (i._id == event.target.value) {
        this.dropdownListRoom = [];
        this.AddMaintenance.controls['Rooms'].setValue([]);
        for (let x of i.rooms) {
          let obj = {
            item_id: x._id,
            item_text: x.roomName,
          };
          this.dropdownListRoom.push(obj);
        }
        break;
      }
    }
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

  showAddpop() {
    this.ShowMain = false;
    this.ShowAdd = true;
    this.ShowEdit = false;
  }

  cancelpop() {
    this.ShowAdd = false;
    this.ShowEdit = false;
  }

  getTomorrow() {
    this.Tomorrow = new Date(this.AddMaintenance.controls.startDate.value);
    this.Tomorrow.setDate(this.Tomorrow.getDate() + 1);
    this.Tomorrow = new DatePipe('en-US').transform(
      this.Tomorrow,
      'yyyy-MM-dd'
    );
    return this.Tomorrow;
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
        if (r.includes(t.roomType)) {
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

  maintainance(m: any) {
    this.ShowAdd = false;
    this.ShowMain = true;
    this.ShowEdit = false;
    this.CurrentMaintainance = { ...m };
    this.CurrentMaintainance.startDate = new DatePipe('en-US').transform(
      new Date(this.CurrentMaintainance.startDate),
      'yyyy-MM-dd'
    );
    this.CurrentMaintainance.endDate = new DatePipe('en-US').transform(
      new Date(this.CurrentMaintainance.endDate),
      'yyyy-MM-dd'
    );
  }

  addMaintenance() {
    let formdata = this.AddMaintenance.value;
    let objarr: any[] = [];
    if (new Date(formdata.endDate) < new Date(formdata.startDate)) {
      this.alertService.errorAlert('Enter Valid Start and End Date!');
    } else {
      for (let i of formdata.Rooms) {
        let obj = {
          roomId: i.item_id,
          propertyUnitId: this.propertyUnitId,
          startDate: formdata.startDate,
          endDate: formdata.endDate,
          reason: formdata.Reason,
          description: formdata.Notes,
          isCompleted: false,
          today: this.Today,
        };
        objarr.push(obj);
      }

      this.crudService
        .post(APIConstant.CREATE_ROOM_MAINTENANCE, { RoomMaintainance: objarr })
        .then((response: any) => {
          this.fetchdata();
        })
        .catch((error) => {
          this.alertService.errorAlert(error?.error?.message);
        });
    }
  }

  Cancelupdate() {
    this.ShowMain = false;
  }

  updateMaintenance(isCompleted: Boolean) {
    if (isCompleted) {
      this.CurrentMaintainance.isCompleted = true;
      this.CurrentMaintainance.endDate = new Date(this.Today);
      this.CurrentMaintainance.endDate.setUTCHours(0, 0, 0, 0);
    } else {
      let today = new Date();
      today.setDate(today.getDate() + 1);
      today.setHours(0, 0, 0, 0);

      let st = new Date(this.CurrentMaintainance.startDate);
      st.setHours(0, 0, 0, 0);
      let ed = new Date(this.CurrentMaintainance.endDate);
      ed.setHours(0, 0, 0, 0);
      if (st >= ed) {
        this.alertService.errorAlert('Enter Valid Start and End Date!');
        return;
      } else if (st < today && ed < today) {
        this.alertService.errorAlert('Enter Valid Start and End Date!');
        return;
      }
    }

    this.CurrentMaintainance.RoomMaintainanceId = this.CurrentMaintainance._id;
    this.CurrentMaintainance.Today = this.Today;

    this.crudService
      .post(APIConstant.UPDATE_ROOM_MAINTENANCE, this.CurrentMaintainance)
      .then((response: any) => {
        this.alertService.successAlert('Room maintenance updated successfully');
        this.fetchdata();
      })
      .catch((error) => {
        this.alertService.errorAlert(error.message);
      });
  }

  showEdit() {
    this.ShowMain = false;
    this.ShowAdd = false;
    this.ShowEdit = true;
  }

  openRangeUpdateModal(content: any) {
    this.modalService.open(content).result.then((result) => {
      if (result) {
      }
    });
  }

  rangeUpdate() {
    let obj = {
      RangeMaintenance: this.RangeMaintenance,
    };

    this.crudService
      .post(APIConstant.UPDATE_ROOM_MAINTENANCE_RANGE, obj)
      .then((response: any) => {
        this.alertService.successAlert(
          'Room maintainance completed Successfully!'
        );
        this.modalService.dismissAll();
        this.ngOnInit();
      })
      .catch((error) => {
        this.alertService.errorAlert(error.message);
      });
  }

  onSelectChange(m: any, event: any) {
    if (event.target.checked) {
      this.RangeMaintenance.push(m);
    } else {
      const index = this.RangeMaintenance.indexOf(m);
      if (index !== -1) {
        this.RangeMaintenance.splice(index, 1);
      }
    }
  }

  isSelected(m: any): boolean {
    return this.RangeMaintenance.includes(m);
  }

  toggleSelectAll(event: any) {
    let allSelected = event.target.checked;
    this.RangeMaintenance = [];

    if (allSelected) {
      for (const item of this.RoomData) {
        for (const m of item.RoomMaintainance) {
          this.RangeMaintenance.push(m);
        }
      }
    } else {
      this.RangeMaintenance = [];
    }
  }
}

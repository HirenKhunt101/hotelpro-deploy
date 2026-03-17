import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import {
  FormGroup,
  FormArray,
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AlertService } from '../../../core/services/alert.service';
import { CrudService } from '../../../core/services/crud.service';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule, DatePipe } from '@angular/common';
import { APIConstant } from '../../../core/constants/APIConstant';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NgMultiSelectDropDownModule } from 'ng-multiselect-dropdown';

@Component({
  selector: 'app-house-keeping',
  standalone: true,
  imports: [
    FormsModule,
    NgMultiSelectDropDownModule,
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
  ],
  templateUrl: './house-keeping.component.html',
  styleUrl: './house-keeping.component.css',
})
export class HouseKeepingComponent implements OnInit {
  HouseKeeperForm!: FormGroup;
  AssignHousekeepingForm!: FormGroup;
  propertyUnitId: string | null = '';
  Start: number = 0;
  End: number = 0;
  SelectCondition = 'dirty';
  SelectRoomType = 'all';
  RoomDetails: any;
  SearchText: any;
  RoomTypes: any;
  HouseKeeperData: any;
  Flag = false;
  isEditable = false;
  SelectRoom = '';
  isShowingSchedule = false;
  ShowAdd = false;
  modalAction = 'Add';
  initialFormValues: any;

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
    this.dropDownSettings();

    this.isEditable = false;
    this.HouseKeeperForm = this.fb.group({
      _id: [''],
      propertyUnitId: [this.propertyUnitId],
      firstName: [
        '',
        [Validators.required, Validators.pattern("^[a-zA-Z.'\\s]*$")],
      ],
      lastName: [
        '',
        [Validators.required, Validators.pattern("^[a-zA-Z.'\\s]*$")],
      ],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],
      // schedule: this.fb.array([
      //   this.createScheduleGroup('monday', true),
      //   this.createScheduleGroup('tuesday', true),
      //   this.createScheduleGroup('wednesday', true),
      //   this.createScheduleGroup('thursday', true),
      //   this.createScheduleGroup('friday', true),
      //   this.createScheduleGroup('saturday', false),
      //   this.createScheduleGroup('sunday', false),
      // ]),
    });

    this.AssignHousekeepingForm = this.fb.group({
      propertyUnitId: [this.propertyUnitId],
      housekeeper: ['', Validators.required],
      roomType: ['', Validators.required],
      rooms: [[], Validators.required],
      notes: [''],
    });
    this.initialFormValues = this.HouseKeeperForm.value;
    this.fetchData();
  }

  // createScheduleGroup(day: string, working: boolean): FormGroup {
  //   return this.fb.group({
  //     day: [day],
  //     shiftStartTime: ['12:00'],
  //     shiftEndTime: ['00:00'],
  //     working: [working],
  //     _id: [''],
  //   });
  // }

  resetHouseKeeperForm() {
    this.HouseKeeperForm.reset(this.initialFormValues);
  }

  dropDownSettings() {
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
  }

  fetchData() {
    this.crudService
      .post(APIConstant.READ_ROOMS_WITH_HOUSE_KEEPING, {
        propertyUnitId: this.propertyUnitId,
      })
      .then((response: any) => {
        this.RoomDetails = response.data.RoomDetails;
        this.HouseKeeperData = response.data.housekeeperDetail;
        this.RoomTypes = [
          ...new Set(this.RoomDetails.map((room: any) => room.roomType)),
        ]; // Find unique room type from all rooms
      })
      .catch((error) => {
        this.alertService.errorAlert(error.statusMessage);
      });
  }

  get schedule(): FormArray {
    return this.HouseKeeperForm.get('schedule') as FormArray;
  }

  addUpdateHouseKeeper() {
    let housekeeper = this.HouseKeeperForm.value;
    // let working = false;
    // for (let s of housekeeper.schedule) {
    //   if (s.working) {
    //     working = true;
    //   }
    //   let d = new Date();
    //   d.setHours(
    //     s.shiftEndTime.split(':')[0],
    //     s.shiftEndTime.split(':')[1],
    //     0,
    //     0
    //   );
    //   let d2 = new Date();
    //   d2.setHours(
    //     s.shiftStartTime.split(':')[0],
    //     s.shiftStartTime.split(':')[1],
    //     0,
    //     0
    //   );

    //   s.shiftEndTime = d.getHours() + ':' + d.getMinutes();
    //   s.shiftStartTime = d2.getHours() + ':' + d2.getMinutes();
    //   if (this.modalAction == 'Add') delete s._id;
    // }
    // if (working) {
    if (this.modalAction == 'Add') {
      this.crudService
        .post(APIConstant.CREATE_HOUSE_KEEPER, housekeeper)
        .then((response: any) => {
          this.alertService.successAlert('Housekeeper added successfully!');
          this.ngOnInit();
        })
        .catch((error) => {
          this.alertService.errorAlert(error?.error?.message);
        })
        .finally(() => {
          this.modalService.dismissAll();
        });
    } else {
      this.crudService
        .post(APIConstant.UPDATE_HOUSE_KEEPER, housekeeper)
        .then((response: any) => {
          this.alertService.successAlert('Housekeeper updated successfully!');
          this.ngOnInit();
        })
        .catch((error) => {
          this.alertService.errorAlert(error?.error?.message);
        })
        .finally(() => {
          this.modalService.dismissAll();
        });
    }
    // }
    // else {
    //   this.alertService.errorAlert('Please add valid schedule!');
    // }
  }

  activeDeactiveHousekeeper(i: any) {
    if (this.HouseKeeperData[i].assignedRoom == 0) {
      this.crudService
        .post(APIConstant.DELETE_HOUSE_KEEPER, {
          housekeeperId: this.HouseKeeperData[i]._id,
          active: !this.HouseKeeperData[i].active,
        })
        .then((response: any) => {
          this.alertService.successAlert(
            `Housekeeper ${
              !this.HouseKeeperData[i].active ? 'activated' : 'deactivated'
            }  successfully`
          );
          this.ngOnInit();
        })
        .catch((error) => {
          this.alertService.errorAlert(error.statusMessage);
        });
    } else {
      this.alertService.errorAlert(
        'You cannot deactivate the housekeeper if the room is assigned to them. Please unassign the room and try again.'
      );
      this.ngOnInit();
    }
  }

  cancelpop() {
    this.AssignHousekeepingForm.patchValue({
      roomType: '',
      rooms: [],
      notes: '',
      housekeeper: '',
    });

    this.ShowAdd = false;
  }

  assignHousekeepingTask() {
    this.crudService
      .post(
        APIConstant.CREATE_HOUSE_KEEPING_TASK,
        this.AssignHousekeepingForm.value
      )
      .then((response: any) => {
        this.alertService.successAlert(
          'Housekeeping task assigned successfully!'
        );
        this.ngOnInit();
      })
      .catch((error) => {
        this.alertService.errorAlert(error?.error?.message);
      });
  }

  showRooms(event: any) {
    this.dropdownListRoom = [];
    for (let i of this.RoomDetails) {
      if (
        !i.housekeeperId &&
        i.roomType == event.target.value &&
        i.roomCondition == 'dirty'
      ) {
        this.AssignHousekeepingForm.patchValue({ rooms: [] });
        let obj = {
          item_id: i._id,
          item_text: i.roomName,
        };
        this.dropdownListRoom.push(obj);
      }
    }
  }

  show_Schedule() {
    this.isShowingSchedule = !this.isShowingSchedule;
  }

  editbtn() {
    this.isEditable = true;
  }

  changeCondition(conditon: any, i: any) {
    console.log(conditon);
    this.RoomDetails[i].roomCondition = conditon;
    this.RoomDetails[i].Changed = true;
  }

  showAddpop() {
    if (this.HouseKeeperData?.length == 0) {
      this.alertService.errorAlert(
        'Please add housekeeper for assign housekeeping task'
      );
    } else {
      this.ShowAdd = true;
    }
  }

  rangeUpdate() {
    let rd = [];
    if (this.Start > 0 && this.End > 0 && this.Start < this.End) {
      this.Flag = false;
      if (this.SelectRoomType == 'all') {
        for (let d of this.RoomDetails) {
          if (
            Number(d.roomNumber) >= this.Start &&
            Number(d.roomNumber) <= this.End
          ) {
            if (this.SelectRoom == 'even' && Number(d.roomNumber) % 2 == 0) {
              d.Changed = true;
              d.roomCondition = this.SelectCondition;
              rd.push(d);
            } else if (
              this.SelectRoom == 'odd' &&
              Number(d.roomNumber) % 2 != 0
            ) {
              d.Changed = true;
              d.roomCondition = this.SelectCondition;
              rd.push(d);
            } else if (this.SelectRoom == 'all') {
              d.Changed = true;
              d.roomCondition = this.SelectCondition;
              rd.push(d);
            }
          }
        }
      } else {
        for (let d of this.RoomDetails) {
          if (
            Number(d.roomNumber) >= this.Start &&
            Number(d.roomNumber) <= this.End &&
            d.roomType == this.SelectRoomType
          ) {
            if (this.SelectRoom == 'even' && Number(d.roomNumber) % 2 == 0) {
              d.Changed = true;
              d.roomCondition = this.SelectCondition;
              rd.push(d);
            } else if (
              this.SelectRoom == 'odd' &&
              Number(d.roomNumber) % 2 != 0
            ) {
              d.Changed = true;
              d.roomCondition = this.SelectCondition;
              rd.push(d);
            } else if (this.SelectRoom == 'all') {
              d.Changed = true;
              d.roomCondition = this.SelectCondition;
              rd.push(d);
            }
          }
        }
      }
      this.modalService.dismissAll();
    } else {
      this.Flag = true;
    }
  }

  updateRooms() {
    let rd = this.RoomDetails.filter((e: any) => {
      if (e.Changed) {
        return true;
      } else {
        return false;
      }
    });
    this.crudService
      .post(APIConstant.UPDATE_ROOMS_WITH_HOUSE_KEEPING, {
        propertyUnitId: this.propertyUnitId,
        RoomDetails: rd,
      })
      .then((response: any) => {
        for (let r of rd) {
          delete r._id;
          delete r.Show;
        }
        this.ngOnInit();
      })
      .catch((error) => {
        this.alertService.errorAlert(error.statusMessage);
      });
  }

  completeTask(item: any) {
    console.log(item);
    this.crudService
      .post(APIConstant.COMPLETE_TASK_BY_ID, {
        housekeepingId: item.housekeepingId,
        roomId: item._id,
      })
      .then((response: any) => {
        this.alertService.successAlert(
          'Housekeeping task completed successfully!'
        );
        this.ngOnInit();
      })
      .catch((error) => {
        this.alertService.errorAlert(error?.error?.message);
      });
  }

  openModal_sm(content: any) {
    this.Flag = false;
    this.Start = 0;
    this.End = 0;
    this.SelectRoomType = 'all';
    this.SelectCondition = 'dirty';
    this.SelectRoom = 'all';
    this.modalService.open(content, { centered: true });
  }

  openModalAddHouseKeeper(content: any) {
    this.modalAction = 'Add';
    this.isShowingSchedule = false;
    this.resetHouseKeeperForm();
    this.modalService.open(content, { centered: true });
  }

  openModalEditHouseKeeper(content: any, i: any) {
    this.modalAction = 'Edit';
    this.isShowingSchedule = false;
    let housekeeper = this.HouseKeeperData[i];
    console.log(this.HouseKeeperData[i]);
    for (let s of housekeeper.schedule) {
      let d = new Date();
      let d2 = new Date();

      const formatTime = (date: any) =>
        (date.getHours() >= 10 ? date.getHours() : '0' + date.getHours()) +
        ':' +
        (date.getMinutes() >= 10 ? date.getMinutes() : '0' + date.getMinutes());

      d.setHours(
        s.shiftEndTime.split(':')[0],
        s.shiftEndTime.split(':')[1],
        0,
        0
      );
      d2.setHours(
        s.shiftStartTime.split(':')[0],
        s.shiftStartTime.split(':')[1],
        0,
        0
      );

      s.shiftEndTime = formatTime(d);
      s.shiftStartTime = formatTime(d2);
    }

    this.HouseKeeperForm.patchValue(housekeeper);
    this.modalService.open(content, { centered: true });
  }

  search(event: any) {
    this.RoomDetails.forEach((element: any) => {
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
}

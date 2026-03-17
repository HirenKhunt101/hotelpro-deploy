import { Component, OnInit, TemplateRef } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AlertService } from '../../../core/services/alert.service';
import { CrudService } from '../../../core/services/crud.service';
import { CommonModule, DatePipe, JsonPipe } from '@angular/common';
import { NgMultiSelectDropDownModule } from 'ng-multiselect-dropdown';
import { APIConstant } from '../../../core/constants/APIConstant';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../../../core/services/auth.service';
import { distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-create-reservation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    NgMultiSelectDropDownModule,
    DatePipe,
  ],
  templateUrl: './create-reservation.component.html',
  styleUrl: './create-reservation.component.css',
})
export class CreateReservationComponent implements OnInit {
  groupForm!: FormGroup;
  roomsData: any[] = [];
  selectedItems: any[] = [];
  propertyUnitId: string | null = '';
  roomTypeRooms: Record<string, any[]> = {};
  extraGuestsData: any = {
    extraAdults: 0,
    extraChilds: 0,
    childRate: 0,
    adultRate: 0,
  };
  Today: string = '';
  isOccupancySufficient: boolean = false;

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
    // this.propertyUnitId = this.route.snapshot.paramMap.get('propertyUnitId');
    this.initForms();
    this.clearSession();
    this.groupForm
      .get('adults')
      ?.valueChanges.pipe(distinctUntilChanged())
      .subscribe((adultsValue) => {
        this.resetGuestTotals();
      });
    this.groupForm
      .get('childs')
      ?.valueChanges.pipe(distinctUntilChanged())
      .subscribe((childsValue) => {
        this.resetGuestTotals();
      });
  }

  private clearSession(): void {
    sessionStorage.removeItem('reservationsArray');
    sessionStorage.removeItem('groupDetails');
    sessionStorage.removeItem('resdata');
  }

  private initForms(): void {
    const today = new Date();
    const arrivalDate = this.formatDate(today);
    this.Today = arrivalDate;
    const departureDate = this.formatDate(
      new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000)
    );

    this.groupForm = this.fb.group({
      arrival: [arrivalDate, Validators.required],
      departure: [departureDate, Validators.required],
      adults: [2, [Validators.min(1), Validators.required]],
      childs: [0, Validators.required],
      totalCost: [0],
      totalPrice: [0],
    });
  }
  nextDate() {
    let x = new Date(this.groupForm.get('arrival')?.value);
    x.setDate(x.getDate() + 1);
    return this.formatDate(x);
  }
  setDeparture() {
    let date1 = new Date(this.groupForm.get('arrival')?.value);
    let date2 = new Date(this.groupForm.get('departure')?.value);
    if (date1 >= date2) {
      let diff = (date2.getTime() - date1.getTime()) / (1000 * 3600 * 24);
      diff = diff < 1 ? 1 : Math.round(diff);
      date1.setDate(date1.getDate() + diff);
      this.groupForm.controls.departure.setValue(this.formatDate(date1));
    }
    this.resetGuestTotals();
    // return this.formatDate(this.groupForm.get('departure')?.value);
  }
  private formatDate(date: Date): string {
    return new DatePipe('en-US').transform(date, 'yyyy-MM-dd') || '';
  }

  readRooms(): void {
    this.isOccupancySufficient = false;
    this.resetGuestTotals();
    this.crudService
      .post(
        APIConstant.READ_RESERVATION_RATE + this.propertyUnitId,
        this.groupForm.value
      )
      .then((response: any) => {
        this.processRoomsData(response.data);
      })
      .catch((error: any) => {
        this.alertService.errorAlert(error?.error?.message);
      });
  }

  resetGuestTotals(): void {
    this.roomsData = [];
    this.selectedItems = [];
    this.roomTypeRooms = {};
    this.groupForm.patchValue({
      totalCost: 0,
      totalPrice: 0,
    });
  }

  private processRoomsData(data: any[]): void {
    this.roomsData = data.map((room) => {
      room.dropdownSettings = {
        singleSelection: false,
        limitSelection: 0,
        idField: 'id',
        textField: 'roomName',
        unSelectAllText: 'UnSelect All',
        enableCheckAll: false,
        itemsShowLimit: 3,
        allowSearchFilter: true,
      };
      room.extraAdults = 0;
      room.extraChilds = 0;
      [room.roomPrice, room.roomCost] = this.calculateRoomCost(room);
      if (!this.roomTypeRooms[room.roomTypeId]) {
        this.roomTypeRooms[room.roomTypeId] = room.rooms;
      }
      this.selectedItems.push([]);
      return room;
    });
  }

  private calculateRoomCost(room: any): [number, number] {
    const basePrice = room.dateRate.reduce(
      (total: number, rate: any) =>
        total +
        Number(rate.baseRate) +
        Number(rate.adultRate * room.extraAdults) +
        Number(rate.childRate * room.extraChilds),
      0
    );
    const taxAmount = (basePrice * room.taxPercentage) / 100;
    return [basePrice, basePrice + taxAmount];
  }

  addRoomCount(index: number): void {
    this.updateRoomSelection(index, 1);
  }

  removeRoomCount(index: number): void {
    this.updateRoomSelection(index, -1);
  }

  trackSelectedRooms() {
    let x = this.roomsData.reduce((acc: number, room: any) => {
      return (acc +=
        room.dropdownSettings.limitSelection *
        (room.adultOccupant +
          room.childOccupant +
          room.extraAdults +
          room.extraChilds));
    }, 0);
    console.log(x);
    this.isOccupancySufficient =
      x >=
      this.groupForm.get('adults')?.value + this.groupForm.get('childs')?.value;
  }

  private updateRoomSelection(index: number, increment: number): void {
    const room = this.roomsData[index];
    room.dropdownSettings = Object.assign({}, room.dropdownSettings, {
      limitSelection: room.dropdownSettings.limitSelection + increment,
    });
    this.roomsData.forEach((element: any, i: number) => {
      if (i !== index && element.roomTypeId === room.roomTypeId) {
        element.totalRoom -= increment;
      }
    });

    this.groupForm.controls.totalCost.patchValue(
      this.groupForm.get('totalCost')?.value + increment * room.roomCost
    );
    this.groupForm.controls.totalPrice.patchValue(
      this.groupForm.get('totalPrice')?.value + increment * room.roomPrice
    );
    if (
      increment < 0 &&
      this.selectedItems[index].length > room.dropdownSettings.limitSelection
    ) {
      let x = [...this.selectedItems[index]];
      x.splice(x.length - 1, 1);
      this.selectedItems[index] = Object.assign(x);
    }
    this.trackSelectedRooms();
  }

  trackByFn(index: number, item: any): any {
    return item.id;
  }

  dropDownData(rooms: any[], index: number): any[] {
    return rooms.filter(
      (room: any) =>
        !this.selectedItems.some(
          (selectedRooms: any[], i: number) =>
            i !== index && selectedRooms.some((r: any) => r.id === room.id)
        )
    );
  }

  onSubmit(): void {
    const reservationDetails = this.prepareReservationDetails();

    sessionStorage.setItem(
      'resdata',
      JSON.stringify({
        reservationDetails,
        groupDetails: this.groupForm.value,
        roomTypeRooms: this.roomTypeRooms,
      })
    );
    this.router.navigate([`/reservation-info`]);
  }

  private prepareReservationDetails(): any[] {
    return this.roomsData.reduce((acc: any[], room: any, index: number) => {
      if (room.dropdownSettings.limitSelection > 0) {
        const roomDetails = this.createRoomDetails(room, index);
        return acc.concat(roomDetails);
      }
      return acc;
    }, []);
  }

  private createRoomDetails(room: any, index: number): any[] {
    const selectedRooms = this.selectedItems[index].map(
      (selectedRoom: any) => ({
        ...room,
        room,
        roomId: selectedRoom.id,
      })
    );

    const unassignedRooms = Array(
      room.dropdownSettings.limitSelection - selectedRooms.length
    ).fill({
      ...room,
      room: {
        id: 'assign',
        roomStatus: 'vacant',
        roomCondition: 'clean',
        roomNumber: 'default',
        roomName: 'default',
      },
      roomId: 'assign',
    });

    return selectedRooms.concat(unassignedRooms);
  }

  openExtraModal(content: any, room: any): void {
    this.extraGuestsData = {
      extraAdults: room.extraAdults,
      extraChilds: room.extraChilds,
      childRate: room.dateRate[0].childRate,
      adultRate: room.dateRate[0].adultRate,
    };

    this.modalService.open(content).result.then((result) => {
      if (result) {
        room.extraAdults = Number(this.extraGuestsData.extraAdults);
        room.extraChilds = Number(this.extraGuestsData.extraChilds);

        if (room.dropdownSettings.limitSelection > 0) {
          this.groupForm.controls.totalCost.patchValue(
            this.groupForm.get('totalCost')?.value -
              room.roomCost * room.dropdownSettings.limitSelection
          );
          this.groupForm.controls.totalPrice.patchValue(
            this.groupForm.get('totalPrice')?.value -
              room.roomPrice * room.dropdownSettings.limitSelection
          );
          [room.roomPrice, room.roomCost] = this.calculateRoomCost(room);

          this.groupForm.controls.totalCost.patchValue(
            this.groupForm.get('totalCost')?.value +
              room.roomCost * room.dropdownSettings.limitSelection
          );
          this.groupForm.controls.totalPrice.patchValue(
            this.groupForm.get('totalPrice')?.value +
              room.roomPrice * room.dropdownSettings.limitSelection
          );
        } else {
          [room.roomPrice, room.roomCost] = this.calculateRoomCost(room);
        }
        this.trackSelectedRooms();
      }
    });
  }
}

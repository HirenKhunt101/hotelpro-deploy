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

@Component({
  selector: 'app-create-walkin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    NgMultiSelectDropDownModule,
    DatePipe,
  ],
  templateUrl: './create-walkin.component.html',
  styleUrl: './create-walkin.component.css',
})
export class CreateWalkinComponent implements OnInit {
  groupForm!: FormGroup;
  roomsData: any[] = [];
  selectedItems: any[] = [];
  totalGuests: any = { adults: 0, childs: 0 };
  propertyUnitId: string | null = '';
  roomTypeRooms: Record<string, any[]> = {};
  extraGuestsData: any = {
    extraAdults: 0,
    extraChilds: 0,
    childRate: 0,
    adultRate: 0,
  };
  Today: string = '';

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

    this.initForms();
    this.clearSession();
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
    this.totalGuests = { adults: 0, childs: 0 };
    this.groupForm.patchValue({
      totalCost: 0,
      totalPrice: 0,
    });
  }

  private processRoomsData(data: any[]): void {
    this.roomsData = data.map((room) => {
      room.dropdownSettings = {
        singleSelection: false,
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

  private updateRoomSelection(index: number, increment: number): void {
    const room = this.roomsData[index];

    this.roomsData.forEach((element: any, i: number) => {
      if (element.roomTypeId === room.roomTypeId) {
        element.totalRoom -= increment;
      }
    });

    this.totalGuests.adults += increment * room.adultOccupant;
    this.totalGuests.childs += increment * room.childOccupant;

    this.groupForm.controls.totalCost.patchValue(
      this.groupForm.get('totalCost')?.value + increment * room.roomCost
    );
    this.groupForm.controls.totalPrice.patchValue(
      this.groupForm.get('totalPrice')?.value + increment * room.roomPrice
    );
  }
  onItemDeSelect(e: any, index: number) {
    this.updateRoomSelection(index, -1);
  }
  onItemSelect(e: any, index: number) {
    this.updateRoomSelection(index, 1);
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
    this.router.navigate([`/walkin-info`]);
  }

  private prepareReservationDetails(): any[] {
    return this.roomsData.reduce((acc: any[], room: any, index: number) => {
      const roomDetails = this.createRoomDetails(room, index);
      return acc.concat(roomDetails);
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

    return selectedRooms;
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
        this.totalGuests.adults -= room.adultOccupant + room.extraAdults;
        this.totalGuests.childs -= room.childOccupant + room.extraChilds;
        room.extraAdults = Number(this.extraGuestsData.extraAdults);
        room.extraChilds = Number(this.extraGuestsData.extraChilds);

        this.groupForm.controls.totalCost.patchValue(
          this.groupForm.get('totalCost')?.value - room.roomCost
        );
        this.groupForm.controls.totalPrice.patchValue(
          this.groupForm.get('totalPrice')?.value - room.roomPrice
        );
        [room.roomPrice, room.roomCost] = this.calculateRoomCost(room);
        this.totalGuests.adults += room.adultOccupant + room.extraAdults;
        this.totalGuests.childs += room.childOccupant + room.extraChilds;
        this.groupForm.controls.totalCost.patchValue(
          this.groupForm.get('totalCost')?.value + room.roomCost
        );
        this.groupForm.controls.totalPrice.patchValue(
          this.groupForm.get('totalPrice')?.value + room.roomPrice
        );
      }
    });
  }
}

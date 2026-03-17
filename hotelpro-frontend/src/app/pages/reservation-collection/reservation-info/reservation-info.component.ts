import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, TemplateRef } from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  Validators,
  FormArray,
  FormsModule,
  ReactiveFormsModule,
  AbstractControl,
} from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CrudService } from '../../../core/services/crud.service';
import { APIConstant } from '../../../core/constants/APIConstant';
import { AlertService } from '../../../core/services/alert.service';
import { ActivatedRoute, Router } from '@angular/router';
import { NgxFileDropModule } from 'ngx-file-drop';
import {
  NgxFileDropEntry,
  FileSystemFileEntry,
  FileSystemDirectoryEntry,
} from 'ngx-file-drop';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reservation-info',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    DatePipe,
    NgxFileDropModule,
  ],
  templateUrl: './reservation-info.component.html',
  styleUrls: ['./reservation-info.component.css'],
})
export class ReservationInfoComponent implements OnInit {
  reservationForm!: FormGroup;
  groupForm!: FormGroup;
  propertyUnitId: string | null = '';
  roomsData: any[] = [];
  updateDateRateObj: any = {};
  roomTypeRooms: any;
  isWalkin: boolean = false;

  constructor(
    private fb: FormBuilder,
    private modalService: NgbModal,
    private crudService: CrudService,
    private alertService: AlertService,
    private authService: AuthService,
    private activeRoute: ActivatedRoute,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.propertyUnitId = this.authService.getUserInfo()?.user?.propertyUnitId;
    this.isWalkin = this.router.url == '/reservation-info' ? false : true;

    // this.propertyUnitId = this.route.snapshot.paramMap.get('propertyUnitId');
    this.initializeForms();
    this.loadData();
  }

  private initializeForms(): void {
    this.reservationForm = this.fb.group({
      reservations: this.fb.array([]),
    });

    this.groupForm = this.fb.group({
      arrival: [this.formatDate(new Date()), Validators.required],
      departure: [this.formatDate(new Date()), Validators.required],
      adults: [2, [Validators.min(1), Validators.required]],
      childs: [0, Validators.required],
      totalCost: [0],
      totalPrice: [0],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.email]],
      phone: [''],
      addressLine1: [''],
      addressLine2: [''],
      country: [''],
      city: [''],
      state: ['', [Validators.pattern(/^[A-Za-z\s]+$/)]],
      zipCode: [''],
      documents: [],
    });
  }

  private loadData(): void {
    let d = sessionStorage.getItem('resdata');
    if (d) {
      let data = JSON.parse(d);
      this.groupForm.patchValue(data.groupDetails);
      this.populateReservations(data.reservationDetails);
      this.roomTypeRooms = data.roomTypeRooms;
    }

    let rd = sessionStorage.getItem('reservationsArray');
    if (rd) {
      const reservationsData = JSON.parse(rd);
      this.reservations.clear();
      reservationsData.forEach((reservation: any) => {
        this.reservations.push(this.createReservation(reservation));
      });
    }

    let gd = sessionStorage.getItem('groupDetails');
    if (gd) {
      let groupdata = JSON.parse(gd);
      this.groupForm.patchValue(groupdata);
    }
  }

  private formatDate(date: Date): string {
    return new DatePipe('en-US').transform(date, 'yyyy-MM-dd')!;
  }

  private createReservation(room?: any): FormGroup {
    return this.fb.group({
      roomTypeId: [room?.roomTypeId || '', Validators.required],
      roomId: [room?.roomId || '', Validators.required],
      rateplanId: [room?.rateplanId || '', Validators.required],
      rateName: [room?.rateName || '', Validators.required],
      roomtype: [room?.roomtype || '', Validators.required],
      adultOccupant: [room?.adultOccupant || 0, Validators.required],
      childOccupant: [room?.childOccupant || 0],
      extraAdults: [room?.extraAdults || 0],
      extraChilds: [room?.extraChilds || 0],
      taxPercentage: [room?.taxPercentage || 0],
      roomPrice: [room?.roomPrice || 0, Validators.required],
      roomCost: [room?.roomCost || 0, Validators.required],
      images: [room?.images || []],
      dateRate: this.fb.array(
        room ? this.createDateRates(room.dateRate) : [this.createDateRate()]
      ),
      guests: this.fb.array(
        room?.guests ? this.createGuests(room.guests) : [this.createGuest()]
      ),
      isDetailsVisiable: [true],
    });
  }

  private createDateRates(dateRates: any[]): FormGroup[] {
    return dateRates.map((dateRate) => this.createDateRate(dateRate));
  }

  private createDateRate(dateRate?: any): FormGroup {
    return this.fb.group({
      date: [dateRate?.date || '', Validators.required],
      baseRate: [dateRate?.baseRate || '', Validators.required],
      adultRate: [dateRate?.adultRate || '', Validators.required],
      childRate: [dateRate?.childRate || '', Validators.required],
    });
  }

  private createGuests(guests: any[]): FormGroup[] {
    return guests.map((guest) => this.createGuest(guest));
  }

  private createGuest(guest?: any): FormGroup {
    return this.fb.group({
      firstName: [guest?.firstName || '', Validators.required],
      lastName: [guest?.lastName || '', Validators.required],
      email: [guest?.email || '', [Validators.email]],
      phone: [guest?.phone || ''],
      addressLine1: [guest?.addressLine1 || ''],
      addressLine2: [guest?.addressLine2 || ''],
      country: [guest?.country || ''],
      city: [guest?.city || ''],
      state: [guest?.state || ''],
      zipCode: [guest?.zipCode || ''],
      isSameAsCustomer: [false],
      documents: [],
    });
  }

  private populateReservations(rooms: any[]): void {
    const reservationArray = this.reservationForm.get(
      'reservations'
    ) as FormArray;
    rooms.forEach((room) =>
      reservationArray.push(this.createReservation(room))
    );
  }

  get reservations(): FormArray {
    return this.reservationForm.get('reservations') as FormArray;
  }

  addReservation(): void {
    this.reservations.push(this.createReservation());
  }

  getDateRates(reservation: AbstractControl): FormArray {
    return reservation.get('dateRate') as FormArray;
  }

  getGuests(reservation: AbstractControl): FormArray {
    return reservation.get('guests') as FormArray;
  }

  addGuest(reservationIndex: number): void {
    const guests = this.getGuests(this.reservations.at(reservationIndex));
    guests.push(this.createGuest());
  }

  removeGuest(reservationIndex: number, guestIndex: number): void {
    const guests = this.getGuests(this.reservations.at(reservationIndex));
    if (guests.length > 1) {
      guests.removeAt(guestIndex);
    }
  }

  sameAsCustomer(guestForm: AbstractControl, event: any): void {
    if (event.target.checked) {
      guestForm.patchValue(this.groupForm.value);
    }
  }
  filterRooms(roomTypeRooms: any[], i: number): Array<any> {
    this.reservationForm
      .get('reservations')
      ?.value.forEach((element: any, index: number) => {
        if (i != index) {
          roomTypeRooms = roomTypeRooms.filter((r: any) => {
            return r.id != element.roomId;
          });
        }
      });
    return roomTypeRooms;
  }

  openUpdateRate(
    content: TemplateRef<any>,
    reservation: any,
    index: number
  ): void {
    this.updateDateRateObj = { ...reservation };
    this.modalService.open(content).result.then((result) => {
      if (result) {
        const oldObj = this.reservations.at(index).value;

        this.reservations.at(index).patchValue(this.updateDateRateObj);
        this.groupForm.controls.totalCost.patchValue(
          this.roundNumber(
            this.groupForm.controls.totalCost.value -
              oldObj.roomCost +
              this.updateDateRateObj.roomCost
          )
        );
        this.groupForm.controls.totalPrice.patchValue(
          this.roundNumber(
            this.groupForm.controls.totalPrice.value -
              oldObj.roomPrice +
              this.updateDateRateObj.roomPrice
          )
        );
      }
    });
  }

  calculateRate(): void {
    this.updateDateRateObj.roomPrice = this.roundNumber(
      this.updateDateRateObj.roomCost /
        (1 + this.updateDateRateObj.taxPercentage / 100)
    );
    const onlyRoomCharges = this.roundNumber(
      this.updateDateRateObj.roomPrice / this.updateDateRateObj.dateRate.length
    );
    this.updateDateRateObj.dateRate.forEach((r: any) => {
      r.baseRate = onlyRoomCharges;
    });
  }
  goToPayment() {
    sessionStorage.setItem(
      'reservationsArray',
      JSON.stringify(this.reservationForm.get('reservations')?.value)
    );
    sessionStorage.setItem(
      'groupDetails',
      JSON.stringify(this.groupForm.value)
    );
    if (this.isWalkin) {
      this.router.navigate([`/walkin-payment`]);
    } else {
      this.router.navigate([`/reservation-payment`]);
    }

    this.modalService.dismissAll();
  }
  onReserve(content: TemplateRef<any>): void {
    this.modalService.open(content).result.then((result) => {
      if (result) {
        const sendObj = {
          propertyUnitId: this.propertyUnitId,
          reservationsArray: this.reservationForm.get('reservations')?.value,
          groupDetails: {
            ...this.groupForm.value,
            totalTax: this.roundNumber(
              this.groupForm.get('totalCost')?.value -
                this.groupForm.get('totalPrice')?.value
            ),
            totalBalance: -this.groupForm.get('totalCost')?.value,
            totalPayment: 0,
            totalDeposit: 0,
          },
          isWalkin: this.isWalkin,
        };

        this.crudService
          .post(APIConstant.CREATE_RESERVATION, sendObj)
          .then((response) => {
            console.log(response);
            this.alertService.successAlert(
              `${this.isWalkin ? 'Walkin' : 'Reservation'} created successfully`
            );
            this.router.navigate(['/guest-folio/' + response?.data?._id]);
          })
          .catch((error) => {
            this.alertService.errorAlert(
              error?.error?.message || 'An error occurred'
            );
            console.error(error);
          });
      }
    });
  }

  public files: NgxFileDropEntry[] = [];

  dropped(files: NgxFileDropEntry[], guestForm: AbstractControl) {
    this.files = files;

    // Create a single FormData object for valid files
    const formData = new FormData();

    for (const droppedFile of files) {
      // Check if it's a file
      if (droppedFile.fileEntry.isFile) {
        const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;

        fileEntry.file((file: File) => {
          // Validate file type and size
          if (this.validateImageFile(file)) {
            // Append each valid file to the FormData
            formData.append('uploadedImages', file, droppedFile.relativePath);
          } else {
            this.alertService.errorAlert(
              `Invalid file: ${file.name}. Only image files under 3 MB are allowed.`
            );
          }

          // After all files have been processed, send the request
          if (files.indexOf(droppedFile) === files.length - 1) {
            if (formData.has('uploadedImages')) {
              this.uploadPhotos(formData, guestForm);
            } else {
              this.alertService.errorAlert('No valid image files to upload.');
            }
          }
        });
      } else {
        // It was a directory (handle directories if necessary)
        const fileEntry = droppedFile.fileEntry as FileSystemDirectoryEntry;
        console.log(droppedFile.relativePath, fileEntry);
      }
    }
  }

  validateImageFile(file: File): boolean {
    // Allowed image MIME types
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSizeInBytes = 3 * 1024 * 1024; // 3 MB

    // Check file type and size
    return allowedTypes.includes(file.type) && file.size <= maxSizeInBytes;
  }

  uploadPhotos(formData: FormData, guestForm: AbstractControl) {
    this.crudService
      .post(APIConstant.UPLOAD_RESERVATION_IMAGES, formData)
      .then((response) => {
        console.log(response);
        if (response?.data?.images?.length) {
          let currentDocuments = guestForm.get('documents')?.value
            ? guestForm.get('documents')?.value
            : [];

          guestForm.patchValue({
            documents: [...currentDocuments, ...response?.data?.images],
          });
        }
      })
      .catch((error) => {
        this.alertService.errorAlert(
          error?.error?.message || 'An error occurred'
        );
        console.error(error);
      });
  }

  deletePhotos(imageUrl: any, guestForm: AbstractControl) {
    this.crudService
      .post(APIConstant.DELETE_RESERVATION_IMAGES, {
        imageUrl,
      })
      .then((response) => {
        let currentDocuments = guestForm.get('documents')?.value
          ? guestForm.get('documents')?.value
          : [];

        const updatedDocuments = currentDocuments.filter(
          (doc: string) => doc !== imageUrl
        );
        guestForm.patchValue({ documents: updatedDocuments });
      })
      .catch((error) => {
        this.alertService.errorAlert(
          error?.error?.message || 'An error occurred '
        );
        console.error(error);
      });
  }

  fileOver(event: any) {
    console.log(event);
  }

  fileLeave(event: any) {
    console.log(event);
  }

  roundNumber(n: any) {
    return Math.round(n * 100) / 100;
  }
}

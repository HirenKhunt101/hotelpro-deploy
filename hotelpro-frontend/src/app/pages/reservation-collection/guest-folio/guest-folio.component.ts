import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService } from '../../../core/services/alert.service';
import { CrudService } from '../../../core/services/crud.service';
import { APIConstant } from '../../../core/constants/APIConstant';
import {
  CommonModule,
  CurrencyPipe,
  DatePipe,
  JsonPipe,
} from '@angular/common';
import { NgImageSliderModule } from 'ng-image-slider-v17';
import { AuthService } from '../../../core/services/auth.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NgMultiSelectDropDownModule } from 'ng-multiselect-dropdown';
import { NgxFileDropModule } from 'ngx-file-drop';
import {
  NgxFileDropEntry,
  FileSystemFileEntry,
  FileSystemDirectoryEntry,
} from 'ngx-file-drop';
import { StatusPipe } from '../../../core/shared/pipes/status.pipe';
import { BalancePipe } from '../../../core/shared/pipes/balance.pipe';
import { PaymentSharedService } from '../../../core/services/payment-shared.service';

@Component({
  selector: 'app-guest-folio',
  standalone: true,
  imports: [
    JsonPipe,
    DatePipe,
    CurrencyPipe,
    StatusPipe,
    BalancePipe,
    CommonModule,
    NgImageSliderModule,
    FormsModule,
    NgMultiSelectDropDownModule,
    ReactiveFormsModule,
    NgxFileDropModule,
  ],
  templateUrl: './guest-folio.component.html',
  styleUrl: './guest-folio.component.css',
})
export class GuestFolioComponent implements OnInit {
  groupDetails: any;
  propertyUnitId: string | null = '';
  groupId: string | null = '';
  updateStayArrival: string = '';
  updateStayDeparture: string = '';
  roomsData: any[] = [];
  selectedItems: any[] = [];
  roomTypeRooms: Record<string, any[]> = {};
  currentRoomCount = 0;
  currentReservation: any;
  documentsImages: any[] = [];
  paymentForm!: FormGroup;
  refundForm!: FormGroup;
  postChargeForm!: FormGroup;
  guestForm!: FormGroup;
  noshowDetails: any = {};
  cancelDetails: any = {};
  public files: NgxFileDropEntry[] = [];
  Today: string = '';
  FormatToday: string = '';
  confirmMsg: string = '';
  depositObj: any = {};
  cardsArray: any[] = [];
  cardDetails: any = {};
  propertyUnitData: any = {};
  roomTypeImages: any = {};
  imageObject = [
    {
      image:
        'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
      thumbImage:
        'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    },
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private alertService: AlertService,
    private authService: AuthService,
    private crudService: CrudService,
    private modalService: NgbModal,
    private paymentSharedService: PaymentSharedService
  ) {}
  ngOnInit(): void {
    let d = new Date();
    this.FormatToday = this.formatDate(d);
    d.setUTCHours(0, 0, 0, 0);
    this.Today = d.toISOString();
    this.propertyUnitId = this.authService.getUserInfo()?.user?.propertyUnitId;
    this.groupId = this.route.snapshot.paramMap.get('groupId');
    this.loadGroupDetails();
    this.initializeForms();
    this.readPropertyunitData();
  }
  private initializeForms() {
    this.paymentForm = this.fb.group({
      groupId: ['', [Validators.required]],
      paymentType: ['cash', [Validators.required]],
      deposit: [false],
      amount: [10, [Validators.required, Validators.min(0)]],
      remark: [''],
    });
    this.refundForm = this.fb.group({
      groupId: ['', [Validators.required]],
      paymentType: ['cash', [Validators.required]],
      amount: [10, [Validators.required, Validators.min(0)]],
      maxRefund: [0, [Validators.required, Validators.min(0)]],
      remark: [''],
      payId: [''],
    });

    this.postChargeForm = this.fb.group({
      groupId: ['', [Validators.required]],
      reservationId: ['', [Validators.required]],
      reason: ['penalty', [Validators.required]],
      remark: [''],
      charge: [10, [Validators.required, Validators.min(0)]],
    });
  }

  readPropertyunitData() {
    this.crudService
      .post(APIConstant.READ_PROPERTY_UNIT + this.propertyUnitId, {})
      .then((response: any) => {
        this.propertyUnitData = response.data;
        console.log(this.propertyUnitData);
      })
      .catch((error) => {
        this.alertService.errorAlert(error.message);
      });
    this.crudService
      .post(APIConstant.READ_ROOMTYPE_IMAGES, {
        propertyUnitId: this.propertyUnitId,
      })
      .then((response: any) => {
        console.log(response.data);
        this.roomTypeImages = response.data.images;
      })
      .catch((error) => {
        this.alertService.errorAlert(error.message);
      });
  }

  // Load group details
  private loadGroupDetails() {
    if (this.groupId) {
      this.crudService
        .post(APIConstant.GUEST_FOLIO, { groupId: this.groupId })
        .then((response) => {
          this.groupDetails = response.data;
          this.groupDetails?.reservations.forEach((reservation: any) => {
            reservation.nights = this.getDiffBetweenDate(
              reservation?.arrival,
              reservation?.departure
            );
          });
        })
        .catch((error) => {
          this.alertService.errorAlert(
            error?.error?.message ||
              'An error occurred while loading group details'
          );
          console.error(error);
        });
    }
  }

  updateStay(reservationId: any) {
    const updatePayload = {
      reservationId: reservationId,
      propertyUnitId: this.propertyUnitId,
      groupId: this.groupId,
      assigncheckindate: new Date(this.updateStayArrival),
      assigncheckoutdate: new Date(this.updateStayDeparture),
    };

    this.crudService
      .post(APIConstant.STAY_UPDATE, updatePayload)
      .then((response) => {
        this.alertService.successAlert(response.message);
        this.loadGroupDetails();
      })
      .catch((error) => {
        this.alertService.errorAlert(
          error?.error?.message || 'An error occurred while updating stay '
        );
        console.error(error);
      });
  }
  private formatDate(date: Date): string {
    return new DatePipe('en-US').transform(date, 'yyyy-MM-dd') || '';
  }
  setDeparture() {
    if (
      this.isValidDate(this.updateStayArrival) &&
      this.isValidDate(this.updateStayDeparture)
    ) {
      let date1 = new Date(this.updateStayArrival);
      let date2 = new Date(this.updateStayDeparture);
      if (date1 >= date2) {
        let diff = (date2.getTime() - date1.getTime()) / (1000 * 3600 * 24);
        diff = diff < 1 ? 1 : Math.round(diff);
        date1.setDate(date1.getDate() + diff);
        this.updateStayDeparture = this.formatDate(date1);
      }
    }
  }
  nextDate() {
    if (this.isValidDate(this.updateStayArrival)) {
      let x = new Date(this.updateStayArrival);
      x.setDate(x.getDate() + 1);
      return this.formatDate(x);
    }
    return this.formatDate(new Date());
  }
  checkDate() {
    return (
      !this.isValidDate(this.updateStayArrival) ||
      !this.isValidDate(this.updateStayDeparture) ||
      new Date(this.updateStayArrival) >= new Date(this.updateStayDeparture)
    );
  }
  isValidDate(d: any) {
    return !Number.isNaN(new Date(d).getTime());
  }
  // Open modal for stay update
  openUpdateStayModal(reservation: any, content: any): void {
    this.updateStayArrival = this.formatDate(new Date(reservation.arrival));
    this.updateStayDeparture = this.formatDate(new Date(reservation.departure));
    this.openModal(content).then((result) => {
      if (result) {
        this.updateStay(reservation._id);
      }
    });
  }
  openModal(content: any, options?: any): Promise<any> {
    return this.modalService.open(content, options).result;
  }
  openAddRoomModal(content: any): void {
    this.currentRoomCount = 0;

    // Fetch reservation rates for the selected property unit based on arrival and departure dates.
    this.crudService
      .post(APIConstant.READ_RESERVATION_RATE + this.propertyUnitId, {
        arrival: new Date(this.groupDetails.arrival),
        departure: new Date(this.groupDetails.departure),
      })
      .then((response: any) => {
        console.log(response.data);
        this.processRoomsData(response.data); // Process the room data
        this.openModal(content, {
          size: 'lg',
          centered: true,
          backdrop: 'static',
          keyboard: false,
        }).then((result) => {
          if (result) {
            const reservationDetails = this.prepareReservationDetails(); // Prepare room reservation details
            this.crudService
              .post(APIConstant.ADD_ROOM, {
                groupData: {
                  _id: this.groupDetails._id,
                  arrival: this.groupDetails.arrival,
                  departure: this.groupDetails.departure,
                  customerDetails: this.groupDetails.customerDetails,
                },
                propertyUnitId: this.propertyUnitId,
                reservation: reservationDetails[0],
              })
              .then((response) => {
                console.log(response);
                this.alertService.successAlert(response.message); // Success alert
                this.loadGroupDetails(); // Refresh the component (Consider optimizing if performance is slow)
              })
              .catch((error) => {
                this.alertService.errorAlert(
                  error?.error?.message ||
                    'An error occurred while processing the room addition'
                );
                console.error(error);
              });
          }
        });
      })
      .catch((error: any) => {
        this.alertService.errorAlert(
          error?.error?.message || 'Failed to fetch room rates'
        );
      });
  }

  // Process room data and add dropdown settings
  private processRoomsData(data: any[]): void {
    this.roomsData = data.map((room) => {
      room.dropdownSettings = {
        singleSelection: false,
        limitSelection: 0, // Start with no limit
        idField: 'id',
        textField: 'roomName',
        unSelectAllText: 'UnSelect All',
        enableCheckAll: false,
        itemsShowLimit: 3,
        allowSearchFilter: true,
      };
      room.extraAdults = 0;
      room.extraChilds = 0;
      [room.roomPrice, room.roomCost] = this.calculateRoomCost(room); // Calculate room price and cost
      if (!this.roomTypeRooms[room.roomTypeId]) {
        this.roomTypeRooms[room.roomTypeId] = room.rooms;
      }
      this.selectedItems.push([]); // Prepare an empty selection for each room
      return room;
    });
  }

  // Calculate room cost based on rates and extra occupants
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

  // Add room count and update the selection settings
  addRoomCount(index: number): void {
    this.currentRoomCount += 1;
    this.updateRoomSelection(index, 1); // Increase room selection
  }

  // Remove room count and update the selection settings
  removeRoomCount(index: number): void {
    this.currentRoomCount -= 1;
    this.updateRoomSelection(index, -1); // Decrease room selection
  }

  // Update room selection and manage limits
  private updateRoomSelection(index: number, increment: number): void {
    const room = this.roomsData[index];
    room.dropdownSettings = Object.assign({}, room.dropdownSettings, {
      limitSelection: room.dropdownSettings.limitSelection + increment, // Adjust selection limit
    });

    // Adjust total rooms for similar room types
    this.roomsData.forEach((element: any, i: number) => {
      if (i !== index && element.roomTypeId === room.roomTypeId) {
        element.totalRoom -= increment;
      }
    });

    // Adjust selected items when rooms are removed and limit is exceeded
    if (
      increment < 0 &&
      this.selectedItems[index].length > room.dropdownSettings.limitSelection
    ) {
      let x = [...this.selectedItems[index]];
      x.splice(x.length - 1, 1);
      this.selectedItems[index] = Object.assign(x);
    }
  }

  // Prepare reservation details to be submitted to the server
  private prepareReservationDetails(): any[] {
    return this.roomsData.reduce((acc: any[], room: any, index: number) => {
      if (room.dropdownSettings.limitSelection > 0) {
        const roomDetails = this.createRoomDetails(room, index);
        return acc.concat(roomDetails);
      }
      return acc;
    }, []);
  }

  // Create room details based on user selection and unassigned rooms
  private createRoomDetails(room: any, index: number): any[] {
    const selectedRooms = this.selectedItems[index].map(
      (selectedRoom: any) => ({
        ...room,
        room,
        roomId: selectedRoom.id,
      })
    );

    // Handle unassigned rooms
    const unassignedRooms = Array(
      room.dropdownSettings.limitSelection - selectedRooms.length
    ).fill({
      ...room,
      roomId: 'assign',
      room: {
        id: 'assign',
        roomStatus: 'vacant',
        roomCondition: 'clean',
        roomNumber: 'default',
        roomName: 'default',
      },
    });

    return selectedRooms.concat(unassignedRooms);
  }

  // Filter available rooms for dropdown (to avoid already selected ones)
  dropDownData(rooms: any[], index: number): any[] {
    return rooms.filter(
      (room: any) =>
        !this.selectedItems.some(
          (selectedRooms: any[], i: number) =>
            i !== index &&
            selectedRooms.some(
              (selectedRoom: any) => selectedRoom.id === room.id
            )
        )
    );
  }

  // Open modal to change room and fetch room rates
  openChangeRoomModal(reservation: any, content: any): void {
    this.currentReservation = reservation;

    // Fetch reservation rates for the selected reservation
    this.crudService
      .post(APIConstant.READ_RESERVATION_RATE + this.propertyUnitId, {
        arrival: new Date(reservation.arrival),
        departure: new Date(reservation.departure),
      })
      .then((response: any) => {
        console.log(response.data);
        this.processRoomsData(response.data); // Reuse the processRoomsData function
        this.openModal(content, {
          size: 'lg',
          centered: true,
          backdrop: 'static',
          keyboard: false,
        }); // Open the modal
      })
      .catch((error: any) => {
        this.alertService.errorAlert(
          error?.error?.message || 'Failed to fetch room rates'
        );
        console.error(error);
      });
  }

  // Submit the room change request
  callChangeRoom(newReservation: any, room: any, content: any): void {
    newReservation.room = room;
    newReservation.roomId = room.id;
    if (newReservation.roomTypeId === this.currentReservation.roomTypeId) {
      this.changeRoom(newReservation);
    } else {
      this.openModal(content, {
        centered: true,
        backdrop: 'static',
        keyboard: false,
      }).then((result) => {
        if (result) {
          this.changeRoom(newReservation, true);
        } else {
          this.changeRoom(newReservation, false);
        }
      });
    }
  }
  changeRoom(newReservation: any, isSameRate = true) {
    this.crudService
      .post(APIConstant.CHANGE_ROOM, {
        groupData: {
          groupId: this.groupDetails._id,
          arrival: this.groupDetails.arrival,
          departure: this.groupDetails.departure,
        },
        propertyUnitId: this.propertyUnitId,
        reservation: newReservation,
        oldReservation: this.currentReservation,
        isSameRate,
      })
      .then((response: any) => {
        console.log(response);
        this.modalService.dismissAll(); // Close the modal
        this.alertService.successAlert(response.message); // Success alert
        this.loadGroupDetails(); // Refresh the component
      })
      .catch((error: any) => {
        this.alertService.errorAlert(
          error?.error?.message || 'An error occurred while changing the room'
        );
        console.error(error);
      });
  }
  // Toggle room charges display
  showRoomCharges(reservation: any): void {
    reservation.showCharges = !reservation.showCharges;
  }

  // Open modal to add charges to a reservation
  openAddChargeModal(content: any, reservation: any): void {
    // Initialize the charge form with default values
    this.postChargeForm.patchValue({
      groupId: reservation.groupId,
      reservationId: reservation._id,
      charge: 10, // Default charge value, can be changed
      description: '',
    });

    this.openModal(content, {
      size: 'lg',
      backdrop: 'static',
      keyboard: false,
    }).then((result) => {
      if (result) {
        this.submitReservationCharge(); // Submit charge when confirmed
      }
    });
  }

  // Submit reservation charge to the server
  private submitReservationCharge(): void {
    this.crudService
      .post(APIConstant.ADD_RESERVATION_CHARGE, {
        propertyUnitId: this.propertyUnitId,
        groupId: this.groupId,
        charges: this.postChargeForm.value,
      })
      .then((response: any) => {
        console.log(response);
        this.alertService.successAlert(response.message); // Success alert
        this.loadGroupDetails(); // Refresh the component
      })
      .catch((error: any) => {
        this.alertService.errorAlert(
          error?.error?.message || 'An error occurred while adding charges'
        );
        console.error(error);
      });
  }

  createPaymentOrder() {
    this.crudService
      .post(APIConstant.CREATE_PAYMENT_ORDER, {
        payment: this.paymentForm.value,
        userId: this.groupDetails.customerId,
        propertyUnitId: this.propertyUnitId,
        groupId: this.groupId,
      })
      .then((response: any) => {
        console.log(response);
        this.paymentSharedService.updatePaymentData({
          paymentOrderId: response.data.id,
          payment: this.paymentForm.value,
          userId: this.groupDetails.customerId,
          propertyUnitId: this.propertyUnitId,
          groupId: this.groupId,
        });
        this.modalService.dismissAll();
        this.router.navigateByUrl('razorpay-demo');
      })
      .catch((error: any) => {
        this.alertService.errorAlert(
          error?.error?.message || 'An error occurred while adding Payment'
        );
        console.error(error);
      });
  }
  openPaymentModal(content: any): void {
    const amount =
      this.groupDetails?.totalBalance < 0
        ? -this.groupDetails.totalBalance
        : 10;

    this.paymentForm.patchValue({
      groupId: this.groupId,
      paymentType: 'cash',
      amount: amount,
      deposit: false,
      remark: '',
    });
    this.openModal(content, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
      keyboard: false,
    }).then((result) => {
      if (result) {
        this.crudService
          .post(APIConstant.POST_RESERVATION_PAYMENT, {
            payment: this.paymentForm.value,
            userId: this.groupDetails.customerId,
            propertyUnitId: this.propertyUnitId,
            groupId: this.groupId,
          })
          .then((response) => {
            console.log(response);
            this.alertService.successAlert(response.message);
            this.loadGroupDetails();
          })
          .catch((error) => {
            this.alertService.errorAlert(
              error?.error?.message || 'An error occurred '
            );
            console.error(error);
          });
      }
    });
  }

  openRefundModal(content: any): void {
    const totalRefundable = this.groupDetails?.paymentDetails.reduce(
      (acc: number, curr: any) => {
        if (
          !curr.isDeposit &&
          !curr.isRefund &&
          curr?.transactionDetails?.transactionRate > 0
        ) {
          acc += curr?.transactionDetails?.transactionRate;
        }
        return acc;
      },
      0
    );
    this.groupDetails?.paymentDetails.forEach((payment: any) => {
      if (
        payment.billingCardDetails &&
        !payment.isRefund &&
        !payment.isDeposit
      ) {
        this.cardsArray.push(payment.billingCardDetails);
      }
    });

    this.cardDetails = this.cardsArray?.[0];
    if (totalRefundable > 0 || this.cardDetails) {
      this.refundForm.patchValue({
        groupId: this.groupId,
        paymentType: 'cash',
        amount: 0,
        maxRefund: totalRefundable,
        remark: '',
        payId: this.cardDetails?.extraDetails?.id,
      });
      this.openModal(content, {
        size: 'lg',
        centered: true,
        backdrop: 'static',
        keyboard: false,
      }).then((result) => {
        if (result) {
          this.crudService
            .post(APIConstant.REFUND_PAYMENT, {
              payment: this.refundForm.value,
              userId: this.groupDetails.customerId,
              propertyUnitId: this.propertyUnitId,
              groupId: this.groupId,
            })
            .then((response) => {
              console.log(response);
              this.alertService.successAlert(response.message);
              this.loadGroupDetails();
            })
            .catch((error) => {
              this.alertService.errorAlert(
                error?.error?.message || 'An error occurred '
              );
              console.error(error);
            });
        }
      });
    } else {
      this.alertService.errorAlert('All Refund Done , Nothing is remaining!');
    }
  }
  // Handle card change event in the refund process
  onCardChange(event: any): void {
    this.cardDetails = this.cardsArray.find(
      (card: any) => card.paymentId === event.target.value
    );
  }

  readNoshowCharge(reservation: any, content: any): void {
    this.crudService
      .post(APIConstant.READ_NOSHOW_CHARGE, {
        propertyUnitId: this.propertyUnitId,
        reservationId: reservation._id,
      })
      .then((response) => {
        console.log(response);
        this.noshowDetails = response.data;
        this.openModal(content).then((result) => {
          if (result) {
            this.crudService
              .post(APIConstant.NOSHOW_RESERVATION, {
                groupId: this.groupId,
                noshowDetails: this.noshowDetails,
                reservation: reservation,
                propertyUnitId: this.propertyUnitId,
              })
              .then((response) => {
                console.log(response);
                this.alertService.successAlert(response.message);
                this.loadGroupDetails();
              })
              .catch((error) => {
                this.alertService.errorAlert(
                  error?.error?.message ||
                    'An error occurred while processing no-show'
                );
                console.error(error);
              });
          }
        });
      })
      .catch((error) => {
        this.alertService.errorAlert(
          error?.error?.message || 'Failed to retrieve no-show charges'
        );
        console.error(error);
      });
  }

  readCancelCharge(reservation: any, content: any): void {
    this.crudService
      .post(APIConstant.READ_CANCEL_RESERVATION_CHARGE, {
        propertyUnitId: this.propertyUnitId,
        reservationId: reservation._id,
      })
      .then((response) => {
        console.log(response);
        this.cancelDetails = response.data;
        this.openModal(content, {
          size: 'lg',
          centered: true,
          backdrop: 'static',
          keyboard: false,
        }).then((result) => {
          if (result) {
            this.crudService
              .post(APIConstant.CANCEL_RESERVATION, {
                groupId: this.groupId,
                cancelDetails: this.cancelDetails,
                reservation: reservation,
                propertyUnitId: this.propertyUnitId,
              })
              .then((response) => {
                console.log(response);
                this.alertService.successAlert(response.message);
                this.loadGroupDetails();
              })
              .catch((error) => {
                this.alertService.errorAlert(
                  error?.error?.message ||
                    'An error occurred while canceling the reservation'
                );
                console.error(error);
              });
          }
        });
      })
      .catch((error) => {
        this.alertService.errorAlert(
          error?.error?.message || 'Failed to retrieve cancellation charges'
        );
        console.error(error);
      });
  }

  openGuestForm(
    content: any,
    reservationId: any,
    isDeleteAble = false,
    guest?: any,
    address?: any
  ): void {
    this.guestForm = this.fb.group({
      _id: [guest?._id || ''],
      firstName: [
        guest?.firstName || '',
        [Validators.required, Validators.minLength(2)],
      ],
      lastName: [
        guest?.lastName || '',
        [Validators.required, Validators.minLength(2)],
      ],
      email: [guest?.email || '', [Validators.required, Validators.email]],
      phone: [guest?.phone || ''],
      addressLine1: [address?.addressLine1 || ''],
      addressLine2: [address?.addressLine2 || ''],
      country: [address?.country || ''],
      city: [address?.city || ''],
      state: [address?.state || '', [Validators.pattern(/^[A-Za-z\s]+$/)]],
      zipCode: [address?.zipCode || ''],
      documents: [guest?.documents || []],
      isCustomer: [isDeleteAble],
    });
    this.openModal(content, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
      keyboard: false,
    }).then((result) => {
      if (result === 'delete') {
        this.deleteGuest(reservationId);
      } else if (result) {
        this.saveGuest(reservationId);
      }
    });
  }

  private deleteGuest(reservationId: any): void {
    this.crudService
      .post(APIConstant.DELETE_SHARED_GUEST, {
        reservationId: reservationId,
        groupId: this.groupId,
        userDetails: this.guestForm.value,
        propertyUnitId: this.propertyUnitId,
      })
      .then((response) => {
        console.log(response);
        this.alertService.successAlert(response.message);
        this.loadGroupDetails();
      })
      .catch((error) => {
        this.alertService.errorAlert(
          error?.error?.message || 'An error occurred while deleting the guest'
        );
        console.error(error);
      });
  }

  private saveGuest(reservationId: any): void {
    const apiEndpoint = this.guestForm.get('_id')?.value
      ? APIConstant.UPDATE_GUEST_RESERVATION
      : APIConstant.ADD_SHARED_GUEST_RESERVATION;

    this.crudService
      .post(apiEndpoint, {
        reservationId: reservationId,
        groupId: this.groupId,
        userDetails: this.guestForm.value,
        propertyUnitId: this.propertyUnitId,
      })
      .then((response) => {
        console.log(response);
        this.alertService.successAlert(response.message);
        this.loadGroupDetails();
      })
      .catch((error) => {
        this.alertService.errorAlert(
          error?.error?.message || 'An error occurred '
        );
        console.error(error);
      });
  }

  dropped(files: NgxFileDropEntry[], guestForm: AbstractControl): void {
    const formData = new FormData();

    files.forEach((fileEntry, index) => {
      if (fileEntry.fileEntry.isFile) {
        const entry = fileEntry.fileEntry as FileSystemFileEntry;
        entry.file((file: File) => {
          formData.append('uploadedImages', file, fileEntry.relativePath);

          // Once all files are processed, send the upload request
          if (index === files.length - 1) {
            formData.append('userId', guestForm.get('_id')?.value);
            this.uploadPhotos(formData, guestForm);
          }
        });
      } else {
        // Handle directories if needed
        const dirEntry = fileEntry.fileEntry as FileSystemDirectoryEntry;
        console.log(fileEntry.relativePath, dirEntry);
      }
    });
  }

  uploadPhotos(formData: FormData, guestForm: AbstractControl) {
    this.crudService
      .post(APIConstant.UPLOAD_RESERVATION_IMAGES, formData)
      .then((response) => {
        const uploadedImages = response?.data?.images || [];
        if (uploadedImages.length) {
          const currentDocuments = guestForm.get('documents')?.value || [];
          guestForm.patchValue({
            documents: [...currentDocuments, ...uploadedImages],
          });
        }
      })
      .catch((error) => {
        this.alertService.errorAlert(
          error?.error?.message || 'An error occurred '
        );
        console.error(error);
      });
  }

  deletePhotos(imageUrl: any) {
    this.crudService
      .post(APIConstant.DELETE_RESERVATION_IMAGES, {
        imageUrl,
        userId: this.guestForm?.get('_id')?.value,
      })
      .then((response) => {
        const currentDocuments = this.guestForm.get('documents')?.value;
        const updatedDocuments = currentDocuments.filter(
          (doc: string) => doc !== imageUrl
        );
        this.guestForm.patchValue({ documents: updatedDocuments });
      })
      .catch((error) => {
        this.alertService.errorAlert(
          error?.error?.message || 'An error occurred '
        );
        console.error(error);
      });
  }

  openCheckInModal(content: any, reservation: any): void {
    if (reservation.tentative) {
      this.alertService.errorAlert('Please Assign Room');
    } else {
      this.confirmMsg = 'Are you sure want to check in ?';
      this.openModal(content).then((result) => {
        if (result) {
          this.crudService
            .post(APIConstant.CHECKIN_RESERVATION, {
              propertyUnitId: this.propertyUnitId,
              groupId: this.groupId,
              reservationId: reservation._id,
            })
            .then((response) => {
              console.log(response);
              this.alertService.successAlert(response.message);
              this.loadGroupDetails();
            })
            .catch((error) => {
              this.alertService.errorAlert(
                error?.error?.message ||
                  'An error occurred while adding charges'
              );
              console.error(error);
            });
        }
      });
    }
  }
  openCheckOutModal(content: any, reservation: any): void {
    this.confirmMsg =
      this.groupDetails.totalBalance < 0
        ? `Are you sure want to check out without clearing current outstanding ${-this
            .groupDetails.totalBalance}`
        : 'Are you sure want to check out ?';
    this.openModal(content).then((result) => {
      if (result) {
        this.crudService
          .post(APIConstant.CHECKOUT_RESERVATION, {
            propertyUnitId: this.propertyUnitId,
            groupId: this.groupId,
            reservation: reservation,
          })
          .then((response) => {
            console.log(response);
            this.alertService.successAlert(response.message);
            this.loadGroupDetails();
          })
          .catch((error) => {
            this.alertService.errorAlert(
              error?.error?.message || 'An error occurred while adding charges'
            );
            console.error(error);
          });
      }
    });
  }

  openDepositModal(content: any, deposit: any): void {
    deposit.transactionDetails.refundAmount =
      deposit.transactionDetails.transactionRate;
    deposit.transactionDetails.captureAmount =
      deposit.transactionDetails.transactionRate;
    this.depositObj = deposit;
    this.openModal(content).then((result) => {
      if (result) {
        this.crudService
          .post(APIConstant.DEPOSIT_RELEASE, {
            propertyUnitId: this.propertyUnitId,
            groupId: this.groupId,
            deposit: this.depositObj,
          })
          .then((response) => {
            console.log(response);
            this.alertService.successAlert(response.message);
            this.loadGroupDetails();
          })
          .catch((error) => {
            this.alertService.errorAlert(
              error?.error?.message || 'An error occurred while adding charges'
            );
            console.error(error);
          });
      }
    });
  }
  unassignRoom() {
    this.crudService
      .post(APIConstant.UNASSIGN_ROOM, {
        propertyUnitId: this.propertyUnitId,
        groupId: this.groupId,
        reservation: this.currentReservation,
      })
      .then((response) => {
        console.log(response);
        this.alertService.successAlert(response.message);
        this.modalService.dismissAll();
        this.loadGroupDetails();
      })
      .catch((error) => {
        this.alertService.errorAlert(
          error?.error?.message || 'An error occurred '
        );
        console.error(error);
      });
  }

  getDiffBetweenDate(date1: any, date2: any) {
    // Define two dates
    date1 = new Date(date1);
    date2 = new Date(date2);

    // Calculate the difference in milliseconds
    const diffInMs = Math.abs(date2 - date1);

    // Convert milliseconds to days
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
    return diffInDays;
    console.log(`Difference in days: ${diffInDays}`);
  }

  printInvoice(): void {
    let printContents, popupWin;
    printContents = document.getElementById('invoice-content')?.innerHTML;
    popupWin = window.open('', '_blank', 'top=0,left=0,height=100%,width=auto');
    popupWin?.document.open();
    popupWin?.document.write(`
      <html>
        <head>
          <title>Reservation Invoice</title>
          <style>
          //........Customized style.......
          </style>
        </head>
    <body onload="window.print()">${printContents}</body>
      </html>`);
    popupWin?.document.close();
  }
}

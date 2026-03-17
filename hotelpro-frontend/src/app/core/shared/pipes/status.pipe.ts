import { Pipe, PipeTransform } from '@angular/core';
import { ReservationStatus } from '../../constants/ReservationStatusConstant';
@Pipe({
  name: 'status',
  standalone: true,
})
export class StatusPipe implements PipeTransform {
  transform(value: unknown, ...args: unknown[]): unknown {
    return ReservationStatus[value as keyof typeof ReservationStatus] ?? value;
  }
}

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'balance',
  standalone: true,
})
export class BalancePipe implements PipeTransform {
  transform(value: any, ...args: unknown[]): unknown {
    if (value == undefined || value == null) {
      return '--';
    } else {
      value = Number(value.toFixed(2));

      if (value < 0) {
        return (-value).toFixed(2);
      } else if (value > 0) {
        return '(' + value.toFixed(2) + ')';
      } else {
        return value.toFixed(2);
      }
    }
  }
}

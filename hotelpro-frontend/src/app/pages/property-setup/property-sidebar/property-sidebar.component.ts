import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterModule } from '@angular/router';

@Component({
  selector: 'app-property-sidebar',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './property-sidebar.component.html',
  styleUrl: './property-sidebar.component.css',
})
export class PropertySidebarComponent implements OnInit {
  propertyUnitId: string | null = 'ADD';
  constructor(private activeRoute: ActivatedRoute) {}

  ngOnInit(): void {
    this.propertyUnitId =
      this.activeRoute.snapshot.paramMap.get('propertyUnitId');
  }
}

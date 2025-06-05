import { Component, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { SelectModule } from "primeng/select";
import { IftaLabelModule } from "primeng/iftalabel";

interface City {
  name: string;
  code: string;
}

@Component({
  selector: "select-iftalabel-demo",
  template: `<div class="card flex justify-center">
    <p-iftalabel class="w-full md:w-56">
      <p-select
        [(ngModel)]="selectedCity"
        inputId="dd-city"
        [options]="cities"
        optionLabel="name"
        styleClass="w-full"
      />
      <label for="dd-city">City</label>
    </p-iftalabel>
  </div>`,
  standalone: true,
  imports: [FormsModule, SelectModule, IftaLabelModule],
})
export class SelectIftaLabelDemo implements OnInit {
  cities: City[] | undefined;

  selectedCity: City | undefined;

  ngOnInit() {
    this.cities = [
      { name: "New York", code: "NY" },
      { name: "Rome", code: "RM" },
      { name: "London", code: "LDN" },
      { name: "Istanbul", code: "IST" },
      { name: "Paris", code: "PRS" },
    ];
  }
}

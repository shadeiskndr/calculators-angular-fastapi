import { Component } from "@angular/core";
import { InputNumberModule } from "primeng/inputnumber";
import { FormsModule } from "@angular/forms";
import { IftaLabelModule } from "primeng/iftalabel";

@Component({
  selector: "input-number-ifta-label-demo",
  template: `
    <div class="card flex justify-center">
      <p-iftalabel>
        <p-inputnumber
          [(ngModel)]="value"
          inputId="price_input"
          mode="currency"
          currency="USD"
          locale="en-US"
        />
        <label for="price_input">Price</label>
      </p-iftalabel>
    </div>
  `,
  standalone: true,
  imports: [FormsModule, InputNumberModule, IftaLabelModule],
})
export class InputNumberIftaLabelDemo {
  value: number | undefined;
}

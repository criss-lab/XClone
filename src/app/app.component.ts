import { Component } from '@angular/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
})
export class AppComponent {

  constructor() {
    this.initializeApp();
  }

  async initializeApp() {
    await CapacitorUpdater.notifyAppReady();
  }
}

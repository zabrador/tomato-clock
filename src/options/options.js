import browser from "webextension-polyfill";
import Modal from "bootstrap/js/dist/modal";
import "bootstrap/dist/css/bootstrap.min.css";
import "./options.css";

import Settings from "../utils/settings";
import {
  AVAILABLE_NOTIFICATION_SOUNDS,
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  STORAGE_KEY,
} from "../utils/constants";

export default class Options {
  constructor() {
    this.settings = new Settings();

    this.domMinutesInTomato = document.getElementById("minutes-in-tomato");
    this.domMinutesInShortBreak = document.getElementById(
      "minutes-in-short-break",
    );
    this.domMinutesInLongBreak = document.getElementById(
      "minutes-in-long-break",
    );
    this.domNotificationSoundCheckbox = document.getElementById(
      "notification-sound-checkbox",
    );
    this.domNotificationSoundSelect = document.getElementById(
      "notification-sound-select",
    );
    this.domToolbarBadgeCheckbox = document.getElementById(
      "toolbar-badge-checkbox",
    );
    this.domCustomSoundUploadContainer = document.getElementById(
      "custom-sound-upload-container",
    );
    this.domCustomSoundUpload = document.getElementById("custom-sound-upload");
    this.domCustomSoundFilename = document.getElementById(
      "custom-sound-filename",
    );

    this.setOptionsOnPage();
    this.setEventListeners();
    this.populateSoundSelect();
  }

  populateSoundSelect() {
    AVAILABLE_NOTIFICATION_SOUNDS.forEach((sound) => {
      const option = document.createElement("option");
      option.value = sound.id;
      option.textContent = sound.name;
      this.domNotificationSoundSelect.appendChild(option);
    });
  }

  setOptionsOnPage() {
    this.settings.getSettings().then((settings) => {
      const {
        minutesInTomato,
        minutesInShortBreak,
        minutesInLongBreak,
        isNotificationSoundEnabled,
        selectedNotificationSound,
        isToolbarBadgeEnabled,
      } = settings;

      this.domMinutesInTomato.value = minutesInTomato;
      this.domMinutesInShortBreak.value = minutesInShortBreak;
      this.domMinutesInLongBreak.value = minutesInLongBreak;
      this.domNotificationSoundCheckbox.checked = isNotificationSoundEnabled;
      this.domNotificationSoundSelect.value =
        selectedNotificationSound ||
        DEFAULT_SETTINGS[SETTINGS_KEY.SELECTED_NOTIFICATION_SOUND];
      this.domNotificationSoundSelect.disabled = !isNotificationSoundEnabled;

      this.domCustomSoundUploadContainer.style.display =
        selectedNotificationSound === "custom" ? "block" : "none";

      if (selectedNotificationSound === "custom") {
        browser.storage.local
          .get(STORAGE_KEY.CUSTOM_SOUND_FILENAME)
          .then((result) => {
            const filename = result[STORAGE_KEY.CUSTOM_SOUND_FILENAME];
            if (filename) {
              this.domCustomSoundFilename.textContent = `Current sound: ${filename}`;
            }
          });
      }

      this.domToolbarBadgeCheckbox.checked = isToolbarBadgeEnabled;
    });
  }

  saveOptions() {
    const minutesInTomato = parseInt(this.domMinutesInTomato.value);
    const minutesInShortBreak = parseInt(this.domMinutesInShortBreak.value);
    const minutesInLongBreak = parseInt(this.domMinutesInLongBreak.value);
    const isNotificationSoundEnabled =
      this.domNotificationSoundCheckbox.checked;
    const selectedNotificationSound = this.domNotificationSoundSelect.value;
    const isToolbarBadgeEnabled = this.domToolbarBadgeCheckbox.checked;

    this.settings.saveSettings({
      [SETTINGS_KEY.MINUTES_IN_TOMATO]: minutesInTomato,
      [SETTINGS_KEY.MINUTES_IN_SHORT_BREAK]: minutesInShortBreak,
      [SETTINGS_KEY.MINUTES_IN_LONG_BREAK]: minutesInLongBreak,
      [SETTINGS_KEY.IS_NOTIFICATION_SOUND_ENABLED]: isNotificationSoundEnabled,
      [SETTINGS_KEY.SELECTED_NOTIFICATION_SOUND]: selectedNotificationSound,
      [SETTINGS_KEY.IS_TOOLBAR_BADGE_ENABLED]: isToolbarBadgeEnabled,
    });
  }

  setEventListeners() {
    // Auto-save on change for all inputs
    const inputs = [
      this.domMinutesInTomato,
      this.domMinutesInShortBreak,
      this.domMinutesInLongBreak,
      this.domNotificationSoundCheckbox,
      this.domNotificationSoundSelect,
      this.domToolbarBadgeCheckbox,
    ];

    inputs.forEach((input) => {
      input.addEventListener("change", () => {
        // Special handling for the checkbox enabling/disabling the select
        if (input === this.domNotificationSoundCheckbox) {
          this.domNotificationSoundSelect.disabled = !input.checked;
        }

        if (input === this.domNotificationSoundSelect) {
          const soundFile = this.domNotificationSoundSelect.value;
          if (soundFile === "custom") {
            this.domCustomSoundUploadContainer.style.display = "block";
            browser.storage.local
              .get([STORAGE_KEY.CUSTOM_SOUND, STORAGE_KEY.CUSTOM_SOUND_FILENAME])
              .then((result) => {
                const sound = result[STORAGE_KEY.CUSTOM_SOUND];
                const filename = result[STORAGE_KEY.CUSTOM_SOUND_FILENAME];
                if (sound) {
                  new Audio(sound).play();
                }
                if (filename) {
                  this.domCustomSoundFilename.textContent = `Current sound: ${filename}`;
                } else {
                  this.domCustomSoundFilename.textContent = "";
                }
              });
          } else {
            this.domCustomSoundUploadContainer.style.display = "none";
            if (soundFile) {
              const audioPath = `/assets/sounds/${soundFile}`;
              new Audio(audioPath).play();
            }
          }
        }

        this.saveOptions();
      });
    });

    this.domCustomSoundUpload.addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target.result;
          browser.storage.local
            .set({
              [STORAGE_KEY.CUSTOM_SOUND]: result,
              [STORAGE_KEY.CUSTOM_SOUND_FILENAME]: file.name,
            })
            .then(() => {
              new Audio(result).play();
              this.domCustomSoundFilename.textContent = `Current sound: ${file.name}`;
            });
        };
        reader.readAsDataURL(file);
      }
    });

    const modalElement = document.getElementById("reset-confirmation-modal");
    const resetModal = new Modal(modalElement);

    document.getElementById("reset-options").addEventListener("click", () => {
      resetModal.show();
    });

    document.getElementById("confirm-reset").addEventListener("click", () => {
      this.settings.resetSettings().then(() => {
        this.setOptionsOnPage();
        resetModal.hide();
      });
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new Options();
});

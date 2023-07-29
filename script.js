'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const container = document.getElementById('earth_div');
let earth, mapEvent;

// Workout Parent class
class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  // Creates description based on given Workout Data for use in Sidebar + Popup
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase() + this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  _click() {
    this.clicks++;
  }
}

// Child classes of Workout class
// Running class
class Running extends Workout {
  type = 'running';
  workoutName = 'Running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    this.pace = this.duration / this.distance; // min/km
  }
}

// Cycling class
class Cycling extends Workout {
  type = 'cycling';
  workoutName = 'Cycling';
  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60); // km/h
  }
}

////////////////////////////
// APPLICATION ARCHITECTURE
class App {
  #earth;
  #mapEvent;
  #workouts = [];
  marker;

  constructor() {
    this._getPosition();
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  // Browser attains user location
  _getPosition() {
    // Gets position from Browser info, if not available returns ERROR
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert(`Could not get your position`);
        }
      );
  }

  // Map is loaded and shows current user position
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    console.log(coords);
    let options = { sky: true, atmosphere: true };
    this.#earth = new WE.map('earth_div', options);

    WE.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.#earth);

    // Center the camera on the user's location
    this.#earth.setView(coords, 8); // Use an appropriate zoom level (e.g., 10)

    // Handling clicks on map, executes showForm function on click
    this.#earth.on('click', this._showForm.bind(this));
  }

  // Logic to show input fields for adding workout information
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  // Hiding form after submission
  _hideForm() {
    // Clearing input fields after submission
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    // Ensuring cursor focus always returns to Distance Input

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
    inputDistance.focus();
  }

  // Toggling Elevation/Cadence input field corresponding to user desired input
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  // Creating new workout from user input + Closing form
  _newWorkout(e) {
    const validInput = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    e.preventDefault();

    // Get Data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // Running activity? Create running workout
    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        !validInput(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Input has to be a positive number');
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // Cycling  activiity? Create cycling activity
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInput(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Input has to be a positive number');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Render workout as marker
    this._renderWorkoutMarker(workout);

    // Hide form + Clear input fields
    this._hideForm();
  }

  // Placing marker on map after creation of workout
  _renderWorkoutMarker(workout) {
    // Adding marker
    let marker = WE.marker(workout.coords).addTo(this.#earth);
    marker.bindPopup(`${workout.description}`, 150).openPopup();
  }

  // Placing workout from _newWorkout() into sidebar
  _renderWorkout(workout) {
    // Common data
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;
    // Type dependent data
    html += `
      <div class="workout__details">
         <span class="workout__icon">⚡️</span>
         <span class="workout__value">${
           workout.type === 'running'
             ? workout.pace.toFixed(1)
             : workout.speed.toFixed(1)
         }</span>
         <span class="workout__unit">${
           workout.type === 'running' ? 'min/km' : 'KM/H'
         }</span>
       </div>
       <div class="workout__details">
         <span class="workout__icon">${
           workout.type === 'running' ? '🦶🏼' : '⛰'
         }</span>
         <span class="workout__value">${
           workout.type === 'running' ? workout.cadence : workout.elevation
         }</span>
         <span class="workout__unit">${
           workout.type === 'running' ? 'spm' : 'm'
         }</span>
       </div>
      </li>`;
    // Ensuring Workouts can only be added to sidebar if input field is visible
    if (!form.classList.contains('hidden'))
      form.insertAdjacentHTML('afterend', html);
  }

  // Map pans to marker location of selected workout in sidebar
  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    // Pan to the target position
    this.#earth.panTo(workout.coords);

    // Set the desired zoom level after the pan is complete
    setTimeout(() => {
      this.#earth.setZoom(15, 2000);
    }, 3500);
    // targetZoomLevel: 30 (smaller zoom), duration: 2000ms (2 seconds), 3500);

    // Using the public interface to count clicks
    workout._click();
    console.log(workout);
  }
}

const app = new App();

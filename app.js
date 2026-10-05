const cityInput = document.getElementById("city-input");
const searchButton = document.getElementById("search-button");
const suggestionsList = document.getElementById("suggestions");
const status = document.getElementById("status");
const currentSection = document.getElementById("current");
const forecastSection = document.getElementById("forecast");
const forecastGrid = document.getElementById("forecast-grid");

let suggestions = [];
let activeSuggestion = -1;
let searchTimeout;

function showMessage(text, isError = false) {
  status.textContent = text;
  status.classList.remove("hidden");
  status.classList.toggle("error", isError);
}

function hideMessages() {
  status.classList.add("hidden");
  status.classList.remove("error");
}

function getWeatherDescription(code) {
  const descriptions = {
    0: "Sereno",
    1: "Prevalentemente sereno",
    2: "Parzialmente nuvoloso",
    3: "Nuvoloso",
    45: "Nebbia",
    48: "Nebbia con brina",
    51: "Pioviggine leggera",
    53: "Pioviggine moderata",
    55: "Pioviggine intensa",
    61: "Pioggia leggera",
    63: "Pioggia moderata",
    65: "Pioggia intensa",
    71: "Neve leggera",
    73: "Neve moderata",
    75: "Neve intensa",
    77: "Granelli di neve",
    80: "Rovesci leggeri",
    81: "Rovesci moderati",
    82: "Rovesci intensi",
    85: "Nevischio leggero",
    86: "Nevischio intenso",
    95: "Temporale",
    96: "Temporale con grandine",
    99: "Temporale forte con grandine"
  };

  return descriptions[code] || "Condizione non disponibile";
}

function getWeatherIcon(code) {
  if (code === 0) return "☀️";
  if (code === 1 || code === 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️";
  if (code >= 51 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "❄️";
  if (code >= 80 && code <= 82) return "🌦️";
  if (code >= 85 && code <= 86) return "🌨️";
  if (code >= 95) return "⛈️";
  return "🌡️";
}

function formatDay(dateString) {
  return new Date(dateString).toLocaleDateString("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short"
  });
}

function getCityLabel(city) {
  const parts = [city.name];

  if (city.admin1) parts.push(city.admin1);
  if (city.country) parts.push(city.country);

  return parts.join(", ");
}

async function searchCities(query) {
  if (query.trim().length < 2) {
    hideSuggestions();
    return;
  }

  const params = new URLSearchParams({
    name: query.trim(),
    count: "6",
    language: "it",
    format: "json"
  });

  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?${params}`
    );

    if (!response.ok) throw new Error("Geocoding non disponibile");

    const data = await response.json();
    suggestions = data.results || [];

    renderSuggestions();
  } catch (error) {
    console.error(error);
    hideSuggestions();
  }
}

function renderSuggestions() {
  suggestionsList.innerHTML = "";
  activeSuggestion = -1;

  if (suggestions.length === 0) {
    hideSuggestions();
    return;
  }

  suggestions.forEach((city, index) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <strong>${city.name}</strong>
      <small>${getCityLabel(city)}</small>
    `;

    item.addEventListener("click", () => selectCity(city));
    suggestionsList.appendChild(item);
  });

  suggestionsList.classList.remove("hidden");
}

function hideSuggestions() {
  suggestionsList.classList.add("hidden");
  suggestionsList.innerHTML = "";
  suggestions = [];
  activeSuggestion = -1;
}

function selectCity(city) {
  cityInput.value = city.name;
  hideSuggestions();
  loadWeather(city);
}

async function loadWeather(city) {
  hideMessages();
  currentSection.classList.add("hidden");
  forecastSection.classList.add("hidden");
  showMessage(`Caricamento meteo per ${city.name}...`);

  const params = new URLSearchParams({
    latitude: city.latitude,
    longitude: city.longitude,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum",
    timezone: "auto",
    forecast_days: "7"
  });

  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params}`
    );

    if (!response.ok) throw new Error("Risposta API non valida");

    const data = await response.json();
    renderWeather(city, data);
    hideMessages();
  } catch (error) {
    console.error(error);
    showMessage("Impossibile caricare i dati meteo. Controlla la connessione e riprova.", true);
  }
}

function renderWeather(city, data) {
  document.getElementById("city-name").textContent = city.name;
  document.getElementById("city-region").textContent = getCityLabel(city);
  document.getElementById("current-icon").textContent = getWeatherIcon(data.current.weather_code);
  document.getElementById("current-temp").textContent = `${data.current.temperature_2m}°C`;
  document.getElementById("current-description").textContent = getWeatherDescription(data.current.weather_code);
  document.getElementById("feels-like").textContent = `${data.current.apparent_temperature}°C`;
  document.getElementById("humidity").textContent = `${data.current.relative_humidity_2m}%`;
  document.getElementById("wind").textContent = `${data.current.wind_speed_10m} km/h`;

  currentSection.classList.remove("hidden");

  forecastGrid.innerHTML = "";

  for (let i = 0; i < data.daily.time.length; i++) {
    const article = document.createElement("article");

    article.innerHTML = `
      <p class="day">${formatDay(data.daily.time[i])}</p>
      <p class="forecast-icon">${getWeatherIcon(data.daily.weather_code[i])}</p>
      <p class="temps">${data.daily.temperature_2m_max[i]}° / ${data.daily.temperature_2m_min[i]}°</p>
      <p class="rain">💧 ${data.daily.precipitation_sum[i]} mm</p>
    `;

    forecastGrid.appendChild(article);
  }

  forecastSection.classList.remove("hidden");
}

function handleKeyboard(event) {
  if (suggestions.length === 0) return;

  const items = suggestionsList.querySelectorAll("li");

  if (event.key === "ArrowDown") {
    event.preventDefault();
    activeSuggestion = (activeSuggestion + 1) % suggestions.length;
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    activeSuggestion = (activeSuggestion - 1 + suggestions.length) % suggestions.length;
  } else if (event.key === "Enter") {
    event.preventDefault();

    if (activeSuggestion >= 0) {
      selectCity(suggestions[activeSuggestion]);
    } else if (suggestions.length > 0) {
      selectCity(suggestions[0]);
    }

    return;
  } else if (event.key === "Escape") {
    hideSuggestions();
    return;
  } else {
    return;
  }

  items.forEach((item, index) => {
    item.classList.toggle("active", index === activeSuggestion);
  });
}

function init() {
  cityInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => searchCities(cityInput.value), 350);
  });

  cityInput.addEventListener("keydown", handleKeyboard);

  searchButton.addEventListener("click", () => {
    if (suggestions.length > 0) {
      selectCity(suggestions[0]);
    } else {
      searchCities(cityInput.value);
    }
  });

  document.addEventListener("click", event => {
    if (!event.target.closest(".search")) {
      hideSuggestions();
    }
  });

  loadWeather({
    name: "Napoli",
    latitude: 40.8518,
    longitude: 14.2681,
    admin1: "Campania",
    country: "Italia"
  });
}

init();

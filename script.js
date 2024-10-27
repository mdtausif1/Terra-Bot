const chatBox = document.getElementById('chatBox');
const sendBtn = document.getElementById('sendBtn');
const inputText = document.getElementById('inputText');
const voiceBtn = document.getElementById('voiceBtn');
const micIcon = voiceBtn.querySelector('img');

let isVoiceInput = false;
let cachedData = {}; // Store location, time, and weather data
let ipWeatherData = ''; // Store weather data based on IP location
let askingWeatherData = ''; // Store specific weather inquiries

window.addEventListener('load', async () => {
    await gatherInitialInfo();
    appendMessage('bot', 'How can I help you?'); // Friendly greeting
});

// Function to gather location, time, and weather information once
async function gatherInitialInfo() {
    try {
        const locationResponse = await fetch('https://ipinfo.io/json?token=a31a01378513be');
        const locationData = await locationResponse.json();
        const { city, region, country } = locationData;

        const now = new Date();
        cachedData.city = city;
        cachedData.region = region;
        cachedData.country = country;
        cachedData.dateTime = now.toLocaleString(); // Store current time in a readable format

        ipWeatherData = await fetchWeather(city); // Fetch weather based on IP-detected city
    } catch (error) {
        console.error('Error gathering info:', error);
        appendMessage('bot', "I'm unable to determine your location right now.");
    }
}

// Fetch weather for a specific city
async function fetchWeather(city) {
    const apiKey = '5efc96245a17257ae45388f95bf301b0'; // Replace with your API key
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`;

    try {
        const weatherResponse = await fetch(url);
        const weatherData = await weatherResponse.json();

        if (weatherData.cod === 200) {
            const weatherMessage = `The current weather in ${city} is ${weatherData.main.temp}°C with ${weatherData.weather[0].description}.`;
            askingWeatherData = weatherMessage; // Store the fetched weather message
            return weatherMessage; // Return weather message
        } else {
            askingWeatherData = `Couldn't find weather data for ${city}.`;
            return askingWeatherData;
        }
    } catch (error) {
        askingWeatherData = 'Could not fetch weather data.';
        console.error('Weather fetch error:', error);
        return askingWeatherData;
    }
}

// Event listeners for input submission
sendBtn.addEventListener('click', async () => {
    const text = inputText.value.trim();
    if (!text) return;

    appendMessage('user', text);
    inputText.value = '';
    isVoiceInput = false;
    await handleUserInput(text);
});

inputText.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendBtn.click();
    }
});

voiceBtn.addEventListener('click', startVoiceInput);

function startVoiceInput() {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-US';

    recognition.onstart = () => micIcon.classList.add('blinking');
    recognition.onresult = (event) => {
        const voiceText = event.results[0][0].transcript;
        appendMessage('user', voiceText);
        isVoiceInput = true;
        handleUserInput(voiceText);
    };
    recognition.onend = () => micIcon.classList.remove('blinking');
    recognition.onerror = (event) => console.error('Voice recognition error:', event.error);
    recognition.start();
}

// Handle user input with dynamic location and weather queries
async function handleUserInput(userInput) {
    userInput = userInput.toLowerCase();

    // Handle location-related queries
    if (/address|location|region|where am i|from where am i|from where i am/i.test(userInput)) {
        const address = `Based on your IP, You are in ${cachedData.city}, ${cachedData.region}, ${cachedData.country}.`;
        appendMessage('bot', address);
        if (isVoiceInput) speak(address);
    } else if (/city/i.test(userInput)) {
        const countryMessage = `Based on your IP, You are currently in ${cachedData.city}.`;
        appendMessage('bot', countryMessage);
        if (isVoiceInput) speak(countryMessage);
    } else if (/country/i.test(userInput)) {
        const countryMessage = `Based on your IP, You are currently in ${cachedData.country}.`;
        appendMessage('bot', countryMessage);
        if (isVoiceInput) speak(countryMessage);
    } else if (/state|province/i.test(userInput)) {
        const stateMessage = `Based on your IP, you are in ${cachedData.region}.`;
        appendMessage('bot', stateMessage);
        if (isVoiceInput) speak(stateMessage);
    } else if (/time|current time|what is the time/i.test(userInput)) {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const period = hours >= 12 ? 'PM' : 'AM';
        const formattedTime = `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${period}`;
        const timeMessage = `Current time: ${formattedTime}`;
        appendMessage('bot', timeMessage);
        if (isVoiceInput) speak(timeMessage);
    } else if (/date|today's date|what is the date/i.test(userInput)) {
        const now = new Date();
        const dateMessage = `Today's date is ${now.toLocaleDateString()}.`;
        appendMessage('bot', dateMessage);
        if (isVoiceInput) speak(dateMessage);
    } else if (/day|today/i.test(userInput)) {
        const now = new Date();
        const dayMessage = `Today is ${now.toLocaleDateString('en-US', { weekday: 'long' })}.`;
        appendMessage('bot', dayMessage);
        if (isVoiceInput) speak(dayMessage);
    } else if (/weather/i.test(userInput)) {
        const cityMatch = userInput.match(/(?:weather\s+in|in)\s+(\w+)/); // Extract city name from query

        if (cityMatch) {
            const city = cityMatch[1];
            const weatherMessage = await fetchWeather(city); // Fetch weather for the specified city
            appendMessage('bot', weatherMessage);
            if (isVoiceInput) speak(weatherMessage);
        } else {
            // Use cached weather data for the detected city
            appendMessage('bot', ipWeatherData || 'Weather data unavailable for your current location.');
            if (isVoiceInput) speak(ipWeatherData);
        }
    } else {
        await fetchBotResponse(userInput);
    }
}

// Fetch bot response from external API
async function fetchBotResponse(userInput) {
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    typingIndicator.textContent = 'Bot is typing...';
    chatBox.appendChild(typingIndicator);
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        const apiKey = 'AIzaSyD4BG_pvKJ4xApCDoxzvNn-y4-micwI6rs'; // Replace with your API key
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: userInput }] }] }),
            }
        );

        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        const botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'I did not understand that.';

        setTimeout(() => {
            typingIndicator.remove();
            appendMessage('bot', botResponse);
            if (isVoiceInput) speak(botResponse);
        }, 1000);
    } catch (error) {
        typingIndicator.remove();
        appendMessage('bot', 'Error: ' + error.message);
    }
}

function speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = window.speechSynthesis.getVoices().find(voice => voice.lang === 'en-US');
    utterance.onstart = () => {
        sendBtn.textContent = '⏸️';
        sendBtn.onclick = pauseSpeech;
    };
    utterance.onend = () => {
        sendBtn.textContent = 'Send';
        sendBtn.onclick = () => sendBtn.click();
    };
    window.speechSynthesis.speak(utterance);
}

function pauseSpeech() {
    window.speechSynthesis.pause();
    sendBtn.onclick = resumeSpeech;
    sendBtn.textContent = '▶️';
}

function resumeSpeech() {
    window.speechSynthesis.resume();
    sendBtn.onclick = pauseSpeech;
    sendBtn.textContent = '⏸️';
}

function appendMessage(role, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = role === 'user' ? 'user-message' : 'bot-message';
    messageDiv.textContent = role === 'user' ? `You: ${text}` : `Bot: ${text}`;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll to the latest message
}

// Handle any cleanup actions when the window is closed
window.addEventListener('beforeunload', () => {
    window.speechSynthesis.cancel(); // Stop any ongoing speech when leaving the page
});

import config from './config.js'; // Import the config

const sendBtn = document.getElementById('sendBtn');
const inputText = document.getElementById('inputText');
const chatBox = document.getElementById('chatBox');
const voiceBtn = document.getElementById('voiceBtn');
const micIcon = voiceBtn.querySelector('img'); // Select the mic icon

let isVoiceInput = false;
let userCity = ''; // Store city globally for weather-related queries

window.addEventListener('load', async () => {
    await fetchLocationAndTime();
});

async function fetchLocationAndTime() {
    const ipApiKey = config.ipApiKey;
    try {
        const response = await fetch(`https://ipinfo.io/json?token=${ipApiKey}`); // Token from ipinfo.io
        const locationData = await response.json();
        const { city, region, country } = locationData;

        userCity = city; // Store the city for weather-related queries

        const now = new Date();
        const dateTimeString = now.toLocaleString();

        const welcomeMessage = `Hello! You are accessing from ${city}, ${region}, ${country}. 
        Current date and time: ${dateTimeString}.`;
        appendMessage('bot', welcomeMessage);
    } catch (error) {
        appendMessage('bot', 'Could not retrieve location or time.');
        console.error('Location/Time Error:', error);
    }
}

sendBtn.addEventListener('click', async () => {
    const text = inputText.value;
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

    recognition.onstart = () => {
        micIcon.classList.add('blinking');
    };

    recognition.onresult = (event) => {
        const voiceText = event.results[0][0].transcript;
        appendMessage('user', voiceText);
        isVoiceInput = true;
        handleUserInput(voiceText);
    };

    recognition.onend = () => {
        micIcon.classList.remove('blinking');
    };

    recognition.onerror = (event) => {
        micIcon.classList.remove('blinking');
        console.error('Voice recognition error:', event.error);
    };

    recognition.start();
}

async function handleUserInput(userInput) {
    if (/weather/i.test(userInput)) {
        await fetchWeather();
    } else {
        await fetchBotResponse(userInput);
    }
}

async function fetchWeather() {
    const apiKey = config.openWeatherMapToken;; 
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${userCity}&units=metric&appid=${apiKey}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Unable to fetch weather data');

        const weatherData = await response.json();
        const temp = weatherData.main.temp;
        const description = weatherData.weather[0].description;
        const weatherMessage = `The current weather in ${userCity} is ${temp}°C with ${description}.`;

        appendMessage('bot', weatherMessage);
        if (isVoiceInput) speak(weatherMessage);
    } catch (error) {
        appendMessage('bot', 'Sorry, I could not fetch the weather data.');
        console.error('Weather Fetch Error:', error);
    }
}

async function fetchBotResponse(userInput) {
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    typingIndicator.textContent = 'Bot is typing...';
    chatBox.appendChild(typingIndicator);
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        const apiKey = config.googleApiKey;;
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
    const voices = window.speechSynthesis.getVoices();
    const usEnglishVoice = voices.find(voice => voice.lang === 'en-US') || voices[0];
    utterance.voice = usEnglishVoice;

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
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
    } else {
        window.speechSynthesis.resume();
    }
}

function appendMessage(role, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = role === 'user' ? 'user-message' : 'bot-message';
    messageDiv.textContent = role === 'user' ? `You: ${text}` : `Bot: ${text}`;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

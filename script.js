const chatBox = document.getElementById("chatBox");
const sendBtn = document.getElementById("sendBtn");
const inputText = document.getElementById("inputText");
const voiceBtn = document.getElementById("voiceBtn");
const micIcon = voiceBtn.querySelector("img");

let isVoiceInput = false;
let cachedData = {}; // Store location, time, and weather data
let ipWeatherData = ""; // Store weather data for IP location
let askingWeatherData = ""; // Specific weather inquiry

// Get the stored name from localStorage
let userName = localStorage.getItem("userName") || "";

// Initialize the chat when the page loads
window.addEventListener("load", () => {
  if (userName) {
    // If the user's name is stored, greet them by name
    appendMessage("bot", `Hi ${userName}, how can I help you today?`);
  } else {
    // If no name is stored, give the generic greeting
    appendMessage("bot", "Hi! I'm Terra-Bot. How can I assist you today? 😊");
  }

  // Gather initial info on load
  gatherInitialInfo();
});  

// Function to gather location, time, and weather information
async function gatherInitialInfo() {
  try {
    const locationResponse = await fetch(
      "https://ipinfo.io/json?token=a31a01378513be"
    );
    const locationData = await locationResponse.json();
    const { city = "your city", region = "your region", country = "your country" } = locationData;

    cachedData = { city, region, country, dateTime: new Date().toLocaleString() };

    ipWeatherData = await fetchWeather(city); // Fetch weather for IP location
  } catch (error) {
    console.error("Error gathering initial info:", error);
    appendMessage(
      "bot",
      "I couldn't fetch your location details right now. Let's still chat!"
    );
  }
}

// Fetch weather for a given city
async function fetchWeather(city) {
  const apiKey = "452551c1fefe765858e110910c4d4c3b"; // Replace with your API key
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.cod === 200) {
      const weatherMessage = `The current weather in ${city} is ${data.main.temp}°C with ${data.weather[0].description}.`;
      askingWeatherData = weatherMessage;
      return weatherMessage;
    } else {
      return `Couldn't find weather data for ${city}.`;
    }
  } catch (error) {
    console.error("Error fetching weather:", error);
    return "I couldn't fetch weather details right now.";
  }
}

// Handle input submission
sendBtn.addEventListener("click", () => handleInput(inputText.value.trim()));

inputText.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendBtn.click();
});

voiceBtn.addEventListener("click", startVoiceInput);

function startVoiceInput() {
  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = "en-US";

  recognition.onstart = () => micIcon.classList.add("blinking");
  recognition.onresult = (event) => {
    const voiceText = event.results[0][0].transcript;
    appendMessage("user", voiceText);
    isVoiceInput = true;
    handleUserInput(voiceText);
  };
  recognition.onend = () => micIcon.classList.remove("blinking");
  recognition.onerror = (error) =>
    appendMessage("bot", "Sorry, I couldn't understand that. Please try again.");
  recognition.start();
}

// Main input handler
async function handleInput(text) {
  if (!text) return;
  appendMessage("user", text);
  inputText.value = "";
  isVoiceInput = false;
  await handleUserInput(text.toLowerCase());
}

// Core logic for handling user input
async function handleUserInput(userInput) {
  const lowerInput = userInput.toLowerCase().trim();

  // Location-related responses
  if (/location|where am i|which country|current location|city/i.test(lowerInput)) {
    if (cachedData.city && cachedData.region && cachedData.country) {
      const countryName = await getCountryName(cachedData.country);
      const locationMessage = `Based on your IP, you're in ${cachedData.city || "an unknown city"}, ${cachedData.region || "an unknown state"}, ${countryName}.`;
      appendMessage("bot", locationMessage);
      if (isVoiceInput) speak(locationMessage);
    } else {
      appendMessage("bot", "I couldn't fetch your location. Please check your device settings.");
      if (isVoiceInput) speak("I couldn't fetch your location. Please check your device settings.");
    }
  }

  // Weather-related queries
  else if (/weathe?r/i.test(lowerInput)) { // Handles 'weather' and common typos
    const locationMatch = lowerInput.match(/weather in ([a-z\s]+)/i);
    if (locationMatch) {
      const city = locationMatch[1].trim();
      const weatherMessage = await fetchWeather(city);
      appendMessage("bot", weatherMessage);
      if (isVoiceInput) speak(weatherMessage);
    } else if (cachedData.city) {
      const weatherMessage = await fetchWeather(cachedData.city);
      appendMessage("bot", `Based on your location, ${weatherMessage}`);
      if (isVoiceInput) speak(`Based on your location, ${weatherMessage}`);
    } else {
      appendMessage("bot", "Please specify a location (e.g., 'weather in Cuttack').");
      if (isVoiceInput) speak("Please specify a location for the weather.");
    }
  }

  // Forget name logic
  else if (/forget my name|erase my name|clear my name/i.test(lowerInput)) {
    localStorage.removeItem("userName");
    userName = "";
    appendMessage("bot", "Your name has been forgotten.");
    if (isVoiceInput) speak("Your name has been forgotten.");
  }

  // Handle "My name is" scenario to remember the name
  else if (/my name is (\w+)/i.test(lowerInput)) {
    const nameMatch = lowerInput.match(/my name is (\w+)/i);
    if (nameMatch) {
      userName = nameMatch[1];
      localStorage.setItem("userName", userName);
      appendMessage("bot", `Got it! I'll remember your name as ${userName}.`);
      if (isVoiceInput) speak(`Got it! I'll remember your name as ${userName}.`);
    }
  }

  // Time-related responses
  else if (/time|current time/i.test(lowerInput)) {
    const now = new Date();
    const formattedTime = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    appendMessage("bot", `The current time is ${formattedTime}.`);
    if (isVoiceInput) speak(`The current time is ${formattedTime}.`);
  }

  // Date-related responses
  else if (/date|today's date/i.test(lowerInput)) {
    const today = new Date().toLocaleDateString("en-US");
    appendMessage("bot", `Today's date is ${today}.`);
    if (isVoiceInput) speak(`Today's date is ${today}.`);
  }

  // Day-related responses
  else if (/day/i.test(lowerInput)) {
    const now = new Date();
    const day = now.toLocaleString('en-US', { weekday: 'long' });
    const date = now.toLocaleDateString('en-US');
    appendMessage("bot", `Today is ${day}, ${date}.`);
    if (isVoiceInput) speak(`Today is ${day}, ${date}.`);
  }

  // Developer info
  else if (/who made you|developer/i.test(lowerInput)) {
    appendMessage("bot", "I was developed by Md Tausif.");
    if (isVoiceInput) speak("I was developed by Md Tausif.");
  }

  // Owner info
  else if (/who is the owner of this application|owner/i.test(lowerInput)) {
    appendMessage("bot", "The owner of this application is also Md Tausif.");
    if (isVoiceInput) speak("The owner of this application is Md Tausif.");
  }

  // Remember name response
  else if (/remember my name (is|as)/i.test(lowerInput)) {
    const nameMatch = lowerInput.match(/remember my name (is|as) (\w+)/i);
    if (nameMatch) {
      userName = nameMatch[2];
      localStorage.setItem("userName", userName);
      appendMessage("bot", `Got it! I'll remember your name as ${userName}.`);
      if (isVoiceInput) speak(`Got it! I'll remember your name as ${userName}.`);
    } else {
      appendMessage("bot", "Please provide your name after 'remember my name as' or 'remember my name is'.");
      if (isVoiceInput) speak("Please provide your name after 'remember my name as' or 'remember my name is'.");
    }
  }

  // Respond with user's name if remembered
  else if (/who am i|what is my name|my name/i.test(lowerInput)) {
    const nameMessage = userName ? `Your name is ${userName}.` : "I don't know your name yet.";
    appendMessage("bot", nameMessage);
    if (isVoiceInput) speak(nameMessage);
  }

  // Bot info
  else if (/who are you/i.test(lowerInput)) {
    const greetingMessage = userName
      ? `I'm Terra-Bot, your virtual assistant, and I know you as ${userName}! 🌟`
      : "I'm Terra-Bot, your virtual assistant! 🌟";
    appendMessage("bot", greetingMessage);
    if (isVoiceInput) speak(greetingMessage);
  }

  // General fallback for unsupported queries
  else {
    await fetchBotResponse(userInput);
  }
}

// Helper function to get full country name
async function getCountryName(countryCode) {
  const countryNames = {
    IN: "India",
    US: "United States",
    GB: "United Kingdom",
    CA: "Canada",
    AU: "Australia",
    DE: "Germany",
  };
  return countryNames[countryCode] || "an unknown country";
}

  
  
  
// Fetch response from Gemini API
async function fetchBotResponse(userInput) {
  const typingIndicator = document.createElement("div");
  typingIndicator.className = "typing-indicator";
  typingIndicator.textContent = "Terra-Bot is typing...";
  chatBox.appendChild(typingIndicator);
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    const apiKey = "AIzaSyAFM7YFN8HIXVdGAGOrYX4NwNfvf76o1BA"; // Replace with your API key
    const body = {
      contents: [
        {
          parts: [
            {
              text: `User's question: ${userInput}\nProvide a concise and helpful response.`,
            },
          ],
        },
      ],
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();
    const botResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't find an answer to that.";
    typingIndicator.remove();
    appendMessage("bot", botResponse);
    if (isVoiceInput) speak(botResponse);
  } catch (error) {
    console.error("Error fetching bot response:", error);
    typingIndicator.remove();
    appendMessage("bot", "Sorry, I couldn't process your request.");
  }
}

// Helper functions
function appendMessage(role, text) {
  const messageDiv = document.createElement("div");
  messageDiv.className = role === "user" ? "user-message" : "bot-message";
  messageDiv.textContent = role === "bot" ? `Terra-Bot: ${text}` : `You: ${text}`;
  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll
}

function speak(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = window.speechSynthesis.getVoices().find((v) => v.lang === "en-US");
  window.speechSynthesis.speak(utterance);
}

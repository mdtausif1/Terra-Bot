const sendBtn = document.getElementById('sendBtn');
const inputText = document.getElementById('inputText');
const chatBox = document.getElementById('chatBox');
const voiceBtn = document.getElementById('voiceBtn');
const micIcon = voiceBtn.querySelector('img'); // Select the mic icon

let isVoiceInput = false;

sendBtn.addEventListener('click', async () => {
    const text = inputText.value;
    if (!text) return;

    appendMessage('user', text);
    inputText.value = '';
    isVoiceInput = false;
    await fetchBotResponse(text);
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
        micIcon.classList.add('blinking'); // Start blinking
    };

    recognition.onresult = (event) => {
        const voiceText = event.results[0][0].transcript;
        appendMessage('user', voiceText);
        isVoiceInput = true;
        fetchBotResponse(voiceText);
    };

    recognition.onend = () => {
        micIcon.classList.remove('blinking'); // Stop blinking
    };

    recognition.onerror = (event) => {
        micIcon.classList.remove('blinking'); // Stop blinking on error
        console.error('Voice recognition error:', event.error);
    };

    recognition.start();
}

async function fetchBotResponse(userInput) {
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    typingIndicator.textContent = 'Bot is typing...';
    chatBox.appendChild(typingIndicator);
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        const apiKey = 'AIzaSyD4BG_pvKJ4xApCDoxzvNn-y4-micwI6rs'; // Replace with your Gemini API key
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ contents: [{ parts: [{ text: userInput }] }] })
        });

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

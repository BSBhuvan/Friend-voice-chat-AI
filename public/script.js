const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
const startButton = document.getElementById('startButton');
const audioPlayer = document.getElementById('audio');

if (typeof scrib === 'undefined') {
  window.scrib = {
    show: function(message) {
      const outputDiv = document.getElementById('output');
      const statusMessageDiv = document.getElementById('statusMessage');
      if (outputDiv && statusMessageDiv) {
        outputDiv.innerHTML += `<p>${message}</p>`;
        outputDiv.scrollTop = outputDiv.scrollHeight;
        statusMessageDiv.textContent = message.split(':')[0];
      }
    }
  };
}

if (!SpeechRecognition) {
  console.error('SpeechRecognition not supported');
  scrib.show('Speech Recognition not supported in this browser.');
} else {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.lang = 'en-US';

  recognition.onerror = event => {
    scrib.show(`Speech Recognition Error: ${event.error}`);
    startButton.textContent = 'Start Listening';
    startButton.disabled = false;
  };

  recognition.onend = () => {
    scrib.show("Speech recognition ended. Click 'Start Listening' to speak again.");
    startButton.textContent = 'Start Listening';
    startButton.disabled = false;
  };

  recognition.onstart = () => {
    scrib.show('Speech Recognition is active. Please speak.');
    startButton.textContent = 'Listening...';
    startButton.disabled = true;
  };

  recognition.onresult = async event => {
    const transcript = event.results[0][0].transcript;
    scrib.show(`You said: ${transcript}`);

    try {
      const geminiResult = await callGemini(transcript);
      const geminiText = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Gemini.';
      scrib.show(`Gemini says: ${geminiText}`);
      if (geminiText !== 'No response from Gemini.') {
        await speak(geminiText);
      }
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      scrib.show('Error getting response from Gemini.');
    }
  };

  async function callGemini(text) {
    const fullPrompt = `You are a friendly AI assistant. Reply briefly and clearly.\nUser: ${text}`;
    const body = {
      contents: [
        {
          parts: [
            {
              text: fullPrompt,
            },
          ],
        },
      ],
    };

    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error('Gemini API request failed');
    }

    return await response.json();
  }

  async function speak(text) {
    // Use Web Speech API SpeechSynthesis here for TTS without API key:
    if (!window.speechSynthesis) {
      scrib.show('Speech synthesis not supported in this browser.');
      return;
    }

    return new Promise(resolve => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.onend = resolve;
      speechSynthesis.speak(utterance);
    });
  }

  startButton.addEventListener('click', () => {
    document.getElementById('output').innerHTML = '';
    recognition.start();
  });

  scrib.show("Click 'Start Listening' to begin speaking.");
}

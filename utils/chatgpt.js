// ChatGPT API Utility
const CHATGPT_API_URL = process.env.CHATGPT_API_URL || "https://chatgpt.com/gg/v/6958ab8e49e081a1bfcb896afc1d7697?token=ZXwT5hWNUEQEtEjU6L1EEQ";

/**
 * Call ChatGPT API
 * @param {Object} data - Data to send to ChatGPT
 * @returns {Promise<Object>} Response from ChatGPT
 */
const callChatGPT = async (data) => {
  try {
    const response = await fetch(CHATGPT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`ChatGPT API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error calling ChatGPT API:", error.message);
    throw error;
  }
};

module.exports = {
  callChatGPT,
  CHATGPT_API_URL,
};


// Stores conversation history per user phone number
const sessions = {};

function getSession(phone) {
  if (!sessions[phone]) {
    sessions[phone] = {
      messages: [],        // full chat history for AI
      leadData: {},        // collected loan info
      step: 'start'
    };
  }
  return sessions[phone];
}

function clearSession(phone) {
  delete sessions[phone];
}

module.exports = { getSession, clearSession };
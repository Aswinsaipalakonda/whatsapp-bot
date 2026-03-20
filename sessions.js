// Stores conversation history per user phone number
const sessions = {};

function getSession(phone) {
  if (!sessions[phone]) {
    sessions[phone] = {
      messages: [],        // full chat history for AI
      leadData: {},        // collected loan info
      step: 'start',
      lastActive: Date.now()
    };
  } else {
    // Update lastActive whenever the session is accessed/updated
    sessions[phone].lastActive = Date.now();
    sessions[phone].nudged = false;
  }
  return sessions[phone];
}

function getAllSessions() {
  return sessions;
}

function clearSession(phone) {
  delete sessions[phone];
}

module.exports = { getSession, clearSession, getAllSessions };
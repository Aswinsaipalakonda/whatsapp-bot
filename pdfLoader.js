const pdfParse = require('pdf-parse');
const fs = require('fs');

let knowledgeBase = '';

async function loadPDF() {
  try {
    const pdfBuffer = fs.readFileSync('./data/loan_knowledge.pdf');
    const data = await pdfParse(pdfBuffer);
    knowledgeBase = data.text;
    console.log('✅ PDF loaded successfully. Characters:', knowledgeBase.length);
  } catch (err) {
    console.error('❌ PDF load error:', err.message);
  }
}

function getKnowledge() {
  return knowledgeBase;
}

module.exports = { loadPDF, getKnowledge };
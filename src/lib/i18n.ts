// src/lib/i18n.ts

export const UI_STRINGS: Record<string, any> = {
  en: {
    hello: "🌱 Hello! I'm your **SuperFarmer Agentic AI** — I can autonomously fetch your farm data, diagnose diseases, check prices, and more. Just ask me anything!",
    ask: "Ask anything about your farm...",
    descPhoto: "Describe the photo…",
    listen: "Listening…", cancel: "Tap anywhere to cancel",
    imgAttached: "Image attached", imgAi: "AI will use Gemini Vision to analyse this photo",
    header: "🤖 AI Farm Assistant", agentic: "AGENTIC",
    subtitle: "Autonomously calls tools, fetches your farm data, and reasons step-by-step.",
    quick: "⚡ Quick Actions", working: "⚡ AGENTIC AI WORKING...",
    errConn: "⚠️ Connection error. Please try again.", errOther: "⚠️ Something went wrong. Please try again.",
    layout: "🗺️ Interactive 3D Farm Layout", drag: "Drag to rotate · Scroll to zoom",
    
    // Quick Actions
    q1L: 'What to plant?', q1T: 'What crop should I plant this season based on my soil and water?',
    q2L: 'Yellow leaves', q2T: 'My crop leaves are turning yellow and falling off. What disease could this be?',
    q3L: 'Mandi price', q3T: 'What is the current mandi price of wheat and rice?',
    q4L: 'My crop plan', q4T: 'Show me my current crop plan and what I should do next.',
    q5L: 'Farm status', q5T: 'How is my farm doing overall? Give me a complete status update.',
    q6L: 'Set reminder', q6T: 'Remind me to irrigate my fields on Thursday morning.',
    q7L: 'Spatial layout', q7T: 'Make my plan detailed and generate a spatial twin layout for my farm.',
    
    // Tools
    tProfile: 'Read farmer profile', tPlan: 'Fetched crop plan', tRec: 'Got AI recommendations',
    tDisease: 'Diagnosed disease', tMemory: 'Retrieved memory', tReport: 'Generated report',
    tMandi: 'Checked mandi prices', tRemind: 'Saved reminder', tSpatial: 'Generated Spatial Twin',
    
    // Live Thinking Strings
    thinkBase: "🧠 SuperFarmer AI is thinking...",
    thinkCall: "Calling tool: ",
    thinkDone: "Tool execution finished.",

    // Dashboard
    dashPulse: 'AI PULSE',
    chat: 'Chat with AI',
    report: 'Full Farm Report',
    activePlan: 'ACTIVE CROP PLAN',
    phase: 'Growing phase',
    planNext: 'Next:',
    startPlan: '+ Start a new crop plan'
  },
  kn: {
    hello: "🌱 ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ **SuperFarmer Agentic AI** — ನಾನು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ನಿಮ್ಮ ಕೃಷಿ ಡೇಟಾವನ್ನು ಪಡೆಯಬಲ್ಲೆ, ರೋಗಗಳನ್ನು ಪತ್ತೆಹಚ್ಚಬಲ್ಲೆ, ಬೆಲೆಗಳನ್ನು ಪರಿಶೀಲಿಸಬಲ್ಲೆ ಮತ್ತು ಇನ್ನಷ್ಟು ಮಾಡಬಲ್ಲೆ. ಏನು ಬೇಕಾದರೂ ಕೇಳಿ!",
    ask: "ನಿಮ್ಮ ಕೃಷಿಯ ಬಗ್ಗೆ ಏನಾದರೂ ಕೇಳಿ...",
    descPhoto: "ಫೋಟೋವನ್ನು ವಿವರಿಸಿ...",
    listen: "ಆಲಿಸಲಾಗುತ್ತಿದೆ...", cancel: "ರದ್ದು ಮಾಡಲು ಎಲ್ಲಿಯಾದರೂ ಟ್ಯಾಪ್ ಮಾಡಿ",
    imgAttached: "ಚಿತ್ರವನ್ನು ಲಗತ್ತಿಸಲಾಗಿದೆ", imgAi: "ಫೋಟೋ ವಿಶ್ಲೇಷಿಸಲು AI ಜೆಮಿನಿ ವಿಷನ್ ಅನ್ನು ಬಳಸುತ್ತದೆ",
    header: "🤖 AI ಕೃಷಿ ಸಹಾಯಕ", agentic: "ಏಜೆಂಟಿಕ್",
    subtitle: "ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಪರಿಕರಗಳನ್ನು ಬಳಸುತ್ತದೆ, ಕೃಷಿ ಡೇಟಾವನ್ನು ತರುತ್ತದೆ ಮತ್ತು ವಿಶ್ಲೇಷಿಸುತ್ತದೆ.",
    quick: "⚡ ತ್ವರಿತ ಕ್ರಿಯೆಗಳು", working: "⚡ ಏಜೆಂಟಿಕ್ AI ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತಿದೆ...",
    errConn: "⚠️ ಸಂಪರ್ಕ ದೋಷ. ದಯವಿಟ್ಟು ಪುನಃ ಪ್ರಯತ್ನಿಸಿ.", errOther: "⚠️ ಏನೋ ತಪ್ಪಾಗಿದೆ. ದಯವಿಟ್ಟು ಪುನಃ ಪ್ರಯತ್ನಿಸಿ.",
    layout: "🗺️ ಸಂವಾದಾತ್ಮಕ 3D ಫಾರ್ಮ್ ಲೇಔಟ್", drag: "ತಿರುಗಿಸಲು ಎಳೆಯಿರಿ · ಜೂಮ್ ಮಾಡಲು ಸ್ಕ್ರಾಲ್ ಮಾಡಿ",
    
    // Quick Actions
    q1L: 'ಏನು ಬೆಳೆಯಬೇಕು?', q1T: 'ನನ್ನ ಮಣ್ಣು ಮತ್ತು ನೀರಿಗೆ ಅನುಗುಣವಾಗಿ ಈ ಋತುವಿನಲ್ಲಿ ನಾನು ಯಾವ ಬೆಳೆ ಬೆಳೆಯಬೇಕು?',
    q2L: 'ಹಳದಿ ಎಲೆಗಳು', q2T: 'ನನ್ನ ಬೆಳೆಯ ಎಲೆಗಳು ಹಳಡಿಯಾಗುತ್ತಿವೆ ಮತ್ತು ಉದುರುತ್ತಿವೆ. ಇದು ಯಾವ ರೋಗವಾಗಿರಬಹುದು?',
    q3L: 'ಮಾರುಕಟ್ಟೆ ಬೆಲೆ', q3T: 'ಗೋಧಿ ಮತ್ತು ಅಕ್ಕಿಯ ಪ್ರಸ್ತುತ ಮಾರುಕಟ್ಟೆ ಬೆಲೆ ಎಷ್ಟು?',
    q4L: 'ನನ್ನ ಬೆಳೆ ಯೋಜನೆ', q4T: 'ನನ್ನ ಪ್ರಸ್ತುತ ಬೆಳೆ ಯೋಜನೆಯನ್ನು ತೋರಿಸಿ ಮತ್ತು ನಾನು ಮುಂದೆ ಏನು ಮಾಡಬೇಕು ಎಂದು ತಿಳಿಸಿ.',
    q5L: 'ಕೃಷಿ ಸ್ಥಿತಿ', q5T: 'ನನ್ನ ಕೃಷಿ ಒಟ್ಟಾರೆಯಾಗಿ ಹೇಗಿದೆ? ನನಗೆ ಸಂಪೂರ್ಣ ಸ್ಥಿತಿಯ ನವೀಕರಣವನ್ನು ನೀಡಿ.',
    q6L: 'ಜ್ಞಾಪನೆ ಹೊಂದಿಸಿ', q6T: 'ಗುರುವಾರ ಬೆಳಿಗ್ಗೆ ನನ್ನ ಹೊಲಗಳಿಗೆ ನೀರುಣಿಸಲು ನನಗೆ ನೆನಪಿಸಿ.',
    q7L: 'ಪ್ರಾದೇಶಿಕ ಲೇಔಟ್', q7T: 'ನನ್ನ ಯೋಜನೆಯನ್ನು ವಿವರವಾಗಿ ಮಾಡಿ ಮತ್ತು ನನ್ನ ಫಾರ್ಮ್‌ಗಾಗಿ ಪ್ರಾದೇಶಿಕ ಲೇಔಟ್ ರಚಿಸಿ.',
    
    // Tools
    tProfile: 'ರೈತರ ಪ್ರೊಫೈಲ್ ಓದಲಾಗಿದೆ', tPlan: 'ಬೆಳೆ ಯೋಜನೆ ಪಡೆಯಲಾಗಿದೆ', tRec: 'AI ಶಿಫಾರಸುಗಳನ್ನು ಪಡೆಯಲಾಗಿದೆ',
    tDisease: 'ರೋಗವನ್ನು ಪತ್ತೆಹಚ್ಚಲಾಗಿದೆ', tMemory: 'ನೆನಪನ್ನು ಪಡೆಯಲಾಗಿದೆ', tReport: 'ವರದಿಯನ್ನು ರಚಿಸಲಾಗಿದೆ',
    tMandi: 'ಮಾರುಕಟ್ಟೆ ಬೆಲೆಗಳನ್ನು ಪರಿಶೀಲಿಸಲಾಗಿದೆ', tRemind: 'ಜ್ಞಾಪನೆಯನ್ನು ಉಳಿಸಲಾಗಿದೆ', tSpatial: 'ಪ್ರಾದೇಶಿಕ ಅವಳಿ ರಚಿಸಲಾಗಿದೆ',
    
    // Live Thinking Strings
    thinkBase: "🧠 SuperFarmer AI ಯೋಚಿಸುತ್ತಿದೆ...",
    thinkCall: "ಪರಿಕರವನ್ನು ಕರೆಯಲಾಗುತ್ತಿದೆ: ",
    thinkDone: "ಪರಿಕರದ ಕಾರ್ಯಗತಗೊಳಿಸುವಿಕೆ ಮುಗಿದಿದೆ.",

    // Dashboard
    dashPulse: 'AI ಪಲ್ಸ್',
    chat: 'AI ಯೊಂದಿಗೆ ಚಾಟ್ ಮಾಡಿ',
    report: 'ಸಂಪೂರ್ಣ ಫಾರ್ಮ್ ವರದಿ',
    activePlan: 'ಸಕ್ರಿಯ ಬೆಳೆ ಯೋಜನೆ',
    phase: 'ಬೆಳವಣಿಗೆಯ ಹಂತ',
    planNext: 'ಮುಂದೆ:',
    startPlan: '+ ಹೊಸ ಬೆಳೆ ಯೋಜನೆ ಪ್ರಾರಂಭಿಸಿ'
  }
};

export function getAllUI(lang: string) {
  return UI_STRINGS[lang] || UI_STRINGS.en;
}

export function getUI(lang: string, key: string) {
  const dict = UI_STRINGS[lang] || UI_STRINGS.en;
  return dict[key] || UI_STRINGS.en[key] || '';
}

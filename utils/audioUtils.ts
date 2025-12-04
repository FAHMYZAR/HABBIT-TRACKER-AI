export const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
  
    // Cancel any current speaking to avoid overlap
    window.speechSynthesis.cancel();
  
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Attempt to select a clear Indonesian voice if available
    const voices = window.speechSynthesis.getVoices();
    const indoVoice = voices.find(v => v.lang.includes('id-ID'));
    
    if (indoVoice) {
      utterance.voice = indoVoice;
      utterance.rate = 1.0; // Normal speed
    } else {
      // Fallback to English but speak the text (accents might be funny but works)
      utterance.lang = 'id-ID'; 
    }
    
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
  
    window.speechSynthesis.speak(utterance);
  };
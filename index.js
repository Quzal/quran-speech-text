const recorder = require('node-record-lpcm16');

// Imports the Google Cloud client library
const speech = require('@google-cloud/speech');

// Creates a client
const client = new speech.SpeechClient();
const fs = require('fs');

/**
 * TODO(developer): Uncomment the following lines before running the sample.
 */
// const encoding = 'Encoding of the audio file, e.g. LINEAR16';
// const sampleRateHertz = 16000;
// const languageCode = 'BCP-47 language code, e.g. en-US';

const request = {
  config: {
    encoding: "LINEAR16",
    sampleRateHertz: 16000,
    languageCode: "ar-LB",
  },
  interimResults: false, // If you want interim results, set this to true
};

function jaccardIndex(str1, str2) {
    // Convert strings to sets of characters
    const set1 = new Set(str1);
    const set2 = new Set(str2);

    // Calculate the intersection (common characters)
    const intersection = new Set([...set1].filter(char => set2.has(char)));

    // Calculate the union (total unique characters)
    const union = new Set([...set1, ...set2]);

    // Calculate Jaccard index
    const jaccardIndex = intersection.size / union.size;

    // Convert index to percentage
    const percentage = Math.round(jaccardIndex * 100);

    return percentage;
}

function hasCertainCharacters(str, characters) {
    const regex = new RegExp(`[${characters}]`);
    return regex.test(str);
}

function hasSpecificKeywords(str, keywords) {
    const regex = new RegExp(keywords.join('|'), 'i'); // 'i' flag for case-insensitive matching
    return regex.test(str);
}

function keywordMatchPercentage(str, keyword) {
    const keywordCount = (str.match(new RegExp(keyword, 'gi')) || []).length;
    // console.log("-----------",keywordCount)
    const totalWords = str.split(/\s+/).length;
    // console.log("...........", totalWords)
    const percentage = (keywordCount / totalWords) * 100;
    // console.log("///////////////////", percentage)
    return percentage; // Round to 2 decimal places
}

function findWordInFile(filePath, word) {
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    let kalima = []
    kalima = word.split(" ")
    kalima = kalima.filter(str => str.trim() !== "");
    console.log(kalima)

    const matches = [];
    lines.forEach((line, lineNumber) => {
        if(hasSpecificKeywords(line, kalima)){

            let percentage = 0
            kalima.forEach((lfz,index)=>{
                percentage = percentage + parseInt(keywordMatchPercentage(line,lfz))
                
            })
            if (percentage >= 50){
                matches.push({percentage,line : lineNumber+1, content: line})
                matches.sort((a, b) => a.percentage - b.percentage)
                console.log(".....................................", matches)
            }
        }
    });

    return matches;
}

// Create a recognize stream
const recognizeStream = client
  .streamingRecognize(request)
  .on('error', console.error)
  .on('data', (data) =>{

      process.stdout.write(
        data.results[0] && data.results[0].alternatives[0]
          ? `Transcription: ${data.results[0].alternatives[0].transcript}\n`
          : '\n\nReached transcription time limit, press Ctrl+C\n'
      )
      if (data.results[0] && data.results[0].alternatives[0]){
        const filePath = 'quran-simple-clean.txt'; // Path to your text file
        const word = data.results[0].alternatives[0].transcript
        
        const matches = findWordInFile(filePath, word);
        // if (matches.length > 0) {
        //     console.log(`Found '${word}' in the following lines:`);
        //     matches.forEach(match => {
        //         console.log(`Line ${match.line}: ${match.content}`);
        //     });
        // } else {
        //     console.log(`'${word}' not found in the file.`);
        // }
      }
  }
  );

// Start recording and send the microphone input to the Speech API.
// Ensure SoX is installed, see https://www.npmjs.com/package/node-record-lpcm16#dependencies
recorder
  .record({
    sampleRateHertz: 16000,
    threshold: 0,
    // Other options, see https://www.npmjs.com/package/node-record-lpcm16#options
    verbose: false,
    recordProgram: 'rec', // Try also "arecord" or "sox"
    silence: '10.0',
  })
  .stream()
  .on('error', console.error)
  .pipe(recognizeStream);

console.log('Listening, press Ctrl+C to stop.');
// Fixed lines spoken by the coach, and cheers the sibling gives on the results screen.

export const LINES = {
  praise: [
    'Yes! You got it!',
    'Perfect spelling!',
    'Awesome! That is exactly right!',
    'Wow, you nailed it!',
    'Super speller!',
    'Boom! Correct!',
  ],
  praiseHelped: [
    'You got it! Great job sticking with it.',
    'Yes! See? You can do hard things.',
    'That is it! Your brain just grew a little bigger.',
  ],
  spot: [
    'So close! The green letters are right. Look at the spot that needs fixing.',
    'Almost! Check the red and empty spots and try again.',
  ],
  fill: [
    'Here is a hint. Fill in the missing letters.',
    'Let\'s use a clue. Which letters go in the blanks?',
  ],
  cover: [
    'Let\'s learn this one together. Look at the word, say the letters with me, then I will hide it and you spell it.',
  ],
  coverAgain: [
    'Let\'s look one more time. You can do it.',
  ],
  ready: ['Ready? Spell it from memory!'],
  listen: ['Listen carefully.'],
  camp: ['Welcome to Training Camp! These are the words that need a little extra practice.'],
  campEmpty: ['Nothing to practice yet! Play a chapter first, and any tricky words will show up here.'],
  teacherList: ['These words are from your teacher\'s list. Let\'s practice them!'],
  welcome: ['Who is playing today?'],
  locked: ['Finish the chapter before this one to unlock it!'],
};

// Cheers said by the other sibling on the results screen, keyed by who is being cheered.
export const CHEERS = {
  emma: [
    { who: 'parker', text: 'Great job, Emma! You are a spelling superstar!' },
    { who: 'parker', text: 'Emma, that was awesome! High five!' },
    { who: 'parker', text: 'Wow, Emma! Even my dragon is impressed!' },
  ],
  parker: [
    { who: 'emma', text: 'Great job, Parker! You are the best knight in Letterland!' },
    { who: 'emma', text: 'Parker, that was amazing! I am so proud of you!' },
    { who: 'emma', text: 'Go Parker! You are a spelling champion!' },
  ],
};

import { ListeningTask } from './types';

export const MOCK_LISTENING_TASKS: ListeningTask[] = [
  {
    id: 'lt_1',
    partLabel: 'Part 1',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // Placeholder audio
    instructions: 'Listen to the conversation between a travel agent and a customer. Answer questions 1 to 4.',
    questions: [
      {
        id: 'l1_q1',
        number: 1,
        text: 'What is the main purpose of the customer’s visit?',
        type: 'multiple_choice',
        options: [
          'To book a flight to Paris',
          'To complain about a recent holiday',
          'To inquire about a Mediterranean cruise',
          'To cancel a hotel reservation'
        ],
        correctAnswer: 'To inquire about a Mediterranean cruise'
      },
      {
        id: 'l1_q2',
        number: 2,
        text: 'When does the customer want to travel?',
        type: 'multiple_choice',
        options: [
          'Early June',
          'Mid July',
          'Late August',
          'September'
        ],
        correctAnswer: 'Mid July'
      },
      {
        id: 'l1_q3',
        number: 3,
        text: 'What is the maximum budget per person?',
        type: 'fill_in_blank',
        correctAnswer: '1500' // They might write $1500 or 1500, we'll strip non-alphanumerics in grading
      },
      {
        id: 'l1_q4',
        number: 4,
        text: 'Which extra service does the customer request?',
        type: 'multiple_choice',
        options: [
          'Travel insurance',
          'Airport transfer',
          'Extra luggage allowance',
          'Vegan meals'
        ],
        correctAnswer: 'Travel insurance'
      }
    ]
  },
  {
    id: 'lt_2',
    partLabel: 'Part 2',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', // Placeholder audio
    instructions: 'Listen to a monologue about a local community project. Answer questions 5 to 8.',
    questions: [
      {
        id: 'l2_q5',
        number: 5,
        text: 'The community project primarily focuses on planting...',
        type: 'fill_in_blank',
        correctAnswer: 'trees'
      },
      {
        id: 'l2_q6',
        number: 6,
        text: 'Who is funding the new community garden?',
        type: 'multiple_choice',
        options: [
          'The local government',
          'A private tech company',
          'Community donations',
          'A national charity'
        ],
        correctAnswer: 'A private tech company'
      },
      {
        id: 'l2_q7',
        number: 7,
        text: 'Volunteers are expected to work for how many hours per week?',
        type: 'multiple_choice',
        options: [
          '2 hours',
          '4 hours',
          '5 hours',
          '10 hours'
        ],
        correctAnswer: '4 hours'
      },
      {
        id: 'l2_q8',
        number: 8,
        text: 'The main goal of the project is to improve the neighborhood’s...',
        type: 'fill_in_blank',
        correctAnswer: 'air quality'
      }
    ]
  }
];

const alphabets = {
  base10: `0123456789`,
  base16: `0123456789abcdef`,
  base32: `abcdefghijklmnopqrstuvwxyz234567`,
  base36: `0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ`,
  base58: `123456789ABCDEFGHJKLMNOPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz`,
  base64: `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_`,
  // Imaginary; codes 10 bits in 3 characters (42% efficient)
  base1024: [...(function*() {for (const a of 'bdfghjklmnprstvz') for (const b of 'aeio') for (const c of 'bdfghjklmnprstvz') yield a+b+c; })()],
};

const alphabetNames = Object.keys(alphabets);

function symbolCountToEncode(bits, alphabet) {
  return Math.ceil(bits / Math.log2(alphabets[alphabet].length));
}

function stringSizeToEncode(bits, alphabet) {
  let count = symbolCountToEncode(bits, alphabet);
  if (alphabet === 'base1024') { count / 3; }
  return count;
}

function isValidAlphabet(a) {
  return alphabetNames.some(alphabet => alphabet === a);
}

// submissions: {<user>: Submission {
//   user, total: { <alphabet>: count },
//   errors: [TranscriptionError {
//     input, type,
//     test: Test { alphabet, bits, expected }
//   ]}}
// statistics: {<alphabet>: {total, outcomes: {<outcome>: {count}}}}
class Study {
  constructor(submissions = {}) {
    this.submissions = submissions;
    this.statistics = Object.create(null);
    this.buildStatistics();
  }

  add(submission) {
    if (this.submissions[submission.user] !== undefined) {
      this.revertStatistics(this.submissions[submission.user]);
    }
    this.updateStatistics(submission);
    this.submissions[submission.user] = submission;
  }

  buildStatistics() {
    this.resetStatistics();
    Object.values(this.submissions).forEach(s => this.updateStatistics(s));
  }

  revertStatistics(submission) {
    this.updateStatistics(submission, -1);
  }

  updateStatistics(submission, diff = 1) {
    const errorTypes = submission.errors.reduce(
      (acc, e) => acc.add(e.type), new Set());
    const outcomes = ['no error', ...errorTypes];

    // Add new error types to statistics.
    for (const type of outcomes) {
      for (const [alphabet, stat] of Object.entries(this.statistics)) {
        if (stat.outcomes[type] === undefined) {
          stat.outcomes[type] = {count: 0};
        }
      }
    }

    // In order to compute the successful tests (with no errors), we need to
    // count the number of errors for each alphabet.
    const alphabetErrors = Object.fromEntries(alphabetNames.map(n => [n, 0]));

    // Update the error statistics.
    for (const error of submission.errors) {
      this.statistics[error.test.alphabet].outcomes[error.type].count += diff;
      alphabetErrors[error.test.alphabet]++;
    }

    for (const alphabet of alphabetNames) {
      this.statistics[alphabet].outcomes['no error'].count +=
        diff * (submission.total[alphabet] - alphabetErrors[alphabet]);
      this.statistics[alphabet].total += diff * submission.total[alphabet];
    }
  }

  resetStatistics() {
    this.statistics = Object.fromEntries(alphabetNames.map(
      a => [a, {total: 0, outcomes: Object.create(null)}]));
  }
}

class Submission {
  constructor(post) {
    if (!(post instanceof Object)) { post = Object.create(null); }
    this.user = post.user;
    this.total = post.total;
    this.errors = (post.errors || [])
      .map(e => new TranscriptionError(e.input, e.test));
  }

  addEntry(input, test) {
    this.total[test.alphabet]++;
    if (test.expected !== input) {
      this.errors.push(new TranscriptionError(input, test));
    }
  }

  validate() {
    let errors = [];
    if (typeof this.user !== 'string') {
      errors.push({code: 'invalid_type', message: 'user is not a string'});
    } else if (this.user.length < 20) {
      errors.push({code: 'invalid_type', message: 'user is not long enough'});
    } else if (this.user.length > 200) {
      errors.push({code: 'invalid_type', message: 'user is too long'});
    }
    if (!Object.keys(this.total).every(a => isValidAlphabet(a)
          && (typeof this.total[a] === 'number'))) {
      errors.push({code: 'invalid_type', message: 'total contains elements of the wrong format'});
    }
    const errorsValidation = this.errors.flatMap(e => e.validate());
    errors = errors.concat(errorsValidation);
    return errors;
  }
}

class TranscriptionError {
  constructor(input, test) {
    this.input = input;
    this.test = new Test(test);
    this.guessType();
  }

  guessType() {
    const lenDiff = this.test.expected.length - this.input.length;
    if (lenDiff > 0) {
      this.type = lenDiff + '-del';
      return;
    } else if (lenDiff < 0) {
      this.type = (-lenDiff) + '-ins';
      return;
    }
    const sub1 = findSub(this.test.expected, this.input);
    const trailSub = findSub(this.test.expected.slice(sub1 + 1), this.input.slice(sub1 + 1));
    if (trailSub !== undefined) {
      const sub2 = sub1 + 1 + trailSub;
      if (sub2 === sub1 + 1) {
        if (this.test.expected[sub1] === '1' && this.input[sub2] === '0' && this.test.expected[sub2] === this.input[sub1]) {
          this.type = 'phonetic';
          return;
        }
        if (this.test.expected[sub2] === '1' && this.input[sub1] === '0' && this.test.expected[sub1] === this.input[sub2]) {
          this.type = 'phonetic';
          return;
        }
      }
      if (this.test.expected[sub1] === this.input[sub2] && this.test.expected[sub2] === this.input[sub1]) {
        this.type = (sub2 - sub1 - 1) + '-trans';
        return;
      }
      if (this.test.expected[sub1] === this.test.expected[sub2] && this.input[sub1] === this.input[sub2]) {
        this.type = (sub2 - sub1 - 1) + '-twin';
        return;
      }
      if (this.test.expected.slice(sub2 + 1) === this.input.slice(sub2 + 1)) {
        this.type = (sub2 - sub1 - 1) + '-2sub';
        return;
      }
      this.type = 'nsub';
      return;
    }
    this.type = '1sub';
  }

  validate() {
    let errors = [];
    if (typeof this.input !== 'string') {
      errors.push({code: 'invalid_type', message: 'error input is not a string'});
    } else if (this.input.length > 200) {
      errors.push({code: 'invalid_type', message: 'error input is too long'});
    }
    errors = errors.concat(this.test.validate());
    return errors;
  }
}

function findSub(expected, input) {
  for (let i = 0; i < expected.length; i++) {
    if (expected[i] !== input[i]) {
      return i;
    }
  }
}

function genChar(alphabet) {
  return alphabets[alphabet][Math.floor(Math.random() * alphabets[alphabet].length)];
}

function genPayload(size, alphabet) {
  let payload = '';
  for (let i = 0; i < size; i++) {
    payload += genChar(alphabet);
  }
  return payload;
}

let testBitSize = 64;
let currentAlphabetIdx = Math.floor(Math.random() * alphabetNames.length);

class Test {
  constructor(test) {
    if (test === undefined) {
      this.generate();
    } else {
      this.alphabet = test.alphabet;
      this.bits = test.bits;
      this.expected = test.expected;
    }
  }

  generate() {
    this.alphabet = alphabetNames[currentAlphabetIdx];
    currentAlphabetIdx = (currentAlphabetIdx + 1) % alphabetNames.length;
    this.bits = testBitSize;
    //testBitSize = testBitSize + 8;
    if (testBitSize > 128) { testBitSize = 64; }
    const size = symbolCountToEncode(this.bits, this.alphabet);
    this.expected = genPayload(size, this.alphabet);
  }

  validate() {
    const errors = [];
    if (typeof this.alphabet !== 'string') {
      errors.push({code: 'invalid_type', message: 'test alphabet is not a string'});
    } else if (!isValidAlphabet(this.alphabet)) {
      errors.push({code: 'invalid_type', message: 'test alphabet is unknown'});
    }
    if (typeof this.bits !== 'number') {
      errors.push({code: 'invalid_type', message: 'test bits are not a number'});
    }
    if (typeof this.expected !== 'string') {
      errors.push({code: 'invalid_type', message: 'expected test input is not a string'});
    } else if (this.expected.length > 200) {
      errors.push({code: 'invalid_type', message: 'expected test input is too long'});
    }
    if (errors.length > 0) { return errors; }
    const expectedSize = stringSizeToEncode(this.bits, this.alphabet);
    if (expectedSize !== this.expected.length) {
      errors.push({code: 'invalid_type', message: 'expected test input does not match alphabet and bits'});
    }
    return errors;
  }
}


/// Persistence
//

const fsos = require('fsos');

const filePath = './store/study.json';

Study.prototype.save = function() {
  return fsos.set(filePath, JSON.stringify(this));
};

Study.load = function() {
  return fsos.get(filePath)
  .then(buf => new Study(JSON.parse(buf.toString()).submissions))
  .catch(e => new Study());
};

exports.Study = Study;
exports.Submission = Submission;
exports.TranscriptionError = TranscriptionError;

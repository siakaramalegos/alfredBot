'use strict';

// This is an edited copy of the sample bot which manages orders for flowers.

// ------------------------------------------------------------------------------------
// Helpers to build responses which match the structure of the necessary dialog actions
// ------------------------------------------------------------------------------------

function elicitSlot(sessionAttributes, intentName, slots, slotToElicit, message) {
  return {
    sessionAttributes,
    dialogAction: {
      type: 'ElicitSlot',
      intentName,
      slots,
      slotToElicit,
      message,
    },
  };
}

function close(sessionAttributes, fulfillmentState, message) {
  return {
    sessionAttributes,
    dialogAction: {
      type: 'Close',
      fulfillmentState,
      message,
    },
  };
}

function delegate(sessionAttributes, slots) {
  return {
    sessionAttributes,
    dialogAction: {
      type: 'Delegate',
      slots,
    },
  };
}

// ---------------- Helper Functions --------------------------------------------------

function parseLocalDate(date) {
  /** Construct a date object in the local timezone by parsing the input date string, assuming a YYYY-MM-DD format. Date(dateString) constructor is explicitly avoided as it may implicitly assume a UTC timezone.
   */
  const dateComponents = date.split(/\-/);
  return new Date(dateComponents[0], dateComponents[1] - 1, dateComponents[2]);
}

function isValidDate(date) {
  try {
    return !(isNaN(parseLocalDate(date).getTime()));
  } catch (err) {
    return false;
  }
}

function isValidCity(city) {
  const cities = ['new orleans']
  try {
    return cities.includes(city.toLowerCase().trim());
  } catch (err) {
    return false;
  }
}

function buildValidationResult(isValid, violatedSlot, messageContent) {
  if (messageContent == null) {
    return {
      isValid,
      violatedSlot,
    };
  }
  return {
    isValid,
    violatedSlot,
    message: { contentType: 'PlainText', content: messageContent },
  };
}

function validateSessionRating(date, city) {
  // const flowerTypes = ['lilies', 'roses', 'tulips'];
  // if (flowerType && flowerTypes.indexOf(flowerType.toLowerCase()) === -1) {
  //     return buildValidationResult(false, 'FlowerType', `We do not have ${flowerType}, would you like a different type of flower?  Our most popular flowers are roses`);
  // }
  if (date) {
    if (!isValidDate(date)) {
      return buildValidationResult(false, 'SessionDate', 'I did not understand that, on what date was the session you would like to leave feedback for?');
    }
    if (parseLocalDate(date) > new Date()) {
      return buildValidationResult(false, 'SessionDate', 'You can rate sessions only in the past. On what day was your session?');
    }
  }
  if (city) {
    if (!isValidCity(city)) {
      return buildValidationResult(false, 'SessionCity', 'Hmm, that doesn\'t seem like a city I had a session in. Which city was it in?');

    }
  }
  return buildValidationResult(true, null, null);
}

// --------------- Functions that control the bot's behavior -----------------------

/**
 * Performs dialog management and fulfillment for ordering flowers.
 *
 * Beyond fulfillment, the implementation of this intent demonstrates the use of the elicitSlot dialog action
 * in slot validation and re-prompting.
 *
 */
function leaveRating(intentRequest, callback) {
  const date = intentRequest.currentIntent.slots.SessionDate;
  const city = intentRequest.currentIntent.slots.SessionCity;
  const rating = intentRequest.currentIntent.slots.Rating;
  const topic = intentRequest.currentIntent.slots.SessionTopic;
  const source = intentRequest.invocationSource;

  // DialogCodeHook is for initialization and validation
  if (source === 'DialogCodeHook') {
    console.log('Beginning validation...');

    // Perform basic validation on the supplied input slots.  Use the elicitSlot dialog action to re-prompt for the first violation detected.
    const slots = intentRequest.currentIntent.slots;
    const validationResult = validateSessionRating(date, city);

    if (!validationResult.isValid) {
      slots[`${validationResult.violatedSlot}`] = null;
      callback(elicitSlot(intentRequest.sessionAttributes, intentRequest.currentIntent.name, slots, validationResult.violatedSlot, validationResult.message));
      return;
    }

    const outputSessionAttributes = intentRequest.sessionAttributes || {};
    // Pass the price of the flowers back through session attributes to be used in various prompts defined on the bot model.
    // if (flowerType) {
    //     outputSessionAttributes.Price = flowerType.length * 5; // Elegant pricing model
    // }
    callback(delegate(outputSessionAttributes, intentRequest.currentIntent.slots));
    return;
  }

  // Rest of code is for FulfillmentCodeHook
  console.log(`Begin fulfillment with `, intentRequest.sessionAttributes);

  // Submit the rating, and rely on the goodbye message of the bot to define the message to the end user.  In a real bot, this would likely involve a call to a backend service.
  callback(close(intentRequest.sessionAttributes, 'Fulfilled', {
    contentType: 'PlainText',
    content: `Thanks, your rating of ${rating} was submitted for ${topic} on ${date} in ${city}.`
  }));
}

// --------------- Intents -----------------------

// Called when the user specifies an intent for this skill.
function dispatch(intentRequest, callback) {
  console.log(`dispatch userId=${intentRequest.userId}, intentName=${intentRequest.currentIntent.name}`);

  const intentName = intentRequest.currentIntent.name;

  // Dispatch to your skill's intent handlers
  if (intentName === 'Feedback') {
    return leaveRating(intentRequest, callback);
  }
  // throw new Error(`Intent with name ${intentName} not supported`);
}

// --------------- Main handler -----------------------

// Route the incoming request based on intent.
// The JSON body of the request is provided in the event slot.
exports.handler = (event, context, callback) => {
  try {
    // By default, treat the user request as coming from the America/Chicago time zone.
    process.env.TZ = 'America/Chicago';
    console.log(`event.bot.name=${event.bot.name}`);

    /**
     * Uncomment this if statement and populate with your Lex bot name and / or version as
     * a sanity check to prevent invoking this Lambda function from an undesired Lex bot or
     * bot version.
     */
    if (event.bot.name !== 'AlfredPersonalAssistant') {
      callback('Invalid Bot Name');
    }
    dispatch(event, (response) => callback(null, response));
  } catch (err) {
    callback(err);
  }
};
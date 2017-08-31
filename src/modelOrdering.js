// src/modelOrdering.js
//
// Copyright (c) 2017 Endless Mobile Inc.
//
// Contains the logic used to determine model ordering in the feed.

const Stores = imports.stores;

// Returns true if some interface type, somewhere, has an app remaining
// for this app index
function modelsRemaining(modelMap, appIndicesForCardType) {
    return Object.keys(appIndicesForCardType).some(cardType =>
        modelMap[cardType] && appIndicesForCardType[cardType] < modelMap[cardType].length
    );
}

function insertAs(map, key, initial, inserter) {
    if (!map[key]) {
        map[key] = initial;
    }

    inserter(map[key]);
    return map;
}

function arrangeDescriptorsIntoMap(descriptors) {
    let descriptorMap = {};
    descriptors.forEach(m =>
        insertAs(descriptorMap,
                 m.type,
                 {},
                 appMap => insertAs(appMap,
                                    m.source || 'no-app',
                                    [],
                                    list => list.push(m)))
    );

    // Now that we have inserted all descriptors, we'll need to
    // convert the second level of objects into arrays so that
    // we can index directly into them
    let indexableDescriptorMap = {};
    Object.keys(descriptorMap).forEach((key) => {
        indexableDescriptorMap[key] = Object.keys(descriptorMap[key]).map(appName => ({
            app_id: appName,
            model: descriptorMap[key][appName]
        }));
    });
    return indexableDescriptorMap;
}

// Take from news, then content, then video, then
// wikiArt. Increment app each time. WordQuote should
// be the third card.
const CARD_TYPE_INDICES_ORDERING = [
    [
        Stores.CARD_STORE_TYPE_NEWS_CARD,
        Stores.CARD_STORE_TYPE_ARTICLE_CARD,
        Stores.CARD_STORE_TYPE_VIDEO_CARD,
        Stores.CARD_STORE_TYPE_ARTWORK_CARD
    ],
    [
        Stores.CARD_STORE_TYPE_NEWS_CARD,
        Stores.CARD_STORE_TYPE_VIDEO_CARD,
        Stores.CARD_STORE_TYPE_ARTICLE_CARD,
        Stores.CARD_STORE_TYPE_ARTWORK_CARD
    ]
];

const CARD_TYPE_APP_LIMITS = (function() {
    let limits = {};
    limits[Stores.CARD_STORE_TYPE_NEWS_CARD] = 5;
    limits[Stores.CARD_STORE_TYPE_ARTICLE_CARD] = 1;
    limits[Stores.CARD_STORE_TYPE_VIDEO_CARD] = 1;
    limits[Stores.CARD_STORE_TYPE_ARTWORK_CARD] = 1;
    return limits;
})();

function zeroIfUndefined(number) {
    if (number === undefined)
        return 0;

    return number;
}

// 14 cards, then one more for installable apps
const CARDS_LIMIT = 14;

// Sort the model descriptors according to the discovery
// feed's design criteria. Essentially what we want here is a pattern
// which is not "predictable", but one that shuffles through a range
// of content adequately.
//
// It assumes that apps might return more than one article per interface
// in its later stages.
//
// eslint-disable-next-line no-unused-vars
function arrange(descriptors) {
    let descriptorMap = arrangeDescriptorsIntoMap(descriptors);

    let cardTypeIndex = 0;
    let innerOuterIndex = 0;
    let nCardsToTake = 1;
    let overallIndex = 0;
    let evergreenCardAdded = false;
    
    let cardsTakenFromApp = 0;
    let cardsTakenFromType = 0;

    let arrangedDescriptors = [];

    let appIndicesForCardType = [
        Stores.CARD_STORE_TYPE_NEWS_CARD,
        Stores.CARD_STORE_TYPE_ARTICLE_CARD,
        Stores.CARD_STORE_TYPE_ARTWORK_CARD,
        Stores.CARD_STORE_TYPE_VIDEO_CARD
    ].reduce((map, type) => {
        map[type] = 0;
        return map;
    }, {});

    while (overallIndex < CARDS_LIMIT && modelsRemaining(descriptorMap, appIndicesForCardType)) {
        if (overallIndex === 2) {
            // If we have a word/quote card, append that now
            if (descriptorMap[Stores.CARD_STORE_TYPE_WORD_QUOTE_CARD]) {
                // For the word/quote card, we really only want to take the
                // first entry.
                arrangedDescriptors.push(descriptorMap[Stores.CARD_STORE_TYPE_WORD_QUOTE_CARD][0].model[0]);
                overallIndex++;
                evergreenCardAdded = true;
                continue;
            }
        }

        // First, pick a card from the current card type
        let cardType = CARD_TYPE_INDICES_ORDERING[innerOuterIndex][cardTypeIndex];
        if (descriptorMap[cardType] &&
            appIndicesForCardType[cardType] < descriptorMap[cardType].length &&
            cardsTakenFromApp < descriptorMap[cardType][appIndicesForCardType[cardType]].model.length) {
            arrangedDescriptors.push(descriptorMap[cardType][appIndicesForCardType[cardType]].model[cardsTakenFromApp]);
            overallIndex++;
        }

        // Okay, now figure out what to do. If we can pick more cards from
        // the given app then just increment cardsTakenFromApp. Otherise, reset
        // cardsTakenFromApp back to zero and increment appIndex. Otherwise, reset
        // both to zero and go to the next card type index.
        cardsTakenFromApp++;
        cardsTakenFromType++;

        // We've taken as many cards as we can for this type. Reset the limit
        // and go to the next type (and thus app)
        if (!descriptorMap[cardType] ||
            cardsTakenFromType >= nCardsToTake ||
            appIndicesForCardType[cardType] >= descriptorMap[cardType].length) {
            cardsTakenFromType = 0;
            cardsTakenFromApp = 0;

            appIndicesForCardType[cardType]++;

            // Increment the card type. If that wraps around, increment the
            // innerOuterIndex. We'll be done once modelsRemaining
            // returns false and we have nothing else left to add.
            cardTypeIndex = (cardTypeIndex + 1) % CARD_TYPE_INDICES_ORDERING[innerOuterIndex].length;
            if (cardTypeIndex === 0) {
                innerOuterIndex = (innerOuterIndex + 1) % CARD_TYPE_INDICES_ORDERING.length;

                if (innerOuterIndex === 0)
                    nCardsToTake++;
            }
        } else {
            let cardLimitForApp = Math.min(zeroIfUndefined(CARD_TYPE_APP_LIMITS[cardType]),
                                           descriptorMap[cardType][appIndicesForCardType[cardType]].model.length);
            if (cardsTakenFromApp >= cardLimitForApp) {
                // We've takne as many as we can for this app, but we still
                // have cards left to take from this type. Go to the next app
                // index.
                cardsTakenFromApp = 0;
                ++appIndicesForCardType[cardType];
            }
        }
    }

    // We have less than 3 apps, add word/quote card neverless
    if (!evergreenCardAdded && descriptorMap[Stores.CARD_STORE_TYPE_WORD_QUOTE_CARD])
        arrangedDescriptors.push(descriptorMap[Stores.CARD_STORE_TYPE_WORD_QUOTE_CARD][0].model[0]);

    // Okay, now that we're at the end, add installable apps, again, only
    // taking the first descriptor
    if (descriptorMap[Stores.CARD_STORE_TYPE_AVAILABLE_APPS])
        arrangedDescriptors.push(descriptorMap[Stores.CARD_STORE_TYPE_AVAILABLE_APPS][0].model[0]);

    return arrangedDescriptors;
}

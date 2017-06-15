// src/modelOrdering.js
//
// Copyright (c) 2017 Endless Mobile Inc.
//
// Contains the logic used to determine model ordering in the feed.

const Stores = imports.stores;

// Returns true if some interface type, somewhere, has an app remaining
// for this app index
function modelsRemaining(modelMap, appIndex) {
    return Object.keys(modelMap).some(cardType =>
        appIndex < modelMap[cardType].length
    );
}

function insertAs(map, key, initial, inserter) {
    if (!map[key]) {
        map[key] = initial;
    }

    inserter(map[key]);
    return map;
}

// Sort the models internally and externally according to the discovery
// feed's design criteria. Essentially what we want here is a pattern
// which is not "predictable", but one that shuffles through a range
// of content adequately.
//
// It assumes that apps might return more than one article per interface
// in its later stages.
//
// eslint-disable-next-line no-unused-vars
function arrange(models) {
    let modelMap = {};
    models.forEach(m =>
        insertAs(modelMap,
                 m.type,
                 {},
                 appMap => insertAs(appMap,
                                    m.knowledge_app_id || 'no-app',
                                    [],
                                    list => list.push(m)))
    );

    // Now that we have inserted all models, we'll need to
    // convert the second level of objects into arrays so that
    // we can index directly into them
    let nextModelMap = {};
    Object.keys(modelMap).forEach((key) => {
        nextModelMap[key] = Object.keys(modelMap[key]).map(appName => ({
            app_id: appName,
            model: modelMap[key][appName]
        }));
    });

    // Take from news, then content, then video, then
    // wikiArt. Increment app each time. WordQuote should
    // be the third card.
    let cardTypeIndices = [
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
    let appCardIndex = 0;
    let cardTypeIndex = 0;
    let innerOuterIndex = 0;
    let nCardsToTakeFromApp = 1;
    let appIndex = 0;
    let overallIndex = 0;

    let arrangedModels = [];

    while (modelsRemaining(nextModelMap, appIndex)) {
        if (overallIndex === 2) {
            // If we have a word/quote card, append that now
            if (nextModelMap[Stores.CARD_STORE_TYPE_WORD_QUOTE_CARD]) {
                arrangedModels.push(nextModelMap[Stores.CARD_STORE_TYPE_WORD_QUOTE_CARD][0].model[0]);
                overallIndex++;
                continue;
            }
        }

        // Try to append a card of the given type given
        // the current overallIndex. If we can't do it,
        // increment overallIndex and try the next one.
        let nextCardType = cardTypeIndices[innerOuterIndex][cardTypeIndex];
        let nextCardSet = nextModelMap[nextCardType];
        if (nextCardSet) {
            // Add an app's card if we still have some apps left on this type
            if (appIndex < nextCardSet.length) {
                if (appCardIndex < nextCardSet[appIndex].model.length &&
                   appCardIndex < nCardsToTakeFromApp) {
                    arrangedModels.push(nextCardSet[appIndex].model[appCardIndex++]);
                    overallIndex++;
                    continue;
                }
            }
        }

        appCardIndex = 0;

        // In any case, increment indices. Increment the card type. If that
        // wraps around, increment the innerOuterIndex. If the wraps around
        // increment the app index. We'll be done once modelsRemaining
        // returns false and we have nothing else left to add.
        let nextCardTypeIndex = (cardTypeIndex + 1) % cardTypeIndices[innerOuterIndex].length;
        if (nextCardTypeIndex === 0) {
            let nextInnerOuterIndex = (innerOuterIndex + 1) % cardTypeIndices.length;
            appIndex++;

            if (nextInnerOuterIndex === 0)
                nCardsToTakeFromApp++;

            innerOuterIndex = nextInnerOuterIndex;
        }

        cardTypeIndex = nextCardTypeIndex;
    }

    // Okay, now that we're at the end, add installable apps
    if (nextModelMap[Stores.CARD_STORE_TYPE_AVAILABLE_APPS])
        arrangedModels.push(nextModelMap[Stores.CARD_STORE_TYPE_AVAILABLE_APPS][0].model[0]);

    return arrangedModels;
}

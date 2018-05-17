// test/testModelOrdering.js
//
// Copyright (c) 2017 Endless Mobile Inc.
//
// This contains some tests for the model ordering component
// of the discovery feed.
/* eslint-env jasmine */

const ContentFeed = imports.gi.ContentFeed;

function make_orderable(modelProps) {
    let orderable = new ContentFeed.OrderableModel({
        source: modelProps.source,
        type: modelProps.type,
        model: null
    });
    orderable.builder = () => ({
        desktop_id: modelProps.source,
        type: modelProps.type
    });

    return orderable;
}

function arrange_with_installable_apps(models) {
    return ContentFeed.arrange_orderable_models(models,
                                                ContentFeed.ArrangeOrderableModelsFlags.ARRANGE_ORDERABLE_MODEL_FLAGS_INCLUDE_INSTALLABLE_APPS);
}

function addBuilders(descriptors) {
    return descriptors.map(d => make_orderable(d));
}

describe('Model ordering', function() {
    it('arranges sequential model types', function() {
        let models = addBuilders([
            {
                source: 'a',
                type: ContentFeed.CardStoreType.ARTWORK_CARD
            },
            {
                source: 'b',
                type: ContentFeed.CardStoreType.VIDEO_CARD
            },
            {
                source: 'c',
                type: ContentFeed.CardStoreType.NEWS_CARD
            },
            {
                source: 'd',
                type: ContentFeed.CardStoreType.ARTICLE_CARD
            }
        ]);
        let arranged = arrange_with_installable_apps(models);
        expect(arranged.map(descriptor => descriptor.builder().type)).toEqual([
            ContentFeed.CardStoreType.NEWS_CARD,
            ContentFeed.CardStoreType.ARTICLE_CARD,
            ContentFeed.CardStoreType.VIDEO_CARD,
            ContentFeed.CardStoreType.ARTWORK_CARD
        ]);
    });
    it('adjusts the ordering of models on each iteration', function() {
        let models = addBuilders([
            {
                source: 'a',
                type: ContentFeed.CardStoreType.ARTWORK_CARD
            },
            {
                source: 'b',
                type: ContentFeed.CardStoreType.VIDEO_CARD
            },
            {
                source: 'c',
                type: ContentFeed.CardStoreType.NEWS_CARD
            },
            {
                source: 'd',
                type: ContentFeed.CardStoreType.ARTICLE_CARD
            },
            {
                source: 'e',
                type: ContentFeed.CardStoreType.ARTWORK_CARD
            },
            {
                source: 'f',
                type: ContentFeed.CardStoreType.VIDEO_CARD
            },
            {
                source: 'g',
                type: ContentFeed.CardStoreType.NEWS_CARD
            },
            {
                source: 'h',
                type: ContentFeed.CardStoreType.ARTICLE_CARD
            }
        ]);
        let arranged = arrange_with_installable_apps(models);
        expect(arranged.map(descriptor => descriptor.builder().type)).toEqual([
            ContentFeed.CardStoreType.NEWS_CARD,
            ContentFeed.CardStoreType.ARTICLE_CARD,
            ContentFeed.CardStoreType.VIDEO_CARD,
            ContentFeed.CardStoreType.ARTWORK_CARD,
            ContentFeed.CardStoreType.NEWS_CARD,
            ContentFeed.CardStoreType.VIDEO_CARD,
            ContentFeed.CardStoreType.ARTICLE_CARD,
            ContentFeed.CardStoreType.ARTWORK_CARD
        ]);
    });
    it('handles running out of certain card types', function() {
        let models = addBuilders([
            {
                source: 'a',
                type: ContentFeed.CardStoreType.ARTWORK_CARD
            },
            {
                source: 'b',
                type: ContentFeed.CardStoreType.VIDEO_CARD
            },
            {
                source: 'c',
                type: ContentFeed.CardStoreType.NEWS_CARD
            },
            {
                source: 'd',
                type: ContentFeed.CardStoreType.ARTICLE_CARD
            },
            {
                source: 'f',
                type: ContentFeed.CardStoreType.VIDEO_CARD
            },
            {
                source: 'g',
                type: ContentFeed.CardStoreType.NEWS_CARD
            }
        ]);
        let arranged = arrange_with_installable_apps(models);
        expect(arranged.map(descriptor => descriptor.builder().type)).toEqual([
            ContentFeed.CardStoreType.NEWS_CARD,
            ContentFeed.CardStoreType.ARTICLE_CARD,
            ContentFeed.CardStoreType.VIDEO_CARD,
            ContentFeed.CardStoreType.ARTWORK_CARD,
            ContentFeed.CardStoreType.NEWS_CARD,
            ContentFeed.CardStoreType.VIDEO_CARD
        ]);
    });
    it('repeats the same card type for different apps', function() {
        let models = addBuilders([
            {
                source: 'a',
                type: ContentFeed.CardStoreType.ARTWORK_CARD
            },
            {
                source: 'b',
                type: ContentFeed.CardStoreType.ARTWORK_CARD
            },
            {
                source: 'c',
                type: ContentFeed.CardStoreType.ARTWORK_CARD
            }
        ]);
        let arranged = arrange_with_installable_apps(models);
        expect(arranged.map(descriptor => descriptor.builder().type)).toEqual([
            ContentFeed.CardStoreType.ARTWORK_CARD,
            ContentFeed.CardStoreType.ARTWORK_CARD,
            ContentFeed.CardStoreType.ARTWORK_CARD
        ]);
    });
    it('does not repeat the same card type for one app', function() {
        let models = addBuilders([
            {
                source: 'a',
                type: ContentFeed.CardStoreType.ARTWORK_CARD
            },
            {
                source: 'a',
                type: ContentFeed.CardStoreType.ARTWORK_CARD
            }
        ]);
        let arranged = arrange_with_installable_apps(models);
        expect(arranged.map(descriptor => descriptor.builder().type)).toEqual([
            ContentFeed.CardStoreType.ARTWORK_CARD
        ]);
    });
    it('eventually repeats cards of the same type from different apps', function() {
        let models = addBuilders([
            {
                source: 'a',
                type: ContentFeed.CardStoreType.ARTICLE_CARD
            },
            {
                source: 'a',
                type: ContentFeed.CardStoreType.ARTICLE_CARD
            },
            {
                source: 'b',
                type: ContentFeed.CardStoreType.ARTICLE_CARD
            },
            {
                source: 'b',
                type: ContentFeed.CardStoreType.ARTICLE_CARD
            },
            {
                source: 'c',
                type: ContentFeed.CardStoreType.ARTICLE_CARD
            },
            {
                source: 'd',
                type: ContentFeed.CardStoreType.ARTICLE_CARD
            },
            {
                source: 'f',
                type: ContentFeed.CardStoreType.VIDEO_CARD
            },
            {
                source: 'g',
                type: ContentFeed.CardStoreType.ARTWORK_CARD
            },
            {
                source: 'h',
                type: ContentFeed.CardStoreType.VIDEO_CARD
            },
            {
                source: 'i',
                type: ContentFeed.CardStoreType.ARTWORK_CARD
            },
        ]);
        let arranged = arrange_with_installable_apps(models);
        expect(arranged.map(descriptor => descriptor.builder().type)).toEqual([
            ContentFeed.CardStoreType.ARTICLE_CARD,
            ContentFeed.CardStoreType.VIDEO_CARD,
            ContentFeed.CardStoreType.ARTWORK_CARD,
            ContentFeed.CardStoreType.VIDEO_CARD,
            ContentFeed.CardStoreType.ARTICLE_CARD,
            ContentFeed.CardStoreType.ARTWORK_CARD,
            ContentFeed.CardStoreType.ARTICLE_CARD,
            ContentFeed.CardStoreType.ARTICLE_CARD
        ]);
    });
    it('eventually takes many news cards from the same app', function() {
        let models = addBuilders([
            {
                source: 'a',
                type: ContentFeed.CardStoreType.NEWS_CARD
            },
            {
                source: 'a',
                type: ContentFeed.CardStoreType.NEWS_CARD
            },
            {
                source: 'b',
                type: ContentFeed.CardStoreType.NEWS_CARD
            },
            {
                source: 'b',
                type: ContentFeed.CardStoreType.NEWS_CARD
            },
            {
                source: 'c',
                type: ContentFeed.CardStoreType.NEWS_CARD
            },
            {
                source: 'c',
                type: ContentFeed.CardStoreType.NEWS_CARD
            }
        ]);
        let arranged = arrange_with_installable_apps(models);
        expect(arranged.map(descriptor => descriptor.builder().desktop_id)).toEqual([
            'a', 'b', 'c', 'c'
        ]);
    });
    it('doesnt repeat content app cards at all', function() {
        let models = addBuilders([
            {
                source: 'a',
                type: ContentFeed.CardStoreType.ARTICLE_CARD
            },
            {
                source: 'a',
                type: ContentFeed.CardStoreType.ARTICLE_CARD
            },
            {
                source: 'b',
                type: ContentFeed.CardStoreType.ARTICLE_CARD
            },
            {
                source: 'b',
                type: ContentFeed.CardStoreType.ARTICLE_CARD
            },
            {
                source: 'c',
                type: ContentFeed.CardStoreType.ARTICLE_CARD
            },
            {
                source: 'c',
                type: ContentFeed.CardStoreType.ARTICLE_CARD
            }
        ]);
        let arranged = arrange_with_installable_apps(models);
        expect(arranged.map(descriptor => descriptor.builder().desktop_id)).toEqual([
            'a', 'b', 'c'
        ]);
    });
    it('splices in word/quote card in second position', function() {
        let models = addBuilders([
            {
                source: 'word/quote',
                type: ContentFeed.CardStoreType.WORD_QUOTE_CARD
            },
            {
                source: 'a',
                type: ContentFeed.CardStoreType.ARTWORK_CARD
            },
            {
                source: 'b',
                type: ContentFeed.CardStoreType.VIDEO_CARD
            },
            {
                source: 'c',
                type: ContentFeed.CardStoreType.NEWS_CARD
            },
            {
                source: 'd',
                type: ContentFeed.CardStoreType.ARTICLE_CARD
            }
        ]);
        let arranged = arrange_with_installable_apps(models);
        expect(arranged.map(descriptor => descriptor.builder().type)).toEqual([
            ContentFeed.CardStoreType.NEWS_CARD,
            ContentFeed.CardStoreType.ARTICLE_CARD,
            ContentFeed.CardStoreType.WORD_QUOTE_CARD,
            ContentFeed.CardStoreType.VIDEO_CARD,
            ContentFeed.CardStoreType.ARTWORK_CARD
        ]);
    });
    it('appends word/quote card if it is not already added', function() {
        let models = addBuilders([
            {
                source: 'word/quote',
                type: ContentFeed.CardStoreType.WORD_QUOTE_CARD
            }
        ]);
        let arranged = arrange_with_installable_apps(models);
        expect(arranged.map(descriptor => descriptor.builder().type)).toEqual([
            ContentFeed.CardStoreType.WORD_QUOTE_CARD
        ]);
    });
    it('appends installable apps to the end', function() {
        let models = addBuilders([
            {
                source: 'no-app',
                type: ContentFeed.CardStoreType.AVAILABLE_APPS
            },
            {
                source: 'a',
                type: ContentFeed.CardStoreType.ARTWORK_CARD
            },
            {
                source: 'b',
                type: ContentFeed.CardStoreType.VIDEO_CARD
            },
            {
                source: 'c',
                type: ContentFeed.CardStoreType.NEWS_CARD
            },
            {
                source: 'd',
                type: ContentFeed.CardStoreType.ARTICLE_CARD
            }
        ]);
        let arranged = arrange_with_installable_apps(models);
        expect(arranged.map(descriptor => descriptor.builder().type)).toEqual([
            ContentFeed.CardStoreType.NEWS_CARD,
            ContentFeed.CardStoreType.ARTICLE_CARD,
            ContentFeed.CardStoreType.VIDEO_CARD,
            ContentFeed.CardStoreType.ARTWORK_CARD,
            ContentFeed.CardStoreType.AVAILABLE_APPS,
        ]);
    });
    it('is limited to 15 cards overall', function() {
        let models = addBuilders([
            {
                source: 'no-app',
                type: ContentFeed.CardStoreType.AVAILABLE_APPS
            },
            {
                source: 'a',
                type: ContentFeed.CardStoreType.ARTWORK_CARD
            },
            {
                source: 'b',
                type: ContentFeed.CardStoreType.VIDEO_CARD
            },
            {
                source: 'c',
                type: ContentFeed.CardStoreType.NEWS_CARD
            },
            {
                source: 'd',
                type: ContentFeed.CardStoreType.ARTICLE_CARD
            },
            {
                source: 'e',
                type: ContentFeed.CardStoreType.ARTWORK_CARD
            },
            {
                source: 'f',
                type: ContentFeed.CardStoreType.VIDEO_CARD
            },
            {
                source: 'g',
                type: ContentFeed.CardStoreType.NEWS_CARD
            },
            {
                source: 'h',
                type: ContentFeed.CardStoreType.ARTICLE_CARD
            },
            {
                source: 'i',
                type: ContentFeed.CardStoreType.ARTWORK_CARD
            },
            {
                source: 'j',
                type: ContentFeed.CardStoreType.VIDEO_CARD
            },
            {
                source: 'k',
                type: ContentFeed.CardStoreType.NEWS_CARD
            },
            {
                source: 'l',
                type: ContentFeed.CardStoreType.ARTICLE_CARD
            },
            {
                source: 'm',
                type: ContentFeed.CardStoreType.ARTWORK_CARD
            },
            {
                source: 'n',
                type: ContentFeed.CardStoreType.VIDEO_CARD
            },
            {
                source: 'o',
                type: ContentFeed.CardStoreType.NEWS_CARD
            },
            {
                source: 'p',
                type: ContentFeed.CardStoreType.ARTICLE_CARD
            },
            {
                source: 'q',
                type: ContentFeed.CardStoreType.ARTWORK_CARD
            },
            {
                source: 'r',
                type: ContentFeed.CardStoreType.VIDEO_CARD
            },
            {
                source: 's',
                type: ContentFeed.CardStoreType.NEWS_CARD
            },
            {
                source: 't',
                type: ContentFeed.CardStoreType.ARTICLE_CARD
            }
        ]);
        let arranged = arrange_with_installable_apps(models);
        expect(arranged.length).toEqual(15);
    });
});

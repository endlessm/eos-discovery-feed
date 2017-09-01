// test/testModelOrdering.js
//
// Copyright (c) 2017 Endless Mobile Inc.
//
// This contains some tests for the model ordering component
// of the discovery feed.
/* eslint-env jasmine */

const ModelOrdering = imports.modelOrdering;
const Stores = imports.stores;

function addBuilders(descriptors) {
    return descriptors.map(d => ({
        source: d.source,
        type: d.type,
        builder: () => ({
            desktop_id: d.source,
            type: d.type
        })
    }));
}

describe('Model ordering', function() {
    it('arranges sequential model types', function() {
        let models = addBuilders([
            {
                source: 'a',
                type: Stores.CARD_STORE_TYPE_ARTWORK_CARD
            },
            {
                source: 'b',
                type: Stores.CARD_STORE_TYPE_VIDEO_CARD
            },
            {
                source: 'c',
                type: Stores.CARD_STORE_TYPE_NEWS_CARD
            },
            {
                source: 'd',
                type: Stores.CARD_STORE_TYPE_ARTICLE_CARD
            }
        ]);
        let arranged = ModelOrdering.arrange(models);
        expect(arranged.map(descriptor => descriptor.builder().type)).toEqual([
            Stores.CARD_STORE_TYPE_NEWS_CARD,
            Stores.CARD_STORE_TYPE_ARTICLE_CARD,
            Stores.CARD_STORE_TYPE_VIDEO_CARD,
            Stores.CARD_STORE_TYPE_ARTWORK_CARD
        ]);
    });
    it('adjusts the ordering of models on each iteration', function() {
        let models = addBuilders([
            {
                source: 'a',
                type: Stores.CARD_STORE_TYPE_ARTWORK_CARD
            },
            {
                source: 'b',
                type: Stores.CARD_STORE_TYPE_VIDEO_CARD
            },
            {
                source: 'c',
                type: Stores.CARD_STORE_TYPE_NEWS_CARD
            },
            {
                source: 'd',
                type: Stores.CARD_STORE_TYPE_ARTICLE_CARD
            },
            {
                source: 'e',
                type: Stores.CARD_STORE_TYPE_ARTWORK_CARD
            },
            {
                source: 'f',
                type: Stores.CARD_STORE_TYPE_VIDEO_CARD
            },
            {
                source: 'g',
                type: Stores.CARD_STORE_TYPE_NEWS_CARD
            },
            {
                source: 'h',
                type: Stores.CARD_STORE_TYPE_ARTICLE_CARD
            }
        ]);
        let arranged = ModelOrdering.arrange(models);
        expect(arranged.map(descriptor => descriptor.builder().type)).toEqual([
            Stores.CARD_STORE_TYPE_NEWS_CARD,
            Stores.CARD_STORE_TYPE_ARTICLE_CARD,
            Stores.CARD_STORE_TYPE_VIDEO_CARD,
            Stores.CARD_STORE_TYPE_ARTWORK_CARD,
            Stores.CARD_STORE_TYPE_NEWS_CARD,
            Stores.CARD_STORE_TYPE_VIDEO_CARD,
            Stores.CARD_STORE_TYPE_ARTICLE_CARD,
            Stores.CARD_STORE_TYPE_ARTWORK_CARD
        ]);
    });
    it('handles running out of certain card types', function() {
        let models = addBuilders([
            {
                source: 'a',
                type: Stores.CARD_STORE_TYPE_ARTWORK_CARD
            },
            {
                source: 'b',
                type: Stores.CARD_STORE_TYPE_VIDEO_CARD
            },
            {
                source: 'c',
                type: Stores.CARD_STORE_TYPE_NEWS_CARD
            },
            {
                source: 'd',
                type: Stores.CARD_STORE_TYPE_ARTICLE_CARD
            },
            {
                source: 'f',
                type: Stores.CARD_STORE_TYPE_VIDEO_CARD
            },
            {
                source: 'g',
                type: Stores.CARD_STORE_TYPE_NEWS_CARD
            }
        ]);
        let arranged = ModelOrdering.arrange(models);
        expect(arranged.map(descriptor => descriptor.builder().type)).toEqual([
            Stores.CARD_STORE_TYPE_NEWS_CARD,
            Stores.CARD_STORE_TYPE_ARTICLE_CARD,
            Stores.CARD_STORE_TYPE_VIDEO_CARD,
            Stores.CARD_STORE_TYPE_ARTWORK_CARD,
            Stores.CARD_STORE_TYPE_NEWS_CARD,
            Stores.CARD_STORE_TYPE_VIDEO_CARD
        ]);
    });
    it('repeats the same card type for different apps', function() {
        let models = addBuilders([
            {
                source: 'a',
                type: Stores.CARD_STORE_TYPE_ARTWORK_CARD
            },
            {
                source: 'b',
                type: Stores.CARD_STORE_TYPE_ARTWORK_CARD
            },
            {
                source: 'c',
                type: Stores.CARD_STORE_TYPE_ARTWORK_CARD
            }
        ]);
        let arranged = ModelOrdering.arrange(models);
        expect(arranged.map(descriptor => descriptor.builder().type)).toEqual([
            Stores.CARD_STORE_TYPE_ARTWORK_CARD,
            Stores.CARD_STORE_TYPE_ARTWORK_CARD,
            Stores.CARD_STORE_TYPE_ARTWORK_CARD
        ]);
    });
    it('does not repeat the same card type for one app', function() {
        let models = addBuilders([
            {
                source: 'a',
                type: Stores.CARD_STORE_TYPE_ARTWORK_CARD
            },
            {
                source: 'a',
                type: Stores.CARD_STORE_TYPE_ARTWORK_CARD
            }
        ]);
        let arranged = ModelOrdering.arrange(models);
        expect(arranged.map(descriptor => descriptor.builder().type)).toEqual([
            Stores.CARD_STORE_TYPE_ARTWORK_CARD
        ]);
    });
    it('eventually repeats cards of the same type from different apps', function() {
        let models = addBuilders([
            {
                source: 'a',
                type: Stores.CARD_STORE_TYPE_ARTICLE_CARD
            },
            {
                source: 'a',
                type: Stores.CARD_STORE_TYPE_ARTICLE_CARD
            },
            {
                source: 'b',
                type: Stores.CARD_STORE_TYPE_ARTICLE_CARD
            },
            {
                source: 'b',
                type: Stores.CARD_STORE_TYPE_ARTICLE_CARD
            },
            {
                source: 'c',
                type: Stores.CARD_STORE_TYPE_ARTICLE_CARD
            },
            {
                source: 'd',
                type: Stores.CARD_STORE_TYPE_ARTICLE_CARD
            },
            {
                source: 'f',
                type: Stores.CARD_STORE_TYPE_VIDEO_CARD
            },
            {
                source: 'g',
                type: Stores.CARD_STORE_TYPE_ARTWORK_CARD
            },
            {
                source: 'h',
                type: Stores.CARD_STORE_TYPE_VIDEO_CARD
            },
            {
                source: 'i',
                type: Stores.CARD_STORE_TYPE_ARTWORK_CARD
            },
        ]);
        let arranged = ModelOrdering.arrange(models);
        expect(arranged.map(descriptor => descriptor.builder().type)).toEqual([
            Stores.CARD_STORE_TYPE_ARTICLE_CARD,
            Stores.CARD_STORE_TYPE_VIDEO_CARD,
            Stores.CARD_STORE_TYPE_ARTWORK_CARD,
            Stores.CARD_STORE_TYPE_VIDEO_CARD,
            Stores.CARD_STORE_TYPE_ARTICLE_CARD,
            Stores.CARD_STORE_TYPE_ARTWORK_CARD,
            Stores.CARD_STORE_TYPE_ARTICLE_CARD,
            Stores.CARD_STORE_TYPE_ARTICLE_CARD
        ]);
    });
    it('eventually takes many news cards from the same app', function() {
        let models = addBuilders([
            {
                source: 'a',
                type: Stores.CARD_STORE_TYPE_NEWS_CARD
            },
            {
                source: 'a',
                type: Stores.CARD_STORE_TYPE_NEWS_CARD
            },
            {
                source: 'b',
                type: Stores.CARD_STORE_TYPE_NEWS_CARD
            },
            {
                source: 'b',
                type: Stores.CARD_STORE_TYPE_NEWS_CARD
            },
            {
                source: 'c',
                type: Stores.CARD_STORE_TYPE_NEWS_CARD
            },
            {
                source: 'c',
                type: Stores.CARD_STORE_TYPE_NEWS_CARD
            }
        ]);
        let arranged = ModelOrdering.arrange(models);
        expect(arranged.map(descriptor => descriptor.builder().desktop_id)).toEqual([
            'a', 'b', 'c', 'c'
        ]);
    });
    it('doesnt repeat content app cards at all', function() {
        let models = addBuilders([
            {
                source: 'a',
                type: Stores.CARD_STORE_TYPE_ARTICLE_CARD
            },
            {
                source: 'a',
                type: Stores.CARD_STORE_TYPE_ARTICLE_CARD
            },
            {
                source: 'b',
                type: Stores.CARD_STORE_TYPE_ARTICLE_CARD
            },
            {
                source: 'b',
                type: Stores.CARD_STORE_TYPE_ARTICLE_CARD
            },
            {
                source: 'c',
                type: Stores.CARD_STORE_TYPE_ARTICLE_CARD
            },
            {
                source: 'c',
                type: Stores.CARD_STORE_TYPE_ARTICLE_CARD
            }
        ]);
        let arranged = ModelOrdering.arrange(models);
        expect(arranged.map(descriptor => descriptor.builder().desktop_id)).toEqual([
            'a', 'b', 'c'
        ]);
    });
    it('splices in word/quote card in second position', function() {
        let models = addBuilders([
            {
                source: 'word/quote',
                type: Stores.CARD_STORE_TYPE_WORD_QUOTE_CARD
            },
            {
                source: 'a',
                type: Stores.CARD_STORE_TYPE_ARTWORK_CARD
            },
            {
                source: 'b',
                type: Stores.CARD_STORE_TYPE_VIDEO_CARD
            },
            {
                source: 'c',
                type: Stores.CARD_STORE_TYPE_NEWS_CARD
            },
            {
                source: 'd',
                type: Stores.CARD_STORE_TYPE_ARTICLE_CARD
            }
        ]);
        let arranged = ModelOrdering.arrange(models);
        expect(arranged.map(descriptor => descriptor.builder().type)).toEqual([
            Stores.CARD_STORE_TYPE_NEWS_CARD,
            Stores.CARD_STORE_TYPE_ARTICLE_CARD,
            Stores.CARD_STORE_TYPE_WORD_QUOTE_CARD,
            Stores.CARD_STORE_TYPE_VIDEO_CARD,
            Stores.CARD_STORE_TYPE_ARTWORK_CARD
        ]);
    });
    it('appends word/quote card if it is not already added', function() {
        let models = addBuilders([
            {
                source: 'word/quote',
                type: Stores.CARD_STORE_TYPE_WORD_QUOTE_CARD
            }
        ]);
        let arranged = ModelOrdering.arrange(models);
        expect(arranged.map(descriptor => descriptor.builder().type)).toEqual([
            Stores.CARD_STORE_TYPE_WORD_QUOTE_CARD
        ]);
    });
    it('appends installable apps to the end', function() {
        let models = addBuilders([
            {
                source: 'no-app',
                type: Stores.CARD_STORE_TYPE_AVAILABLE_APPS
            },
            {
                source: 'a',
                type: Stores.CARD_STORE_TYPE_ARTWORK_CARD
            },
            {
                source: 'b',
                type: Stores.CARD_STORE_TYPE_VIDEO_CARD
            },
            {
                source: 'c',
                type: Stores.CARD_STORE_TYPE_NEWS_CARD
            },
            {
                source: 'd',
                type: Stores.CARD_STORE_TYPE_ARTICLE_CARD
            }
        ]);
        let arranged = ModelOrdering.arrange(models);
        expect(arranged.map(descriptor => descriptor.builder().type)).toEqual([
            Stores.CARD_STORE_TYPE_NEWS_CARD,
            Stores.CARD_STORE_TYPE_ARTICLE_CARD,
            Stores.CARD_STORE_TYPE_VIDEO_CARD,
            Stores.CARD_STORE_TYPE_ARTWORK_CARD,
            Stores.CARD_STORE_TYPE_AVAILABLE_APPS,
        ]);
    });
    it('is limited to 15 cards overall', function() {
        let models = addBuilders([
            {
                source: 'no-app',
                type: Stores.CARD_STORE_TYPE_AVAILABLE_APPS
            },
            {
                source: 'a',
                type: Stores.CARD_STORE_TYPE_ARTWORK_CARD
            },
            {
                source: 'b',
                type: Stores.CARD_STORE_TYPE_VIDEO_CARD
            },
            {
                source: 'c',
                type: Stores.CARD_STORE_TYPE_NEWS_CARD
            },
            {
                source: 'd',
                type: Stores.CARD_STORE_TYPE_ARTICLE_CARD
            },
            {
                source: 'e',
                type: Stores.CARD_STORE_TYPE_ARTWORK_CARD
            },
            {
                source: 'f',
                type: Stores.CARD_STORE_TYPE_VIDEO_CARD
            },
            {
                source: 'g',
                type: Stores.CARD_STORE_TYPE_NEWS_CARD
            },
            {
                source: 'h',
                type: Stores.CARD_STORE_TYPE_ARTICLE_CARD
            },
            {
                source: 'i',
                type: Stores.CARD_STORE_TYPE_ARTWORK_CARD
            },
            {
                source: 'j',
                type: Stores.CARD_STORE_TYPE_VIDEO_CARD
            },
            {
                source: 'k',
                type: Stores.CARD_STORE_TYPE_NEWS_CARD
            },
            {
                source: 'l',
                type: Stores.CARD_STORE_TYPE_ARTICLE_CARD
            },
            {
                source: 'm',
                type: Stores.CARD_STORE_TYPE_ARTWORK_CARD
            },
            {
                source: 'n',
                type: Stores.CARD_STORE_TYPE_VIDEO_CARD
            },
            {
                source: 'o',
                type: Stores.CARD_STORE_TYPE_NEWS_CARD
            },
            {
                source: 'p',
                type: Stores.CARD_STORE_TYPE_ARTICLE_CARD
            },
            {
                source: 'q',
                type: Stores.CARD_STORE_TYPE_ARTWORK_CARD
            },
            {
                source: 'r',
                type: Stores.CARD_STORE_TYPE_VIDEO_CARD
            },
            {
                source: 's',
                type: Stores.CARD_STORE_TYPE_NEWS_CARD
            },
            {
                source: 't',
                type: Stores.CARD_STORE_TYPE_ARTICLE_CARD
            }
        ]);
        let arranged = ModelOrdering.arrange(models);
        expect(arranged.length).toEqual(15);
    });
});

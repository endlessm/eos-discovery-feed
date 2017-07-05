// src/stores.js
//
// Copyright (c) 2016-2017 Endless Mobile Inc.
//
// This file contains the model state for all the cards.

const Gio = imports.gi.Gio;
const GObject = imports.gi.GObject;

const Lang = imports.lang; 

const CARD_STORE_TYPE_ARTICLE_CARD = 0;
const CARD_STORE_TYPE_WORD_QUOTE_CARD = 1;
const CARD_STORE_TYPE_ARTWORK_CARD = 2;
const CARD_STORE_TYPE_AVAILABLE_APPS = 3;
const CARD_STORE_TYPE_VIDEO_CARD = 4;
const CARD_STORE_TYPE_NEWS_CARD = 5;
const CARD_STORE_TYPE_MAX = CARD_STORE_TYPE_NEWS_CARD;

// eslint-disable-next-line no-unused-vars
const DiscoveryFeedCardStore = new Lang.Class({
    Name: 'DiscoveryFeedCardStore',
    Extends: GObject.Object,
    Properties: {
        type: GObject.ParamSpec.int('type',
                                    '',
                                    '',
                                    GObject.ParamFlags.READWRITE |
                                    GObject.ParamFlags.CONSTRUCT_ONLY,
                                    CARD_STORE_TYPE_ARTICLE_CARD,
                                    CARD_STORE_TYPE_MAX,
                                    CARD_STORE_TYPE_ARTICLE_CARD)
    }
});

// eslint-disable-next-line no-unused-vars
const DiscoveryFeedAppCardStore = new Lang.Class({
    Name: 'DiscoveryFeedAppCardStore',
    Extends: DiscoveryFeedCardStore,
    Properties: {
        'desktop-id': GObject.ParamSpec.string('desktop-id',
                                               '',
                                               '',
                                               GObject.ParamFlags.READWRITE |
                                               GObject.ParamFlags.CONSTRUCT_ONLY,
                                               '')
    }
});

// eslint-disable-next-line no-unused-vars
const DiscoveryFeedWordStore = new Lang.Class({
    Name: 'DiscoveryFeedWordStore',
    Extends: GObject.Object,
    Properties: {
        word: GObject.ParamSpec.string('word',
                                         '',
                                         '',
                                         GObject.ParamFlags.READWRITE |
                                         GObject.ParamFlags.CONSTRUCT_ONLY,
                                         ''),
        word_type: GObject.ParamSpec.string('word-type',
                                            '',
                                            '',
                                            GObject.ParamFlags.READWRITE |
                                            GObject.ParamFlags.CONSTRUCT_ONLY,
                                            ''),
        definition: GObject.ParamSpec.string('definition',
                                             '',
                                             '',
                                             GObject.ParamFlags.READWRITE |
                                             GObject.ParamFlags.CONSTRUCT_ONLY,
                                             '')
    }
});

// eslint-disable-next-line no-unused-vars
const DiscoveryFeedQuoteStore = new Lang.Class({
    Name: 'DiscoveryFeedQuoteStore',
    Extends: GObject.Object,
    Properties: {
        quote: GObject.ParamSpec.string('quote',
                                          '',
                                          '',
                                          GObject.ParamFlags.READWRITE |
                                          GObject.ParamFlags.CONSTRUCT_ONLY,
                                          ''),
        author: GObject.ParamSpec.string('author',
                                           '',
                                           '',
                                           GObject.ParamFlags.READWRITE |
                                           GObject.ParamFlags.CONSTRUCT_ONLY,
                                           '')
    }
});

// eslint-disable-next-line no-unused-vars
const DiscoveryFeedWordQuotePairStore = new Lang.Class({
    Name: 'DiscoveryFeedQuotePairStore',
    Extends: DiscoveryFeedCardStore,
    Properties: {
        quote: GObject.ParamSpec.object('quote',
                                          '',
                                          '',
                                          GObject.ParamFlags.READWRITE |
                                          GObject.ParamFlags.CONSTRUCT_ONLY,
                                          DiscoveryFeedQuoteStore.$gtype),
        word: GObject.ParamSpec.object('word',
                                         '',
                                         '',
                                         GObject.ParamFlags.READWRITE |
                                         GObject.ParamFlags.CONSTRUCT_ONLY,
                                         DiscoveryFeedWordStore.$gtype)
    },

    _init: function(params) {
        params.type = CARD_STORE_TYPE_WORD_QUOTE_CARD;
        this.parent(params);
    }
});

const LAYOUT_DIRECTION_IMAGE_FIRST = 0;
const LAYOUT_DIRECTION_IMAGE_LAST = 1;

// eslint-disable-next-line no-unused-vars
const DiscoveryFeedKnowlegeArtworkCardStore = new Lang.Class({
    Name: 'DiscoveryFeedKnowlegeArtworkCardStore',
    Extends: DiscoveryFeedCardStore,
    Properties: {
        title: GObject.ParamSpec.string('title',
                                          '',
                                          '',
                                          GObject.ParamFlags.READWRITE |
                                          GObject.ParamFlags.CONSTRUCT_ONLY,
                                          ''),
        author: GObject.ParamSpec.string('author',
                                           '',
                                           '',
                                           GObject.ParamFlags.READWRITE |
                                           GObject.ParamFlags.CONSTRUCT_ONLY,
                                           ''),
        thumbnail: GObject.ParamSpec.object('thumbnail',
                                              '',
                                              '',
                                              GObject.ParamFlags.READWRITE |
                                              GObject.ParamFlags.CONSTRUCT_ONLY,
                                              Gio.InputStream),
        layout_direction: GObject.ParamSpec.int('layout-direction',
                                                '',
                                                '',
                                                GObject.ParamFlags.READWRITE |
                                                GObject.ParamFlags.CONSTRUCT_ONLY,
                                                LAYOUT_DIRECTION_IMAGE_FIRST,
                                                LAYOUT_DIRECTION_IMAGE_LAST,
                                                LAYOUT_DIRECTION_IMAGE_FIRST)
    },

    _init: function(params) {
        params.type = CARD_STORE_TYPE_ARTWORK_CARD;
        this.parent(params);
    }
});

const THUMBNAIL_SIZE_APP_STORE = 180;
const THUMBNAIL_WIDTH_APP_STORE_LINK = 211;
const THUMBNAIL_SIZE_ARTICLE = 254;
const THUMBNAIL_SIZE_NEWS = 322;

// eslint-disable-next-line no-unused-vars
const DiscoveryFeedKnowledgeAppCardStore = new Lang.Class({
    Name: 'DiscoveryFeedKnowledgeAppCardStore',
    Extends: DiscoveryFeedAppCardStore,
    Properties: {
        title: GObject.ParamSpec.string('title',
                                        '',
                                        '',
                                        GObject.ParamFlags.READWRITE |
                                        GObject.ParamFlags.CONSTRUCT_ONLY,
                                        ''),
        uri: GObject.ParamSpec.string('uri',
                                      '',
                                      '',
                                      GObject.ParamFlags.READWRITE |
                                      GObject.ParamFlags.CONSTRUCT_ONLY,
                                      ''),
        synopsis: GObject.ParamSpec.string('synopsis',
                                           '',
                                           '',
                                           GObject.ParamFlags.READWRITE |
                                           GObject.ParamFlags.CONSTRUCT_ONLY,
                                           ''),
        thumbnail: GObject.ParamSpec.object('thumbnail',
                                            '',
                                            '',
                                            GObject.ParamFlags.READWRITE |
                                            GObject.ParamFlags.CONSTRUCT_ONLY,
                                            Gio.InputStream),
        bus_name: GObject.ParamSpec.string('bus-name',
                                           '',
                                           '',
                                           GObject.ParamFlags.READWRITE |
                                           GObject.ParamFlags.CONSTRUCT_ONLY,
                                           ''),
        knowledge_search_object_path: GObject.ParamSpec.string('knowledge-search-object-path',
                                                               '',
                                                               '',
                                                               GObject.ParamFlags.READWRITE |
                                                               GObject.ParamFlags.CONSTRUCT_ONLY,
                                                               ''),
        knowledge_app_id: GObject.ParamSpec.string('knowledge-app-id',
                                                     '',
                                                     '',
                                                     GObject.ParamFlags.READWRITE |
                                                     GObject.ParamFlags.CONSTRUCT_ONLY,
                                                     ''),
        layout_direction: GObject.ParamSpec.int('layout-direction',
                                                '',
                                                '',
                                                GObject.ParamFlags.READWRITE |
                                                GObject.ParamFlags.CONSTRUCT_ONLY,
                                                LAYOUT_DIRECTION_IMAGE_FIRST,
                                                LAYOUT_DIRECTION_IMAGE_LAST,
                                                LAYOUT_DIRECTION_IMAGE_FIRST),
        'thumbnail-size': GObject.ParamSpec.int('thumbnail-size',
                                                '',
                                                '',
                                                GObject.ParamFlags.READWRITE |
                                                GObject.ParamFlags.CONSTRUCT_ONLY,
                                                THUMBNAIL_SIZE_APP_STORE,
                                                THUMBNAIL_SIZE_NEWS,
                                                THUMBNAIL_SIZE_ARTICLE)
    },

    _init: function(params) {
        params.type = params.type || CARD_STORE_TYPE_ARTICLE_CARD;
        this.parent(params);
    }
});

// eslint-disable-next-line no-unused-vars
const DiscoveryFeedKnowledgeAppVideoCardStore = new Lang.Class({
    Name: 'DiscoveryFeedKnowledgeAppVideoCardStore',
    Extends: DiscoveryFeedKnowledgeAppCardStore,
    Properties: {
        duration: GObject.ParamSpec.string('duration',
                                           '',
                                           '',
                                           GObject.ParamFlags.READWRITE |
                                           GObject.ParamFlags.CONSTRUCT_ONLY,
                                           '')
    },

    _init: function(params) {
        params.type = CARD_STORE_TYPE_VIDEO_CARD;
        this.parent(params);
    }
});

// eslint-disable-next-line no-unused-vars
const DiscoveryFeedAvailableAppsStore = new Lang.Class({
    Name: 'DiscoveryFeedAvailableAppsStore',
    Extends: DiscoveryFeedCardStore,

    _init: function(params, apps) {
        params.type = CARD_STORE_TYPE_AVAILABLE_APPS;
        this.parent(params);
        this.apps = apps;
    }
});

const DISCOVERY_FEED_APP_TYPE_BASIC = 0;
const DISCOVERY_FEED_APP_TYPE_DETAILED = 1;
const DISCOVERY_FEED_APP_TYPE_APP_STORE_LINK = 2;
const DISCOVERY_FEED_APP_TYPE_MAX = DISCOVERY_FEED_APP_TYPE_APP_STORE_LINK;

// eslint-disable-next-line no-unused-vars
const DiscoveryFeedAppStore = new Lang.Class({
    Name: 'DiscoveryFeedAppStore',
    Extends: GObject.Object,
    Properties: {
        app_id: GObject.ParamSpec.string('app_id',
                                         '',
                                         '',
                                         GObject.ParamFlags.CONSTRUCT_ONLY |
                                         GObject.ParamFlags.READWRITE,
                                         ''),
        title: GObject.ParamSpec.string('title',
                                        '',
                                        '',
                                        GObject.ParamFlags.CONSTRUCT_ONLY |
                                        GObject.ParamFlags.READWRITE,
                                        ''),
        thumbnail_data: GObject.ParamSpec.object('thumbnail-data',
                                                 '',
                                                 '',
                                                 GObject.ParamFlags.READWRITE |
                                                 GObject.ParamFlags.CONSTRUCT_ONLY,
                                                 Gio.InputStream),
        type: GObject.ParamSpec.int('type',
                                    '',
                                    '',
                                    GObject.ParamFlags.READWRITE |
                                    GObject.ParamFlags.CONSTRUCT_ONLY,
                                    DISCOVERY_FEED_APP_TYPE_BASIC,
                                    DISCOVERY_FEED_APP_TYPE_MAX,
                                    DISCOVERY_FEED_APP_TYPE_BASIC),
        layout_direction: GObject.ParamSpec.int('layout-direction',
                                                '',
                                                '',
                                                GObject.ParamFlags.READWRITE |
                                                GObject.ParamFlags.CONSTRUCT_ONLY,
                                                LAYOUT_DIRECTION_IMAGE_FIRST,
                                                LAYOUT_DIRECTION_IMAGE_LAST,
                                                LAYOUT_DIRECTION_IMAGE_FIRST)
    }
});

// eslint-disable-next-line no-unused-vars
const DiscoveryFeedAppStoreLinkStore = new Lang.Class({
    Name: 'DiscoveryFeedAppStoreLinkStore',
    Extends: DiscoveryFeedAppStore,

    _init: function(params) {
        let thumbnail_uri = 'resource:///com/endlessm/DiscoveryFeed/img/explore.png';
        params.title = _('Explore the App Center');
        params.thumbnail_data = Gio.File.new_for_uri(thumbnail_uri).read(null);
        params.app_id = 'org.gnome.Software';
        params.type = DISCOVERY_FEED_APP_TYPE_APP_STORE_LINK;
        params.layout_direction = LAYOUT_DIRECTION_IMAGE_LAST;
        this.parent(params);
    }
});

// eslint-disable-next-line no-unused-vars
const DiscoveryFeedInstallableAppStore = new Lang.Class({
    Name: 'DiscoveryFeedInstallableAppStore',
    Extends: DiscoveryFeedAppStore,
    Properties: {
        synopsis: GObject.ParamSpec.string('synopsis',
                                           '',
                                           '',
                                           GObject.ParamFlags.CONSTRUCT_ONLY |
                                           GObject.ParamFlags.READWRITE,
                                           ''),
        icon: GObject.ParamSpec.object('icon',
                                        '',
                                        '',
                                        GObject.ParamFlags.READWRITE |
                                        GObject.ParamFlags.CONSTRUCT_ONLY,
                                        Gio.Icon)
    },

    _init: function(params) {
        params.type = DISCOVERY_FEED_APP_TYPE_DETAILED;
        params.layout_direction = LAYOUT_DIRECTION_IMAGE_LAST;
        this.parent(params);
    }
});


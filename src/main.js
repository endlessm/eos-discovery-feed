// src/main.js
//
// Copyright (c) 2016-2017 Endless Mobile Inc.
//
// This file is the file first run by the entrypoint to the com.endlessm.DiscoveryFeed
// package.
pkg.initGettext();
pkg.initFormat();
pkg.require({
    Gdk: '3.0',
    GdkX11: '3.0',
    Gtk: '3.0',
    Gio: '2.0',
    GLib: '2.0',
});

const EosShard = imports.gi.EosShard;
const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Wnck = imports.gi.Wnck;

const Lang = imports.lang;

const ImageCoverFrame = imports.imageCoverFrame;
const TextSanitization = imports.textSanitization;

const DISCOVERY_FEED_PATH = '/com/endlessm/DiscoveryFeed';
const DISCOVERY_FEED_IFACE = 'com.endlessm.DiscoveryFeed';
const SIDE_COMPONENT_ROLE = 'eos-side-component';

const KnowledgeSearchIface = '\
<node> \
  <interface name="com.endlessm.KnowledgeSearch"> \
    <method name="LoadItem"> \
      <arg type="s" name="EknID" direction="in" /> \
      <arg type="s" name="Query" direction="in" /> \
      <arg type="u" name="Timestamp" direction="in" /> \
    </method> \
    <method name="LoadQuery"> \
      <arg type="s" name="Query" direction="in" /> \
      <arg type="u" name="Timestamp" direction="in" /> \
    </method> \
  </interface> \
</node>';

const DiscoveryFeedIface = '\
<node> \
  <interface name="' + DISCOVERY_FEED_IFACE + '">  \
    <method name="show">  \
      <arg type="u" direction="in" name="timestamp"/>  \
    </method>  \
    <method name="hide"> \
      <arg type="u" direction="in" name="timestamp"/> \
    </method> \
    <property name="Visible" type="b" access="read"/> \
  </interface> \
</node>';

const DiscoveryFeedContentIface = '\
<node> \
  <interface name="com.endlessm.DiscoveryFeedContent"> \
    <method name="ArticleCardDescriptions"> \
      <arg type="as" name="Shards" direction="out" /> \
      <arg type="aa{ss}" name="Result" direction="out" /> \
    </method> \
  </interface> \
</node>';

const DiscoveryFeedWordIface = '\
<node> \
  <interface name="com.endlessm.DiscoveryFeedWord"> \
    <method name="GetWordOfTheDay"> \
      <arg type="a{ss}" name="Results" direction="out" /> \
    </method> \
  </interface> \
</node>';

const DiscoveryFeedQuoteIface = '\
<node> \
  <interface name="com.endlessm.DiscoveryFeedQuote"> \
    <method name="GetQuoteOfTheDay"> \
      <arg type="a{ss}" name="Results" direction="out" /> \
    </method> \
  </interface> \
</node>';

const DiscoveryFeedNewsIface = '\
<node> \
  <interface name="com.endlessm.DiscoveryFeedNews"> \
    <method name="GetRecentNews"> \
      <arg type="as" name="Shards" direction="out" /> \
      <arg type="aa{ss}" name="Result" direction="out" /> \
    </method> \
  </interface> \
</node>';

//
// maybeGetKeyfileString
//
// Attempt to read a GKeyFile for a particular key in a given section
// but return a default value if it wasn't found
//
// @param {object.Gio.KeyFile} keyFile - The key file to read.
// @param {string} section - The section to read from.
// @param {string} key - The key to read.
// @param {string} defaultValue - The default value in case the key was not found.
// @returns {string} the looked up string, or the default
function maybeGetKeyfileString(keyFile, section, key, defaultValue) {
    try {
        return keyFile.get_string(section, key);
    } catch (e) {
        return defaultValue;
    }
}

const DISCOVERY_FEED_SECTION_NAME = 'Discovery Feed Content Provider';
const LOAD_ITEM_SECTION_NAME = 'Load Item Provider';

//
// languageCodeIsCompatible
//
// True if the provided language code is compatible with the provided
// languages. We check both the locale variant and the actual language
// code itself
//
// @param {string} language - The language code to check
// @param {array.String} languages - The supported user languages
// @returns {bool} - True if the language is supported
function languageCodeIsCompatible(language, languages) {
    let languageCode = language.split('_')[0];
    return languages.some(l => l === languageCode);
}

//
// appLanguage
function appLanguage(desktopId) {
    let appInfo = Gio.DesktopAppInfo.new(desktopId);
    if (!appInfo) {
        // This case shouldn't happen - the app id passed must always
        // be valid.
        throw new Error('Could not create GDesktopAppInfo for ' + desktopId);
    }

    return appInfo.get_string('X-Endless-Content-Language');
}

//
// readDiscoveryFeedProvidersInDirectory
//
// Read all the discovery feed providers in a directory, calling
// done with an array of all providers when they have been read in.
//
// @param {object.Gio.File} directory - The directory to enumerate.
// @param {function} done - The function to call with a list of providers
//                          when done.
function readDiscoveryFeedProvidersInDirectory(directory) {
    let enumerator = null;
    let info = null;
    let providerBusDescriptors = [];
    let languages = GLib.get_language_names();

    try {
        enumerator = directory.enumerate_children('standard::name,standard::type',
                                                  Gio.FileQueryInfoFlags.NONE,
                                                  null);
    } catch (e) {
        if (e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.NOT_FOUND)) {
            return providerBusDescriptors;
        }

        throw e;
    }

    while ((info = enumerator.next_file(null))) {
        let file = Gio.File.new_for_path(GLib.build_filenamev([
            directory.get_path(),
            info.get_name()
        ]));
        let path = file.get_path();

        let keyFile = new GLib.KeyFile();
        try {
            keyFile.load_from_file(path, GLib.KeyFileFlags.NONE);
        } catch(e) {
            logError(e, 'Key file ' + path + ' could not be loaded, ignored');
        }

        if (!keyFile.has_group(DISCOVERY_FEED_SECTION_NAME)) {
            log('Key file ' + path + ' does not have a section called ' + DISCOVERY_FEED_SECTION_NAME + ', ignored');
            continue;
        }

        let keys = keyFile.get_keys(DISCOVERY_FEED_SECTION_NAME)[0];
        let requiredKeys = ['DesktopId', 'ObjectPath', 'BusName', 'SupportedInterfaces'];

        let notFoundKeys = requiredKeys.filter(k => keys.indexOf(k) === -1);
        if (notFoundKeys.length) {
            log('Key file ' + path + ' does not have keys ' + notFoundKeys.join(', ') + ', ignoring');
            continue;
        }

        let objectPath = null;
        if (keyFile.has_group(LOAD_ITEM_SECTION_NAME)) {
            log('Key file ' + path + ' does have a section called ' + LOAD_ITEM_SECTION_NAME + ', processing...');
            try {
                objectPath = keyFile.get_string(LOAD_ITEM_SECTION_NAME,
                                                'ObjectPath');
            } catch(e) {
                log('Key file ' + path + ' does not have key \'ObjectPath\', ignoring');
                continue;
            }
        }

        let desktopId = maybeGetKeyfileString(keyFile,
                                              DISCOVERY_FEED_SECTION_NAME,
                                              'DesktopId',
                                              null);

        // Now, if we have a Desktop ID, we'll want to check it
        // to see if there's an embedded language code in the
        // desktop file. If so, filter out this application if it
        // would not be compatible
        if (desktopId) {
            let providerLocale = appLanguage(desktopId);
            if (providerLocale &&
                !languageCodeIsCompatible(providerLocale, languages)) {
                log('Language code ' + providerLocale + ' is not compatible ' +
                    'with language codes ' + languages.join(' ') +
                    ', skipping ' + path);
                continue;
            }
        }

        providerBusDescriptors.push({
            path: keyFile.get_string(DISCOVERY_FEED_SECTION_NAME,
                                     'ObjectPath'),
            name: keyFile.get_string(DISCOVERY_FEED_SECTION_NAME,
                                     'BusName'),
            interfaces: keyFile.get_string(DISCOVERY_FEED_SECTION_NAME,
                                           'SupportedInterfaces').split(';'),
            knowledgeAppId: maybeGetKeyfileString(keyFile,
                                                  DISCOVERY_FEED_SECTION_NAME,
                                                  'AppID',
                                                  null),
            desktopFileId: desktopId,
            knowledgeSearchObjectPath: objectPath
        });
    }

    return providerBusDescriptors;
}

function readDiscoveryFeedProvidersInDataDirectories() {
    let dataDirectories = GLib.get_system_data_dirs();
    return dataDirectories.reduce((allProviders, directory) => {
        let dir = Gio.File.new_for_path(GLib.build_filenamev([
            directory,
            'eos-discovery-feed',
            'content-providers'
        ]));
        Array.prototype.push.apply(allProviders,
                                   readDiscoveryFeedProvidersInDirectory(dir));
        return allProviders;
    }, []);
}

function instantiateObjectsFromDiscoveryFeedProviders(connection,
                                                      providers,
                                                      done) {
    let interfaceWrappers = {
        'com.endlessm.DiscoveryFeedContent': Gio.DBusProxy.makeProxyWrapper(DiscoveryFeedContentIface),
        'com.endlessm.DiscoveryFeedQuote': Gio.DBusProxy.makeProxyWrapper(DiscoveryFeedQuoteIface),
        'com.endlessm.DiscoveryFeedWord': Gio.DBusProxy.makeProxyWrapper(DiscoveryFeedWordIface),
        'com.endlessm.DiscoveryFeedNews': Gio.DBusProxy.makeProxyWrapper(DiscoveryFeedNewsIface)
    };

    let onProxyReady = function(initable, error, objectPath, name, interfaceName) {
        remaining--;

        if (error) {
            logError(error, 'Could not create proxy for ' + interfaceName +
                            ' at ' + objectPath + ' on bus name ' + name);
            return;
        }

        log('Created Discovery Feed proxy for ' + objectPath);

        if (remaining < 1) {
            done(proxies);
        }
    };

    // Map to proxies and then flat map
    let proxies = providers.map(provider =>
        provider.interfaces.filter(interfaceName => {
            if (Object.keys(interfaceWrappers).indexOf(interfaceName) === -1) {
                log('Filtering out unrecognised interface ' + interfaceName);
                return false;
            }

            return true;
        })
        .map(interfaceName => ({
            iface: interfaceWrappers[interfaceName](connection,
                                                    provider.name,
                                                    provider.path,
                                                    Lang.bind(this,
                                                              onProxyReady,
                                                              provider.path,
                                                              provider.name,
                                                              interfaceName),
                                                    null),
            interfaceName: interfaceName,
            desktopId: provider.desktopFileId,
            busName: provider.name,
            knowledgeSearchObjectPath: provider.knowledgeSearchObjectPath,
            knowledgeAppId: provider.knowledgeAppId
        }))
    ).reduce((list, incoming) => list.concat(incoming), []);

    // Update remaining based on flatMap. We're fine to do this here
    // since the asynchronous functions don't start running until we've
    // left this function
    let remaining = proxies.length;
}

const CARD_STORE_TYPE_ARTICLE_CARD = 0;
const CARD_STORE_TYPE_WORD_QUOTE_CARD = 1;
const CARD_STORE_TYPE_ARTWORK_CARD = 2;
const CARD_STORE_TYPE_MAX = CARD_STORE_TYPE_ARTWORK_CARD;

const DiscoveryFeedCardStore = new Lang.Class({
    Name: 'DiscoveryFeedCardStore',
    Extends: GObject.Object,
    Properties: {
        'type': GObject.ParamSpec.int('type',
                                      '',
                                      '',
                                      GObject.ParamFlags.READWRITE |
                                      GObject.ParamFlags.CONSTRUCT_ONLY,
                                      CARD_STORE_TYPE_ARTICLE_CARD,
                                      CARD_STORE_TYPE_MAX,
                                      CARD_STORE_TYPE_ARTICLE_CARD)
    }
});

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

const DiscoveryFeedWordStore = new Lang.Class({
    Name: 'DiscoveryFeedWordStore',
    Extends: GObject.Object,
    Properties: {
        'word': GObject.ParamSpec.string('word',
                                         '',
                                         '',
                                         GObject.ParamFlags.READWRITE |
                                         GObject.ParamFlags.CONSTRUCT_ONLY,
                                         ''),
        'word-type': GObject.ParamSpec.string('word-type',
                                              '',
                                              '',
                                              GObject.ParamFlags.READWRITE |
                                              GObject.ParamFlags.CONSTRUCT_ONLY,
                                              ''),
        'definition': GObject.ParamSpec.string('definition',
                                               '',
                                               '',
                                               GObject.ParamFlags.READWRITE |
                                               GObject.ParamFlags.CONSTRUCT_ONLY,
                                               '')
    }
});

const DiscoveryFeedQuoteStore = new Lang.Class({
    Name: 'DiscoveryFeedQuoteStore',
    Extends: GObject.Object,
    Properties: {
        'quote': GObject.ParamSpec.string('quote',
                                          '',
                                          '',
                                          GObject.ParamFlags.READWRITE |
                                          GObject.ParamFlags.CONSTRUCT_ONLY,
                                          ''),
        'author': GObject.ParamSpec.string('author',
                                           '',
                                           '',
                                           GObject.ParamFlags.READWRITE |
                                           GObject.ParamFlags.CONSTRUCT_ONLY,
                                           '')
    }
});

const DiscoveryFeedWordQuotePairStore = new Lang.Class({
    Name: 'DiscoveryFeedQuotePairStore',
    Extends: DiscoveryFeedCardStore,
    Properties: {
        'quote': GObject.ParamSpec.object('quote',
                                          '',
                                          '',
                                          GObject.ParamFlags.READWRITE |
                                          GObject.ParamFlags.CONSTRUCT_ONLY,
                                          DiscoveryFeedQuoteStore.$gtype),
        'word': GObject.ParamSpec.object('word',
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

const DiscoveryFeedKnowlegeArtworkCardStore = new Lang.Class({
    Name: 'DiscoveryFeedKnowlegeArtworkCardStore',
    Extends: DiscoveryFeedCardStore,
    Properties: {
        'title': GObject.ParamSpec.string('title',
                                          '',
                                          '',
                                          GObject.ParamFlags.READWRITE |
                                          GObject.ParamFlags.CONSTRUCT_ONLY,
                                          ''),
        'author': GObject.ParamSpec.string('author',
                                           '',
                                           '',
                                           GObject.ParamFlags.READWRITE |
                                           GObject.ParamFlags.CONSTRUCT_ONLY,
                                           ''),
        'thumbnail': GObject.ParamSpec.object('thumbnail',
                                              '',
                                              '',
                                              GObject.ParamFlags.READWRITE |
                                              GObject.ParamFlags.CONSTRUCT_ONLY,
                                              Gio.InputStream),
        'layout-direction': GObject.ParamSpec.int('layout-direction',
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


const DiscoveryFeedKnowledgeAppCardStore = new Lang.Class({
    Name: 'DiscoveryFeedKnowledgeAppCardStore',
    Extends: DiscoveryFeedAppCardStore,
    Properties: {
        'title': GObject.ParamSpec.string('title',
                                          '',
                                          '',
                                          GObject.ParamFlags.READWRITE |
                                          GObject.ParamFlags.CONSTRUCT_ONLY,
                                          ''),
        'uri': GObject.ParamSpec.string('uri',
                                        '',
                                        '',
                                        GObject.ParamFlags.READWRITE |
                                        GObject.ParamFlags.CONSTRUCT_ONLY,
                                        ''),
        'synopsis': GObject.ParamSpec.string('synopsis',
                                             '',
                                             '',
                                             GObject.ParamFlags.READWRITE |
                                             GObject.ParamFlags.CONSTRUCT_ONLY,
                                             ''),
        'thumbnail': GObject.ParamSpec.object('thumbnail',
                                              '',
                                              '',
                                              GObject.ParamFlags.READWRITE |
                                              GObject.ParamFlags.CONSTRUCT_ONLY,
                                              Gio.InputStream),
        'bus-name': GObject.ParamSpec.string('bus-name',
                                             '',
                                             '',
                                             GObject.ParamFlags.READWRITE |
                                             GObject.ParamFlags.CONSTRUCT_ONLY,
                                             ''),
        'knowledge-search-object-path': GObject.ParamSpec.string('knowledge-search-object-path',
                                                                 '',
                                                                 '',
                                                                 GObject.ParamFlags.READWRITE |
                                                                 GObject.ParamFlags.CONSTRUCT_ONLY,
                                                                 ''),
        'knowledge-app-id': GObject.ParamSpec.string('knowledge-app-id',
                                                     '',
                                                     '',
                                                     GObject.ParamFlags.READWRITE |
                                                     GObject.ParamFlags.CONSTRUCT_ONLY,
                                                     ''),
        'layout-direction': GObject.ParamSpec.int('layout-direction',
                                                  '',
                                                  '',
                                                  GObject.ParamFlags.READWRITE |
                                                  GObject.ParamFlags.CONSTRUCT_ONLY,
                                                  LAYOUT_DIRECTION_IMAGE_FIRST,
                                                  LAYOUT_DIRECTION_IMAGE_LAST,
                                                  LAYOUT_DIRECTION_IMAGE_FIRST)
    },

    _init: function(params) {
        params.type = CARD_STORE_TYPE_ARTICLE_CARD;
        this.parent(params);
    }
});

const DiscoveryFeedCard = new Lang.Class({
    Name: 'DiscoveryFeedCard',
    Extends: Gtk.Box,
    Properties: {
        'source-title': GObject.ParamSpec.string('source-title',
                                                 '',
                                                 '',
                                                 GObject.ParamFlags.READWRITE |
                                                 GObject.ParamFlags.CONSTRUCT_ONLY,
                                                 ''),
        'title': GObject.ParamSpec.string('title',
                                          '',
                                          '',
                                          GObject.ParamFlags.READWRITE |
                                          GObject.ParamFlags.CONSTRUCT_ONLY,
                                          ''),
        'synopsis': GObject.ParamSpec.string('synopsis',
                                             '',
                                             '',
                                             GObject.ParamFlags.READWRITE |
                                             GObject.ParamFlags.CONSTRUCT_ONLY,
                                             ''),
        'thumbnail-data': GObject.ParamSpec.object('thumbnail-data',
                                                   '',
                                                   '',
                                                   GObject.ParamFlags.READWRITE |
                                                   GObject.ParamFlags.CONSTRUCT_ONLY,
                                                   Gio.InputStream),
        'layout-direction': GObject.ParamSpec.int('layout-direction',
                                                  '',
                                                  '',
                                                  GObject.ParamFlags.READWRITE |
                                                  GObject.ParamFlags.CONSTRUCT_ONLY,
                                                  LAYOUT_DIRECTION_IMAGE_FIRST,
                                                  LAYOUT_DIRECTION_IMAGE_LAST,
                                                  LAYOUT_DIRECTION_IMAGE_FIRST)
    },
    Signals: {
        'activate': [ ]
    },
    Template: 'resource:///com/endlessm/DiscoveryFeed/content-card.ui',
    Children: [
        'title-label',
        'synopsis-label',
        'thumbnail-container',
        'app-icon',
        'app-label',
        'content-layout',
        'content-button'
    ],

    _init: function(params) {
        this.parent(params);
        this.title_label.label = this.title;
        this.synopsis_label.label = this.synopsis;
        this._knowledgeSearchProxy = null;

        if (this.thumbnail_data) {
            let frame = new ImageCoverFrame.ImageCoverFrame({
                hexpand: true
            });
            try {
                frame.set_content(this.thumbnail_data);
            } catch (e) {
                log('Couldn\'t load thumbnail data from file');
            }
            this.thumbnail_container.add(frame);
        }

        this.app_label.label = this.source_title;

        // If this is an odd card, adjust the packing order of all widgets
        // in the box
        if (this.layout_direction == LAYOUT_DIRECTION_IMAGE_FIRST) {
            this.content_layout.get_children().forEach(Lang.bind(this, function(child) {
                this.content_layout.child_set_property(child,
                                                       'pack-type',
                                                       Gtk.PackType.END);
            }));
        }

        // Connect to the realize signal of the button and set
        // the pointer cursor over its event window once the event
        // window has been created.
        this.content_button.connect('realize', Lang.bind(this, function(widget) {
            widget.get_event_window().set_cursor(Gdk.Cursor.new_from_name(Gdk.Display.get_default(),
                                                                          'pointer'));
        }));
        this.content_button.connect('clicked', Lang.bind(this, function() {
            this.emit('activate');
        }));
    }
});

const DiscoveryFeedKnowledgeAppCard = new Lang.Class({
    Name: 'DiscoveryFeedKnowledgeAppCard',
    Extends: Gtk.Box,
    Properties: {
        'model': GObject.ParamSpec.object('model',
                                          '',
                                          '',
                                          GObject.ParamFlags.READWRITE |
                                          GObject.ParamFlags.CONSTRUCT_ONLY,
                                          DiscoveryFeedKnowledgeAppCardStore.$gtype)
    },

    _init: function(params) {
        params.visible = true;
        this.parent(params);

        // Read the desktop file and then set the app icon and label
        // appropriately
        this._app = Gio.DesktopAppInfo.new(params.model.desktop_id);
        let card = new DiscoveryFeedCard({
            title: params.model.title,
            synopsis: params.model.synopsis,
            thumbnail_data: params.model.thumbnail,
            source_title: this._app.get_display_name().toUpperCase(),
            layout_direction: params.model.layout_direction
        })
        this.add(card);
        card.connect('activate', Lang.bind(this, function() {
            if (!this._knowledgeSearchProxy) {
                this._app.launch([], null);
                return;
            }

            this._knowledgeSearchProxy.LoadItemRemote(this.model.uri, '', timestamp, Lang.bind(this, function(result, excp) {
                if (!excp)
                    return;
                logError(excp, 'Could not load app with article ' + this.model.uri + ' fallback to just launch the app, trace');
                this._app.launch([], null);
            }));
        }));

        if (this.model.knowledge_search_object_path) {
            let onProxyReady = function(initable, error) {
                if (error) {
                    logError(error, 'Could not create proxy for ' + this.model.knowledge_search_object_path);
                    return;
                }
                log('Created proxy for ' + this.model.knowledge_search_object_path);
            };

            let interfaceWrapper = Gio.DBusProxy.makeProxyWrapper(KnowledgeSearchIface);
            this._knowledgeSearchProxy = interfaceWrapper(Gio.DBus.session,
                                                          this.model.knowledge_app_id,
                                                          this.model.knowledge_search_object_path,
                                                          Lang.bind(this,
                                                                    onProxyReady));
        }
    }
});

const DiscoveryFeedKnowledgeArtworkCard = new Lang.Class({
    Name: 'DiscoveryFeedKnowledgeArtworkCard',
    Extends: Gtk.Box,
    Properties: {
        model: GObject.ParamSpec.object('model',
                                        '',
                                        '',
                                        GObject.ParamFlags.READWRITE |
                                        GObject.ParamFlags.CONSTRUCT_ONLY,
                                        DiscoveryFeedKnowlegeArtworkCardStore.$gtype)
    },

    _init: function(params) {
        params.visible = true;
        this.parent(params);

        this.add(new DiscoveryFeedCard({
            title: params.model.title,
            synopsis: 'by ' + params.model.author,
            thumbnail_data: params.model.thumbnail,
            source_title: 'Masterpiece of the Day'.toUpperCase(),
            layout_direction: params.model.layout_direction
        }));
        this.get_style_context().add_class('artwork');
    }
});

const DiscoveryFeedWordQuotePair = new Lang.Class({
    Name: 'DiscoveryFeedWordQuotePair',
    Extends: Gtk.Box,
    Template: 'resource:///com/endlessm/DiscoveryFeed/word-quote-pair.ui',
    Properties: {
        'model': GObject.ParamSpec.object('model',
                                          '',
                                          '',
                                          GObject.ParamFlags.READWRITE |
                                          GObject.ParamFlags.CONSTRUCT_ONLY,
                                          DiscoveryFeedWordQuotePairStore.$gtype)
    },
    Children: [
        'word',
        'quote',
        'word-description',
        'quote-author'
    ],

    _init: function(params) {
        this.parent(params);

        this.word.label = this.model.word.word;
        this.word_description.label = '(' + this.model.word.word_type + ') ' + this.model.word.definition;
        this.quote.label = '"' + this.model.quote.quote + '"';
        this.quote_author.label = this.model.quote.author.toUpperCase();
    }
});

const DiscoveryFeedListItem = new Lang.Class({
    Name: 'DiscoveryFeedListItem',
    Extends: Gtk.ListBoxRow,
    Template: 'resource:///com/endlessm/DiscoveryFeed/content-list-item.ui',
    Properties: {
        'content': GObject.ParamSpec.object('content',
                                            '',
                                            '',
                                            GObject.ParamFlags.READWRITE |
                                            GObject.ParamFlags.CONSTRUCT_ONLY,
                                            Gtk.Widget)
    },

    _init: function(params) {
        this.parent(params);
        this.add(this.content);
    }
});

function contentViewFromType(type, store) {
    let params = { model: store };
    switch (type) {
    case CARD_STORE_TYPE_ARTICLE_CARD:
        return new DiscoveryFeedKnowledgeAppCard(params);
    case CARD_STORE_TYPE_WORD_QUOTE_CARD:
        return new DiscoveryFeedWordQuotePair(params);
    case CARD_STORE_TYPE_ARTWORK_CARD:
        return new DiscoveryFeedKnowledgeArtworkCard(params);
    default:
        throw new Error('Card type ' + type + ' not recognized');
    }
}

function populateCardsListFromStore(store) {
    return new DiscoveryFeedListItem({
        content: contentViewFromType(store.type, store)
    });
}


const DiscoveryFeedMainWindow = new Lang.Class({
    Name: 'DiscoveryFeedMainWindow',
    Extends: Gtk.ApplicationWindow,
    Properties: {
        'card-model': GObject.ParamSpec.object('card-model',
                                               '',
                                               '',
                                               GObject.ParamFlags.READWRITE |
                                               GObject.ParamFlags.CONSTRUCT_ONLY,
                                               Gio.ListModel)
    },
    Template: 'resource:///com/endlessm/DiscoveryFeed/main.ui',
    Children: [
        'cards',
        'today-date',
        'close-button'
    ],

    _init: function(params) {
        this.parent(params);
        this.cards.bind_model(this.card_model, populateCardsListFromStore);
        this.today_date.label = (new Date()).toLocaleFormat('%B %e').toUpperCase();

        // Add an action so that we can dismiss the view by pressing the
        // escape key or by pressing the close button
        let escAction = new Gio.SimpleAction({ name: 'close' });
        escAction.connect('activate', Lang.bind(this, function() {
            this.visible = false;
        }));

        this.add_action(escAction);
        this.application.set_accels_for_action('win.close', ['Escape']);
        this.close_button.set_action_name('win.close');
    },
});

function load_style_sheet(resourcePath) {
    let provider = new Gtk.CssProvider();
    provider.load_from_resource(resourcePath);
    Gtk.StyleContext.add_provider_for_screen(Gdk.Screen.get_default(),
                                             provider,
                                             Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
}

function find_thumbnail_in_shards (shards, thumbnail_uri) {
    for (let i = 0; i < shards.length; i++) {
        let shard_file = new EosShard.ShardFile({ path: shards[i] });
        shard_file.init(null);
        let record = shard_file.find_record_by_hex_name(normalize_ekn_id(thumbnail_uri));
        if (record === null)
            continue;
        let data = record.data;
        if (data === null)
            continue;
        let stream = data.get_stream();
        if (stream === null)
            continue;
        return data.get_stream();
    }
    log('Thumbnail with uri ' +  thumbnail_uri + ' could not be found in shards.');
    return null;
}

// from a famous frog
function normalize_ekn_id (ekn_id) {
    if (ekn_id.startsWith('ekn://')) {
        return ekn_id.split('/').pop();
    }
    return ekn_id;
}

function appendArticleCardsFromShardsAndItems(shards, items, proxy, model, appendFunc) {
    items.forEach(function(response) {
        try {
            response.forEach(function(entry) {
                let thumbnail = find_thumbnail_in_shards(shards, entry.thumbnail_uri);

                appendFunc(model, modelIndex => new DiscoveryFeedKnowledgeAppCardStore({
                    title: entry.title,
                    synopsis: TextSanitization.synopsis(entry.synopsis),
                    thumbnail: thumbnail,
                    desktop_id: proxy.desktopId,
                    bus_name: proxy.busName,
                    knowledge_search_object_path: proxy.knowledgeSearchObjectPath,
                    knowledge_app_id: proxy.knowledgeAppId,
                    uri: entry.ekn_id,
                    layout_direction: modelIndex % 2 === 0 ? LAYOUT_DIRECTION_IMAGE_FIRST : LAYOUT_DIRECTION_IMAGE_LAST
                }));
            });
        } catch (e) {
            logError(e, 'Could not parse response');
        }
    });
}

function appendDiscoveryFeedQuoteToModelFromProxy(quoteProxy, wordProxy, model, appendToModel) {
    let quote, word;
    quoteProxy.iface.GetQuoteOfTheDayRemote(function(results, error) {
        if (error) {
            logError(error, 'Failed to execute Discovery Feed Quote query');
            return;
        }
        try {
            quote = results[0];
            wordProxy.iface.GetWordOfTheDayRemote(function(results, error) {
                if (error) {
                    logError(error, 'Failed to execute Discovery Feed Word query');
                    return;
                }
                try {
                    word = results[0];
                    appendToModel(model, modelIndex => new DiscoveryFeedWordQuotePairStore({
                        quote: new DiscoveryFeedQuoteStore({
                            quote: TextSanitization.synopsis(quote.synopsis),
                            author: quote.title
                        }),
                        word: new DiscoveryFeedWordStore({
                            word: word.title,
                            definition: TextSanitization.synopsis(word.synopsis),
                            word_type: word.license
                        })
                    }));
                } catch (e) {
                    logError(e, 'Could not parse response');
                }
            });
        } catch (e) {
            logError(e, 'Could not parse response');
        }
    });
}

function appendDiscoveryFeedContentToModelFromProxy(proxy, model, appendToModel) {
    proxy.iface.ArticleCardDescriptionsRemote(function(results, error) {
        if (error) {
            logError(error, 'Failed to execute Discovery Feed Content query');
            return;
        }
        appendArticleCardsFromShardsAndItems(results[0],
                                             results.slice(1, results.length),
                                             proxy,
                                             model,
                                             appendToModel);
    });
}

function appendDiscoveryFeedNewsToModelFromProxy(proxy, model, appendToModel) {
    proxy.iface.GetRecentNewsRemote(function(results, error) {
        if (error) {
            logError(error, 'Failed to execute Discovery Feed News query');
            return;
        }
        appendArticleCardsFromShardsAndItems(results[0],
                                             results.slice(1, results.length),
                                             proxy,
                                             model,
                                             appendToModel);
    });
}

function populateDiscoveryFeedModelFromQueries(model, proxies) {
    let modelIndex = 0;
    model.remove_all();

    let indexInsertFuncs = {
        '4': (modelIndex) => {
            let thumbnail_uri = 'resource:///com/endlessm/DiscoveryFeed/img/summertime-1894.jpg';
            model.append(new DiscoveryFeedKnowlegeArtworkCardStore({
                title: 'Summertime',
                author: 'Mary Cassat',
                thumbnail: Gio.File.new_for_uri(thumbnail_uri).read(null),
                layout_direction: modelIndex % 2 === 0 ? LAYOUT_DIRECTION_IMAGE_FIRST : LAYOUT_DIRECTION_IMAGE_LAST
            }));
            modelIndex++;
        }
    };

    let appendToModel = function(model, modelBuildForIndexFunc) {
        // We don't necessarily want to increment modelIndex
        // here - only if we are displaying a card where the
        // image and content should be flipped
        if (indexInsertFuncs[modelIndex]) {
            indexInsertFuncs[modelIndex](modelIndex);
        }

        model.append(modelBuildForIndexFunc(modelIndex));
        modelIndex++;
    };

    let quoteProxy, wordProxy;
    proxies.forEach(function(proxy) {
        switch (proxy.interfaceName) {
        case 'com.endlessm.DiscoveryFeedContent':
            appendDiscoveryFeedContentToModelFromProxy(proxy, model, appendToModel);
            break;
        case 'com.endlessm.DiscoveryFeedQuote':
        {
            quoteProxy = proxy;
            break;
        }
        case 'com.endlessm.DiscoveryFeedWord':
        {
            wordProxy = proxy;
            break;
        }
        case 'com.endlessm.DiscoveryFeedNews':
            appendDiscoveryFeedNewsToModelFromProxy(proxy, model, appendToModel);
            break;
        default:
            throw new Error('Don\'t know how to handle interface ' + proxy.interfaceName);
        }
    });
    appendDiscoveryFeedQuoteToModelFromProxy(quoteProxy, wordProxy, model, appendToModel);
}

const DiscoveryFeedApplication = new Lang.Class({
    Name: 'DiscoveryFeedApplication',
    Extends: Gtk.Application,

    _init: function() {
        this.parent({ application_id: pkg.name });
        GLib.set_application_name(_('Discovery Feed'));
        this.Visible = false;
        this._changedSignalId = 0;
        this._discoveryFeedProxies = [];
        this._contentAppIds = [];
        this._discoveryFeedCardModel = new Gio.ListStore({
            item_type: DiscoveryFeedCardStore.$gtype
        });
    },

    vfunc_startup: function() {
        this.parent();

        load_style_sheet('/com/endlessm/DiscoveryFeed/application.css');

        this._window = new DiscoveryFeedMainWindow({
            application: this,
            type_hint: Gdk.WindowTypeHint.DOCK,
            role: SIDE_COMPONENT_ROLE,
            card_model: this._discoveryFeedCardModel,
            opacity: 0.9
        });

        this._window.connect('notify::visible', Lang.bind(this, this._on_visibility_changed));
        // There seems to be a race condition with the WM that can
        // lead the sidebar into an inconsistent state if the
        // _on_active_window_changed callback gets executed in such a
        // way that ends up calling to hide() between the user pressed
        // the tray button and the sidebar has been made visible,
        // which can lead to the sidebar never been displayed.
        this._window.connect('map-event', Lang.bind(this, function() {
            if (!this._changedSignalId) {
                this._changedSignalId = Wnck.Screen.get_default().connect('active-window-changed',
                                                                          Lang.bind(this, this._on_active_window_changed));
            }
            return false;
        }));
        this._window.connect('unmap', Lang.bind(this, function() {
            if (this._changedSignalId) {
                Wnck.Screen.get_default().disconnect(this._changedSignalId);
                this._changedSignalId = 0;
            }
        }));

        // update position when workarea changes
        let display = Gdk.Display.get_default();
        display.connect('monitor-added', Lang.bind(this,
                                                   this._update_geometry));
        display.connect('monitor-removed', Lang.bind(this,
                                                     this._update_geometry));
        let monitor = display.get_primary_monitor();
        monitor.connect('notify::workarea', Lang.bind(this,
                                                      this._update_geometry));
        this._update_geometry();
    },

    vfunc_dbus_register: function(connection, path) {
        this._dbusImpl = Gio.DBusExportedObject.wrapJSObject(DiscoveryFeedIface, this);
        this._dbusImpl.export(Gio.DBus.session, path);

        let providers = readDiscoveryFeedProvidersInDataDirectories();
        let onProxiesInstantiated = Lang.bind(this, function(proxies) {
            Array.prototype.push.apply(this._discoveryFeedProxies, proxies);
            populateDiscoveryFeedModelFromQueries(this._discoveryFeedCardModel,
                                                  this._discoveryFeedProxies);
        });
        instantiateObjectsFromDiscoveryFeedProviders(connection,
                                                     providers,
                                                     onProxiesInstantiated);

        return this.parent(connection, path);
    },

    vfunc_activate: function() {
        // This does nothing -we should only show when the shell asks us
    },

    show: function(timestamp) {
        this._window.show();
        this._window.present_with_time(timestamp);

        populateDiscoveryFeedModelFromQueries(this._discoveryFeedCardModel,
                                              this._discoveryFeedProxies);
    },

    hide: function() {
        this._window.hide();
    },

    _on_visibility_changed: function() {
        this.Visible = this._window.is_visible();
        let propChangedVariant = new GLib.Variant('(sa{sv}as)', [
            DISCOVERY_FEED_IFACE, {
                'Visible': new GLib.Variant('b', this.Visible)
            },
            []
        ]);

        Gio.DBus.session.emit_signal(null,
                                     DISCOVERY_FEED_PATH,
                                     'org.freedesktop.DBus.Properties',
                                     'PropertiesChanged',
                                     propChangedVariant);
    },

    _on_active_window_changed: function() {
        let active_window = Wnck.Screen.get_default().get_active_window();
        let current_window = this._window.get_window();
        let active_window_xid = active_window ? active_window.get_xid() : 0;
        let current_window_xid = current_window ? current_window.get_xid() : 0;

        if (active_window !== null) {
            // try to match transient windows
            let transient_window = active_window.get_transient();

            if (transient_window !== null &&
                current_window_xid === transient_window.get_xid()) {
                return;
            }
        }

        if (active_window_xid !== current_window_xid) {
            this.hide();
        }
    },

    _update_geometry: function() {
        let monitor = Gdk.Display.get_default().get_primary_monitor();
        let workarea = monitor.get_workarea();

        let geometry = {
            width: this._window.get_size()[0],
            height: workarea.height,
            y: workarea.y
        };

        geometry.x = workarea.x + ((workarea.width - geometry.width) * 0.5);
        this._window.move(geometry.x, geometry.y);

        // We'll take up 7/8ths of the screen height, leaving
        // some below
        this._window.resize(geometry.width, geometry.height * (7 / 8));
    }
});

function main(argv) { // eslint-disable-line no-unused-vars
    return (new DiscoveryFeedApplication()).run(argv);
}

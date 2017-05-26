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

const Cairo = imports.cairo;
const EosShard = imports.gi.EosShard;
const EosMetrics = imports.gi.EosMetrics;
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

const DiscoveryFeedNewsIface = '\
<node> \
  <interface name="com.endlessm.DiscoveryFeedNews"> \
    <method name="GetRecentNews"> \
      <arg type="as" name="Shards" direction="out" /> \
      <arg type="aa{ss}" name="Result" direction="out" /> \
    </method> \
  </interface> \
</node>';

const DiscoveryFeedInstallableAppsIface = '\
<node> \
  <interface name="com.endlessm.DiscoveryFeedInstallableApps"> \
    <method name="GetInstallableApps"> \
      <arg type="aa{sv}" name="Results" direction="out" /> \
    </method> \
  </interface> \
</node>';

const DiscoveryFeedVideoIface = '\
<node> \
  <interface name="com.endlessm.DiscoveryFeedVideo"> \
    <method name="GetVideos"> \
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
        'com.endlessm.DiscoveryFeedNews': Gio.DBusProxy.makeProxyWrapper(DiscoveryFeedNewsIface),
        'com.endlessm.DiscoveryFeedInstallableApps': Gio.DBusProxy.makeProxyWrapper(DiscoveryFeedInstallableAppsIface),
        'com.endlessm.DiscoveryFeedVideo': Gio.DBusProxy.makeProxyWrapper(DiscoveryFeedVideoIface),
        'com.endlessm.DiscoveryFeedQuote': Gio.DBusProxy.makeProxyWrapper(DiscoveryFeedQuoteIface),
        'com.endlessm.DiscoveryFeedWord': Gio.DBusProxy.makeProxyWrapper(DiscoveryFeedWordIface)
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


const EVENT_DISCOVERY_FEED_OPEN = 'd54cbd8c-c977-4dac-ae72-535ad5633877';
const EVENT_DISCOVERY_FEED_CLOSE = 'e7932cbd-7c20-49eb-94e9-4bf075e0c0c0';
const EVENT_DISCOVERY_FEED_CLICK = 'f2f31a64-2193-42b5-ae39-ca0b4d1f0691';

// recordMetricsEvent
//
// Called whenever we want to record a metrics event for the discovery feed.
// This will only ever be called if metrics are turned on, which they are off
// by default.
//
// The caller is responsible for passing the correct payload (serialized as
// a GVariant for the given event ID).
function recordMetricsEvent(eventId, payload) {
    EosMetrics.EventRecorder.get_default().record_event(eventId, payload);
}

const CARD_STORE_TYPE_ARTICLE_CARD = 0;
const CARD_STORE_TYPE_WORD_QUOTE_CARD = 1;
const CARD_STORE_TYPE_ARTWORK_CARD = 2;
const CARD_STORE_TYPE_AVAILABLE_APPS = 3;
const CARD_STORE_TYPE_VIDEO_CARD = 4;
const CARD_STORE_TYPE_MAX = CARD_STORE_TYPE_VIDEO_CARD;

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
        params.type = params.type || CARD_STORE_TYPE_ARTICLE_CARD;
        this.parent(params);
    }
});

const DiscoveryFeedKnowledgeAppVideoCardStore = new Lang.Class({
    Name: 'DiscoveryFeedKnowledgeAppVideoCardStore',
    Extends: DiscoveryFeedKnowledgeAppCardStore,
    Properties: {
        'duration': GObject.ParamSpec.string('duration',
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
                                    DISCOVERY_FEED_APP_TYPE_BASIC)
    }
});

const DiscoveryFeedAppStoreLinkStore = new Lang.Class({
    Name: 'DiscoveryFeedAppStoreLinkStore',
    Extends: DiscoveryFeedAppStore,

    _init: function(params) {
        let thumbnail_uri = 'resource:///com/endlessm/DiscoveryFeed/img/explore.png';
        params.title = _('Explore the App Center'),
        params.thumbnail_data = Gio.File.new_for_uri(thumbnail_uri).read(null),
        params.app_id = 'org.gnome.Software',
        params.type = DISCOVERY_FEED_APP_TYPE_APP_STORE_LINK;
        this.parent(params);
    }
});

const DiscoveryFeedInstallableAppStore = new Lang.Class({
    Name: 'DiscoveryFeedInstallableAppStore',
    Extends: DiscoveryFeedAppStore,
    Properties: {
        'synopsis': GObject.ParamSpec.string('synopsis',
                                             '',
                                             '',
                                             GObject.ParamFlags.CONSTRUCT_ONLY |
                                             GObject.ParamFlags.READWRITE,
                                             ''),
        'icon': GObject.ParamSpec.object('icon',
                                          '',
                                          '',
                                          GObject.ParamFlags.READWRITE |
                                          GObject.ParamFlags.CONSTRUCT_ONLY,
                                          Gio.Icon)
    },

    _init: function(params) {
        params.type = DISCOVERY_FEED_APP_TYPE_DETAILED;
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

        if (this.thumbnail_data) {
            let frame = new ImageCoverFrame.ImageCoverFrame({
                hexpand: true
            });
            frame.set_content(this.thumbnail_data);
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

// loadKnowledgeAppContent
//
// Try to load a specific EknURI in a knowledge app, opening the app
// itself if that fails.
function loadKnowledgeAppContent(app, knowledgeSearchProxy, uri, contentType) {
    recordMetricsEvent(EVENT_DISCOVERY_FEED_CLICK, new GLib.Variant('a{ss}', {
        app_id: app.get_id(),
        content_type: contentType
    }));

    if (!knowledgeSearchProxy) {
        app.launch([], null);
        return;
    }

    knowledgeSearchProxy.LoadItemRemote(uri, '', Gdk.CURRENT_TIME, function(result, excp) {
        if (!excp)
            return;
        logError(excp, 'Could not load app with article ' + uri + ' fallback to just launch the app, trace');
        app.launch([], null);
    });
}

// createSearchProxyFromObjectPath
//
// Using the given object path, create a KnowledgeSearchProxy from it
// asynchronously
function createSearchProxyFromObjectPath(appId, objectPath) {
    if (objectPath) {
        let onProxyReady = function(initable, error) {
            if (error) {
                logError(error, 'Could not create proxy for ' + objectPath);
                return;
            }
            log('Created proxy for ' + objectPath);
        };

        let interfaceWrapper = Gio.DBusProxy.makeProxyWrapper(KnowledgeSearchIface);
        return interfaceWrapper(Gio.DBus.session,
                                appId,
                                objectPath,
                                onProxyReady);
    }

    return null;
}

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
        });
        this.add(card);
        card.connect('activate', Lang.bind(this, function() {
            loadKnowledgeAppContent(this._app,
                                    this._knowledgeSearchProxy,
                                    this.model.uri,
                                    'knowledge_article');
        }));
        this._knowledgeSearchProxy = createSearchProxyFromObjectPath(this.model.knowledge_app_id,
                                                                     this.model.knowledge_search_object_path);
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

const PLAY_BUTTON_IMAGE = (function() {
    let surface = new Cairo.ImageSurface(Cairo.Format.ARGB32, 200, 200);
    let cr = new Cairo.Context(surface);

    // Circle
    cr.setSourceRGBA(0, 0, 0, 1.0);
    cr.arc(100, 100, 50, 0, 2 * Math.PI);
    cr.fill();

    // Play icon itself
    cr.setSourceRGBA(1, 1, 1, 1.0);

    // Simple equilateral triangle
    cr.moveTo(130, 100);
    cr.lineTo(80, 130);
    cr.lineTo(80, 70);
    cr.closePath();
    cr.fill();

    let pixbuf = Gdk.pixbuf_get_from_surface(surface, 0, 0, 200, 200);
    cr.$dispose();

    return pixbuf;
})();

const DiscoveryFeedVideoCard = new Lang.Class({
    Name: 'DiscoveryFeedVideoCard',
    Extends: Gtk.Box,
    Properties: {
        title: GObject.ParamSpec.string('title',
                                        '',
                                        '',
                                        GObject.ParamFlags.READWRITE |
                                        GObject.ParamFlags.CONSTRUCT_ONLY,
                                        ''),
        source_name: GObject.ParamSpec.string('source_name',
                                              '',
                                              '',
                                              GObject.ParamFlags.READWRITE |
                                              GObject.ParamFlags.CONSTRUCT_ONLY,
                                              ''),
        duration: GObject.ParamSpec.string('duration',
                                           '',
                                           '',
                                           GObject.ParamFlags.READWRITE |
                                           GObject.ParamFlags.CONSTRUCT_ONLY,
                                           ''),
        thumbnail_data: GObject.ParamSpec.object('thumbnail-data',
                                                 '',
                                                 '',
                                                 GObject.ParamFlags.READWRITE |
                                                 GObject.ParamFlags.CONSTRUCT_ONLY,
                                                 Gio.InputStream)
    },
    Signals: {
        'activate': [ ]
    },
    Template: 'resource:///com/endlessm/DiscoveryFeed/video-card.ui',
    Children: [
        'title-label',
        'app-label',
        'thumbnail-container',
        'content-button',
        'play-button-overlay',
        'duration-label'
    ],

    _init: function(params) {
        params.visible = true;
        this.parent(params);

        if (this.thumbnail_data) {
            let frame = new ImageCoverFrame.ImageCoverFrame({
                hexpand: true
            });
            frame.set_content(this.thumbnail_data);
            this.thumbnail_container.add(frame);
        }

        this.app_label.label = this.source_name;
        this.title_label.label = this.title;
        this.duration_label.label = this.duration;

        this.play_button_overlay.set_from_pixbuf(PLAY_BUTTON_IMAGE);

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

const DiscoveryFeedKnowledgeVideoCard = new Lang.Class({
    Name: 'DiscoveryFeedKnowledgeVideoCard',
    Extends: Gtk.Box,
    Properties: {
        model: GObject.ParamSpec.object('model',
                                        '',
                                        '',
                                        GObject.ParamFlags.READWRITE |
                                        GObject.ParamFlags.CONSTRUCT_ONLY,
                                        DiscoveryFeedKnowledgeAppVideoCardStore.$gtype)
    },

    _init: function(params) {
        params.visible = true;
        this.parent(params);

        this._app = Gio.DesktopAppInfo.new(params.model.desktop_id);
        let card = new DiscoveryFeedVideoCard({
            title: params.model.title,
            duration: params.model.duration,
            thumbnail_data: params.model.thumbnail,
            source_name: this._app.get_display_name().toUpperCase(),
        });
        this.add(card);
        this.get_style_context().add_class('artwork');

        card.connect('activate', Lang.bind(this, function() {
            loadKnowledgeAppContent(this._app,
                                    this._knowledgeSearchProxy,
                                    this.model.uri,
                                    'knowledge_video');
        }));
        this._knowledgeSearchProxy = createSearchProxyFromObjectPath(this.model.knowledge_app_id,
                                                                     this.model.knowledge_search_object_path);
    }
});

const DiscoveryFeedWordQuotePair = new Lang.Class({
    Name: 'DiscoveryFeedWordQuotePair',
    Extends: Gtk.Button,
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

        this.connect('clicked', function() {
            recordMetricsEvent(EVENT_DISCOVERY_FEED_CLICK, new GLib.Variant('a{ss}', {
                app_id: 'com.endlessm.WordOfTheDay'
            }));
        });
    }
});

const DiscoveryFeedInstallableAppCard = new Lang.Class({
    Name: 'DiscoveryFeedInstallableAppCard',
    Extends: Gtk.Box,
    Template: 'resource:///com/endlessm/DiscoveryFeed/installable-app-card.ui',
    Properties: {
        'model': GObject.ParamSpec.object('model',
                                          '',
                                          '',
                                          GObject.ParamFlags.READWRITE |
                                          GObject.ParamFlags.CONSTRUCT_ONLY,
                                          DiscoveryFeedInstallableAppStore.$gtype)
    },
    Children: [
        'content-button',
        'title-label',
        'app-icon',
        'synopsis-label',
        'thumbnail-container'
    ],

    _init: function(params) {
        this.parent(params);

        this.title_label.label = this.model.title;
        this.synopsis_label.label = this.model.synopsis;
        this.app_icon.set_from_gicon(this.model.icon, Gtk.IconSize.DND);

        if (this.model.thumbnail_data) {
            let frame = new ImageCoverFrame.ImageCoverFrame({
                hexpand: true
            });
            frame.set_content(this.model.thumbnail_data);
            this.thumbnail_container.add(frame);
        }

        // Connect to the realize signal of the button and set
        // the pointer cursor over its event window once the event
        // window has been created.
        this.content_button.connect('realize', Lang.bind(this, function(widget) {
            widget.get_event_window().set_cursor(Gdk.Cursor.new_from_name(Gdk.Display.get_default(),
                                                                          'pointer'));
        }));
        this.content_button.connect('clicked', Lang.bind(this, function() {
            recordMetricsEvent(EVENT_DISCOVERY_FEED_CLICK, new GLib.Variant('a{ss}', {
                app_id: this.model.app_id,
                content_type: 'software_center_app'
            }));

            Gio.DBusActionGroup.get(Gio.Application.get_default().get_dbus_connection(),
                                    'org.gnome.Software',
                                    '/org/gnome/Software')
                               .activate_action('details',
                                                new GLib.Variant('(ss)', [this.model.app_id, '']));
        }));
    }
});

const DiscoveryFeedAppStoreLinkCard = new Lang.Class({
    Name: 'DiscoveryFeedAppStoreLinkCard',
    Extends: Gtk.Box,
    Template: 'resource:///com/endlessm/DiscoveryFeed/app-store-link-card.ui',
    Properties: {
        'model': GObject.ParamSpec.object('model',
                                          '',
                                          '',
                                          GObject.ParamFlags.READWRITE |
                                          GObject.ParamFlags.CONSTRUCT_ONLY,
                                          DiscoveryFeedAppStoreLinkStore.$gtype)
    },
    Children: [
        'content-button',
        'title-label',
        'thumbnail-container'
    ],

    _init: function(params) {
        this.parent(params);

        this.title_label.label = this.model.title;

        if (this.model.thumbnail_data) {
            let frame = new ImageCoverFrame.ImageCoverFrame({
                hexpand: true
            });
            frame.set_content(this.model.thumbnail_data);
            this.thumbnail_container.add(frame);
        }

        // Connect to the realize signal of the button and set
        // the pointer cursor over its event window once the event
        // window has been created.
        this.content_button.connect('realize', Lang.bind(this, function(widget) {
            widget.get_event_window().set_cursor(Gdk.Cursor.new_from_name(Gdk.Display.get_default(),
                                                                          'pointer'));
        }));
        this.content_button.connect('clicked', Lang.bind(this, function() {
            (Gio.DesktopAppInfo.new('org.gnome.Software.desktop')).launch([], null);
        }));
    }
});

const DiscoveryFeedAvailableAppsCard = new Lang.Class({
    Name: 'DiscoveryFeedAvailableAppsCard',
    Extends: Gtk.Box,
    Template: 'resource:///com/endlessm/DiscoveryFeed/available-apps.ui',
    Children: [
        'flow-box'
    ],
    Properties: {
        'model': GObject.ParamSpec.object('model',
                                          '',
                                          '',
                                          GObject.ParamFlags.READWRITE |
                                          GObject.ParamFlags.CONSTRUCT_ONLY,
                                          DiscoveryFeedAvailableAppsStore.$gtype)
    },

    _init: function(params) {
        this.parent(params);
        this.model.apps.forEach(Lang.bind(this, function(model) {
            this.flow_box.add(new DiscoveryFeedInstallableAppCard({
                model: model
            }));
        }));
        this.flow_box.add(new DiscoveryFeedAppStoreLinkCard({
            model: new DiscoveryFeedAppStoreLinkStore({})
        }));
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
    case CARD_STORE_TYPE_AVAILABLE_APPS:
        return new DiscoveryFeedAvailableAppsCard(params);
    case CARD_STORE_TYPE_VIDEO_CARD:
        return new DiscoveryFeedKnowledgeVideoCard(params);
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

    close: function(method) {
        recordMetricsEvent(EVENT_DISCOVERY_FEED_CLOSE, new GLib.Variant('a{ss}', {
            closed_by: method,
            time: String(GLib.get_real_time() - this._openedAtTime)
        }));
        this.visible = false;
    },

    _init: function(params) {
        this.parent(params);
        this.cards.bind_model(this.card_model, populateCardsListFromStore);
        this.today_date.label = (new Date()).toLocaleFormat('%B %e').toUpperCase();

        // Add an action so that we can dismiss the view by pressing the
        // escape key or by pressing the close button
        this.connect('notify::visible', Lang.bind(this, function() {
            if (this.visible) {
                this._openedAtTime = GLib.get_real_time();
            }
        }));

        let closeCallback = function(action, payload, method) {
            this.close(method);
        };
        let buttonAction = new Gio.SimpleAction({ name: 'buttonclose' });
        let escAction = new Gio.SimpleAction({ name: 'escclose' });
        escAction.connect('activate', Lang.bind(this, closeCallback, 'escape'));
        buttonAction.connect('activate', Lang.bind(this, closeCallback, 'button'));

        this.add_action(escAction);
        this.add_action(buttonAction);
        this.application.set_accels_for_action('win.escclose', ['Escape']);
        this.close_button.set_action_name('win.buttonclose');
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

function promisifyGIO(obj, funcName, ...args) {
    return new Promise((resolve, reject) => {
        try {
            obj[funcName](...args, function() {
                try {
                    let error = Array.prototype.slice.call(arguments, -1)[0];
                    let parameters = Array.prototype.slice.call(arguments,
                                                                0,
                                                                arguments.length - 1);
                    if (error) {
                        reject(error);
                    } else {
                        resolve(parameters);
                    }
                } catch (e) {
                    reject(e);
                }
            });
        } catch (e) {
            reject(e);
        }
    });
}

function appendDiscoveryFeedQuoteWordToModel(quoteWordProxies, model, appendToModel) {
    quoteWordProxies.forEach((proxyBundle) => {
        Promise.all([
            promisifyGIO(proxyBundle.quote.iface, 'GetQuoteOfTheDayRemote').then(([results]) => results[0]),
            promisifyGIO(proxyBundle.word.iface, 'GetWordOfTheDayRemote').then(([results]) => results[0])
        ])
        .then(([quote, word]) => {
            appendToModel(model, () => new DiscoveryFeedWordQuotePairStore({
                quote: new DiscoveryFeedQuoteStore({
                    quote: TextSanitization.synopsis(quote.quote),
                    author: quote.author
                }),
                word: new DiscoveryFeedWordStore({
                    word: word.word,
                    definition: TextSanitization.synopsis(word.definition),
                    word_type: word.type
                })
            }));
        })
        .catch(e => {
            logError(e, 'Failed to retrieve quote/word content');
        });
    });
}

const N_APPS_TO_DISPLAY = 5;

function appendDiscoveryFeedInstallableAppsToModelFromProxy(proxy, model, appendToModel) {
    proxy.iface.GetInstallableAppsRemote(function(results, error) {
        if (error) {
            logError(error, 'Failed to execute Discovery Feed Installable Apps query');
            return;
        }
        results.slice(0, N_APPS_TO_DISPLAY).forEach(function(response) {
            try {
                appendToModel(model, () => new DiscoveryFeedAvailableAppsStore({}, response.map(entry =>
                    new DiscoveryFeedInstallableAppStore({
                        app_id: entry.id.get_string()[0],
                        title: entry.name.get_string()[0],
                        thumbnail_data: Gio.File.new_for_path(entry.thumbnail_uri.get_string()[0]).read(null),
                        icon: Gio.Icon.deserialize(entry.icon),
                        synopsis: entry.synopsis.get_string()[0]
                    })))
                );
            } catch (e) {
                logError(e, 'Could not parse response');
            }
        });
    });
}


function withLeadingZero(value) {
    if (value < 10)
        return '0' + value;

    return String(value);
}

function parseDuration(duration) {
    let durationTotalSeconds = Number.parseInt(duration);
    let durationHours = Math.floor(durationTotalSeconds / 3600);
    let durationMinutes = Math.floor(durationTotalSeconds / 60) % 60;
    let durationSeconds = durationTotalSeconds % 60;

    if (durationHours > 0)
        return durationHours + ':' + withLeadingZero(durationMinutes);

    return durationMinutes + ':' + withLeadingZero(durationSeconds);
}

function appendDiscoveryFeedVideoToModelFromProxy(proxy, model, appendToModel) {
    proxy.iface.GetVideosRemote(function(results, error) {
        if (error) {
            logError(error, 'Failed to execute Discovery Feed Video query');
            return;
        }

        let [shards, items] = [results[0], results.slice(1, results.length)];

        items.forEach(function(response) {
            try {
                response.forEach(function(entry) {
                    let thumbnail = find_thumbnail_in_shards(shards, entry.thumbnail_uri);

                    appendToModel(model, () => new DiscoveryFeedKnowledgeAppVideoCardStore({
                        title: entry.title,
                        thumbnail: thumbnail,
                        desktop_id: proxy.desktopId,
                        bus_name: proxy.busName,
                        knowledge_search_object_path: proxy.knowledgeSearchObjectPath,
                        knowledge_app_id: proxy.knowledgeAppId,
                        uri: entry.ekn_id,
                        duration: parseDuration(entry.duration)
                    }));
                });
            } catch (e) {
                logError(e, 'Could not parse response');
            }
        });
    });
}

// zipArraysInObject
//
// Given an object described as:
//
// {
//     a: [...]
//     b: [...]
// }
//
// Return a sequence of arrays described as
//
// [
//     {
//         a: a[n]
//         b: b[n]
//     }
// ]
function zipArraysInObject(object) {
    let minLength = Object.keys(object).reduce((v, k) =>
        v < object[k].length ? v : object[k].length ,
        Number.MAX_INT
    );
    let arr = [];

    for (let i = 0; i < minLength; ++i) {
        let ret = {};
        Object.keys(object).forEach((k) => {
            if (i < object[k].length) {
                ret[k] = object[k][i];
            }
        });

        arr.push(ret);
    }

    return arr;
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

    let wordQuoteProxies = {
        word: [],
        quote: []
    };

    proxies.forEach(function(proxy) {
        switch (proxy.interfaceName) {
        case 'com.endlessm.DiscoveryFeedContent':
            appendDiscoveryFeedContentToModelFromProxy(proxy, model, appendToModel);
            break;
        case 'com.endlessm.DiscoveryFeedNews':
            appendDiscoveryFeedNewsToModelFromProxy(proxy, model, appendToModel);
            break;
        case 'com.endlessm.DiscoveryFeedInstallableApps':
            appendDiscoveryFeedInstallableAppsToModelFromProxy(proxy, model, appendToModel);
            break;
        case 'com.endlessm.DiscoveryFeedVideo':
            appendDiscoveryFeedVideoToModelFromProxy(proxy, model, appendToModel);
            break;
        case 'com.endlessm.DiscoveryFeedQuote':
            wordQuoteProxies.quote.push(proxy);
            break;
        case 'com.endlessm.DiscoveryFeedWord':
            wordQuoteProxies.word.push(proxy);
            break;
        default:
            throw new Error('Don\'t know how to handle interface ' + proxy.interfaceName);
        }
    });

    // Note that zipArraysInObject here will zip to the shortest length
    // which means that we may not execute all proxies if there was a
    // mismatch in cardinality.
    appendDiscoveryFeedQuoteWordToModel(zipArraysInObject(wordQuoteProxies),
                                        model,
                                        appendToModel);
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

        recordMetricsEvent(EVENT_DISCOVERY_FEED_OPEN, new GLib.Variant('a{ss}', {
            opened_by: 'shell_button',
            language: GLib.get_language_names()[0]
        }));
        populateDiscoveryFeedModelFromQueries(this._discoveryFeedCardModel,
                                              this._discoveryFeedProxies);
    },

    hide: function() {
        this._window.close('lost_focus');
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

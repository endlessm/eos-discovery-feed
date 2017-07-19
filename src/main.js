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
const EosMetrics = imports.gi.EosMetrics;
const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Wnck = imports.gi.Wnck;

const Lang = imports.lang;

const ImageCoverFrame = imports.imageCoverFrame;
const ModelOrdering = imports.modelOrdering;
const Stores = imports.stores;
const TextSanitization = imports.textSanitization;

const DISCOVERY_FEED_PATH = '/com/endlessm/DiscoveryFeed';
const DISCOVERY_FEED_IFACE = 'com.endlessm.DiscoveryFeed';
const SIDE_COMPONENT_ROLE = 'eos-side-component';

const KNOWLEDGE_SEARCH_INTERFACE_NAME = 'com.endlessm.KnowledgeSearch';

const SHELL_BUS_NAME = 'org.gnome.Shell';
const SHELL_OBJECT_PATH = '/org/gnome/Shell';

const KnowledgeSearchIface = '\
<node> \
  <interface name="' + KNOWLEDGE_SEARCH_INTERFACE_NAME + '"> \
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

const AppLauncherIface = '\
<node> \
<interface name="org.gnome.Shell.AppLauncher"> \
<method name="Launch"> \
    <arg type="s" direction="in" name="name" /> \
    <arg type="u" direction="in" name="timestamp" /> \
</method> \
<method name="LaunchViaDBusCall"> \
    <arg type="s" direction="in" name="name" /> \
    <arg type="s" direction="in" name="busName" /> \
    <arg type="s" direction="in" name="objectPath" /> \
    <arg type="s" direction="in" name="interfaceName" /> \
    <arg type="s" direction="in" name="methodName" /> \
    <arg type="v" direction="in" name="args" /> \
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

const DiscoveryFeedArtworkIface = '\
<node> \
  <interface name="com.endlessm.DiscoveryFeedArtwork"> \
    <method name="ArticleCardDescriptions"> \
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

function allSettledPromises(promises) {
    // Return a Promise.all of promises that always resolve, however they
    // resolve with tuples of error and result pairs. It is up to the
    // consumer to deal with the errors as they come in.
    return Promise.all(promises.map((promise) => {
        return new Promise(function(resolve) {
            try {
                promise.then(result => resolve([null, result]))
                .catch(e => resolve([e, null]));
            } catch (e) {
                logError(e, 'Something went wrong in allSettledPromises resolution');
                resolve([e, null]);
            }
        });
    }));
}


// Gio.js does things the wrong way around which trips up promisifyGIO,
// so re-curry the arguments so that they make sense.
function makeCorrectlyOrderedProxyWrapper(iface) {
    let wrapper = Gio.DBusProxy.makeProxyWrapper(iface);
    return function(bus, name, object, cancellable, asyncCallback) {
        return wrapper(bus,
                       name,
                       object,
                       asyncCallback,
                       cancellable);
    };
}

function instantiateObjectsFromDiscoveryFeedProviders(connection,
                                                      providers) {
    let interfaceWrappers = {
        'com.endlessm.DiscoveryFeedContent': makeCorrectlyOrderedProxyWrapper(DiscoveryFeedContentIface),
        'com.endlessm.DiscoveryFeedNews': makeCorrectlyOrderedProxyWrapper(DiscoveryFeedNewsIface),
        'com.endlessm.DiscoveryFeedInstallableApps': makeCorrectlyOrderedProxyWrapper(DiscoveryFeedInstallableAppsIface),
        'com.endlessm.DiscoveryFeedVideo': makeCorrectlyOrderedProxyWrapper(DiscoveryFeedVideoIface),
        'com.endlessm.DiscoveryFeedQuote': makeCorrectlyOrderedProxyWrapper(DiscoveryFeedQuoteIface),
        'com.endlessm.DiscoveryFeedWord': makeCorrectlyOrderedProxyWrapper(DiscoveryFeedWordIface),
        'com.endlessm.DiscoveryFeedArtwork': makeCorrectlyOrderedProxyWrapper(DiscoveryFeedArtworkIface)
    };

    // Map to promises and then flat map promises
    return allSettledPromises(providers.map(provider =>
        provider.interfaces.filter(interfaceName => {
            if (Object.keys(interfaceWrappers).indexOf(interfaceName) === -1) {
                log('Filtering out unrecognised interface ' + interfaceName);
                return false;
            }

            return true;
        })
        .map((interfaceName) =>
            promisifyGIO(interfaceWrappers,
                         interfaceName,
                         connection,
                         provider.name,
                         provider.path,
                         null)
            .then(([proxy]) => ({
                iface: proxy,
                interfaceName: interfaceName,
                desktopId: provider.desktopFileId,
                busName: provider.name,
                knowledgeSearchObjectPath: provider.knowledgeSearchObjectPath,
                knowledgeAppId: provider.knowledgeAppId
            }))
            .catch((e) => {
                throw new Error('Initializing proxy for ' + interfaceName +
                                ' at ' + provider.path + ' on bus name ' + provider.name +
                                ' failed: ' + String(e) + ', stack:\n' + String(e.stack));
            })
        )
    ).reduce((list, incoming) => list.concat(incoming), []));
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


// loadKnowledgeAppContent
//
// Try to load a specific EknURI in a knowledge app, opening the app
// itself if that fails.
function loadKnowledgeAppContent(app, knowledgeSearchProxy, uri, contentType) {
    recordMetricsEvent(EVENT_DISCOVERY_FEED_CLICK, new GLib.Variant('a{ss}', {
        app_id: app.get_id(),
        content_type: contentType
    }));

    let context = Gdk.AppLaunchContext.new();
    context.set_timestamp(Gdk.CURRENT_TIME);

    if (!knowledgeSearchProxy) {
        app.launch([], context);
        return;
    }

    knowledgeSearchProxy.LoadItemRemote(uri, '', Gdk.CURRENT_TIME, function(result, excp) {
        if (!excp)
            return;
        logError(excp, 'Could not load app with article ' + uri + ' fallback to just launch the app, trace');
        app.launch([], context);
    });
}

// createMetaCallProxy
//
// Create a proxy for a DBus object with an abstracted away call mechanism
// that passes down the information required to make DBus call to a function
function createMetaCallProxy(interfaceMetadata, callFunc, callFuncSync) {
    let interfaceInfo = Gio.DBusInterfaceInfo.new_for_xml(interfaceMetadata);
    let obj = {};

    interfaceInfo.methods.forEach(function(method) {
        let signature = method.in_args.reduce(function(sig, arg) {
            return sig + arg.signature;
        }, '');
        obj[method.name + 'Remote'] = function() {
            let args = Array.prototype.slice.call(arguments);

            let [callback, rest] = [
                args[args.length - 1],
                Array.prototype.slice.call(args, 0, args.length - 1)
            ];
            callFunc(method.name, rest, signature, callback);
        };
        obj[method.name + 'Sync'] = function() {
            let args = Array.prototype.slice.call(arguments);

            callFuncSync(method.name, args, signature);
        };
    });

    return obj;
}

// createShellAppLauncherMetaCallProxy
//
// Create a proxy for a DBus object which calls methods through the shell's
// AppLauncher interface.
function createShellAppLauncherMetaCallProxy(interfaceMetadata,
                                             appId,
                                             busName,
                                             objectPath,
                                             interfaceName) {
    let interfaceWrapper = Gio.DBusProxy.makeProxyWrapper(AppLauncherIface);
    let onProxyReady = function(initable, error) {
        if (error) {
            logError(error,
                     'Could not create proxy for ' + objectPath);
            return;
        }
    };
    let shellProxy = interfaceWrapper(Gio.DBus.session,
                                      SHELL_BUS_NAME,
                                      SHELL_OBJECT_PATH,
                                      onProxyReady);

    // Now that we have a shell proxy, create our proxy using the shell
    // proxy to call our own proxy's app
    let asyncCallFunc = function(method, args, signature, callback) {
        let wrapped = new GLib.Variant('(' + signature + ')', args);
        return shellProxy.LaunchViaDBusCallRemote(appId,
                                                  busName,
                                                  objectPath,
                                                  interfaceName,
                                                  method,
                                                  wrapped,
                                                  callback);
    };
    let syncCallFunc = function(method, args, signature) {
        let wrapped = new GLib.Variant('(' + signature + ')', args);
        return shellProxy.LaunchViaDBusCallSync(appId,
                                                busName,
                                                objectPath,
                                                interfaceName,
                                                method,
                                                wrapped,
                                                args);
    };
    return createMetaCallProxy(interfaceMetadata, asyncCallFunc, syncCallFunc);
}

// createSearchProxyFromObjectPath
//
// Using the given object path, create a proxy object for it asynchronously.
//
// Note that the created proxy object is not just a direct proxy to the app -
// it is actually a 'meta-proxy' which makes a method call through the shell
// so that launching the app will show a splash-screen. However, it should
// have similar semantics to a proxy created using makeProxyWrapper - you
// should be able to use it transparently.
function createSearchProxyFromObjectPath(appId, objectPath) {
    if (objectPath) {
        return createShellAppLauncherMetaCallProxy(KnowledgeSearchIface,
                                                   appId,
                                                   appId,
                                                   objectPath,
                                                   KNOWLEDGE_SEARCH_INTERFACE_NAME);
    }

    return null;
}

const DiscoveryFeedActivatableFrame = new Lang.Class({
    Name: 'DiscoveryFeedActivatableFrame',
    Extends: Gtk.Button,
    Properties: {
        content: GObject.ParamSpec.object('content',
                                          '',
                                          '',
                                          GObject.ParamFlags.READWRITE |
                                          GObject.ParamFlags.CONSTRUCT_ONLY,
                                          Gtk.Widget),
    },
    Template: 'resource:///com/endlessm/DiscoveryFeed/activatable-frame.ui',

    _init: function(params) {
        this.parent(params);
        this.add(params.content);
        // Connect to the realize signal of the button and set
        // the pointer cursor over its event window once the event
        // window has been created.
        this.connect('realize', Lang.bind(this, function(widget) {
            widget.get_event_window().set_cursor(Gdk.Cursor.new_from_name(Gdk.Display.get_default(),
                                                                          'pointer'));
        }));
    }
});

const DiscoveryFeedAppContentDescription = new Lang.Class({
    Name: 'DiscoveryFeedAppContentDescription',
    Extends: Gtk.Box,
    Properties: {
        app_name: GObject.ParamSpec.string('app-name',
                                           '',
                                           '',
                                           GObject.ParamFlags.READWRITE |
                                           GObject.ParamFlags.CONSTRUCT_ONLY,
                                           ''),
        title: GObject.ParamSpec.string('title',
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
                                           '')
    },
    Template: 'resource:///com/endlessm/DiscoveryFeed/app-content-description.ui',
    Children: [
        'app-label',
        'title-label',
        'synopsis-label'
    ],

    _init: function(params) {
        this.parent(params);
        this.app_label.label = this.app_name;
        this.title_label.label = this.title;
        this.synopsis_label.label = this.synopsis;
    }
});

const DiscoveryFeedAppStoreLink = new Lang.Class({
    Name: 'DiscoveryFeedAppStoreLink',
    Extends: Gtk.Box,
    Properties: {
        message: GObject.ParamSpec.string('message',
                                          '',
                                          '',
                                          GObject.ParamFlags.READWRITE |
                                          GObject.ParamFlags.CONSTRUCT_ONLY,
                                          '')
    },
    Template: 'resource:///com/endlessm/DiscoveryFeed/app-store-link.ui',
    Children: [
        'message-label',
    ],

    _init: function(params) {
        this.parent(params);
        this.message_label.label = this.message;
    }
});

const DiscoveryFeedAppStoreDescription = new Lang.Class({
    Name: 'DiscoveryFeedAppStoreDescription',
    Extends: Gtk.Box,
    Properties: {
        app_name: GObject.ParamSpec.string('app-name',
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
        icon: GObject.ParamSpec.object('icon',
                                       '',
                                       '',
                                       GObject.ParamFlags.READWRITE |
                                       GObject.ParamFlags.CONSTRUCT_ONLY,
                                       Gio.Icon)
    },
    Template: 'resource:///com/endlessm/DiscoveryFeed/app-store-description.ui',
    Children: [
        'app-icon',
        'app-label',
        'synopsis-label'
    ],

    _init: function(params) {
        this.parent(params);
        this.app_label.label = this.app_name;
        if (this.icon)
            this.app_icon.set_from_gicon(this.icon, Gtk.IconSize.DND);
        this.app_label.label = this.app_name;
        this.synopsis_label.label = this.synopsis;
    }
});

const CONTENT_PREVIEW_SMALL = 200;
const CONTENT_PREVIEW_MID = 300;
const CONTENT_PREVIEW_LARGE = 400;

const DiscoveryFeedContentPreview = new Lang.Class({
    Name: 'DiscoveryFeedContentPreview',
    Extends: Gtk.Box,
    Properties: {
        image_stream: GObject.ParamSpec.object('image-stream',
                                               '',
                                               '',
                                               GObject.ParamFlags.READWRITE |
                                               GObject.ParamFlags.CONSTRUCT_ONLY,
                                               Gio.InputStream),
        min_width: GObject.ParamSpec.int('min-width',
                                         '',
                                         '',
                                         GObject.ParamFlags.READWRITE |
                                         GObject.ParamFlags.CONSTRUCT_ONLY,
                                         0,
                                         GLib.MAXINT32,
                                         CONTENT_PREVIEW_SMALL),
        min_height: GObject.ParamSpec.int('min-height',
                                          '',
                                          '',
                                          GObject.ParamFlags.READWRITE |
                                          GObject.ParamFlags.CONSTRUCT_ONLY,
                                          0,
                                          GLib.MAXINT32,
                                          CONTENT_PREVIEW_SMALL),
        has_alpha: GObject.ParamSpec.boolean('has-alpha',
                                             'Has Alpha',
                                             'Has Alpha',
                                             GObject.ParamFlags.READWRITE |
                                             GObject.ParamFlags.CONSTRUCT_ONLY,
                                             false),
    },
    Template: 'resource:///com/endlessm/DiscoveryFeed/content-preview.ui',
    Children: [
        'thumbnail-container'
    ],

    _init: function(params) {
        this.parent(params);
        this.thumbnail_container.width_request = this.min_width;
        this.thumbnail_container.height_request = this.min_height;

        if (this.image_stream) {
            let frame = new ImageCoverFrame.ImageCoverFrame({
                hexpand: true,
                has_alpha: this.has_alpha
            });
            frame.set_content(this.image_stream);
            this.thumbnail_container.add(frame);
        }
    }
});

const DiscoveryFeedContentCardLayout = new Lang.Class({
    Name: 'DiscoveryFeedContentCardLayout',
    Extends: Gtk.Box,
    Properties: {
        content: GObject.ParamSpec.object('content',
                                          '',
                                          '',
                                          GObject.ParamFlags.READWRITE |
                                          GObject.ParamFlags.CONSTRUCT_ONLY,
                                          Gtk.Widget),
        description: GObject.ParamSpec.object('description',
                                              '',
                                              '',
                                              GObject.ParamFlags.READWRITE |
                                              GObject.ParamFlags.CONSTRUCT_ONLY,
                                              Gtk.Widget),
        layout_direction: GObject.ParamSpec.int('layout-direction',
                                                '',
                                                '',
                                                GObject.ParamFlags.READWRITE |
                                                GObject.ParamFlags.CONSTRUCT_ONLY,
                                                Stores.LAYOUT_DIRECTION_IMAGE_FIRST,
                                                Stores.LAYOUT_DIRECTION_IMAGE_LAST,
                                                Stores.LAYOUT_DIRECTION_IMAGE_FIRST)
    },
    Template: 'resource:///com/endlessm/DiscoveryFeed/content-card-layout.ui',

    _init: function(params) {
        this.parent(params);
        this.add(this.content);
        this.add(this.description);
        // If this is an odd card, adjust the packing order of all widgets
        // in the box
        if (this.layout_direction == Stores.LAYOUT_DIRECTION_IMAGE_LAST) {
            this.get_children().forEach(Lang.bind(this, function(child) {
                this.child_set_property(child,
                                        'pack-type',
                                        Gtk.PackType.END);
            }));
        }
    }
});

const DiscoveryFeedVideoCardLayout = new Lang.Class({
    Name: 'DiscoveryFeedVideoCardLayout',
    Extends: Gtk.Overlay,
    Properties: {
        content: GObject.ParamSpec.object('content',
                                          '',
                                          '',
                                          GObject.ParamFlags.READWRITE |
                                          GObject.ParamFlags.CONSTRUCT_ONLY,
                                          Gtk.Widget),
        title: GObject.ParamSpec.string('title',
                                        '',
                                        '',
                                        GObject.ParamFlags.READWRITE |
                                        GObject.ParamFlags.CONSTRUCT_ONLY,
                                        ''),
        duration: GObject.ParamSpec.int('duration',
                                        '',
                                        '',
                                        GObject.ParamFlags.READWRITE |
                                        GObject.ParamFlags.CONSTRUCT_ONLY,
                                        0,
                                        GLib.MAXINT32,
                                        0),
        app_name: GObject.ParamSpec.string('app-name',
                                           '',
                                           '',
                                           GObject.ParamFlags.READWRITE |
                                           GObject.ParamFlags.CONSTRUCT_ONLY,
                                           '')
    },
    Template: 'resource:///com/endlessm/DiscoveryFeed/video-card-layout.ui',
    Children: [
        'background-content',
        'title-label',
        'duration-label',
        'app-label'
    ],

    _init: function(params) {
        this.parent(params);
        this.background_content.add(this.content);

        this.title_label.label = this.title;
        this.app_label.label = this.app_name;
        this.duration.label = parseDuration(this.duration);
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
                                        Stores.DiscoveryFeedKnowledgeAppVideoCardStore.$gtype)
    },

    _init: function(params) {
        params.visible = true;
        this.parent(params);

        this._app = Gio.DesktopAppInfo.new(params.model.desktop_id);
        let card = new DiscoveryFeedActivatableFrame({
            content: new DiscoveryFeedVideoCardLayout({
                title: params.model.title,
                duration: params.model.duration,
                app_name: this._app.get_display_name().toUpperCase(),
                content: new DiscoveryFeedContentPreview({
                    image_stream: params.model.thumbnail,
                    min_height: CONTENT_PREVIEW_MID
                })
            })
        });
        this.add(card);
        card.connect('clicked', Lang.bind(this, function() {
            loadKnowledgeAppContent(this._app,
                                    this._knowledgeSearchProxy,
                                    this.model.uri,
                                    'knowledge_video');
        }));
        this._knowledgeSearchProxy = createSearchProxyFromObjectPath(this.model.knowledge_app_id,
                                                                     this.model.knowledge_search_object_path);
    }
});

const DiscoveryFeedKnowledgeAppCard = new Lang.Class({
    Name: 'DiscoveryFeedKnowledgeAppCard',
    Extends: Gtk.Box,
    Properties: {
        model: GObject.ParamSpec.object('model',
                                        '',
                                        '',
                                        GObject.ParamFlags.READWRITE |
                                        GObject.ParamFlags.CONSTRUCT_ONLY,
                                        Stores.DiscoveryFeedKnowledgeAppCardStore.$gtype)
    },

    _init: function(params) {
        params.visible = true;
        this.parent(params);

        // Read the desktop file and then set the app icon and label
        // appropriately
        this._app = Gio.DesktopAppInfo.new(params.model.desktop_id);
        let card = new DiscoveryFeedActivatableFrame({
            content: new DiscoveryFeedContentCardLayout({
                content: new DiscoveryFeedContentPreview({
                    image_stream: this.model.thumbnail,
                    min_width: params.model.thumbnail_size,
                    min_height: params.model.thumbnail_size
                }),
                description: new DiscoveryFeedAppContentDescription({
                    title: params.model.title,
                    synopsis: params.model.synopsis,
                    app_name: this._app.get_display_name().toUpperCase()
                }),
                layout_direction: params.model.layout_direction
            })
        });
        this.add(card);
        card.connect('clicked', Lang.bind(this, function() {
            loadKnowledgeAppContent(this._app,
                                    this._knowledgeSearchProxy,
                                    this.model.uri,
                                    'knowledge_content');
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
                                        Stores.DiscoveryFeedKnowlegeArtworkCardStore.$gtype)
    },

    _init: function(params) {
        params.visible = true;
        this.parent(params);

        let card = new DiscoveryFeedActivatableFrame({
            content: new DiscoveryFeedContentCardLayout({
                content: new DiscoveryFeedContentPreview({
                    image_stream: this.model.thumbnail,
                    min_width: CONTENT_PREVIEW_LARGE,
                    min_height: CONTENT_PREVIEW_LARGE
                }),
                description: new DiscoveryFeedAppContentDescription({
                    title: params.model.title,
                    synopsis: 'by ' + params.model.author,
                    app_name: 'Masterpiece of the Day'.toUpperCase()
                }),
                layout_direction: params.model.layout_direction
            })
        });
        this.add(card);
        this.get_style_context().add_class('artwork');
    }
});

const DiscoveryFeedWordQuotePair = new Lang.Class({
    Name: 'DiscoveryFeedWordQuotePair',
    Extends: Gtk.Button,
    Template: 'resource:///com/endlessm/DiscoveryFeed/word-quote-pair.ui',
    Properties: {
        model: GObject.ParamSpec.object('model',
                                        '',
                                        '',
                                        GObject.ParamFlags.READWRITE |
                                        GObject.ParamFlags.CONSTRUCT_ONLY,
                                        Stores.DiscoveryFeedWordQuotePairStore.$gtype)
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
        model: GObject.ParamSpec.object('model',
                                        '',
                                        '',
                                        GObject.ParamFlags.READWRITE |
                                        GObject.ParamFlags.CONSTRUCT_ONLY,
                                        Stores.DiscoveryFeedInstallableAppStore.$gtype)
    },

    _init: function(params) {
        this.parent(params);

        let card = new DiscoveryFeedActivatableFrame({
            content: new DiscoveryFeedContentCardLayout({
                content: new DiscoveryFeedContentPreview({
                    image_stream: this.model.thumbnail_data,
                    min_width: Stores.THUMBNAIL_SIZE_APP_STORE,
                    min_height: Stores.THUMBNAIL_SIZE_APP_STORE
                }),
                description: new DiscoveryFeedAppStoreDescription({
                    app_name: this.model.title,
                    synopsis: this.model.synopsis,
                    icon: this.model.icon
                }),
                layout_direction: params.model.layout_direction
            })
        });
        this.add(card);

        // Connect to the realize signal of the button and set
        // the pointer cursor over its event window once the event
        // window has been created.
        card.connect('clicked', Lang.bind(this, function() {
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
        model: GObject.ParamSpec.object('model',
                                        '',
                                        '',
                                        GObject.ParamFlags.READWRITE |
                                        GObject.ParamFlags.CONSTRUCT_ONLY,
                                        Stores.DiscoveryFeedAppStoreLinkStore.$gtype)
    },

    _init: function(params) {
        this.parent(params);

        let card = new DiscoveryFeedActivatableFrame({
            content: new DiscoveryFeedContentCardLayout({
                content: new DiscoveryFeedContentPreview({
                    image_stream: this.model.thumbnail_data,
                    min_width: Stores.THUMBNAIL_WIDTH_APP_STORE_LINK,
                    min_height: Stores.THUMBNAIL_SIZE_APP_STORE,
                    has_alpha: true
                }),
                description: new DiscoveryFeedAppStoreLink({
                    message: this.model.title
                }),
                layout_direction: params.model.layout_direction
            })
        });
        this.add(card);
        card.connect('clicked', Lang.bind(this, function() {
            let context = Gdk.AppLaunchContext.new();
            context.set_timestamp(Gdk.CURRENT_TIME);
            (Gio.DesktopAppInfo.new('org.gnome.Software.desktop')).launch([], context);
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
        model: GObject.ParamSpec.object('model',
                                        '',
                                        '',
                                        GObject.ParamFlags.READWRITE |
                                        GObject.ParamFlags.CONSTRUCT_ONLY,
                                        Stores.DiscoveryFeedAvailableAppsStore.$gtype)
    },

    _init: function(params) {
        this.parent(params);
        this.model.apps.forEach(Lang.bind(this, function(model) {
            this.flow_box.add(new DiscoveryFeedInstallableAppCard({
                model: model
            }));
        }));
        this.flow_box.add(new DiscoveryFeedAppStoreLinkCard({
            model: new Stores.DiscoveryFeedAppStoreLinkStore({})
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
    case Stores.CARD_STORE_TYPE_ARTICLE_CARD:
        return new DiscoveryFeedKnowledgeAppCard(params);
    case Stores.CARD_STORE_TYPE_NEWS_CARD:
        return new DiscoveryFeedKnowledgeAppCard(params);
    case Stores.CARD_STORE_TYPE_WORD_QUOTE_CARD:
        return new DiscoveryFeedWordQuotePair(params);
    case Stores.CARD_STORE_TYPE_ARTWORK_CARD:
        return new DiscoveryFeedKnowledgeArtworkCard(params);
    case Stores.CARD_STORE_TYPE_AVAILABLE_APPS:
        return new DiscoveryFeedAvailableAppsCard(params);
    case Stores.CARD_STORE_TYPE_VIDEO_CARD:
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

const COLLAPSED_DATE_VISIBLE_THRESHOLD = 50;
const HEADER_SEPARATOR_VISIBLE_THRESHOLD = 20;

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
        'recommended',
        'close-button',
        'collapsed-date-revealer',
        'collapsed-date',
        'expanded-date-revealer',
        'expanded-date',
        'header-separator-revealer',
        'scroll-view'
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

        this.expanded_date.label = (new Date()).toLocaleFormat('%B %e').toLowerCase();
        this.expanded_date_revealer.set_reveal_child(true);

        // Translators: collapsed date at the header of the DiscoveryFeed
        this.collapsed_date.label = _("Today is %s").format((new Date()).toLocaleFormat('%B %e, %Y'));

        let vadjustment = this.scroll_view.vadjustment;
        vadjustment.connect('value-changed', Lang.bind(this, function() {
            if (vadjustment.value > HEADER_SEPARATOR_VISIBLE_THRESHOLD)
                this.header_separator_revealer.set_reveal_child(true);
            else
                this.header_separator_revealer.set_reveal_child(false);

            if (vadjustment.value > COLLAPSED_DATE_VISIBLE_THRESHOLD) {
                this.expanded_date_revealer.set_reveal_child(false);
                this.collapsed_date_revealer.set_reveal_child(true);
            } else {
                this.collapsed_date_revealer.set_reveal_child(false);
                this.expanded_date_revealer.set_reveal_child(true);
            }
        }));

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

function appendArticleCardsFromShardsAndItems(shards, items, proxy, type, direction, thumbnailSize) {
    return items.map(function(response) {
        return Array.prototype.slice.call(response).map(function(entry) {
            let thumbnail = find_thumbnail_in_shards(shards, entry.thumbnail_uri);

            return {
                type: type,
                source: proxy.desktopId,
                builder: function(modelIndex) {
                    return new Stores.DiscoveryFeedKnowledgeAppCardStore({
                        title: entry.title,
                        synopsis: TextSanitization.synopsis(entry.synopsis),
                        thumbnail: thumbnail,
                        desktop_id: proxy.desktopId,
                        bus_name: proxy.busName,
                        knowledge_search_object_path: proxy.knowledgeSearchObjectPath,
                        knowledge_app_id: proxy.knowledgeAppId,
                        uri: entry.ekn_id,
                        layout_direction: direction || Stores.LAYOUT_DIRECTION_IMAGE_FIRST,
                        type: type,
                        thumbnail_size: thumbnailSize
                    });
                }
            };
        });
    })
    .reduce((list, incoming) => list.concat(incoming), []);
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

function appendDiscoveryFeedContentFromProxy(proxy) {
    return promisifyGIO(proxy.iface, 'ArticleCardDescriptionsRemote')
    .then(([results]) => appendArticleCardsFromShardsAndItems(results[0],
                                                              results.slice(1, results.length),
                                                              proxy,
                                                              Stores.CARD_STORE_TYPE_ARTICLE_CARD,
                                                              Stores.LAYOUT_DIRECTION_IMAGE_FIRST,
                                                              Stores.THUMBNAIL_SIZE_ARTICLE))
    .catch((e) => {
        throw new Error('Getting content failed: ' + e + '\n' + e.stack);
    });
}

function appendDiscoveryFeedArtworkFromProxy(proxy) {
    return promisifyGIO(proxy.iface, 'ArticleCardDescriptionsRemote')
    .then(([results]) => appendArticleCardsFromShardsAndItems(results[0],
                                                              results.slice(1, results.length),
                                                              proxy,
                                                              Stores.CARD_STORE_TYPE_ARTWORK_CARD,
                                                              Stores.LAYOUT_DIRECTION_IMAGE_FIRST,
                                                              Stores.THUMBNAIL_SIZE_ARTICLE))
    .catch((e) => {
        throw new Error('Getting artwork failed: ' + e + '\n' + e.stack);
    });
}

function appendDiscoveryFeedNewsFromProxy(proxy) {
    return promisifyGIO(proxy.iface, 'GetRecentNewsRemote')
    .then(([results]) => appendArticleCardsFromShardsAndItems(results[0],
                                                              results.slice(1, results.length),
                                                              proxy,
                                                              Stores.CARD_STORE_TYPE_NEWS_CARD,
                                                              Stores.LAYOUT_DIRECTION_IMAGE_LAST,
                                                              Stores.THUMBNAIL_SIZE_NEWS))
    .catch((e) => {
        throw new Error('Getting news failed: ' + e + '\n' + e.stack);
    });
}

function appendDiscoveryFeedQuoteWordFromProxy(proxyBundle) {
    return Promise.all([
        promisifyGIO(proxyBundle.quote.iface, 'GetQuoteOfTheDayRemote').then(([results]) => results[0]),
        promisifyGIO(proxyBundle.word.iface, 'GetWordOfTheDayRemote').then(([results]) => results[0])
    ])
    .then(([quote, word]) => ({
        type: Stores.CARD_STORE_TYPE_WORD_QUOTE_CARD,
        source: 'word-quote',
        builder: () => new Stores.DiscoveryFeedWordQuotePairStore({
            quote: new Stores.DiscoveryFeedQuoteStore({
                quote: TextSanitization.synopsis(quote.quote),
                author: quote.author
            }),
            word: new Stores.DiscoveryFeedWordStore({
                word: word.word,
                definition: TextSanitization.synopsis(word.definition)
            })
        })
    })).catch((e) => {
        throw new Error('Getting word/quote models failed: ' + e + '\n' + e.stack);
    });
}

const N_APPS_TO_DISPLAY = 5;

function appendDiscoveryFeedInstallableAppsFromProxy(proxy) {
    return promisifyGIO(proxy.iface, 'GetInstallableAppsRemote').then(([results]) =>
        results.map(response => ({
            type: Stores.CARD_STORE_TYPE_AVAILABLE_APPS,
            source: proxy.desktopId,
            builder: () => new Stores.DiscoveryFeedAvailableAppsStore({}, response.slice(0, N_APPS_TO_DISPLAY).map(entry =>
                new Stores.DiscoveryFeedInstallableAppStore({
                    app_id: entry.id.get_string()[0],
                    title: entry.name.get_string()[0],
                    thumbnail_data: Gio.File.new_for_path(entry.thumbnail_uri.get_string()[0]).read(null),
                    icon: Gio.Icon.deserialize(entry.icon),
                    synopsis: entry.synopsis.get_string()[0]
                })
            ))
        }))
    ).catch((e) => {
        throw new Error('Getting installable apps failed: ' + e + '\n' + e.stack);
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

function appendDiscoveryFeedVideoFromProxy(proxy) {
    return promisifyGIO(proxy.iface, 'GetVideosRemote')(function(results) {
        let [shards, items] = [results[0], results.slice(1, results.length)];

        return items.map(function(response) {
            return response.map(function(entry) {
                let thumbnail = find_thumbnail_in_shards(shards, entry.thumbnail_uri);

                return ({
                    type: Stores.CARD_STORE_TYPE_VIDEO_CARD,
                    source: proxy.desktopId,
                    builder: () => new Stores.DiscoveryFeedKnowledgeAppVideoCardStore({
                        title: entry.title,
                        thumbnail: thumbnail,
                        desktop_id: proxy.desktopId,
                        bus_name: proxy.busName,
                        knowledge_search_object_path: proxy.knowledgeSearchObjectPath,
                        knowledge_app_id: proxy.knowledgeAppId,
                        uri: entry.ekn_id,
                        duration: parseDuration(entry.duration)
                    })
                });
            });
        }).reduce((a, b) => a.concat(b));
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

function populateDiscoveryFeedModelFromQueries(model, proxies, recommended) {
    model.remove_all();

    let wordQuoteProxies = {
        word: [],
        quote: []
    };

    let pendingPromises = [];
    recommended.hide();

    proxies.forEach(function(proxy) {
        switch (proxy.interfaceName) {
        case 'com.endlessm.DiscoveryFeedContent':
            pendingPromises.push(appendDiscoveryFeedContentFromProxy(proxy));
            break;
        case 'com.endlessm.DiscoveryFeedNews':
            pendingPromises.push(appendDiscoveryFeedNewsFromProxy(proxy));
            break;
        case 'com.endlessm.DiscoveryFeedInstallableApps':
            pendingPromises.push(appendDiscoveryFeedInstallableAppsFromProxy(proxy));
            break;
        case 'com.endlessm.DiscoveryFeedVideo':
            pendingPromises.push(appendDiscoveryFeedVideoFromProxy(proxy));
            break;
        case 'com.endlessm.DiscoveryFeedQuote':
            wordQuoteProxies.quote.push(proxy);
            break;
        case 'com.endlessm.DiscoveryFeedWord':
            wordQuoteProxies.word.push(proxy);
            break;
        case 'com.endlessm.DiscoveryFeedArtwork':
            pendingPromises.push(appendDiscoveryFeedArtworkFromProxy(proxy));
            break;
        default:
            throw new Error('Don\'t know how to handle interface ' + proxy.interfaceName);
        }
    });

    // Note that zipArraysInObject here will zip to the shortest length
    // which means that we may not execute all proxies if there was a
    // mismatch in cardinality.
    pendingPromises = pendingPromises.concat(zipArraysInObject(wordQuoteProxies).map(appendDiscoveryFeedQuoteWordFromProxy));

    // Okay, now wait for all proxies to execute. allSettledPromises will
    // return tuples of errors and "model builders" depending on whether
    // or not an D-Bus call failed or succeeded. From there we can add
    // the results to a model as we build it up (since we will now have
    // the index) of the model.
    allSettledPromises(pendingPromises)
    .then(states => {
        let models = states.map(([error, builders]) => {
            if (error) {
                logError(error, 'Query failed');
                return null;
            }

            return builders;
        })
        // Remove null entries (errors)
        .filter(r => !!r)
        // Flat map, since we get a list list from promise
        .reduce((a, b) => a.concat(b), []);

        let layoutIndex = 0;
        ModelOrdering.arrange(models).forEach(descriptor => {
            model.append(descriptor.builder(layoutIndex));

            // Only increment layout determinant index where we should
            // do so. For instance on the word quote card we want to keep
            // it as is so that we still get left-right layout.
            if (descriptor.type !== Stores.CARD_STORE_TYPE_WORD_QUOTE_CARD)
                ++layoutIndex;

            // If we show a card that is not the available apps card,
            // we'll want to show the 'recommended content' text now.
            if (descriptor.type !== Stores.CARD_STORE_TYPE_AVAILABLE_APPS) {
                recommended.show();
            }
        });
    }).catch(e => logError(e, 'Query failed'));
}

const DiscoveryFeedApplication = new Lang.Class({
    Name: 'DiscoveryFeedApplication',
    Extends: Gtk.Application,

    _init: function() {
        this.parent({ application_id: pkg.name });
        GLib.set_application_name(_('Discovery Feed'));
        this.Visible = false;
        this._installedAppsChangedId = -1;
        this._changedSignalId = -1;
        this._discoveryFeedProxies = [];
        this._contentAppIds = [];
        this._discoveryFeedCardModel = new Gio.ListStore({
            item_type: Stores.DiscoveryFeedCardStore.$gtype
        });
        this._debugWindow = !!GLib.getenv('DISCOVERY_FEED_DEBUG_WINDOW');
    },

    vfunc_startup: function() {
        this.parent();

        load_style_sheet('/com/endlessm/DiscoveryFeed/application.css');

        this._window = new DiscoveryFeedMainWindow({
            application: this,
            type_hint: !this._debugWindow ? Gdk.WindowTypeHint.DOCK : Gdk.WindowTypeHint.NORMAL,
            role: !this._debugWindow ? SIDE_COMPONENT_ROLE : null,
            card_model: this._discoveryFeedCardModel
        });

        // to be able to set the opacity from css
        let visual = Gdk.Screen.get_default().get_rgba_visual();
        if (visual) {
            this._window.set_visual(visual);
        }

        // when the label contains letters and numbers the allocation
        // does not work properly, force re-allocation here
        this._window.expanded_date.realize();

        this._window.connect('notify::visible', Lang.bind(this, this._onVisibilityChanged));

        this._setupWindowInteraction();

        // update position when workarea changes
        let display = Gdk.Display.get_default();
        display.connect('monitor-added', Lang.bind(this,
                                                   this._updateGeometry));
        display.connect('monitor-removed', Lang.bind(this,
                                                     this._updateGeometry));
        let monitor = display.get_primary_monitor();
        monitor.connect('notify::workarea', Lang.bind(this,
                                                      this._updateGeometry));
        this._updateGeometry();
    },

    // Using connection, refresh discovery feed proxies. Returns a promise
    // that resolves when refresh operation is complete. Note that this
    // does not re-query the proxies. That is the responsibility of the
    // caller. For convenience, the promise resolves with proxies.
    _refreshDiscoveryFeedProxies: function(connection) {
        // Remove all proxies and start over
        let providers = readDiscoveryFeedProvidersInDataDirectories();
        return instantiateObjectsFromDiscoveryFeedProviders(connection,
                                                            providers)
        .then(Lang.bind(this, function(promises) {
            this._discoveryFeedProxies = promises.map(([error, proxy]) => {
                if (error) {
                    logError(error, 'Could not create proxy');
                    return null;
                }

                return proxy;
            }).filter(proxy => proxy);
            return this._discoveryFeedProxies;
        }));
    },

    vfunc_dbus_register: function(connection, path) {
        this._dbusImpl = Gio.DBusExportedObject.wrapJSObject(DiscoveryFeedIface, this);
        this._dbusImpl.export(connection, path);
        this._providersRequireRefresh = true;

        // Make sure to update the available proxies when the
        // app info state changes. Note that we need to hold
        // on to the reference here: https://phabricator.endlessm.com/T17598
        // otherwise the signal will be automatically disconnected, even though
        // the Gio documentation says that this is a singleton.
        this._appInfoMonitor = Gio.AppInfoMonitor.get();
        this._installedAppsChangedId = this._appInfoMonitor.connect('changed', Lang.bind(this, function() {
            this._providersRequireRefresh = true;
        }));

        return this.parent(connection, path);
    },

    vfunc_dbus_unregister: function(connection, path) {
        if (this._installedAppsChangedId !== -1) {
            this._appInfoMonitor.disconnect(this._installedAppsChangedId);
            this._installedAppsChangedId = -1;
        }

        this.parent(connection, path);
    },

    vfunc_activate: function() {
        if (this._debugWindow)
            this.show(Gdk.CURRENT_TIME);
    },

    show: function(timestamp) {
        this._window.show();
        this._window.present_with_time(timestamp);

        recordMetricsEvent(EVENT_DISCOVERY_FEED_OPEN, new GLib.Variant('a{ss}', {
            opened_by: 'shell_button',
            language: GLib.get_language_names()[0]
        }));

        let chain = Promise.resolve(this._discoveryFeedProxies);
        if (this._providersRequireRefresh) {
            chain = this._refreshDiscoveryFeedProxies(this.get_dbus_connection());
            this._providersRequireRefresh = false;
        }

        chain.then(Lang.bind(this, function(proxies) {
            populateDiscoveryFeedModelFromQueries(this._discoveryFeedCardModel,
                                                  proxies,
                                                  this._window.recommended);
        }));
    },

    hide: function() {
        this._window.close('lost_focus');
    },

    _onVisibilityChanged: function() {
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

    _setupWindowInteraction: function() {
        // we do not want this behavior when in debug mode to
        // not interfere with the inspector window
        if (this._debugWindow)
            return;

        // There seems to be a race condition with the WM that can
        // lead the sidebar into an inconsistent state if the
        // _onActiveWindowChanged callback gets executed in such a
        // way that ends up calling to hide() between the user pressed
        // the tray button and the sidebar has been made visible,
        // which can lead to the sidebar never been displayed.
        this._window.connect('map-event', Lang.bind(this, function() {
            if (this._changedSignalId == -1) {
                this._changedSignalId = Wnck.Screen.get_default().connect('active-window-changed',
                                                                          Lang.bind(this, this._onActiveWindowChanged));
            }
            return false;
        }));
        this._window.connect('unmap', Lang.bind(this, function() {
            if (this._changedSignalId != -1) {
                Wnck.Screen.get_default().disconnect(this._changedSignalId);
                this._changedSignalId = -1;
            }
        }));
    },

    _onActiveWindowChanged: function() {
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

    _updateGeometry: function() {
        let monitor = Gdk.Display.get_default().get_primary_monitor();
        let workarea = monitor.get_workarea();

        let geometry = {
            width: this._window.get_size()[0],
            height: workarea.height,
            y: workarea.y
        };

        geometry.x = workarea.x + ((workarea.width - geometry.width) * 0.5);
        this._window.move(geometry.x, geometry.y);

        this._window.resize(geometry.width, geometry.height);
    }
});

function main(argv) { // eslint-disable-line no-unused-vars
    return (new DiscoveryFeedApplication()).run(argv);
}

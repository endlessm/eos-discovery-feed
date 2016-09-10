// src/main.js
//
// Copyright (c) 2016-2017 Endless Mobile Inc.
//
// This file is the file first run by the entrypoint to the com.endlessm.GrandCentral
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

const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Wnck = imports.gi.Wnck;

const Lang = imports.lang;

const GRAND_CENTRAL_NAME = 'com.endlessm.GrandCentral';
const GRAND_CENTRAL_PATH = '/com/endlessm/GrandCentral';
const GRAND_CENTRAL_IFACE = 'com.endlessm.GrandCentral.View';
const SIDE_COMPONENT_ROLE = 'eos-side-component';

const GrandCentralIface = '<node><interface name="' + GRAND_CENTRAL_NAME + '">' +
  '<method name="show">' +
    '<arg type="u" direction="in" name="timestamp"/>' +
  '</method>' +
  '<method name="hide">' +
    '<arg type="u" direction="in" name="timestamp"/>' +
  '</method>' +
  '<property name="Visible" type="b" access="read"/>' +
'</interface></node>';

const GrandCentralMainWindow = new Lang.Class({
    Name: 'GrandCentralMainWindow',
    Extends: Gtk.ApplicationWindow,
    Properties: {
    },
    Template: 'resource:///com/endlessm/GrandCentral/main.ui',
    Children: [
    ],

    _init: function(params) {
        this.parent(params);
    },
});

function load_style_sheet(resourcePath) {
    let provider = new Gtk.CssProvider();
    provider.load_from_resource(resourcePath);
    Gtk.StyleContext.add_provider_for_screen(Gdk.Screen.get_default(),
                                             provider,
                                             Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
}



const GrandCentralApplication = new Lang.Class({
    Name: 'GrandCentralApplication',
    Extends: Gtk.Application,

    _init: function() {
        this.parent({ application_id: pkg.name });
        GLib.set_application_name(_("Grand Central"));
        this.Visible = false;
        this._changedSignalId = 0;
        this._grandCentralProxies = [];
    },

    vfunc_startup: function() {
        this.parent();

        Gtk.Settings.get_default().gtk_application_prefer_dark_theme = true;
        load_style_sheet('/com/endlessm/GrandCentral/application.css');

        this._window = new GrandCentralMainWindow({
            application: this,
            type_hint: Gdk.WindowTypeHint.DOCK,
            role: SIDE_COMPONENT_ROLE
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
                this._changedSignalId = Wnck.Screen.get_default().connect('active-window-changed', Lang.bind(this, this._on_active_window_changed));
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
        display.connect('monitor-added', Lang.bind(this,
                                                   this._update_geometry));
        let monitor = display.get_primary_monitor();
        monitor.connect('notify::workarea', Lang.bind(this,
                                                      this._update_geometry));
        this._update_geometry();
    },

    vfunc_dbus_register: function(connection, path) {
        this._dbusImpl = Gio.DBusExportedObject.wrapJSObject(GrandCentralIface, this);
        this._dbusImpl.export(Gio.DBus.session, path);

        return this.parent(connection, path);
    },

    vfunc_activate: function() {
        // This does nothing -we should only show when the shell asks us
    },

    show: function(timestamp) {
        this._window.show();
        this._window.present_with_time(timestamp);
    },

    hide: function() {
        this._window.hide();
    },

    _on_visibility_changed: function() {
        this.Visible = this._window.is_visible();
        let propChangedVariant = new GLib.Variant('(sa{sv}as)', [
            GRAND_CENTRAL_IFACE, {
                'Visible': new GLib.Variant('b', this.Visible)
            },
            []
        ]);

        Gio.DBus.session.emit_signal(null,
                                     GRAND_CENTRAL_PATH,
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

        geometry.x = workarea.width - geometry.width;
        this._window.move(geometry.x, geometry.y);
        this._window.resize(geometry.width, geometry.height);
    }
});

function main(argv) { // eslint-disable-line no-unused-vars
    return (new GrandCentralApplication()).run(argv);
}

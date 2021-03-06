const Gdk = imports.gi.Gdk;
const GdkPixbuf = imports.gi.GdkPixbuf;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;

const Lang = imports.lang;
const WidgetSurfaceCache = imports.widgetSurfaceCache;

/**
 * Class: ImageCoverFrame
 *
 * A widget to mimic the CSS 'background-size:cover;'
 * effect on images. The image is scaled to cover the entire
 * space it is allocated and then centered.
 *
 */
var ImageCoverFrame = new Lang.Class({ // eslint-disable-line no-unused-vars
    Name: 'ImageCoverFrame',
    Extends: Gtk.Widget,

    Properties: {
        'has-alpha': GObject.ParamSpec.boolean('has-alpha',
                                               'Has Alpha',
                                               'Has Alpha',
                                               GObject.ParamFlags.READWRITE |
                                               GObject.ParamFlags.CONSTRUCT_ONLY,
                                               false),
    },

    _init: function (props={}) {
        props.visible = true;
        this.parent(props);
        this.set_has_window(false);

        this._pixbuf = null;
        this._last_width = 0;
        this._last_height = 0;

        this._surface_cache = new WidgetSurfaceCache.WidgetSurfaceCache(this, this._draw_scaled_pixbuf.bind(this), {
            has_alpha: this.has_alpha
        });
    },

    set_content: function (stream) {
        GdkPixbuf.Pixbuf.new_from_stream_async(stream, null, Lang.bind(this, function(src, result) {
            this._pixbuf = GdkPixbuf.Pixbuf.new_from_stream_finish(result);
            this.queue_draw();
            this._surface_cache.invalidate();
        }));
    },

    _draw_scaled_pixbuf: function (cr) {
        if (!this._pixbuf)
            return;

        let allocation = this.get_allocation();

        // Helps to read these transforms in reverse. We center the pixbuf at
        // the origin, scale it to cover, then translate its center to the
        // center of our allocation.
        cr.translate(allocation.width / 2, allocation.height / 2);
        let scale = Math.max(allocation.width / this._pixbuf.get_width(),
                             allocation.height / this._pixbuf.get_height());
        cr.scale(scale, scale);
        cr.translate(-this._pixbuf.get_width() / 2, -this._pixbuf.get_height() / 2);

        Gdk.cairo_set_source_pixbuf(cr, this._pixbuf, 0, 0);
        cr.paint();
    },

    vfunc_draw: function (cr) {
        if (this._pixbuf) {
            // This is just a static image, we should only need to redraw after a
            // resize of the contents is changed
            let allocation = this.get_allocation();
            if (this._last_width !== allocation.width || this._last_height !== allocation.height)
                this._surface_cache.invalidate();
            this._last_width = allocation.width;
            this._last_height = allocation.height;

            cr.setSourceSurface(this._surface_cache.get_surface(), 0, 0);
            cr.paint();
        }

        // We need to manually call dispose on cairo contexts. This is somewhat related to the bug listed here
        // https://bugzilla.gnome.org/show_bug.cgi?id=685513 for the shell. We should see if they come up with
        // a better fix in the future, i.e. fix this through gjs.
        cr.$dispose();

        return true;
    }
});

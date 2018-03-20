SUBDIRS = po

# Our Autoconf macros are kept in the m4/ directory
ACLOCAL_AMFLAGS = -I m4

# Helper C library
girdir = $(datadir)/gir-1.0
typelibdir = $(libdir)/girepository-1.0

lib_LTLIBRARIES =
gir_DATA = 
typelib_DATA = 

BUILT_SOURCES = 
CLEANFILES = 
DISTCLEANFILES = 
EXTRA_DIST = 

lib_LTLIBRARIES += \
	libeos-discovery-feed-1.la \
	$(NULL)

glib_enum_headers = \
	libfeed/feed-base-card-store.h \
	libfeed/feed-card-layout-direction.h \
	$(NULL)

glib_enum_h = libfeed/feed-enums.h
glib_enum_c = libfeed/feed-enums.c
include $(top_srcdir)/Makefile.am.enums

introspection_sources = \
	$(glib_enum_c) \
	$(glib_enum_h) \
	libfeed/feed-app-card-store.c \
	libfeed/feed-app-card-store.h \
	libfeed/feed-base-card-store.c \
	libfeed/feed-base-card-store.h \
	libfeed/feed-card-layout-direction.h \
	libfeed/feed-knowledge-app-artwork-card-store.c \
	libfeed/feed-knowledge-app-artwork-card-store.h \
	libfeed/feed-knowledge-app-card-store.c \
	libfeed/feed-knowledge-app-card-store.h \
	libfeed/feed-knowledge-app-news-card-store.c \
	libfeed/feed-knowledge-app-news-card-store.h \
	libfeed/feed-knowledge-app-proxy.c \
	libfeed/feed-knowledge-app-proxy.h \
	libfeed/feed-knowledge-app-video-card-store.c \
	libfeed/feed-knowledge-app-video-card-store.h \
	libfeed/feed-orderable-model.c \
	libfeed/feed-orderable-model.h \
	libfeed/feed-quote-card-store.c \
	libfeed/feed-quote-card-store.h \
	libfeed/feed-sizes.h \
	libfeed/feed-store-provider.c \
	libfeed/feed-store-provider.h \
	libfeed/feed-text-sanitization.c \
	libfeed/feed-text-sanitization.h \
	libfeed/feed-word-card-store.c \
	libfeed/feed-word-card-store.h \
	libfeed/feed-word-quote-card-store.c \
	libfeed/feed-word-quote-card-store.h \
	$(NULL)

nointrospection_sources = \
	libfeed/feed-all-async-tasks-private.h \
	libfeed/feed-all-async-tasks.c \
	$(NULL)

libeos_discovery_feed_1_la_SOURCES = \
	$(introspection_sources) \
	$(nointrospection_sources) \
	$(NULL)

libeos_discovery_feed_1_la_CPPFLAGS = \
	$(EOS_DISCOVERY_FEED_CFLAGS) \
	-I$(abs_top_builddir)/libfeed \
	-I$(abs_top_srcdir)/libfeed \
	$(NULL)

libeos_discovery_feed_1_la_LIBADD = \
	$(EOS_DISCOVERY_FEED_LIBS) \
	$(NULL)

# GObject-Introspection
include $(INTROSPECTION_MAKEFILE)
INTROSPECTION_GIRS = $(NULL)
INTROSPECTION_SCANNER_ARGS = --add-include-path=$(srcdir) --warn-all
INTROSPECTION_COMPILER_ARGS = --includedir=$(srcdir)

if HAVE_INTROSPECTION
EosDiscoveryFeed-1.0.gir: libeos-discovery-feed-1.la
EosDiscoveryFeed_1_0_gir_INCLUDES = GObject-2.0 Gio-2.0 GLib-2.0
EosDiscoveryFeed_1_0_gir_CFLAGS = $(libeos_discovery_feed_1_la_CPPFLAGS)
EosDiscoveryFeed_1_0_gir_LIBS = libeos-discovery-feed-1.la
EosDiscoveryFeed_1_0_gir_FILES = $(introspection_sources)

INTROSPECTION_GIRS += EosDiscoveryFeed-1.0.gir

# Add GObject Introspection files to the build
gir_DATA += $(INTROSPECTION_GIRS)
typelib_DATA += $(INTROSPECTION_GIRS:.gir=.typelib)

CLEANFILES += $(gir_DATA) $(typelib_DATA)
endif

# Resources
resource_files = $(shell $(GLIB_COMPILE_RESOURCES) --sourcedir=$(srcdir)/src --generate-dependencies $(srcdir)/src/com.endlessm.DiscoveryFeed.src.gresource.xml)
app_resource_files = $(shell $(GLIB_COMPILE_RESOURCES) --sourcedir=$(srcdir)/data --generate-dependencies $(srcdir)/data/com.endlessm.DiscoveryFeed.data.gresource.xml)

resourcedir = $(pkgdatadir)
resource_DATA = data/com.endlessm.DiscoveryFeed.data.gresource \
		src/com.endlessm.DiscoveryFeed.src.gresource \
		$(NULL)

servicedir = $(datadir)/dbus-1/services
service_DATA = $(service_in_files:.service.in=.service)
service_in_files = \
	data/com.endlessm.DiscoveryFeed.service.in \
        $(NULL)

gsettings_SCHEMAS = data/com.endlessm.DiscoveryFeed.gschema.xml

%.gschema.xml: %.gschema.xml.in Makefile
	$(AM_V_GEN) sed -e 's|@GETTEXT_PACKAGE[@]|$(GETTEXT_PACKAGE)|g' \
	$< > $@ || rm $@

@GSETTINGS_RULES@

# Tests
javascript_tests = \
	tests/js/testDiscoveryFeed.js \
	tests/js/testModelOrdering.js \
	$(NULL)

# All JS files (used for linting)
all_js_files = \
	$(javascript_tests) \
	$(resource_files) \
	$(NULL)

# Set EXTRA_DIST and CLEANFILES initially
EXTRA_DIST += \
	$(resource_files) \
	$(javascript_tests) \
	$(service_in_files) \
	$(app_resource_files) \
	src/com.endlessm.DiscoveryFeed.in \
	src/com.endlessm.DiscoveryFeed.src.gresource.xml \
	data/com.endlessm.DiscoveryFeed.data.gresource.xml \
	data/com.endlessm.DiscoveryFeed.gschema.xml.in \
	$(NULL)

data/com.endlessm.DiscoveryFeed.service: $(srcdir)/data/com.endlessm.DiscoveryFeed.service.in
	$(AM_V_GEN) mkdir -p data
	$(AM_V_GEN) sed -e "s|\@bindir\@|$(bindir)|" $< > $@

data/com.endlessm.DiscoveryFeed.data.gresource: $(srcdir)/data/com.endlessm.DiscoveryFeed.data.gresource.xml $(app_resource_files)
	$(AM_V_GEN) mkdir -p data
	$(AM_V_GEN) $(GLIB_COMPILE_RESOURCES) --target=$@ --sourcedir=$(srcdir)/data $<

src/com.endlessm.DiscoveryFeed.src.gresource: $(srcdir)/src/com.endlessm.DiscoveryFeed.src.gresource.xml $(resource_files)
	$(AM_V_GEN) mkdir -p src
	$(AM_V_GEN) $(GLIB_COMPILE_RESOURCES) --target=$@ --sourcedir=$(srcdir)/src $<

src/com.endlessm.DiscoveryFeed: $(srcdir)/src/com.endlessm.DiscoveryFeed.in $(manager_resources)
	$(AM_V_GEN) mkdir -p src
	$(AM_V_GEN) sed \
		-e "s|[@]GJS@|$(GJS)|g" \
		-e "s|[@]PACKAGE_VERSION@|$(PACKAGE_VERSION)|g" \
		-e "s|[@]prefix@|$(prefix)|g" \
		-e "s|[@]libdir@|$(libdir)|g" \
		-e "s|[@]pkgdatadir@|$(pkgdatadir)|g" \
		$< > $@
	chmod +x $@
	echo $(app_resource_files)

# Scripts to install
bin_SCRIPTS = src/com.endlessm.DiscoveryFeed

# Distclean
CLEANFILES += \
	$(resource_DATA) \
	$(service_DATA) \
	src/com.endlessm.DiscoveryFeed \
	$(gsettings_SCHEMAS) \
	$(NULL)

#  Run tests when running 'make check'
TESTS = \
	$(javascript_tests) \
	run_coverage.coverage \
	run_eslint.eslint \
	$(NULL)
LOG_COMPILER = gtester
AM_LOG_FLAGS = -k --verbose

TEST_EXTENSIONS = .js .coverage .eslint

JS_LOG_DRIVER = env AM_TAP_AWK='$(AWK)' $(SHELL) $(top_srcdir)/tap-driver.sh
JS_LOG_DRIVER_FLAGS = --comments
JS_LOG_COMPILER = jasmine
AM_JS_LOG_FLAGS = --tap --no-config @JASMINE_REPORT_ARGUMENT@

# Use locally built versions of S modules, and
# libraries. We clobber GJS_PATH and include the js directory and the
# $(top_srcdir) for including test helper files.
# (May need to change to AM_TESTS_ENVIRONMENT in a later version of Automake)
TESTS_ENVIRONMENT = \
	export GJS_PATH="$(top_srcdir):$(top_srcdir)/src"; \
	export GI_TYPELIB_PATH="$(top_builddir)$${GI_TYPELIB_PATH:+:$$GI_TYPELIB_PATH}"; \
	export LD_LIBRARY_PATH="$(top_builddir)/.libs$${LD_LIBRARY_PATH:+:$$LD_LIBRARY_PATH}"; \
	export G_TEST_SRCDIR="$(abs_srcdir)/tests"; \
	export G_TEST_BUILDDIR="$(abs_builddir)/tests"; \
	export LC_ALL=C; \
	$(NULL)

# # # COVERAGE # # #

# Don't specify the resource:/// URIs here, because the tests load modules from
# the local directory, not from the GResource
EOS_JS_COVERAGE_FILES := $(patsubst $(srcdir)/%,%,$(wildcard $(srcdir)/src/*.js))

@EOS_COVERAGE_RULES@

AM_JS_LOG_FLAGS += @EOS_JS_COVERAGE_LOG_FLAGS@

# # # LINTING # # #
EOS_ESLINT_FILES := $(all_js_files)

@EOS_ESLINT_RULES@

